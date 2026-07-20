"""
税务报表生成服务 - 基于 XLS 模板生成报税用财务报表
支持：资产负债表、利润表、现金流量表（月季报 / 年报）
"""
import os
from datetime import datetime
from typing import Optional

import xlrd
import xlwt
from xlutils.copy import copy as xlcopy

from sqlalchemy import select, func, and_, or_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.account.models import Account
from app.category.models import Category
from app.transaction.models import Transaction
from app.employee.models import SalaryRecord
from app.settings.models import CompanyInfo

# 模板路径 - 项目根目录
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
TEMPLATE_DIR = os.path.join(PROJECT_ROOT, "财报模板")
MONTHLY_TEMPLATE = os.path.join(TEMPLATE_DIR, "财务报表报送与信息采集（小企业会计准则）月季报.xls")
YEARLY_TEMPLATE = os.path.join(TEMPLATE_DIR, "财务报表报送与信息采集（小企业会计准则）年报.xls")

# 输出目录
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "generated_reports")


# ============================================================
# 费用分类映射 - 根据分类名称关键字匹配到报表行项
# ============================================================
CATEGORY_MAPPING = {
    "营业成本": ["成本", "进货", "采购", "原材料", "生产"],
    "销售费用": ["销售", "推广", "广告", "业务", "快递", "运费", "物流"],
    "管理费用": ["管理", "办公", "房租", "水电", "物业", "维修", "折旧", "培训", "差旅", "通讯", "社保", "公积金",
                "业务招待", "招待", "餐饮", "应酬"],
    "财务费用": ["利息", "手续费", "银行", "汇兑"],
    "税金及附加": ["税", "印花", "附加"],
    "营业外支出": ["罚款", "捐赠", "损失", "赔偿", "滞纳金"],
}

# 利润表中需要细分的子项关键字
SALES_SUB = {
    "商品维修费": ["维修"],
    "广告费和业务宣传费": ["广告", "宣传", "推广"],
}
ADMIN_SUB = {
    "开办费": ["开办"],
    "业务招待费": ["招待", "餐饮", "应酬"],
    "研究费用": ["研发", "研究"],
}
TAX_SUB = {
    "消费税": ["消费税"],
    "营业税": ["营业税"],
    "城市维护建设税": ["城建", "城市维护"],
    "资源税": ["资源税"],
    "土地增值税": ["土地增值"],
    "城镇土地使用税、房产税、车船税、印花税": ["土地使用", "房产税", "车船", "印花"],
    "教育费附加、矿产资源补偿费、排污费": ["教育", "矿产", "排污"],
}


def _match_category(cat_name: str, keywords: list) -> bool:
    """检查分类名称是否匹配关键词列表"""
    return any(kw in cat_name for kw in keywords)


def _classify_expense(cat_name: str) -> str:
    """将费用分类名称映射到报表行项。
    最长关键词优先，避免遮蔽（如"业务招待"须归管理费用，
    不能被销售费用的"业务"抢先命中）。"""
    best_item, best_len = "管理费用", 0  # 默认归入管理费用
    for report_item, keywords in CATEGORY_MAPPING.items():
        for kw in keywords:
            if kw in cat_name and len(kw) > best_len:
                best_item, best_len = report_item, len(kw)
    return best_item


def _classify_sub(cat_name: str, sub_map: dict) -> Optional[str]:
    """匹配子项"""
    for sub_item, keywords in sub_map.items():
        if _match_category(cat_name, keywords):
            return sub_item
    return None


async def _get_company_info(db: AsyncSession) -> dict:
    """获取企业信息"""
    result = await db.execute(select(CompanyInfo).limit(1))
    info = result.scalar_one_or_none()
    if info:
        return {"tax_number": info.tax_number, "company_name": info.company_name}
    return {"tax_number": "", "company_name": ""}


# ============================================================
# 期末时点快照 - 资产负债表口径
# 统一口径：按「交易日期 ≤ 期末 + 当前确认状态」计算，期后发生的
# 收付（如 7/1 发的 6 月工资）不会污染期末数；与现金流量表的
# 日期过滤完全一致，保证三张表勾稽。
# ============================================================

def _shift_date(date_str: str, days: int) -> str:
    from datetime import date, timedelta
    y, m, d = map(int, date_str.split("-"))
    return (date(y, m, d) + timedelta(days=days)).isoformat()


def _batch_pay_date(batch) -> str:
    """报销批次的实际打款日期（历史数据缺 paid_at 时回退到用户填写的实际转账日期）"""
    if batch.paid_at:
        return batch.paid_at[:10]
    return batch.completed_date or (batch.completed_at or "")[:10]


async def _get_salary_category_ids(db: AsyncSession) -> set:
    rows = await db.execute(select(Category.id).where(Category.name.like("%工资%")))
    return {r[0] for r in rows.all()}


async def _get_snapshot(db: AsyncSession, end_date: str) -> dict:
    """报告期末时点快照。期末数全部由流水重算：
    货币资金 = Σ账户初始余额 + 期末前已确认流水净额（− 无流水的历史批次打款），
    与生成报表时刻的 Account.balance 无关。
    """
    from app.reimbursement.models import ReimbursementBatch

    initial = float((await db.execute(
        select(func.coalesce(func.sum(Account.initial_balance), 0.0)))).scalar() or 0)
    salary_cat_ids = await _get_salary_category_ids(db)
    txns = list((await db.execute(
        select(Transaction).where(Transaction.date <= end_date))).scalars().all())
    batches = list((await db.execute(select(ReimbursementBatch))).scalars().all())
    paid_batch_dates = {b.id: _batch_pay_date(b) for b in batches if b.status == "paid"}

    cash = initial
    receivables = 0.0
    payables = 0.0

    for t in txns:
        if t.type == "transfer":
            continue  # 内部划转不改变货币资金总额
        amt = float(t.amount)
        is_personal = t.payment_account_type == "personal"

        if t.payment_confirmed and not is_personal:
            cash += amt if t.type == "income" else -amt

        if t.type == "income":
            if not t.payment_confirmed:
                receivables += amt
            continue

        # 支出侧负债
        if t.category_id in salary_cat_ids or t.salary_record_id:
            continue  # 工资域负债 → 应付职工薪酬
        if not t.payment_confirmed:
            payables += amt  # 欠供应商 / 未付
        elif is_personal:
            # 已确认的私户垫付：期末前未经批次打款 → 欠员工报销款
            pay_date = paid_batch_dates.get(t.reimbursement_batch_id) if t.reimbursement_batch_id else None
            if not (pay_date and pay_date <= end_date):
                payables += amt

    # 注：历史上存在「打款只扣余额不落流水」的批次，已由
    # migrations/backfill_legacy_batch_payouts.py 一次性补录 [RB:] 流水，
    # 此处不再需要账外补偿分支——现金一律由流水推导。
    unpaid_salary = await _get_unpaid_salary_asof(db, end_date, txns, salary_cat_ids)

    return {
        "cash": round(cash, 2),
        "receivables": round(receivables, 2),
        "payables": round(payables, 2),
        "unpaid_salary": round(unpaid_salary, 2),
    }


async def _get_unpaid_salary_asof(db: AsyncSession, end_date: str,
                                  txns: list, salary_cat_ids: set) -> float:
    """期末时点的应付职工薪酬：
    1. 应发净额 − 期末前实付（主流水 + 已确认差额流水，日期 ≤ 期末）
       —— 6 月工资若在 7/1 发放，6/30 报表中即为应付
    2. 员工垫付的工资类支出（期末前未确认的，非主流水、非差额流水）
    实付口径与 employee.service.compute_salary_settlement 一致，
    仅多一个「交易日期 ≤ 期末」的时点过滤；差额流水按 salary_record_id 关联。
    """
    end_parts = end_date.split("-")
    end_ym = int(end_parts[0]) * 100 + int(end_parts[1])

    records = list((await db.execute(
        select(SalaryRecord).where(
            SalaryRecord.year * 100 + SalaryRecord.month <= end_ym)
    )).scalars().all())

    txn_by_id = {t.id: t for t in txns}
    linked_txn_ids = {r.transaction_id for r in records if r.transaction_id}

    owed = 0.0
    for r in records:
        paid = 0.0
        main = txn_by_id.get(r.transaction_id) if r.transaction_id else None
        if main is not None and main.payment_confirmed:
            paid += float(main.amount)
        for t in txns:
            if t.salary_record_id == r.id and t.payment_confirmed:
                paid += float(t.amount) if t.type == "expense" else -float(t.amount)
        owed += max(float(r.net_salary) - paid, 0)

    for t in txns:
        if (t.type == "expense" and t.category_id in salary_cat_ids
                and t.id not in linked_txn_ids
                and not t.salary_record_id
                and not t.payment_confirmed):
            owed += float(t.amount)

    return owed




async def _get_income_data(db: AsyncSession, start_date: str, end_date: str, cash_basis: bool = False) -> float:
    """获取期间内营业收入。cash_basis=True 时只统计已到账的（payment_confirmed=True）"""
    conditions = [
        Transaction.type == "income",
        Transaction.date >= start_date,
        Transaction.date <= end_date,
    ]
    if cash_basis:
        conditions.append(Transaction.payment_confirmed == True)
    result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0.0))
        .where(and_(*conditions))
    )
    return float(result.scalar() or 0)


async def _get_interest_income(db: AsyncSession, start_date: str, end_date: str,
                               cash_basis: bool = False) -> float:
    """期间内利息收入（按描述识别）。利息不是营业收入：
    利润表从营业收入剔除、以负数体现在财务费用"利息费用"行；
    现金流量表从销售收现剔除、计入"收到其他与经营活动有关的现金"。"""
    conditions = [
        Transaction.type == "income",
        Transaction.date >= start_date,
        Transaction.date <= end_date,
        Transaction.description.like("%利息%"),
    ]
    if cash_basis:
        conditions.append(Transaction.payment_confirmed == True)
    result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0.0)).where(and_(*conditions))
    )
    return float(result.scalar() or 0)


async def _get_interest_expense(db: AsyncSession, start_date: str, end_date: str,
                                cash_basis: bool = False) -> float:
    """期间内利息支出（按描述识别，排除工资相关流水）"""
    conditions = [
        Transaction.type == "expense",
        Transaction.date >= start_date,
        Transaction.date <= end_date,
        Transaction.description.like("%利息%"),
        Transaction.salary_record_id.is_(None),
        Transaction.id.not_in(
            select(SalaryRecord.transaction_id).where(SalaryRecord.transaction_id != None)
        ),
    ]
    if cash_basis:
        conditions.append(Transaction.payment_confirmed == True)
    result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0.0)).where(and_(*conditions))
    )
    return float(result.scalar() or 0)


async def _get_income_tax_paid(db: AsyncSession, end_date: str) -> float:
    """截至期末已实缴的企业所得税（按描述识别），用于应交税费 = 估提 − 已缴"""
    result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0.0)).where(and_(
            Transaction.type == "expense",
            Transaction.payment_confirmed == True,
            Transaction.date <= end_date,
            Transaction.description.like("%企业所得税%"),
        ))
    )
    return float(result.scalar() or 0)


async def _get_expense_by_category(db: AsyncSession, start_date: str, end_date: str,
                                    cash_basis: bool = False,
                                    exclude_salary: bool = False) -> list:
    """获取期间内按分类汇总的支出。
    cash_basis=True 时只统计已付款的（payment_confirmed=True）
    exclude_salary=True 时排除已关联工资记录的交易（避免与 salary_records 重复计算）
    """
    from app.transaction.service import business_expense_conditions, company_cash_conditions

    conditions = [
        Transaction.date >= start_date,
        Transaction.date <= end_date,
    ]
    if cash_basis:
        # 公司现金口径（统一定义见 transaction.service.company_cash_conditions）：
        # 私户垫付没动公司的钱，不计；[RB:] 报销打款是真实出款，计入
        conditions.append(Transaction.type == "expense")
        conditions.extend(company_cash_conditions())
    else:
        # 权责口径（统一定义见 transaction.service.business_expense_conditions）：
        # 费用按垫付原始流水确认，[RB:] 打款是清偿负债、排除防双计；
        # 企业所得税缴款是清偿估提负债，不再计入费用行（所得税费用行已体现）
        conditions.extend(business_expense_conditions())
        conditions.append(Transaction.description.not_like("%企业所得税%"))
    if exclude_salary:
        # 排除已被 salary_records 关联的交易和工资差额流水
        # （职工薪酬行项/工资权责计提已覆盖，避免重复计算）
        conditions.append(Transaction.id.not_in(
            select(SalaryRecord.transaction_id).where(SalaryRecord.transaction_id != None)
        ))
        conditions.append(Transaction.salary_record_id.is_(None))
    result = await db.execute(
        select(Transaction.category_id, func.sum(Transaction.amount).label("total"))
        .where(and_(*conditions))
        .group_by(Transaction.category_id)
    )
    rows = result.all()

    # 查询分类名称
    cat_ids = {r[0] for r in rows if r[0]}
    cat_map = {}
    if cat_ids:
        cat_result = await db.execute(
            select(Category.id, Category.name).where(Category.id.in_(cat_ids))
        )
        cat_map = {r[0]: r[1] for r in cat_result.all()}

    expenses = []
    for row in rows:
        cat_name = cat_map.get(row[0], "未分类")
        expenses.append({
            "category_name": cat_name,
            "amount": float(row[1]),
            "report_item": _classify_expense(cat_name),
        })

    return expenses


async def _get_salary_expense(db: AsyncSession, start_date: str, end_date: str) -> float:
    """期间内工资费用（权责发生制：按工资所属月，取应发净额）。
    净额口径与应付职工薪酬/工资现金流一致：代扣个税的实缴走"税款"分类流水另行入账，
    合计即全额工资成本。"""
    start_parts = start_date.split("-")
    end_parts = end_date.split("-")
    start_ym = int(start_parts[0]) * 100 + int(start_parts[1])
    end_ym = int(end_parts[0]) * 100 + int(end_parts[1])

    ym = SalaryRecord.year * 100 + SalaryRecord.month
    result = await db.execute(
        select(func.coalesce(func.sum(SalaryRecord.net_salary), 0.0))
        .where(and_(ym >= start_ym, ym <= end_ym))
    )
    return float(result.scalar() or 0)


async def _get_salary_cash_paid(db: AsyncSession, start_date: str, end_date: str) -> float:
    """获取期间内实际从账户支付的工资金额（从关联交易中取，确保与账户余额一致）。
    含已确认的 [SR:] 差额流水（补发为流出、回收为流入）。"""
    result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0.0))
        .where(and_(
            Transaction.id.in_(
                select(SalaryRecord.transaction_id).where(SalaryRecord.transaction_id != None)
            ),
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.payment_confirmed == True,
        ))
    )
    main_paid = float(result.scalar() or 0)

    sr_result = await db.execute(
        select(func.coalesce(func.sum(case(
            (Transaction.type == "expense", Transaction.amount),
            (Transaction.type == "income", -Transaction.amount),
            else_=0.0,
        )), 0.0))
        .where(and_(
            Transaction.salary_record_id.is_not(None),
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.payment_confirmed == True,
        ))
    )
    return main_paid + float(sr_result.scalar() or 0)


async def _get_salary_tax_cash_paid(db: AsyncSession, start_date: str, end_date: str) -> float:
    """获取期间内实际代扣代缴的个税（从已付款的税费类交易中取，而非 salary_records.tax）
    注意：个税代扣暂存在公司，只有实际申报缴纳给税务局时才算现金流出。
    这里查询的是已确认付款的、与个税相关的交易。
    """
    # 如果个税是在工资交易里一起扣的（未单独建交易），则此处返回 0
    # 只有单独的报税缴纳交易才算现金流出
    result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0.0))
        .where(and_(
            Transaction.type == "expense",
            Transaction.payment_confirmed == True,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.description.like("%个税%"),
            # 排除工资关联的交易
            Transaction.id.not_in(
                select(SalaryRecord.transaction_id).where(SalaryRecord.transaction_id != None)
            ),
            # 挂"税"类分类的缴款已由分类映射进"支付的税费"行，此处排除防双计
            Transaction.category_id.not_in(
                select(Category.id).where(Category.name.like("%税%"))
            ),
        ))
    )
    return float(result.scalar() or 0)


def _aggregate_expenses(expenses: list) -> dict:
    """汇总费用到报表行项"""
    result = {
        "营业成本": 0.0,
        "税金及附加": 0.0,
        "销售费用": 0.0,
        "管理费用": 0.0,
        "财务费用": 0.0,
        "营业外支出": 0.0,
    }
    # 税金子项
    tax_subs = {k: 0.0 for k in TAX_SUB.keys()}
    # 销售费用子项
    sales_subs = {k: 0.0 for k in SALES_SUB.keys()}
    # 管理费用子项
    admin_subs = {k: 0.0 for k in ADMIN_SUB.keys()}

    for exp in expenses:
        report_item = exp["report_item"]
        amount = exp["amount"]
        cat_name = exp["category_name"]

        result[report_item] = result.get(report_item, 0.0) + amount

        # 匹配子项
        if report_item == "税金及附加":
            sub = _classify_sub(cat_name, TAX_SUB)
            if sub:
                tax_subs[sub] += amount
        elif report_item == "销售费用":
            sub = _classify_sub(cat_name, SALES_SUB)
            if sub:
                sales_subs[sub] += amount
        elif report_item == "管理费用":
            sub = _classify_sub(cat_name, ADMIN_SUB)
            if sub:
                admin_subs[sub] += amount

    return {
        **result,
        "tax_subs": tax_subs,
        "sales_subs": sales_subs,
        "admin_subs": admin_subs,
    }


# ============================================================
# XLS 写入辅助 - 保留模板格式
# ============================================================
def _get_cell_style(rb, sheet_idx, row, col):
    """从 xlrd 工作簿中提取单元格样式，转为 xlwt XFStyle 以保留模板格式"""
    rdsheet = rb.sheet_by_index(sheet_idx)
    xf_idx = rdsheet.cell_xf_index(row, col)
    xf = rb.xf_list[xf_idx]

    style = xlwt.XFStyle()

    # 字体
    rd_font = rb.font_list[xf.font_index]
    wt_font = xlwt.Font()
    wt_font.name = rd_font.name
    wt_font.bold = rd_font.bold
    wt_font.italic = rd_font.italic
    wt_font.height = rd_font.height
    wt_font.colour_index = rd_font.colour_index
    wt_font.underline = rd_font.underline_type != 0
    style.font = wt_font

    # 数字格式
    fmt_key = xf.format_key
    if fmt_key in rb.format_map:
        style.num_format_str = rb.format_map[fmt_key].format_str

    # 对齐
    al = xlwt.Alignment()
    al.horz = xf.alignment.hor_align
    al.vert = xf.alignment.vert_align
    al.wrap = xf.alignment.text_wrapped
    style.alignment = al

    # 边框
    borders = xlwt.Borders()
    brd = xf.border
    borders.left = brd.left_line_style
    borders.right = brd.right_line_style
    borders.top = brd.top_line_style
    borders.bottom = brd.bottom_line_style
    borders.left_colour = brd.left_colour_index
    borders.right_colour = brd.right_colour_index
    borders.top_colour = brd.top_colour_index
    borders.bottom_colour = brd.bottom_colour_index
    style.borders = borders

    # 背景填充
    pattern = xlwt.Pattern()
    bg = xf.background
    pattern.pattern = bg.fill_pattern
    pattern.pattern_fore_colour = bg.pattern_colour_index
    pattern.pattern_back_colour = bg.background_colour_index
    style.pattern = pattern

    return style


def _write_cell(rb, ws, sheet_idx, row, col, value):
    """写入单元格并保留原始模板格式（边框、字体、数字格式等）"""
    style = _get_cell_style(rb, sheet_idx, row, col)
    ws.write(row, col, value, style)


def _fill_balance_sheet(rb, ws, data: dict):
    """填充资产负债表（Sheet 0）。

    期末余额 = 报告期末时点快照（由流水重算），年初余额 = 上年末快照。
    勾稽关系：无往年数据时，未分配利润 == 利润表本年累计净利润。
    """
    SI = 0  # sheet index
    company = data["company"]
    period = data["period"]
    snap = data["snapshot_end"]
    snap0 = data["snapshot_year_start"]
    tax_payable = data["tax_payable"]
    tax_payable0 = data["tax_payable_year_start"]
    tax_prepaid = data["tax_prepaid"]
    tax_prepaid0 = data["tax_prepaid_year_start"]

    # 头部信息 - 写入合并单元格的值区域，不覆盖标签
    # 资产负债表: 纳税人识别号标签在[2,1], 值写入[2,3]; 纳税人名称标签在[2,5], 值写入[2,7]
    _write_cell(rb, ws, SI, 2, 3, company["tax_number"])
    _write_cell(rb, ws, SI, 2, 7, company["company_name"])
    _write_cell(rb, ws, SI, 3, 3, period["start"])
    _write_cell(rb, ws, SI, 3, 7, period["end"])

    def _fill_side(end_snap, end_tax, end_prepaid, asset_col, liab_col):
        # 货币资金(行次1, R6)
        _write_cell(rb, ws, SI, 6, asset_col, round(end_snap["cash"], 2))
        # 应收账款(行次4, R9)
        _write_cell(rb, ws, SI, 9, asset_col, round(end_snap["receivables"], 2))
        # 其他流动资产(行次14, R19) - 多缴税款（预缴超过估提，汇算清缴可抵退）
        _write_cell(rb, ws, SI, 19, asset_col, round(end_prepaid, 2))
        # 流动资产合计(行次15, R20) / 资产合计(行次30, R36)
        total_assets = end_snap["cash"] + end_snap["receivables"] + end_prepaid
        _write_cell(rb, ws, SI, 20, asset_col, round(total_assets, 2))
        _write_cell(rb, ws, SI, 36, asset_col, round(total_assets, 2))

        # 应付账款(行次33, R8)
        _write_cell(rb, ws, SI, 8, liab_col, round(end_snap["payables"], 2))
        # 应付职工薪酬(行次35, R10)
        _write_cell(rb, ws, SI, 10, liab_col, round(end_snap["unpaid_salary"], 2))
        # 应交税费(行次36, R11) - 所得税估提未缴部分
        _write_cell(rb, ws, SI, 11, liab_col, round(end_tax, 2))
        # 流动负债合计(行次41, R16) / 负债合计(行次47, R23)
        liabilities = end_snap["payables"] + end_snap["unpaid_salary"] + end_tax
        _write_cell(rb, ws, SI, 16, liab_col, round(liabilities, 2))
        _write_cell(rb, ws, SI, 23, liab_col, round(liabilities, 2))

        # 未分配利润(行次51, R34) = 资产 − 负债；所有者权益合计(行次52, R35)
        retained = total_assets - liabilities
        _write_cell(rb, ws, SI, 34, liab_col, round(retained, 2))
        _write_cell(rb, ws, SI, 35, liab_col, round(retained, 2))
        # 负债和所有者权益总计(行次53, R36)
        _write_cell(rb, ws, SI, 36, liab_col, round(total_assets, 2))

    _fill_side(snap, tax_payable, tax_prepaid, asset_col=3, liab_col=7)     # 期末余额
    _fill_side(snap0, tax_payable0, tax_prepaid0, asset_col=4, liab_col=8)  # 年初余额


def _fill_income_statement_monthly(rb, ws, data: dict):
    """填充利润表（月季报 Sheet 1: 本期金额=col3, 本年累计金额=col4）"""
    SI = 1  # sheet index
    company = data["company"]
    period = data["period"]

    # 头部 - 利润表: 纳税人识别号标签在[2,1], 值写入[2,3]; 纳税人名称标签在[2,4], 值写入[2,5]
    _write_cell(rb, ws, SI, 2, 3, company["tax_number"])
    _write_cell(rb, ws, SI, 2, 5, company["company_name"])
    _write_cell(rb, ws, SI, 3, 3, period["start"])
    _write_cell(rb, ws, SI, 3, 5, period["end"])

    # 本期金额列 col=3, 本年累计 col=4
    _fill_income_cols(rb, ws, SI, 3, data["pnl_period"])
    _fill_income_cols(rb, ws, SI, 4, data["pnl_ytd"])


def _fill_income_statement_yearly(rb, ws, data: dict):
    """填充利润表（年报 Sheet 1: 本年累计金额=col3, 上年金额=col4）"""
    SI = 1  # sheet index
    company = data["company"]
    period = data["period"]

    # 头部
    _write_cell(rb, ws, SI, 2, 3, company["tax_number"])
    _write_cell(rb, ws, SI, 2, 5, company["company_name"])
    _write_cell(rb, ws, SI, 3, 3, period["start"])
    _write_cell(rb, ws, SI, 3, 5, period["end"])

    # 本年累计 col=3（上年金额 col=4 暂不填）
    _fill_income_cols(rb, ws, SI, 3, data["pnl_ytd"])


def _compute_pnl(income_total: float, interest_income: float, interest_expense: float,
                 exp_agg: dict, salary_accrual: float) -> dict:
    """计算利润表一列的全部数值（权责发生制）。

    - 营业收入剔除利息收入；利息以净额（费用−收入）体现在财务费用"利息费用"行
    - 管理费用 = 分类费用 + 工资权责计提（按工资所属月，与流水日期无关）
    - 所得税 = 利润总额 × 5%（小微企业实际税负），估提口径供资产负债表应交税费复用
    """
    revenue = income_total - interest_income
    cost = exp_agg.get("营业成本", 0.0)
    tax_add = exp_agg.get("税金及附加", 0.0)
    sales = exp_agg.get("销售费用", 0.0)
    admin = exp_agg.get("管理费用", 0.0) + salary_accrual
    interest_net = interest_expense - interest_income
    finance = exp_agg.get("财务费用", 0.0) - interest_income  # 分类费用已含利息支出
    non_op = exp_agg.get("营业外支出", 0.0)

    operating_profit = revenue - cost - tax_add - sales - admin - finance
    profit_total = operating_profit - non_op
    # 小型微利企业优惠(财政部税务总局公告2023年第12号,延续至2027-12-31):
    # 年应纳税所得额 ≤300万 → 减按25%计入×20% = 实际税负5%；
    # 超过300万即整体丧失小微资格，全额按25%（临界跳变，不是超额累进）
    if profit_total <= 0:
        income_tax = 0
    elif profit_total <= 3_000_000:
        income_tax = profit_total * 0.05
    else:
        income_tax = profit_total * 0.25
    net_profit = profit_total - income_tax

    return {
        "revenue": revenue,
        "cost": cost,
        "tax_add": tax_add,
        "sales": sales,
        "admin": admin,
        "finance": finance,
        "interest_net": interest_net,
        "non_op": non_op,
        "operating_profit": operating_profit,
        "profit_total": profit_total,
        "income_tax": income_tax,
        "net_profit": net_profit,
        "tax_subs": exp_agg.get("tax_subs", {}),
        "sales_subs": exp_agg.get("sales_subs", {}),
        "admin_subs": exp_agg.get("admin_subs", {}),
    }


def _fill_income_cols(rb, ws, si: int, col: int, pnl: dict):
    """填充利润表某一列（数值已由 _compute_pnl 算好）"""
    # 一、营业收入(行次1, R5)
    _write_cell(rb, ws, si, 5, col, round(pnl["revenue"], 2))

    # 减：营业成本(行次2, R6)
    _write_cell(rb, ws, si, 6, col, round(pnl["cost"], 2))

    # 税金及附加(行次3, R7)
    tax_add = pnl["tax_add"]
    _write_cell(rb, ws, si, 7, col, round(tax_add, 2))

    # 税金子项 (R8-R14)
    tax_subs = pnl["tax_subs"]
    # 消费税(行次4, R8)
    _write_cell(rb, ws, si, 8, col, round(tax_subs.get("消费税", 0.0), 2))
    # 营业税(行次5, R9)
    _write_cell(rb, ws, si, 9, col, round(tax_subs.get("营业税", 0.0), 2))
    # 城市维护建设税(行次6, R10)
    _write_cell(rb, ws, si, 10, col, round(tax_subs.get("城市维护建设税", 0.0), 2))
    # 资源税(行次7, R11)
    _write_cell(rb, ws, si, 11, col, round(tax_subs.get("资源税", 0.0), 2))
    # 土地增值税(行次8, R12)
    _write_cell(rb, ws, si, 12, col, round(tax_subs.get("土地增值税", 0.0), 2))
    # 城镇土地使用税...(行次9, R13)
    _write_cell(rb, ws, si, 13, col, round(tax_subs.get("城镇土地使用税、房产税、车船税、印花税", 0.0), 2))
    # 教育费附加...(行次10, R14)
    _write_cell(rb, ws, si, 14, col, round(tax_subs.get("教育费附加、矿产资源补偿费、排污费", 0.0), 2))

    # 销售费用(行次11, R15)
    _write_cell(rb, ws, si, 15, col, round(pnl["sales"], 2))

    # 销售子项
    sales_subs = pnl["sales_subs"]
    _write_cell(rb, ws, si, 16, col, round(sales_subs.get("商品维修费", 0.0), 2))  # R16
    _write_cell(rb, ws, si, 17, col, round(sales_subs.get("广告费和业务宣传费", 0.0), 2))  # R17

    # 管理费用(行次14, R18) - 含工资权责计提
    _write_cell(rb, ws, si, 18, col, round(pnl["admin"], 2))

    # 管理子项
    admin_subs = pnl["admin_subs"]
    _write_cell(rb, ws, si, 19, col, round(admin_subs.get("开办费", 0.0), 2))  # R19
    _write_cell(rb, ws, si, 20, col, round(admin_subs.get("业务招待费", 0.0), 2))  # R20
    _write_cell(rb, ws, si, 21, col, round(admin_subs.get("研究费用", 0.0), 2))  # R21

    # 财务费用(行次18, R22) - 已按净额扣除利息收入
    _write_cell(rb, ws, si, 22, col, round(pnl["finance"], 2))
    # 利息费用(行次19, R23) - 利息净额，收入以负数填列
    _write_cell(rb, ws, si, 23, col, round(pnl["interest_net"], 2))

    # 二、营业利润(行次21, R25)
    _write_cell(rb, ws, si, 25, col, round(pnl["operating_profit"], 2))

    # 营业外支出(行次24, R28)
    _write_cell(rb, ws, si, 28, col, round(pnl["non_op"], 2))

    # 三、利润总额(行次30, R34)
    _write_cell(rb, ws, si, 34, col, round(pnl["profit_total"], 2))

    # 所得税费用(行次31, R35) - 小微企业 5% 估提
    _write_cell(rb, ws, si, 35, col, round(pnl["income_tax"], 2))

    # 四、净利润(行次32, R36)
    _write_cell(rb, ws, si, 36, col, round(pnl["net_profit"], 2))


def _fill_cash_flow_monthly(rb, ws, data: dict):
    """填充现金流量表（月季报 Sheet 2: 本期金额=col3, 本年累计金额=col4）"""
    SI = 2  # sheet index
    company = data["company"]
    period = data["period"]

    _write_cell(rb, ws, SI, 2, 3, company["tax_number"])
    _write_cell(rb, ws, SI, 2, 5, company["company_name"])
    _write_cell(rb, ws, SI, 3, 3, period["start"])
    _write_cell(rb, ws, SI, 3, 5, period["end"])

    _fill_cash_flow_cols(rb, ws, SI, 3, data, "period")
    _fill_cash_flow_cols(rb, ws, SI, 4, data, "ytd")


def _fill_cash_flow_yearly(rb, ws, data: dict):
    """填充现金流量表（年报 Sheet 2: 本年累计金额=col3, 上年金额=col4）"""
    SI = 2  # sheet index
    company = data["company"]
    period = data["period"]

    _write_cell(rb, ws, SI, 2, 3, company["tax_number"])
    _write_cell(rb, ws, SI, 2, 5, company["company_name"])
    _write_cell(rb, ws, SI, 3, 3, period["start"])
    _write_cell(rb, ws, SI, 3, 5, period["end"])

    _fill_cash_flow_cols(rb, ws, SI, 3, data, "ytd")


def _fill_cash_flow_cols(rb, ws, si: int, col: int, data: dict, mode: str):
    """填充现金流量表某一列（公司现金口径：私户垫付不计，[RB:] 报销打款计入）"""
    suffix = "_period" if mode == "period" else "_ytd"
    income = data.get(f"income{suffix}", 0.0)          # 销售收现（已剔除利息）
    interest = data.get(f"interest{suffix}", 0.0)      # 收到的利息
    exp = data.get(f"expenses{suffix}", {})
    salary = data.get(f"salary{suffix}", 0.0)          # 工资主流水 + [SR:] 差额
    salary_tax = data.get(f"salary_tax{suffix}", 0.0)
    opening = data.get(f"opening{suffix}", 0.0)        # 期初现金（期初前一日快照）

    cost = exp.get("营业成本", 0.0)
    tax_total = exp.get("税金及附加", 0.0)
    other_expense = (exp.get("销售费用", 0.0) + exp.get("管理费用", 0.0)
                     + exp.get("财务费用", 0.0) + exp.get("营业外支出", 0.0))

    # 一、经营活动
    # 销售收到的现金(行次1, R6)
    _write_cell(rb, ws, si, 6, col, round(income, 2))
    # 收到其他与经营活动有关的现金(行次2, R7) - 利息等
    _write_cell(rb, ws, si, 7, col, round(interest, 2))
    # 购买支付的现金(行次3, R8)
    _write_cell(rb, ws, si, 8, col, round(cost, 2))
    # 支付的职工薪酬(行次4, R9)
    _write_cell(rb, ws, si, 9, col, round(salary, 2))
    # 支付的税费(行次5, R10)
    _write_cell(rb, ws, si, 10, col, round(tax_total + salary_tax, 2))
    # 支付其他与经营活动有关的现金(行次6, R11)
    _write_cell(rb, ws, si, 11, col, round(other_expense, 2))
    # 经营活动产生的现金流量净额(行次7, R12)
    net_operating = income + interest - cost - salary - tax_total - salary_tax - other_expense
    _write_cell(rb, ws, si, 12, col, round(net_operating, 2))

    # 四、现金净增加额(行次20, R27)
    _write_cell(rb, ws, si, 27, col, round(net_operating, 2))

    # 期初现金余额(行次21, R28) - 本列期间起点前一日的时点快照
    _write_cell(rb, ws, si, 28, col, round(opening, 2))

    # 五、期末现金余额(行次22, R29) = 期初 + 净增加额（与资产负债表货币资金一致）
    _write_cell(rb, ws, si, 29, col, round(opening + net_operating, 2))


# ============================================================
# 报表数据组装（生成 XLS 与预览 API 共用同一数据源）
# ============================================================
async def build_report_data(db: AsyncSession, start_date: str, end_date: str) -> dict:
    """组装三张报表全部数据 + 季度申报助手数据（JSON 可序列化）。"""
    company = await _get_company_info(db)
    end_year = int(end_date.split("-")[0])
    year_start = f"{end_year}-01-01"

    # 资产负债表：期末 / 年初（上年末）时点快照
    snapshot_end = await _get_snapshot(db, end_date)
    snapshot_year_start = await _get_snapshot(db, f"{end_year - 1}-12-31")

    async def _pnl_for(pstart: str, pend: str) -> dict:
        """某期间的利润表数值（权责发生制）"""
        income_total = await _get_income_data(db, pstart, pend)
        interest_income = await _get_interest_income(db, pstart, pend)
        interest_expense = await _get_interest_expense(db, pstart, pend)
        exp_raw = await _get_expense_by_category(db, pstart, pend, exclude_salary=True)
        salary = await _get_salary_expense(db, pstart, pend)
        return _compute_pnl(income_total, interest_income, interest_expense,
                            _aggregate_expenses(exp_raw), salary)

    pnl_period = await _pnl_for(start_date, end_date)
    pnl_ytd = await _pnl_for(year_start, end_date)

    # 应交税费 = 所得税估提（本年累计）− 已实缴；预缴超过估提的部分挂"其他流动资产"
    # （季度预缴后利润回落属正常，多缴部分汇算清缴可抵退）；年初列按上年末同口径
    income_tax_paid = await _get_income_tax_paid(db, end_date)
    tax_payable = round(max(pnl_ytd["income_tax"] - income_tax_paid, 0), 2)
    tax_prepaid = round(max(income_tax_paid - pnl_ytd["income_tax"], 0), 2)
    prior_year_end = f"{end_year - 1}-12-31"
    pnl_prior = await _pnl_for(f"{end_year - 1}-01-01", prior_year_end)
    income_tax_paid_prior = await _get_income_tax_paid(db, prior_year_end)
    tax_payable_year_start = round(max(pnl_prior["income_tax"] - income_tax_paid_prior, 0), 2)
    tax_prepaid_year_start = round(max(income_tax_paid_prior - pnl_prior["income_tax"], 0), 2)

    # 现金流量表数据（公司现金口径）
    async def _cash_for(pstart: str, pend: str) -> dict:
        income_total = await _get_income_data(db, pstart, pend, cash_basis=True)
        interest = await _get_interest_income(db, pstart, pend, cash_basis=True)
        exp_raw = await _get_expense_by_category(db, pstart, pend, cash_basis=True, exclude_salary=True)
        return {
            "income": income_total - interest,
            "interest": interest,
            "expenses": _aggregate_expenses(exp_raw),
            "salary": await _get_salary_cash_paid(db, pstart, pend),
            "salary_tax": await _get_salary_tax_cash_paid(db, pstart, pend),
        }

    cash_period = await _cash_for(start_date, end_date)
    cash_ytd = await _cash_for(year_start, end_date)
    # 期初现金 = 各列期间起点前一日的时点快照
    opening_period = (await _get_snapshot(db, _shift_date(start_date, -1)))["cash"]
    opening_ytd = snapshot_year_start["cash"]

    period = {"start": start_date, "end": end_date}

    common_data = {
        "company": company,
        "period": period,
        "snapshot_end": snapshot_end,
        "snapshot_year_start": snapshot_year_start,
        "tax_payable": tax_payable,
        "tax_payable_year_start": tax_payable_year_start,
        "tax_prepaid": tax_prepaid,
        "tax_prepaid_year_start": tax_prepaid_year_start,
        "pnl_period": pnl_period,
        "pnl_ytd": pnl_ytd,
    }

    # 现金流量表专用数据（收付实现制）
    cash_flow_data = {
        "company": company,
        "period": period,
        "income_period": cash_period["income"],
        "interest_period": cash_period["interest"],
        "expenses_period": cash_period["expenses"],
        "salary_period": cash_period["salary"],
        "salary_tax_period": cash_period["salary_tax"],
        "opening_period": opening_period,
        "income_ytd": cash_ytd["income"],
        "interest_ytd": cash_ytd["interest"],
        "expenses_ytd": cash_ytd["expenses"],
        "salary_ytd": cash_ytd["salary"],
        "salary_tax_ytd": cash_ytd["salary_tax"],
        "opening_ytd": opening_ytd,
    }

    # 季度申报助手（企业所得税月季报预缴，与电子税务局"税费试算"页对应）
    taxable = round(max(pnl_ytd["profit_total"], 0), 2)
    statutory_tax = round(taxable * 0.25, 2)
    accrued_tax = round(pnl_ytd["income_tax"], 2)
    # 附报事项"职工薪酬"（本年累计）：计提 = 应发工资总额；实付 = 计提 − 期末应付职工薪酬
    end_month = int(end_date.split("-")[1])
    r = await db.execute(
        select(func.coalesce(func.sum(SalaryRecord.base_salary), 0.0)).where(
            and_(SalaryRecord.year == end_year, SalaryRecord.month <= end_month))
    )
    salary_accrued_ytd = round(float(r.scalar() or 0), 2)
    filing = {
        "profitYtd": round(pnl_ytd["profit_total"], 2),      # 利润总额本年累计
        "taxableIncome": taxable,                             # 应纳税所得额（无调整项时=利润总额）
        "statutoryTax": statutory_tax,                        # 法定税额（25%）
        "reliefAmount": round(statutory_tax - accrued_tax, 2),  # 减免所得税额（小微优惠）
        "accruedTax": accrued_tax,                            # 累计应纳所得税（实际税负）
        "prepaidTax": round(income_tax_paid, 2),              # 已预缴
        "currentDue": round(max(accrued_tax - income_tax_paid, 0), 2),   # 本期应补(退)
        "creditCarryover": round(max(income_tax_paid - accrued_tax, 0), 2),  # 多缴留抵（汇算可退）
        "assetsTotalWan": round((snapshot_end["cash"] + snapshot_end["receivables"]
                                 + tax_prepaid) / 10000, 2),  # 季末资产总额（万元）
        "isSmallMicro": taxable <= 3_000_000,                 # 小型微利资格（应纳税所得额口径）
        "salaryAccruedYtd": salary_accrued_ytd,               # 已计入成本费用的职工薪酬（累计计提）
        "salaryPaidYtd": round(salary_accrued_ytd - snapshot_end["unpaid_salary"], 2),  # 实际支付给职工（累计）
    }

    return {"common": common_data, "cash_flow": cash_flow_data, "filing": filing}


# ============================================================
# 主生成函数
# ============================================================
async def generate_tax_report(
    db: AsyncSession,
    report_type: str,  # "monthly" or "yearly"
    start_date: str,
    end_date: str,
) -> str:
    """
    生成报税用 XLS 报表文件，返回文件路径。

    Args:
        report_type: "monthly"(月季报) 或 "yearly"(年报)
        start_date: 所属期起 (YYYY-MM-DD)
        end_date: 所属期止 (YYYY-MM-DD)
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 选择模板
    template_path = MONTHLY_TEMPLATE if report_type == "monthly" else YEARLY_TEMPLATE
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"模板文件不存在: {template_path}")

    # 读取模板
    rb = xlrd.open_workbook(template_path, formatting_info=True)
    wb = xlcopy(rb)

    # 关键: 将模板的自定义调色板复制到输出工作簿
    # xlutils.copy 不会传递自定义调色板，导致颜色索引在默认调色板中映射错误
    for idx, rgb in rb.colour_map.items():
        if rgb is not None and 8 <= idx <= 63:
            wb.set_colour_RGB(idx, rgb[0], rgb[1], rgb[2])

    data = await build_report_data(db, start_date, end_date)
    common_data = data["common"]
    cash_flow_data = data["cash_flow"]

    # 填充 Sheet 1: 资产负债表
    ws0 = wb.get_sheet(0)
    _fill_balance_sheet(rb, ws0, common_data)

    # 填充 Sheet 2: 利润表（权责发生制）
    ws1 = wb.get_sheet(1)
    if report_type == "monthly":
        _fill_income_statement_monthly(rb, ws1, common_data)
    else:
        _fill_income_statement_yearly(rb, ws1, common_data)

    # 填充 Sheet 3: 现金流量表（收付实现制）
    ws2 = wb.get_sheet(2)
    if report_type == "monthly":
        _fill_cash_flow_monthly(rb, ws2, cash_flow_data)
    else:
        _fill_cash_flow_yearly(rb, ws2, cash_flow_data)

    # 保存文件
    type_label = "月季报" if report_type == "monthly" else "年报"
    filename = f"财务报表_{type_label}_{start_date}至{end_date}_{datetime.now().strftime('%Y%m%d%H%M%S')}.xls"
    output_path = os.path.join(OUTPUT_DIR, filename)
    wb.save(output_path)

    return output_path


async def list_generated_reports() -> list:
    """列出已生成的报表文件"""
    if not os.path.exists(OUTPUT_DIR):
        return []

    files = []
    for f in sorted(os.listdir(OUTPUT_DIR), reverse=True):
        if f.endswith(".xls"):
            path = os.path.join(OUTPUT_DIR, f)
            stat = os.stat(path)
            files.append({
                "filename": f,
                "size": stat.st_size,
                "createdAt": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            })
    return files


def delete_report(filename: str) -> bool:
    """删除已生成的报表文件（文件名限制在输出目录内，防路径穿越）"""
    if os.path.basename(filename) != filename or not filename.endswith(".xls"):
        return False
    path = os.path.realpath(os.path.join(OUTPUT_DIR, filename))
    if os.path.dirname(path) != os.path.realpath(OUTPUT_DIR):
        return False
    if os.path.exists(path):
        os.remove(path)
        return True
    return False
