from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.settings.models import CompanyInfo, TaxSettings
from app.settings.schemas import CompanyInfoCreate, CompanyInfoUpdate, TaxSettingsCreate, TaxSettingsUpdate


def _to_dict(info: CompanyInfo) -> dict:
    return {
        "id": info.id,
        "companyName": info.company_name,
        "taxNumber": info.tax_number,
        "address": info.address,
        "phone": info.phone,
        "bankName": info.bank_name,
        "bankAccount": info.bank_account,
        "createdAt": info.created_at,
        "updatedAt": info.updated_at,
    }


def _tax_to_dict(settings: TaxSettings) -> dict:
    return {
        "id": settings.id,
        "vatRate": settings.vat_rate,
        "vatThresholdQuarterly": settings.vat_threshold_quarterly,
        "additionalTaxRate": settings.additional_tax_rate,
        "incomeTaxEnabled": settings.income_tax_enabled,
        "province": settings.province,
        "city": settings.city,
        "taxpayerType": settings.taxpayer_type,
        "createdAt": settings.created_at,
        "updatedAt": settings.updated_at,
    }


async def get_company_info(db: AsyncSession) -> Optional[dict]:
    """获取企业信息（只有一条记录）"""
    result = await db.execute(select(CompanyInfo).limit(1))
    info = result.scalar_one_or_none()
    return _to_dict(info) if info else None


async def create_or_update_company_info(db: AsyncSession, data: CompanyInfoCreate) -> dict:
    """创建或更新企业信息"""
    # 查找是否已存在
    result = await db.execute(select(CompanyInfo).limit(1))
    info = result.scalar_one_or_none()

    if info:
        # 更新现有记录
        info.company_name = data.companyName
        info.tax_number = data.taxNumber
        info.address = data.address or ""
        info.phone = data.phone or ""
        info.bank_name = data.bankName or ""
        info.bank_account = data.bankAccount or ""
        info.updated_at = datetime.now(timezone.utc).isoformat()
    else:
        # 创建新记录
        info = CompanyInfo(
            company_name=data.companyName,
            tax_number=data.taxNumber,
            address=data.address or "",
            phone=data.phone or "",
            bank_name=data.bankName or "",
            bank_account=data.bankAccount or "",
        )
        db.add(info)

    await db.commit()
    await db.refresh(info)
    return _to_dict(info)


async def update_company_info(db: AsyncSession, data: CompanyInfoUpdate) -> Optional[dict]:
    """更新企业信息"""
    result = await db.execute(select(CompanyInfo).limit(1))
    info = result.scalar_one_or_none()

    if not info:
        return None

    update_data = data.model_dump(exclude_unset=True)
    field_map = {
        "companyName": "company_name",
        "taxNumber": "tax_number",
        "bankName": "bank_name",
        "bankAccount": "bank_account",
    }

    for key, value in update_data.items():
        attr = field_map.get(key, key)
        setattr(info, attr, value)

    info.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(info)
    return _to_dict(info)


async def get_tax_settings(db: AsyncSession) -> Optional[dict]:
    """获取税率设置"""
    result = await db.execute(select(TaxSettings).limit(1))
    settings = result.scalar_one_or_none()
    return _tax_to_dict(settings) if settings else None


async def create_or_update_tax_settings(db: AsyncSession, data: TaxSettingsCreate) -> dict:
    """创建或更新税率设置"""
    result = await db.execute(select(TaxSettings).limit(1))
    settings = result.scalar_one_or_none()

    if settings:
        # 更新现有记录
        settings.vat_rate = data.vatRate
        settings.vat_threshold_quarterly = data.vatThresholdQuarterly
        settings.additional_tax_rate = data.additionalTaxRate
        settings.income_tax_enabled = data.incomeTaxEnabled
        settings.province = data.province
        settings.city = data.city or ""
        settings.taxpayer_type = data.taxpayerType
        settings.updated_at = datetime.now(timezone.utc).isoformat()
    else:
        # 创建新记录
        settings = TaxSettings(
            vat_rate=data.vatRate,
            vat_threshold_quarterly=data.vatThresholdQuarterly,
            additional_tax_rate=data.additionalTaxRate,
            income_tax_enabled=data.incomeTaxEnabled,
            province=data.province,
            city=data.city or "",
            taxpayer_type=data.taxpayerType,
        )
        db.add(settings)

    await db.commit()
    await db.refresh(settings)
    return _tax_to_dict(settings)


async def update_tax_settings(db: AsyncSession, data: TaxSettingsUpdate) -> Optional[dict]:
    """更新税率设置"""
    result = await db.execute(select(TaxSettings).limit(1))
    settings = result.scalar_one_or_none()

    if not settings:
        return None

    update_data = data.model_dump(exclude_unset=True)
    field_map = {
        "vatRate": "vat_rate",
        "vatThresholdQuarterly": "vat_threshold_quarterly",
        "additionalTaxRate": "additional_tax_rate",
        "incomeTaxEnabled": "income_tax_enabled",
        "taxpayerType": "taxpayer_type",
    }

    for key, value in update_data.items():
        attr = field_map.get(key, key)
        setattr(settings, attr, value)

    settings.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(settings)
    return _tax_to_dict(settings)
