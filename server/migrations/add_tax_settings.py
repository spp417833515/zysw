"""
添加税率设置表
"""
import asyncio
from sqlalchemy import text
from app.database import engine


async def upgrade():
    """创建税率设置表"""
    async with engine.begin() as conn:
        # 检查表是否存在
        result = await conn.execute(text(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='tax_settings'"
        ))
        exists = result.fetchone()

        if not exists:
            await conn.execute(text('''
                CREATE TABLE tax_settings (
                    id TEXT PRIMARY KEY,
                    vat_rate REAL NOT NULL DEFAULT 0.03,
                    vat_threshold_quarterly REAL NOT NULL DEFAULT 300000.0,
                    additional_tax_rate REAL NOT NULL DEFAULT 0.12,
                    income_tax_enabled INTEGER NOT NULL DEFAULT 1,
                    province TEXT NOT NULL DEFAULT '河南',
                    city TEXT DEFAULT '',
                    taxpayer_type TEXT NOT NULL DEFAULT 'small',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            '''))
            print("✓ 税率设置表创建成功")
        else:
            print("✓ 税率设置表已存在")


async def downgrade():
    """删除税率设置表"""
    async with engine.begin() as conn:
        await conn.execute(text("DROP TABLE IF EXISTS tax_settings"))
        print("✓ 税率设置表已删除")


if __name__ == "__main__":
    print("正在创建税率设置表...")
    asyncio.run(upgrade())
