"""
税务报表生成服务 - 基于 XLS 模板生成报税用财务报表
支持：资产负债表、利润表、现金流量表（月季报 / 年报）
"""
import os
import copy
from datetime import datetime
from typing import Optional

import xlrd
import xlwt
from xlutils.copy import copy as xlcopy

from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.account.models import Account
from app.category.models import Category
from app.transaction.models import Transaction
from app.employee.models import SalaryRecord
from app.settings.models import CompanyInfo, TaxSettings
from app.invoice.models import Invoice

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
    "管理费用": ["管理", "办公", "房租", "水电", "物业", "维修", "折旧", "培训", "差旅", "通讯", "社保", "公积金"],
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
    """将费用分类名称映射到报表行项"""
    for report_item, keywords in CATEGORY_MAPPING.items():
        if _match_category(cat_name, keywords):
            return report_item
    return "管理费用"  # 默认归入管理费用


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


async def _get_account_balances(db: AsyncSession) -> dict:
    """获取账户余额汇总"""
    result = await db.execute(select(func.coalesce(func.sum(Account.balance), 0.0)))
    total_balance = float(result.scalar() or 0)

    result2 = await db.execute(select(func.coalesce(func.sum(Account.initial_balance), 0.0)))
    initial_balance = float(result2.scalar() or 0)

    return {"current": total_balance, "initial": initial_balance}


async def _get_receivables_total(db: AsyncSession) -> float:
    """获取应收账款总额（未到账收入）"""
    result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0.0))
        .where(and_(Transaction.type == "income", Transaction.payment_confirmed == False))
    )
    return float(result.scalar() or 0)


async def _get_payables_total(db: AsyncSession) -> float:
    """获取应付账款总额（未付支出，排除工资类交易——那些归入应付职工薪酬）"""
    # 查出工资类分类ID
    salary_cat_ids = await db.execute(
        select(Category.id).where(Category.name.like("%工资%"))
    )
    cat_ids = [r[0] for r in salary_cat_ids.all()]

    conditions = [Transaction.type == "expense", Transaction.payment_confirmed == False]
    if cat_ids:
        conditions.append(Transaction.category_id.not_in(cat_ids))

    result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0.0))
        .where(and_(*conditions))
    )
    return float(result.scalar() or 0)


async def _get_unpaid_salary(db: AsyncSession, year: int, month: int) -> float:
    """获取截至指定年月的应付职工薪酬总额（累计），包含：
    1. 完全未发放的工资（transaction_id IS NULL）
    2. 已发放但少付的差额（net_salary - 实际交易金额）
    3. 员工垫付待报销的款项（payment_confirmed=False 的工资类支出交易）
    """
    date_filter = (SalaryRecord.year * 100 + SalaryRecord.month <= year * 100 + month)

    # 1. 完全未发放的工资（累计所有截至报告期的）
    r1 = await db.execute(
        select(func.coalesce(func.sum(SalaryRecord.net_salary), 0.0))
        .where(and_(date_filter, SalaryRecord.transaction_id == None))
    )
    fully_unpaid = float(r1.scalar() or 0)

    # 2. 已发放但少付的差额（累计）
    r2 = await db.execute(
        select(
            func.coalesce(func.sum(SalaryRecord.net_salary), 0.0),
            func.coalesce(func.sum(Transaction.amount), 0.0),
        )
        .select_from(SalaryRecord)
        .join(Transaction, SalaryRecord.transaction_id == Transaction.id)
        .where(and_(date_filter, SalaryRecord.transaction_id != None))
    )
    row = r2.one()
    underpaid = max(float(row[0]) - float(row[1]), 0)

    # 3. 员工垫付待报销款项（未付款的工资类交易，排除工资发放关联的）
    salary_cat_ids = await db.execute(
        select(Category.id).where(Category.name.like("%工资%"))
    )
    cat_ids = [r[0] for r in salary_cat_ids.all()]

    employee_reimbursement = 0.0
    if cat_ids:
        r3 = await db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0.0))
            .where(and_(
                Transaction.type == "expense",
                Transaction.payment_confirmed == False,
                Transaction.category_id.in_(cat_ids),
                Transaction.id.not_in(
                    select(SalaryRecord.transaction_id).where(SalaryRecord.transaction_id != None)
                ),
            ))
        )
        employee_reimbursement = float(r3.scalar() or 0)

    return fully_unpaid + underpaid + employee_reimbursement


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


async def _get_expense_by_category(db: AsyncSession, start_date: str, end_date: str,
                                    cash_basis: bool = False,
                                    exclude_salary: bool = False) -> list:
    """获取期间内按分类汇总的支出。
    cash_basis=True 时只统计已付款的（payment_confirmed=True）
    exclude_salary=True 时排除已关联工资记录的交易（避免与 salary_records 重复计算）
    """
    conditions = [
        Transaction.type == "expense",
        Transaction.date >= start_date,
        Transaction.date <= end_date,
    ]
    if cash_basis:
        conditions.append(Transaction.payment_confirmed == True)
    if exclude_salary:
        # 排除已被 salary_records 关联的交易（避免与职工薪酬行项重复计算）
        conditions.append(Transaction.id.not_in(
            select(SalaryRecord.transaction_id).where(SalaryRecord.transaction_id != None)
        ))
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


async def _get_salary_expense(db: AsyncSession, start_date: str, end_date: str, cash_basis: bool = False) -> float:
    """获取期间内工资支出。cash_basis=True 时只统计已发放的（有 transaction_id）"""
    # 从 salary_records 中获取
    start_parts = start_date.split("-")
    end_parts = end_date.split("-")
    start_year, start_month = int(start_parts[0]), int(start_parts[1])
    end_year, end_month = int(end_parts[0]), int(end_parts[1])

    conditions = []
    if start_year == end_year:
        conditions.append(and_(SalaryRecord.year == start_year,
                               SalaryRecord.month >= start_month,
                               SalaryRecord.month <= end_month))
    else:
        conditions.append(
            and_(SalaryRecord.year >= start_year, SalaryRecord.year <= end_year)
        )

    if cash_basis:
        conditions.append(SalaryRecord.transaction_id != None)

    result = await db.execute(
        select(func.coalesce(func.sum(SalaryRecord.net_salary), 0.0))
        .where(and_(*conditions))
    )
    return float(result.scalar() or 0)


async def _get_salary_cash_paid(db: AsyncSession, start_date: str, end_date: str) -> float:
    """获取期间内实际从账户支付的工资金额（从关联交易中取，确保与账户余额一致）"""
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
    return float(result.scalar() or 0)


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
        ))
    )
    return float(result.scalar() or 0)


async def _get_salary_tax(db: AsyncSession, start_date: str, end_date: str, cash_basis: bool = False) -> float:
    """获取期间内工资个税。cash_basis=True 时只统计已发放工资对应的个税"""
    start_parts = start_date.split("-")
    end_parts = end_date.split("-")
    start_year, start_month = int(start_parts[0]), int(start_parts[1])
    end_year, end_month = int(end_parts[0]), int(end_parts[1])

    conditions = []
    if start_year == end_year:
        conditions.append(and_(SalaryRecord.year == start_year,
                               SalaryRecord.month >= start_month,
                               SalaryRecord.month <= end_month))
    else:
        conditions.append(
            and_(SalaryRecord.year >= start_year, SalaryRecord.year <= end_year)
        )

    if cash_basis:
        conditions.append(SalaryRecord.transaction_id != None)

    result = await db.execute(
        select(func.coalesce(func.sum(SalaryRecord.tax), 0.0))
        .where(and_(*conditions))
    )
    return float(result.scalar() or 0)


async def _get_ytd_income(db: AsyncSession, year: int, end_date: str) -> float:
    """获取年初至今的营业收入"""
    return await _get_income_data(db, f"{year}-01-01", end_date)


async def _get_ytd_expenses(db: AsyncSession, year: int, end_date: str) -> list:
    """获取年初至今的支出"""
    return await _get_expense_by_category(db, f"{year}-01-01", end_date)


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
    """填充资产负债表（Sheet 0）"""
    SI = 0  # sheet index
    company = data["company"]
    period = data["period"]
    balances = data["balances"]
    receivables = data["receivables"]
    payables = data["payables"]
    unpaid_salary = data["unpaid_salary"]

    # 头部信息 - 写入合并单元格的值区域，不覆盖标签
    # 资产负债表: 纳税人识别号标签在[2,1], 值写入[2,3]; 纳税人名称标签在[2,5], 值写入[2,7]
    _write_cell(rb, ws, SI, 2, 3, company["tax_number"])
    _write_cell(rb, ws, SI, 2, 7, company["company_name"])
    _write_cell(rb, ws, SI, 3, 3, period["start"])
    _write_cell(rb, ws, SI, 3, 7, period["end"])

    # 资产方（左半部分，期末余额=col3, 年初余额=col4）
    # 货币资金(行次1, R6)
    _write_cell(rb, ws, SI, 6, 3, round(balances["current"], 2))
    _write_cell(rb, ws, SI, 6, 4, round(balances["initial"], 2))

    # 应收账款(行次4, R9)
    _write_cell(rb, ws, SI, 9, 3, round(receivables, 2))

    # 流动资产合计(行次15, R20)
    current_assets = balances["current"] + receivables
    initial_assets = balances["initial"]
    _write_cell(rb, ws, SI, 20, 3, round(current_assets, 2))
    _write_cell(rb, ws, SI, 20, 4, round(initial_assets, 2))

    # 非流动资产合计(行次29, R35) = 0
    # 资产合计(行次30, R36)
    total_assets = current_assets
    _write_cell(rb, ws, SI, 36, 3, round(total_assets, 2))
    _write_cell(rb, ws, SI, 36, 4, round(initial_assets, 2))

    # 负债方（右半部分，期末余额=col7, 年初余额=col8）
    # 应付账款(行次33, R8)
    _write_cell(rb, ws, SI, 8, 7, round(payables, 2))

    # 应付职工薪酬(行次35, R10)
    _write_cell(rb, ws, SI, 10, 7, round(unpaid_salary, 2))

    # 流动负债合计(行次41, R16)
    current_liabilities = payables + unpaid_salary
    _write_cell(rb, ws, SI, 16, 7, round(current_liabilities, 2))

    # 负债合计(行次47, R23)
    _write_cell(rb, ws, SI, 23, 7, round(current_liabilities, 2))

    # 所有者权益
    # 未分配利润(行次51, R34) = 资产 - 负债
    retained_earnings = total_assets - current_liabilities
    _write_cell(rb, ws, SI, 34, 7, round(retained_earnings, 2))

    # 所有者权益合计(行次52, R35)
    _write_cell(rb, ws, SI, 35, 7, round(retained_earnings, 2))

    # 负债和所有者权益总计(行次53, R36)
    _write_cell(rb, ws, SI, 36, 7, round(total_assets, 2))


def _fill_income_statement_monthly(rb, ws, data: dict):
    """填充利润表（月季报 Sheet 1: 本期金额=col3, 本年累计金额=col4）"""
    SI = 1  # sheet index
    company = data["company"]
    period = data["period"]
    income_period = data["income_period"]
    income_ytd = data["income_ytd"]
    exp_period = data["expenses_period"]
    exp_ytd = data["expenses_ytd"]

    # 头部 - 利润表: 纳税人识别号标签在[2,1], 值写入[2,3]; 纳税人名称标签在[2,4], 值写入[2,5]
    _write_cell(rb, ws, SI, 2, 3, company["tax_number"])
    _write_cell(rb, ws, SI, 2, 5, company["company_name"])
    _write_cell(rb, ws, SI, 3, 3, period["start"])
    _write_cell(rb, ws, SI, 3, 5, period["end"])

    # 本期金额列 col=3, 本年累计 col=4
    _fill_income_cols(rb, ws, SI, 3, income_period, exp_period)
    _fill_income_cols(rb, ws, SI, 4, income_ytd, exp_ytd)


def _fill_income_statement_yearly(rb, ws, data: dict):
    """填充利润表（年报 Sheet 1: 本年累计金额=col3, 上年金额=col4）"""
    SI = 1  # sheet index
    company = data["company"]
    period = data["period"]
    income_ytd = data["income_ytd"]
    exp_ytd = data["expenses_ytd"]

    # 头部
    _write_cell(rb, ws, SI, 2, 3, company["tax_number"])
    _write_cell(rb, ws, SI, 2, 5, company["company_name"])
    _write_cell(rb, ws, SI, 3, 3, period["start"])
    _write_cell(rb, ws, SI, 3, 5, period["end"])

    # 本年累计 col=3（上年金额 col=4 暂不填）
    _fill_income_cols(rb, ws, SI, 3, income_ytd, exp_ytd)


def _fill_income_cols(rb, ws, si: int, col: int, income: float, exp_agg: dict):
    """填充利润表某一列"""
    # 一、营业收入(行次1, R5)
    _write_cell(rb, ws, si, 5, col, round(income, 2))

    # 减：营业成本(行次2, R6)
    cost = exp_agg.get("营业成本", 0.0)
    _write_cell(rb, ws, si, 6, col, round(cost, 2))

    # 税金及附加(行次3, R7)
    tax_add = exp_agg.get("税金及附加", 0.0)
    _write_cell(rb, ws, si, 7, col, round(tax_add, 2))

    # 税金子项 (R8-R14)
    tax_subs = exp_agg.get("tax_subs", {})
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
    sales = exp_agg.get("销售费用", 0.0)
    _write_cell(rb, ws, si, 15, col, round(sales, 2))

    # 销售子项
    sales_subs = exp_agg.get("sales_subs", {})
    _write_cell(rb, ws, si, 16, col, round(sales_subs.get("商品维修费", 0.0), 2))  # R16
    _write_cell(rb, ws, si, 17, col, round(sales_subs.get("广告费和业务宣传费", 0.0), 2))  # R17

    # 管理费用(行次14, R18)
    admin = exp_agg.get("管理费用", 0.0)
    _write_cell(rb, ws, si, 18, col, round(admin, 2))

    # 管理子项
    admin_subs = exp_agg.get("admin_subs", {})
    _write_cell(rb, ws, si, 19, col, round(admin_subs.get("开办费", 0.0), 2))  # R19
    _write_cell(rb, ws, si, 20, col, round(admin_subs.get("业务招待费", 0.0), 2))  # R20
    _write_cell(rb, ws, si, 21, col, round(admin_subs.get("研究费用", 0.0), 2))  # R21

    # 财务费用(行次18, R22)
    finance = exp_agg.get("财务费用", 0.0)
    _write_cell(rb, ws, si, 22, col, round(finance, 2))
    # 利息费用(行次19, R23) - 全归入利息
    _write_cell(rb, ws, si, 23, col, round(finance, 2))

    # 二、营业利润(行次21, R25)
    operating_profit = income - cost - tax_add - sales - admin - finance
    _write_cell(rb, ws, si, 25, col, round(operating_profit, 2))

    # 营业外支出(行次24, R28)
    non_op_expense = exp_agg.get("营业外支出", 0.0)
    _write_cell(rb, ws, si, 28, col, round(non_op_expense, 2))

    # 三、利润总额(行次30, R34)
    profit_total = operating_profit - non_op_expense
    _write_cell(rb, ws, si, 34, col, round(profit_total, 2))

    # 所得税费用(行次31, R35) - 简化处理
    income_tax = max(profit_total * 0.05, 0) if profit_total > 0 else 0  # 小微企业5%
    _write_cell(rb, ws, si, 35, col, round(income_tax, 2))

    # 四、净利润(行次32, R36)
    net_profit = profit_total - income_tax
    _write_cell(rb, ws, si, 36, col, round(net_profit, 2))


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
    """填充现金流量表某一列"""
    suffix = "_period" if mode == "period" else "_ytd"
    income = data.get(f"income{suffix}", 0.0)
    exp = data.get(f"expenses{suffix}", {})
    salary = data.get(f"salary{suffix}", 0.0)
    salary_tax = data.get(f"salary_tax{suffix}", 0.0)

    cost = exp.get("营业成本", 0.0)
    tax_total = exp.get("税金及附加", 0.0)
    other_expense = exp.get("销售费用", 0.0) + exp.get("管理费用", 0.0) + exp.get("财务费用", 0.0) + exp.get("营业外支出", 0.0)

    # 一、经营活动
    # 销售收到的现金(行次1, R6)
    _write_cell(rb, ws, si, 6, col, round(income, 2))
    # 购买支付的现金(行次3, R8)
    _write_cell(rb, ws, si, 8, col, round(cost, 2))
    # 支付的职工薪酬(行次4, R9)
    _write_cell(rb, ws, si, 9, col, round(salary, 2))
    # 支付的税费(行次5, R10)
    _write_cell(rb, ws, si, 10, col, round(tax_total + salary_tax, 2))
    # 支付其他与经营活动有关的现金(行次6, R11)
    _write_cell(rb, ws, si, 11, col, round(other_expense, 2))
    # 经营活动产生的现金流量净额(行次7, R12)
    net_operating = income - cost - salary - tax_total - salary_tax - other_expense
    _write_cell(rb, ws, si, 12, col, round(net_operating, 2))

    # 四、现金净增加额(行次20, R27)
    _write_cell(rb, ws, si, 27, col, round(net_operating, 2))

    # 期初现金余额(行次21, R28)
    initial = data.get("balances", {}).get("initial", 0.0)
    _write_cell(rb, ws, si, 28, col, round(initial, 2))

    # 五、期末现金余额(行次22, R29)
    _write_cell(rb, ws, si, 29, col, round(initial + net_operating, 2))


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

    # 获取数据
    company = await _get_company_info(db)
    balances = await _get_account_balances(db)
    receivables = await _get_receivables_total(db)
    payables = await _get_payables_total(db)

    end_parts = end_date.split("-")
    end_year = int(end_parts[0])
    end_month = int(end_parts[1])
    unpaid_salary = await _get_unpaid_salary(db, end_year, end_month)

    # 本期数据（权责发生制 - 用于利润表）
    income_period = await _get_income_data(db, start_date, end_date)
    expenses_period_raw = await _get_expense_by_category(db, start_date, end_date)
    expenses_period = _aggregate_expenses(expenses_period_raw)
    salary_period = await _get_salary_expense(db, start_date, end_date)
    salary_tax_period = await _get_salary_tax(db, start_date, end_date)

    # 本年累计数据（权责发生制 - 用于利润表）
    income_ytd = await _get_ytd_income(db, end_year, end_date)
    expenses_ytd_raw = await _get_ytd_expenses(db, end_year, end_date)
    expenses_ytd = _aggregate_expenses(expenses_ytd_raw)
    salary_ytd = await _get_salary_expense(db, f"{end_year}-01-01", end_date)
    salary_tax_ytd = await _get_salary_tax(db, f"{end_year}-01-01", end_date)

    # 本期数据（收付实现制 - 用于现金流量表，只统计已收/已付的）
    cash_income_period = await _get_income_data(db, start_date, end_date, cash_basis=True)
    cash_expenses_period_raw = await _get_expense_by_category(db, start_date, end_date, cash_basis=True, exclude_salary=True)
    cash_expenses_period = _aggregate_expenses(cash_expenses_period_raw)
    cash_salary_period = await _get_salary_cash_paid(db, start_date, end_date)
    cash_salary_tax_period = await _get_salary_tax_cash_paid(db, start_date, end_date)

    # 本年累计数据（收付实现制 - 用于现金流量表）
    cash_income_ytd = await _get_income_data(db, f"{end_year}-01-01", end_date, cash_basis=True)
    cash_expenses_ytd_raw = await _get_expense_by_category(db, f"{end_year}-01-01", end_date, cash_basis=True, exclude_salary=True)
    cash_expenses_ytd = _aggregate_expenses(cash_expenses_ytd_raw)
    cash_salary_ytd = await _get_salary_cash_paid(db, f"{end_year}-01-01", end_date)
    cash_salary_tax_ytd = await _get_salary_tax_cash_paid(db, f"{end_year}-01-01", end_date)

    period = {"start": start_date, "end": end_date}

    common_data = {
        "company": company,
        "period": period,
        "balances": balances,
        "receivables": receivables,
        "payables": payables,
        "unpaid_salary": unpaid_salary,
        "income_period": income_period,
        "expenses_period": expenses_period,
        "income_ytd": income_ytd,
        "expenses_ytd": expenses_ytd,
        "salary_period": salary_period,
        "salary_ytd": salary_ytd,
        "salary_tax_period": salary_tax_period,
        "salary_tax_ytd": salary_tax_ytd,
    }

    # 现金流量表专用数据（收付实现制）
    cash_flow_data = {
        "company": company,
        "period": period,
        "balances": balances,
        "income_period": cash_income_period,
        "expenses_period": cash_expenses_period,
        "income_ytd": cash_income_ytd,
        "expenses_ytd": cash_expenses_ytd,
        "salary_period": cash_salary_period,
        "salary_ytd": cash_salary_ytd,
        "salary_tax_period": cash_salary_tax_period,
        "salary_tax_ytd": cash_salary_tax_ytd,
    }

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
    """删除已生成的报表文件"""
    path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(path) and path.endswith(".xls"):
        os.remove(path)
        return True
    return False
