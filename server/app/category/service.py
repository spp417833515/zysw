from datetime import datetime, timezone
from typing import Optional, Union, List, Dict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.budget.models import Budget
from app.category.models import Category
from app.category.schemas import CategoryCreate, CategoryUpdate
from app.transaction.models import Transaction


def _to_dict(cat: Category) -> dict:
    return {
        "id": cat.id,
        "name": cat.name,
        "type": cat.type,
        "icon": cat.icon,
        "color": cat.color,
        "parentId": cat.parent_id,
        "sort": cat.sort,
        "createdAt": cat.created_at,
    }


def _build_tree(items: List[dict]) -> List[dict]:
    by_id: Dict[str, dict] = {}
    roots: List[dict] = []
    for item in items:
        item["children"] = []
        by_id[item["id"]] = item
    for item in items:
        parent_id = item["parentId"]
        if parent_id and parent_id in by_id:
            by_id[parent_id]["children"].append(item)
        else:
            roots.append(item)
    return roots


async def get_categories(db: AsyncSession) -> List[dict]:
    result = await db.execute(select(Category).order_by(Category.sort, Category.created_at))
    items = [_to_dict(c) for c in result.scalars().all()]
    return _build_tree(items)


async def create_category(db: AsyncSession, data: CategoryCreate) -> dict:
    cat = Category(
        name=data.name,
        type=data.type,
        icon=data.icon,
        color=data.color,
        parent_id=data.parentId,
        sort=data.sort,
    )
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    result = _to_dict(cat)
    result["children"] = []
    return result


async def update_category(db: AsyncSession, category_id: str, data: CategoryUpdate) -> Optional[dict]:
    cat = await db.get(Category, category_id)
    if not cat:
        return None
    update_data = data.model_dump(exclude_unset=True)
    field_map = {"parentId": "parent_id"}
    for key, value in update_data.items():
        attr = field_map.get(key, key)
        setattr(cat, attr, value)
    await db.commit()
    await db.refresh(cat)
    result = _to_dict(cat)
    result["children"] = []
    return result


async def delete_category(db: AsyncSession, category_id: str) -> Union[bool, str]:
    cat = await db.get(Category, category_id)
    if not cat:
        return False
    # Check for child categories
    children = await db.execute(
        select(Category.id).where(Category.parent_id == category_id).limit(1)
    )
    if children.first():
        return "has_children"
    # Check for referencing transactions
    txn = await db.execute(
        select(Transaction.id).where(Transaction.category_id == category_id).limit(1)
    )
    if txn.first():
        return "in_use"
    # Check for referencing budgets
    bgt = await db.execute(
        select(Budget.id).where(Budget.category_id == category_id).limit(1)
    )
    if bgt.first():
        return "in_use"
    await db.delete(cat)
    await db.commit()
    return True
