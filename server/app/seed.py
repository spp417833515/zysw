"""Seed database with mock data matching the frontend."""
import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.account.models import Account
from app.budget.models import Budget
from app.category.models import Category
from app.invoice.models import Invoice
from app.transaction.models import Transaction


ACCOUNTS = [
    {"id": "acc_1", "name": "企业基本户", "type": "bank", "balance": 528600.5, "initial_balance": 500000, "icon": "BankOutlined", "color": "#1B65B9", "description": "工商银行企业基本账户", "is_default": True, "created_at": "2024-01-01T00:00:00Z", "updated_at": "2024-12-01T00:00:00Z"},
    {"id": "acc_2", "name": "企业支付宝", "type": "alipay", "balance": 45230.0, "initial_balance": 0, "icon": "AlipayCircleOutlined", "color": "#1677FF", "description": "企业支付宝账户", "is_default": False, "created_at": "2024-01-01T00:00:00Z", "updated_at": "2024-12-01T00:00:00Z"},
    {"id": "acc_3", "name": "现金", "type": "cash", "balance": 3200.0, "initial_balance": 5000, "icon": "MoneyCollectOutlined", "color": "#52C41A", "description": "日常现金备用金", "is_default": False, "created_at": "2024-01-01T00:00:00Z", "updated_at": "2024-12-01T00:00:00Z"},
    {"id": "acc_4", "name": "企业微信", "type": "wechat", "balance": 12800.0, "initial_balance": 0, "icon": "WechatOutlined", "color": "#07C160", "description": "企业微信支付账户", "is_default": False, "created_at": "2024-03-01T00:00:00Z", "updated_at": "2024-12-01T00:00:00Z"},
    {"id": "acc_5", "name": "企业信用卡", "type": "credit", "balance": -8500.0, "initial_balance": 0, "icon": "CreditCardOutlined", "color": "#F5222D", "description": "招商银行企业信用卡", "is_default": False, "created_at": "2024-02-01T00:00:00Z", "updated_at": "2024-12-01T00:00:00Z"},
]

CATEGORIES = [
    {"id": "cat_i1", "name": "主营业务收入", "type": "income", "icon": "ShopOutlined", "color": "#52C41A", "parent_id": None, "sort": 1, "created_at": "2024-01-01T00:00:00Z"},
    {"id": "cat_i1_1", "name": "产品销售", "type": "income", "icon": "ShoppingOutlined", "color": "#52C41A", "parent_id": "cat_i1", "sort": 1, "created_at": "2024-01-01T00:00:00Z"},
    {"id": "cat_i1_2", "name": "服务收入", "type": "income", "icon": "CustomerServiceOutlined", "color": "#52C41A", "parent_id": "cat_i1", "sort": 2, "created_at": "2024-01-01T00:00:00Z"},
    {"id": "cat_i2", "name": "其他收入", "type": "income", "icon": "PlusCircleOutlined", "color": "#73D13D", "parent_id": None, "sort": 2, "created_at": "2024-01-01T00:00:00Z"},
    {"id": "cat_i2_1", "name": "利息收入", "type": "income", "icon": "PercentageOutlined", "color": "#73D13D", "parent_id": "cat_i2", "sort": 1, "created_at": "2024-01-01T00:00:00Z"},
    {"id": "cat_i2_2", "name": "投资收益", "type": "income", "icon": "RiseOutlined", "color": "#73D13D", "parent_id": "cat_i2", "sort": 2, "created_at": "2024-01-01T00:00:00Z"},
    {"id": "cat_e1", "name": "人力成本", "type": "expense", "icon": "TeamOutlined", "color": "#F5222D", "parent_id": None, "sort": 1, "created_at": "2024-01-01T00:00:00Z"},
    {"id": "cat_e1_1", "name": "工资薪酬", "type": "expense", "icon": "UserOutlined", "color": "#F5222D", "parent_id": "cat_e1", "sort": 1, "created_at": "2024-01-01T00:00:00Z"},
    {"id": "cat_e1_2", "name": "社保公积金", "type": "expense", "icon": "SafetyOutlined", "color": "#F5222D", "parent_id": "cat_e1", "sort": 2, "created_at": "2024-01-01T00:00:00Z"},
    {"id": "cat_e2", "name": "办公费用", "type": "expense", "icon": "DesktopOutlined", "color": "#FA541C", "parent_id": None, "sort": 2, "created_at": "2024-01-01T00:00:00Z"},
    {"id": "cat_e2_1", "name": "房租水电", "type": "expense", "icon": "HomeOutlined", "color": "#FA541C", "parent_id": "cat_e2", "sort": 1, "created_at": "2024-01-01T00:00:00Z"},
    {"id": "cat_e2_2", "name": "办公用品", "type": "expense", "icon": "ToolOutlined", "color": "#FA541C", "parent_id": "cat_e2", "sort": 2, "created_at": "2024-01-01T00:00:00Z"},
    {"id": "cat_e3", "name": "营销费用", "type": "expense", "icon": "SoundOutlined", "color": "#FA8C16", "parent_id": None, "sort": 3, "created_at": "2024-01-01T00:00:00Z"},
    {"id": "cat_e3_1", "name": "广告推广", "type": "expense", "icon": "NotificationOutlined", "color": "#FA8C16", "parent_id": "cat_e3", "sort": 1, "created_at": "2024-01-01T00:00:00Z"},
    {"id": "cat_e3_2", "name": "业务招待", "type": "expense", "icon": "CoffeeOutlined", "color": "#FA8C16", "parent_id": "cat_e3", "sort": 2, "created_at": "2024-01-01T00:00:00Z"},
    {"id": "cat_e4", "name": "税费", "type": "expense", "icon": "AccountBookOutlined", "color": "#CF1322", "parent_id": None, "sort": 4, "created_at": "2024-01-01T00:00:00Z"},
    {"id": "cat_e5", "name": "采购成本", "type": "expense", "icon": "ShoppingCartOutlined", "color": "#EB2F96", "parent_id": None, "sort": 5, "created_at": "2024-01-01T00:00:00Z"},
]

TRANSACTIONS = [
    {"id": "tx_1", "type": "income", "amount": 58000, "date": "2024-12-01", "category_id": "cat_i1_1", "account_id": "acc_1", "to_account_id": None, "description": "向A公司销售产品一批", "tags": '["A公司","产品"]', "invoice_id": "inv_1", "book_id": "default", "payment_confirmed": True, "payment_account_type": "company", "payment_confirmed_at": "2024-12-01T12:00:00Z", "invoice_needed": True, "invoice_completed": True, "invoice_confirmed_at": "2024-12-01T14:00:00Z", "tax_declared": True, "tax_declared_at": "2024-12-15T10:00:00Z", "tax_period": "2024-12", "created_at": "2024-12-01T10:00:00Z", "updated_at": "2024-12-01T10:00:00Z"},
    {"id": "tx_2", "type": "expense", "amount": 35000, "date": "2024-12-02", "category_id": "cat_e1_1", "account_id": "acc_1", "to_account_id": None, "description": "12月员工工资发放", "tags": '["工资","12月"]', "invoice_id": None, "book_id": "default", "payment_confirmed": True, "payment_account_type": "company", "payment_confirmed_at": "2024-12-02T10:00:00Z", "invoice_needed": False, "invoice_completed": False, "invoice_confirmed_at": None, "tax_declared": True, "tax_declared_at": "2024-12-15T10:00:00Z", "tax_period": "2024-12", "created_at": "2024-12-02T09:00:00Z", "updated_at": "2024-12-02T09:00:00Z"},
    {"id": "tx_3", "type": "expense", "amount": 8500, "date": "2024-12-03", "category_id": "cat_e2_1", "account_id": "acc_1", "to_account_id": None, "description": "12月办公室租金", "tags": '["租金"]', "invoice_id": None, "book_id": "default", "payment_confirmed": True, "payment_account_type": "company", "payment_confirmed_at": "2024-12-03T09:00:00Z", "invoice_needed": True, "invoice_completed": True, "invoice_confirmed_at": "2024-12-04T10:00:00Z", "tax_declared": False, "tax_declared_at": None, "tax_period": None, "created_at": "2024-12-03T08:00:00Z", "updated_at": "2024-12-03T08:00:00Z"},
    {"id": "tx_4", "type": "income", "amount": 32000, "date": "2024-12-05", "category_id": "cat_i1_2", "account_id": "acc_2", "to_account_id": None, "description": "B公司技术咨询服务费", "tags": '["B公司","咨询"]', "invoice_id": "inv_3", "book_id": "default", "payment_confirmed": True, "payment_account_type": "personal", "payment_confirmed_at": "2024-12-05T15:00:00Z", "invoice_needed": True, "invoice_completed": True, "invoice_confirmed_at": "2024-12-05T16:00:00Z", "tax_declared": False, "tax_declared_at": None, "tax_period": None, "created_at": "2024-12-05T14:00:00Z", "updated_at": "2024-12-05T14:00:00Z"},
    {"id": "tx_5", "type": "expense", "amount": 12000, "date": "2024-12-06", "category_id": "cat_e5", "account_id": "acc_1", "to_account_id": None, "description": "采购原材料一批", "tags": '["采购","原材料"]', "invoice_id": "inv_2", "book_id": "default", "payment_confirmed": True, "payment_account_type": "company", "payment_confirmed_at": "2024-12-06T12:00:00Z", "invoice_needed": True, "invoice_completed": True, "invoice_confirmed_at": "2024-12-06T14:00:00Z", "tax_declared": True, "tax_declared_at": "2024-12-15T10:00:00Z", "tax_period": "2024-12", "created_at": "2024-12-06T11:00:00Z", "updated_at": "2024-12-06T11:00:00Z"},
    {"id": "tx_6", "type": "expense", "amount": 3500, "date": "2024-12-08", "category_id": "cat_e3_1", "account_id": "acc_2", "to_account_id": None, "description": "线上广告投放费用", "tags": '["广告"]', "invoice_id": None, "book_id": "default", "payment_confirmed": True, "payment_account_type": "personal", "payment_confirmed_at": "2024-12-08T17:00:00Z", "invoice_needed": True, "invoice_completed": False, "invoice_confirmed_at": None, "tax_declared": False, "tax_declared_at": None, "tax_period": None, "created_at": "2024-12-08T16:00:00Z", "updated_at": "2024-12-08T16:00:00Z"},
    {"id": "tx_7", "type": "transfer", "amount": 20000, "date": "2024-12-10", "category_id": "", "account_id": "acc_1", "to_account_id": "acc_2", "description": "基本户转支付宝备用", "tags": "[]", "invoice_id": None, "book_id": "default", "payment_confirmed": True, "payment_account_type": "company", "payment_confirmed_at": "2024-12-10T10:00:00Z", "invoice_needed": False, "invoice_completed": False, "invoice_confirmed_at": None, "tax_declared": False, "tax_declared_at": None, "tax_period": None, "created_at": "2024-12-10T09:30:00Z", "updated_at": "2024-12-10T09:30:00Z"},
    {"id": "tx_8", "type": "income", "amount": 15000, "date": "2024-12-12", "category_id": "cat_i1_1", "account_id": "acc_4", "to_account_id": None, "description": "C客户微信支付货款", "tags": '["C客户"]', "invoice_id": None, "book_id": "default", "payment_confirmed": True, "payment_account_type": "personal", "payment_confirmed_at": "2024-12-12T14:00:00Z", "invoice_needed": True, "invoice_completed": False, "invoice_confirmed_at": None, "tax_declared": False, "tax_declared_at": None, "tax_period": None, "created_at": "2024-12-12T13:00:00Z", "updated_at": "2024-12-12T13:00:00Z"},
    {"id": "tx_9", "type": "expense", "amount": 1200, "date": "2024-12-13", "category_id": "cat_e2_2", "account_id": "acc_3", "to_account_id": None, "description": "购买打印纸、墨盒等办公用品", "tags": '["办公用品"]', "invoice_id": None, "book_id": "default", "payment_confirmed": True, "payment_account_type": "personal", "payment_confirmed_at": "2024-12-13T11:00:00Z", "invoice_needed": False, "invoice_completed": False, "invoice_confirmed_at": None, "tax_declared": True, "tax_declared_at": "2024-12-15T10:00:00Z", "tax_period": "2024-12", "created_at": "2024-12-13T10:00:00Z", "updated_at": "2024-12-13T10:00:00Z"},
    {"id": "tx_10", "type": "expense", "amount": 2800, "date": "2024-12-15", "category_id": "cat_e3_2", "account_id": "acc_5", "to_account_id": None, "description": "客户商务宴请", "tags": '["招待","客户"]', "invoice_id": None, "book_id": "default", "payment_confirmed": False, "payment_account_type": None, "payment_confirmed_at": None, "invoice_needed": True, "invoice_completed": False, "invoice_confirmed_at": None, "tax_declared": False, "tax_declared_at": None, "tax_period": None, "created_at": "2024-12-15T19:00:00Z", "updated_at": "2024-12-15T19:00:00Z"},
    {"id": "tx_11", "type": "income", "amount": 88000, "date": "2024-12-18", "category_id": "cat_i1_1", "account_id": "acc_1", "to_account_id": None, "description": "D公司大额订单回款", "tags": '["D公司","大额"]', "invoice_id": None, "book_id": "default", "payment_confirmed": False, "payment_account_type": None, "payment_confirmed_at": None, "invoice_needed": True, "invoice_completed": False, "invoice_confirmed_at": None, "tax_declared": False, "tax_declared_at": None, "tax_period": None, "created_at": "2024-12-18T11:00:00Z", "updated_at": "2024-12-18T11:00:00Z"},
    {"id": "tx_12", "type": "expense", "amount": 6800, "date": "2024-12-20", "category_id": "cat_e1_2", "account_id": "acc_1", "to_account_id": None, "description": "12月社保公积金缴纳", "tags": '["社保","12月"]', "invoice_id": None, "book_id": "default", "payment_confirmed": True, "payment_account_type": "company", "payment_confirmed_at": "2024-12-20T10:00:00Z", "invoice_needed": False, "invoice_completed": False, "invoice_confirmed_at": None, "tax_declared": False, "tax_declared_at": None, "tax_period": None, "created_at": "2024-12-20T09:00:00Z", "updated_at": "2024-12-20T09:00:00Z"},
    {"id": "tx_13", "type": "expense", "amount": 4500, "date": "2024-12-22", "category_id": "cat_e4", "account_id": "acc_1", "to_account_id": None, "description": "增值税及附加税缴纳", "tags": '["税费"]', "invoice_id": None, "book_id": "default", "payment_confirmed": True, "payment_account_type": "company", "payment_confirmed_at": "2024-12-22T11:00:00Z", "invoice_needed": False, "invoice_completed": False, "invoice_confirmed_at": None, "tax_declared": True, "tax_declared_at": "2024-12-22T12:00:00Z", "tax_period": "2024-12", "created_at": "2024-12-22T10:00:00Z", "updated_at": "2024-12-22T10:00:00Z"},
    {"id": "tx_14", "type": "income", "amount": 500, "date": "2024-12-25", "category_id": "cat_i2_1", "account_id": "acc_1", "to_account_id": None, "description": "银行活期利息", "tags": '["利息"]', "invoice_id": None, "book_id": "default", "payment_confirmed": True, "payment_account_type": "company", "payment_confirmed_at": "2024-12-25T01:00:00Z", "invoice_needed": False, "invoice_completed": False, "invoice_confirmed_at": None, "tax_declared": False, "tax_declared_at": None, "tax_period": None, "created_at": "2024-12-25T00:00:00Z", "updated_at": "2024-12-25T00:00:00Z"},
    {"id": "tx_15", "type": "expense", "amount": 15000, "date": "2024-12-28", "category_id": "cat_e5", "account_id": "acc_1", "to_account_id": None, "description": "年末备货采购", "tags": '["采购","备货"]', "invoice_id": None, "book_id": "default", "payment_confirmed": False, "payment_account_type": None, "payment_confirmed_at": None, "invoice_needed": True, "invoice_completed": False, "invoice_confirmed_at": None, "tax_declared": False, "tax_declared_at": None, "tax_period": None, "created_at": "2024-12-28T14:00:00Z", "updated_at": "2024-12-28T14:00:00Z"},
]

INVOICES = [
    {"id": "inv_1", "code": "044001", "number": "12345678", "type": "normal", "direction": "out", "amount": 54716.98, "tax_amount": 3283.02, "total_amount": 58000, "issue_date": "2024-12-01", "buyer_name": "A公司", "buyer_tax_number": "91110000MA12345678", "seller_name": "本公司", "seller_tax_number": "91110000MA87654321", "items": json.dumps([{"name": "产品A", "quantity": 100, "unitPrice": 547.17, "amount": 54716.98, "taxRate": 0.06, "taxAmount": 3283.02}]), "transaction_id": "tx_1", "image_url": None, "status": "verified", "created_at": "2024-12-01T10:00:00Z", "updated_at": "2024-12-01T10:00:00Z"},
    {"id": "inv_2", "code": "044001", "number": "12345679", "type": "special", "direction": "in", "amount": 11320.75, "tax_amount": 679.25, "total_amount": 12000, "issue_date": "2024-12-06", "buyer_name": "本公司", "buyer_tax_number": "91110000MA87654321", "seller_name": "供应商E", "seller_tax_number": "91110000MA11111111", "items": json.dumps([{"name": "原材料B", "quantity": 200, "unitPrice": 56.6, "amount": 11320.75, "taxRate": 0.06, "taxAmount": 679.25}]), "transaction_id": "tx_5", "image_url": None, "status": "verified", "created_at": "2024-12-06T11:00:00Z", "updated_at": "2024-12-06T11:00:00Z"},
    {"id": "inv_3", "code": "044001", "number": "12345680", "type": "electronic", "direction": "out", "amount": 30188.68, "tax_amount": 1811.32, "total_amount": 32000, "issue_date": "2024-12-05", "buyer_name": "B公司", "buyer_tax_number": "91110000MA22222222", "seller_name": "本公司", "seller_tax_number": "91110000MA87654321", "items": json.dumps([{"name": "技术咨询服务", "quantity": 1, "unitPrice": 30188.68, "amount": 30188.68, "taxRate": 0.06, "taxAmount": 1811.32}]), "transaction_id": "tx_4", "image_url": None, "status": "verified", "created_at": "2024-12-05T14:00:00Z", "updated_at": "2024-12-05T14:00:00Z"},
]

BUDGETS = [
    {"id": "bgt_1", "name": "人力成本预算", "category_id": "cat_e1", "amount": 50000, "spent": 41800, "period": "monthly", "start_date": "2024-12-01", "end_date": "2024-12-31", "alert_threshold": 0.8, "created_at": "2024-12-01T00:00:00Z", "updated_at": "2024-12-20T00:00:00Z"},
    {"id": "bgt_2", "name": "办公费用预算", "category_id": "cat_e2", "amount": 15000, "spent": 9700, "period": "monthly", "start_date": "2024-12-01", "end_date": "2024-12-31", "alert_threshold": 0.8, "created_at": "2024-12-01T00:00:00Z", "updated_at": "2024-12-13T00:00:00Z"},
    {"id": "bgt_3", "name": "营销费用预算", "category_id": "cat_e3", "amount": 10000, "spent": 6300, "period": "monthly", "start_date": "2024-12-01", "end_date": "2024-12-31", "alert_threshold": 0.8, "created_at": "2024-12-01T00:00:00Z", "updated_at": "2024-12-15T00:00:00Z"},
    {"id": "bgt_4", "name": "采购成本预算", "category_id": "cat_e5", "amount": 30000, "spent": 27000, "period": "monthly", "start_date": "2024-12-01", "end_date": "2024-12-31", "alert_threshold": 0.8, "created_at": "2024-12-01T00:00:00Z", "updated_at": "2024-12-28T00:00:00Z"},
]


async def seed(db: AsyncSession) -> None:
    # Check if already seeded
    result = await db.execute(select(Account).limit(1))
    if result.scalars().first():
        return

    for data in ACCOUNTS:
        db.add(Account(**data))
    for data in CATEGORIES:
        db.add(Category(**data))
    for data in TRANSACTIONS:
        db.add(Transaction(**data))
    for data in INVOICES:
        db.add(Invoice(**data))
    for data in BUDGETS:
        db.add(Budget(**data))

    await db.commit()
    print("Database seeded successfully!")
