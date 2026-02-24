from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.response import error, success
from app.contact import service
from app.contact.schemas import ContactCreate, ContactUpdate

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("")
async def list_contacts(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    keyword: Optional[str] = None,
    type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    result = await service.get_contacts(db, page=page, page_size=pageSize, keyword=keyword, type_filter=type)
    return success(result)


@router.get("/all")
async def all_contacts(type: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    data = await service.get_all_contacts(db, type_filter=type)
    return success(data)


@router.get("/{contact_id}")
async def get_contact(contact_id: str, db: AsyncSession = Depends(get_db)):
    c = await service.get_contact_by_id(db, contact_id)
    if not c:
        return error("Contact not found", code=404)
    return success(c)


@router.post("")
async def create_contact(data: ContactCreate, db: AsyncSession = Depends(get_db)):
    c = await service.create_contact(db, data)
    return success(c)


@router.put("/{contact_id}")
async def update_contact(contact_id: str, data: ContactUpdate, db: AsyncSession = Depends(get_db)):
    c = await service.update_contact(db, contact_id, data)
    if not c:
        return error("Contact not found", code=404)
    return success(c)


@router.delete("/{contact_id}")
async def delete_contact(contact_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await service.delete_contact(db, contact_id)
    if deleted == "in_use":
        return error("该客户/供应商有关联交易，无法删除", code=409)
    if not deleted:
        return error("Contact not found", code=404)
    return success(None)
