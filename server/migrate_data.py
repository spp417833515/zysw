"""
数据库迁移脚本：Float → Numeric，添加索引，启用外键约束
用法：cd server && python migrate_data.py
"""
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path


DB_PATH = Path(__file__).parent / "data.db"
BACKUP_DIR = Path(__file__).parent / "backups"


def backup_db():
    BACKUP_DIR.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUP_DIR / f"data_{ts}.db"
    shutil.copy2(DB_PATH, backup_path)
    print(f"[OK] 备份到 {backup_path}")
    return backup_path


def migrate():
    if not DB_PATH.exists():
        print("[SKIP] data.db 不存在，跳过迁移")
        return

    backup_db()
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    # Enable foreign keys
    cur.execute("PRAGMA foreign_keys=ON")

    # Round all amount fields to 2 decimal places
    amount_fields = [
        ("transactions", "amount"),
        ("accounts", "balance"),
        ("accounts", "initial_balance"),
        ("invoices", "amount"),
        ("invoices", "tax_amount"),
        ("invoices", "total_amount"),
        ("budgets", "amount"),
        ("budgets", "spent"),
        ("reimbursement_batches", "total_amount"),
        ("reimbursement_batches", "actual_amount"),
        ("reimbursement_batches", "fee"),
        ("recurring_expenses", "amount"),
        ("employees", "base_salary"),
        ("employees", "special_deduction"),
        ("salary_records", "base_salary"),
        ("salary_records", "tax"),
        ("salary_records", "net_salary"),
        ("tax_settings", "vat_threshold_quarterly"),
    ]

    rate_fields = [
        ("employees", "social_insurance_rate"),
        ("employees", "housing_fund_rate"),
        ("budgets", "alert_threshold"),
        ("tax_settings", "vat_rate"),
        ("tax_settings", "additional_tax_rate"),
    ]

    for table, col in amount_fields:
        try:
            cur.execute(f"UPDATE {table} SET {col} = ROUND({col}, 2) WHERE {col} IS NOT NULL")
            print(f"  ROUND({table}.{col}, 2)")
        except sqlite3.OperationalError as e:
            print(f"  [SKIP] {table}.{col}: {e}")

    for table, col in rate_fields:
        try:
            cur.execute(f"UPDATE {table} SET {col} = ROUND({col}, 4) WHERE {col} IS NOT NULL")
            print(f"  ROUND({table}.{col}, 4)")
        except sqlite3.OperationalError as e:
            print(f"  [SKIP] {table}.{col}: {e}")

    # Fix category_id="" → NULL in transactions
    try:
        cur.execute("UPDATE transactions SET category_id = NULL WHERE category_id = ''")
        updated = cur.rowcount
        print(f"  transactions.category_id '' → NULL: {updated} rows")
    except sqlite3.OperationalError as e:
        print(f"  [SKIP] category_id fix: {e}")

    # Create indexes (IF NOT EXISTS)
    indexes = [
        "CREATE INDEX IF NOT EXISTS ix_transactions_date ON transactions(date)",
        "CREATE INDEX IF NOT EXISTS ix_transactions_type ON transactions(type)",
        "CREATE INDEX IF NOT EXISTS ix_transactions_account_id ON transactions(account_id)",
        "CREATE INDEX IF NOT EXISTS ix_transactions_category_id ON transactions(category_id)",
        "CREATE INDEX IF NOT EXISTS ix_transactions_contact_id ON transactions(contact_id)",
        "CREATE INDEX IF NOT EXISTS ix_transactions_payment_confirmed ON transactions(payment_confirmed)",
        "CREATE INDEX IF NOT EXISTS ix_transactions_tax_declared ON transactions(tax_declared)",
        "CREATE INDEX IF NOT EXISTS ix_transactions_invoice_pending ON transactions(invoice_needed, invoice_completed)",
        "CREATE INDEX IF NOT EXISTS ix_transactions_reimbursement_batch_id ON transactions(reimbursement_batch_id)",
        "CREATE INDEX IF NOT EXISTS ix_budgets_category_id ON budgets(category_id)",
        "CREATE INDEX IF NOT EXISTS ix_reimbursement_batches_status ON reimbursement_batches(status)",
        "CREATE INDEX IF NOT EXISTS ix_contacts_type ON contacts(type)",
        "CREATE INDEX IF NOT EXISTS ix_contacts_name ON contacts(name)",
    ]

    # Unique constraint on salary_records
    try:
        cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_salary_employee_year_month ON salary_records(employee_id, year, month)")
        print("  [OK] salary_records unique index created")
    except sqlite3.OperationalError as e:
        print(f"  [SKIP] salary unique index: {e}")

    for idx_sql in indexes:
        try:
            cur.execute(idx_sql)
            idx_name = idx_sql.split("IF NOT EXISTS ")[1].split(" ON")[0]
            print(f"  [OK] index {idx_name}")
        except sqlite3.OperationalError as e:
            print(f"  [SKIP] index: {e}")

    conn.commit()

    # Verify
    print("\n=== 验证 ===")
    cur.execute("SELECT name FROM sqlite_master WHERE type='index' ORDER BY name")
    print(f"索引数量: {len(cur.fetchall())}")

    for table, col in [("transactions", "amount"), ("accounts", "balance")]:
        try:
            cur.execute(f"SELECT typeof({col}), {col} FROM {table} LIMIT 3")
            rows = cur.fetchall()
            for typ, val in rows:
                print(f"  {table}.{col}: typeof={typ}, value={val}")
        except Exception:
            pass

    conn.close()
    print("\n[DONE] 迁移完成")


if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"\n[ERROR] 迁移失败: {e}", file=sys.stderr)
        sys.exit(1)
