"""工资发放领域模型（纯函数 / 不可变值对象 / 策略类）。

约定：M月工资 在 (M+1)月 pay_day 日 发放（中国通用语义）。
- pay_day=1 → 5月工资 6月1日发
- 入职首月按 (入职日到月末天数 / 月总天数) × base 折算，与 pay_day 无关
"""
from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Iterator, Optional


# 工资差额流水的描述前缀标记。
# 仅作展示用途：业务关联/口径过滤一律走 transactions.salary_record_id 结构化列
SALARY_DIFF_MARKER_PREFIX = "[SR:"
MARKER_SUFFIX = "]"


def make_salary_diff_marker(record_id: str) -> str:
    return f"{SALARY_DIFF_MARKER_PREFIX}{record_id}{MARKER_SUFFIX}"


def _safe_day(year: int, month: int, day: int) -> int:
    """将 day 截断到该月实际最大日（处理 31 + 小月）。"""
    return min(day, calendar.monthrange(year, month)[1])


def _shift_month(year: int, month: int, delta: int) -> tuple[int, int]:
    """月份偏移（处理跨年）。"""
    idx = year * 12 + (month - 1) + delta
    return idx // 12, idx % 12 + 1


@dataclass(frozen=True)
class SalaryPeriod:
    """工资所属期（薪资周期）。"""
    year: int
    month: int
    pay_day: int

    @property
    def due_date(self) -> date:
        """本期工资的发放日期 = (year, month+1) 月 pay_day 日。"""
        ny, nm = _shift_month(self.year, self.month, 1)
        return date(ny, nm, _safe_day(ny, nm, self.pay_day))

    def is_due(self, today: date) -> bool:
        """是否已到/已过发薪日（含等号：发薪日当天即已到期）。"""
        return today >= self.due_date

    def next(self) -> "SalaryPeriod":
        ny, nm = _shift_month(self.year, self.month, 1)
        return SalaryPeriod(ny, nm, self.pay_day)

    def as_tuple(self) -> tuple[int, int]:
        return (self.year, self.month)


class SalaryCalculator:
    """工资计算无状态工具。"""

    @staticmethod
    def prorate_first_month(base_salary: float, entry_date_str: str,
                            year: int, month: int) -> float:
        """入职首月按实际在职天数折算（与 pay_day 无关）。

        非入职月返回 base_salary。无法解析入职日期则返回 base_salary。
        """
        try:
            entry = datetime.fromisoformat(entry_date_str)
        except (ValueError, TypeError):
            return base_salary
        if year != entry.year or month != entry.month:
            return base_salary
        days_in_month = calendar.monthrange(year, month)[1]
        work_days = days_in_month - entry.day + 1
        if work_days <= 0:
            return 0.0
        return round(base_salary * work_days / days_in_month, 2)

    @staticmethod
    def iter_unpaid_periods(entry_date_str: str, pay_day: int,
                            today: date) -> Iterator[SalaryPeriod]:
        """从入职月开始，迭代到「已到发薪日」的最后一个所属期。

        该迭代器只产出"应已发放"的薪资周期；未到期的不产出。
        """
        try:
            entry = datetime.fromisoformat(entry_date_str)
        except (ValueError, TypeError):
            return
        period = SalaryPeriod(entry.year, entry.month, pay_day)
        while period.is_due(today):
            yield period
            period = period.next()

    @staticmethod
    def latest_due_period(today: date, pay_day: int) -> SalaryPeriod:
        """计算「今天为止最后一个已到期的所属期」。

        如果今天 >= 本月 pay_day → 上月已到期；否则上上月已到期。
        用于工资发放提醒：定位"现在该发哪个月的工资"。
        """
        safe_today_pay = _safe_day(today.year, today.month, pay_day)
        if today.day >= safe_today_pay:
            ly, lm = _shift_month(today.year, today.month, -1)
        else:
            ly, lm = _shift_month(today.year, today.month, -2)
        return SalaryPeriod(ly, lm, pay_day)

    @staticmethod
    def days_until_next_pay_day(today: date, pay_day: int) -> int:
        """距离下一次「发薪日」的天数（负数表示已过）。

        发薪日始终在某个月的 pay_day 日。返回 (本月pay_day - today.day)
        若已过，则下一次发薪日在下个月（提示"已过期 N 天"用 abs 即可）。
        """
        return _safe_day(today.year, today.month, pay_day) - today.day


# ============================================================
# 个税计算策略
# ============================================================

class TaxStrategy:
    """个税计算策略基类。子类决定 compute 行为。"""

    def compute(self, base: float, social_rate: float, fund_rate: float,
                special_deduction: float, *,
                month_index: int = 1,
                prev_cumulative_income: float = 0,
                prev_cumulative_tax: float = 0,
                prev_cumulative_deduction: float = 0,
                prev_cumulative_special: float = 0) -> dict:
        raise NotImplementedError

    @staticmethod
    def for_employee(employee: Any) -> "TaxStrategy":
        """根据员工属性选择策略。employee.self_tax_filing=True → 自缴策略。"""
        if getattr(employee, "self_tax_filing", False):
            return SelfFilingStrategy()
        return WithholdingStrategy()


class WithholdingStrategy(TaxStrategy):
    """代扣代缴：累计预扣法（沿用 service.calc_tax_cumulative）。"""

    def compute(self, base, social_rate, fund_rate, special_deduction, **kwargs) -> dict:
        # 延迟导入避免循环
        from app.employee.service import calc_tax_cumulative
        return calc_tax_cumulative(
            base, social_rate, fund_rate, special_deduction, **kwargs,
        )


class SelfFilingStrategy(TaxStrategy):
    """员工自行缴税：公司全额发放，不扣不报。"""

    def compute(self, base, social_rate, fund_rate, special_deduction, **kwargs) -> dict:
        return {
            "salary": base,
            "socialInsurance": 0,
            "housingFund": 0,
            "specialDeduction": special_deduction,
            "taxableIncome": 0,
            "tax": 0,
            "netSalary": base,  # 全额发放
            "cumulativeTaxable": 0,
            "cumulativeTax": 0,
            "selfFiling": True,  # 让前端可识别
        }

