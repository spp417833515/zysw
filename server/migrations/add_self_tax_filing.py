"""
为 employees 表添加 self_tax_filing 列（员工自行缴税标志）。
"""
import asyncio
from sqlalchemy import text
from app.database import engine


async def upgrade():
    async with engine.begin() as conn:
        cols = await conn.execute(text("PRAGMA table_info(employees)"))
        names = {row[1] for row in cols.fetchall()}
        if "self_tax_filing" in names:
            print("✓ self_tax_filing 列已存在")
            return
        await conn.execute(text(
            "ALTER TABLE employees ADD COLUMN self_tax_filing INTEGER NOT NULL DEFAULT 0"
        ))
        print("✓ employees.self_tax_filing 列添加成功")


async def downgrade():
    print("⚠ SQLite 不支持 DROP COLUMN，请手动重建表")


if __name__ == "__main__":
    asyncio.run(upgrade())
