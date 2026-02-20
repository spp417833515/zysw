from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.response import error, success
from app.settings import service
from app.settings.schemas import CompanyInfoCreate, CompanyInfoUpdate, TaxSettingsCreate, TaxSettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/company")
async def get_company_info(db: AsyncSession = Depends(get_db)):
    """获取企业信息"""
    info = await service.get_company_info(db)
    if not info:
        # 返回默认值
        return success({
            "companyName": "",
            "taxNumber": "",
            "address": "",
            "phone": "",
            "bankName": "",
            "bankAccount": "",
        })
    return success(info)


@router.post("/company")
async def save_company_info(data: CompanyInfoCreate, db: AsyncSession = Depends(get_db)):
    """保存企业信息（创建或更新）"""
    info = await service.create_or_update_company_info(db, data)
    return success(info)


@router.put("/company")
async def update_company_info(data: CompanyInfoUpdate, db: AsyncSession = Depends(get_db)):
    """更新企业信息"""
    info = await service.update_company_info(db, data)
    if not info:
        return error("企业信息不存在", code=404)
    return success(info)


@router.get("/tax")
async def get_tax_settings(db: AsyncSession = Depends(get_db)):
    """获取税率设置"""
    settings = await service.get_tax_settings(db)
    if not settings:
        # 返回默认值（中国小规模纳税人标准税率）
        return success({
            "vatRate": 0.03,
            "vatThresholdQuarterly": 300000.0,
            "additionalTaxRate": 0.12,
            "incomeTaxEnabled": True,
            "province": "河南",
            "city": "",
            "taxpayerType": "small",
        })
    return success(settings)


@router.post("/tax")
async def save_tax_settings(data: TaxSettingsCreate, db: AsyncSession = Depends(get_db)):
    """保存税率设置（创建或更新）"""
    settings = await service.create_or_update_tax_settings(db, data)
    return success(settings)


@router.put("/tax")
async def update_tax_settings(data: TaxSettingsUpdate, db: AsyncSession = Depends(get_db)):
    """更新税率设置"""
    settings = await service.update_tax_settings(db, data)
    if not settings:
        return error("税率设置不存在", code=404)
    return success(settings)
