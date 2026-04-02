import os
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.report import service
from app.report import tax_report
from app.response import success, error

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/profit-loss")
async def profit_loss(
    startDate: str = Query(...),
    endDate: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    data = await service.get_profit_loss(db, startDate, endDate)
    return success(data)


@router.get("/cash-flow")
async def cash_flow(
    startDate: str = Query(...),
    endDate: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    data = await service.get_cash_flow(db, startDate, endDate)
    return success(data)


@router.get("/category")
async def category_report(
    startDate: str = Query(...),
    endDate: str = Query(...),
    type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    data = await service.get_category_report(db, startDate, endDate, type)
    return success(data)


@router.get("/trend")
async def trend_report(
    startDate: str = Query(...),
    endDate: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    data = await service.get_trend_report(db, startDate, endDate)
    return success(data)


@router.get("/receivables")
async def receivables(db: AsyncSession = Depends(get_db)):
    data = await service.get_receivables(db)
    return success(data)


@router.get("/payables")
async def payables(db: AsyncSession = Depends(get_db)):
    data = await service.get_payables(db)
    return success(data)


@router.get("/aging")
async def aging(type: Optional[str] = "receivable", db: AsyncSession = Depends(get_db)):
    data = await service.get_aging_analysis(db, type or "receivable")
    return success(data)


@router.post("/tax-report/generate")
async def generate_tax_report(
    reportType: str = Query(..., description="monthly 或 yearly"),
    startDate: str = Query(..., description="所属期起 YYYY-MM-DD"),
    endDate: str = Query(..., description="所属期止 YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """生成报税用 XLS 财务报表"""
    try:
        output_path = await tax_report.generate_tax_report(db, reportType, startDate, endDate)
        filename = os.path.basename(output_path)
        return success({"filename": filename, "path": output_path})
    except FileNotFoundError as e:
        return error(str(e), code=404)
    except Exception as e:
        return error(f"生成报表失败: {str(e)}", code=500)


@router.get("/tax-report/download")
async def download_tax_report(filename: str = Query(...)):
    """下载已生成的报表文件"""
    from app.report.tax_report import OUTPUT_DIR
    path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(path):
        return error("文件不存在", code=404)
    return FileResponse(
        path,
        media_type="application/vnd.ms-excel",
        filename=filename,
    )


@router.get("/tax-report/list")
async def list_tax_reports():
    """列出已生成的报表文件"""
    reports = await tax_report.list_generated_reports()
    return success(reports)


@router.delete("/tax-report/{filename}")
async def delete_tax_report(filename: str):
    """删除已生成的报表文件"""
    if tax_report.delete_report(filename):
        return success(None, message="已删除")
    return error("文件不存在", code=404)
