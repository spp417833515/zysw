from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.category import service
from app.category.schemas import CategoryCreate, CategoryUpdate
from app.deps import get_db
from app.response import error, success

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("")
async def list_categories(db: AsyncSession = Depends(get_db)):
    categories = await service.get_categories(db)
    return success(categories)


@router.post("")
async def create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db)):
    category = await service.create_category(db, data)
    return success(category)


@router.put("/{category_id}")
async def update_category(
    category_id: str, data: CategoryUpdate, db: AsyncSession = Depends(get_db)
):
    category = await service.update_category(db, category_id, data)
    if not category:
        return error("Category not found", code=404)
    return success(category)


@router.delete("/{category_id}")
async def delete_category(category_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await service.delete_category(db, category_id)
    if deleted == "has_children":
        return error("该分类下有子分类，请先删除子分类", code=409)
    if deleted == "in_use":
        return error("该分类下有关联数据，无法删除", code=409)
    if not deleted:
        return error("Category not found", code=404)
    return success(None)
