from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.contact.models import Contact
from app.contact.schemas import ContactCreate, ContactUpdate
from app.transaction.models import Transaction


def _to_dict(c: Contact) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "type": c.type,
        "contactPerson": c.contact_person,
        "phone": c.phone,
        "email": c.email,
        "taxNumber": c.tax_number,
        "address": c.address,
        "notes": c.notes,
        "createdAt": c.created_at,
        "updatedAt": c.updated_at,
    }


async def get_contacts(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    keyword: Optional[str] = None,
    type_filter: Optional[str] = None,
) -> dict:
    query = select(Contact)
    if keyword:
        query = query.where(
            or_(Contact.name.contains(keyword), Contact.contact_person.contains(keyword), Contact.phone.contains(keyword))
        )
    if type_filter:
        query = query.where(or_(Contact.type == type_filter, Contact.type == "both"))

    from sqlalchemy import func
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.order_by(Contact.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return {
        "data": [_to_dict(c) for c in result.scalars().all()],
        "total": total,
        "page": page,
        "pageSize": page_size,
    }


async def get_all_contacts(db: AsyncSession, type_filter: Optional[str] = None) -> List[dict]:
    query = select(Contact)
    if type_filter:
        query = query.where(or_(Contact.type == type_filter, Contact.type == "both"))
    query = query.order_by(Contact.name)
    result = await db.execute(query)
    return [_to_dict(c) for c in result.scalars().all()]


async def get_contact_by_id(db: AsyncSession, contact_id: str) -> Optional[dict]:
    contact = await db.get(Contact, contact_id)
    return _to_dict(contact) if contact else None


async def create_contact(db: AsyncSession, data: ContactCreate) -> dict:
    contact = Contact(
        name=data.name,
        type=data.type,
        contact_person=data.contactPerson,
        phone=data.phone,
        email=data.email,
        tax_number=data.taxNumber,
        address=data.address,
        notes=data.notes,
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return _to_dict(contact)


async def update_contact(db: AsyncSession, contact_id: str, data: ContactUpdate) -> Optional[dict]:
    contact = await db.get(Contact, contact_id)
    if not contact:
        return None
    update_data = data.model_dump(exclude_unset=True)
    field_map = {"contactPerson": "contact_person", "taxNumber": "tax_number"}
    for key, value in update_data.items():
        setattr(contact, field_map.get(key, key), value)
    contact.updated_at = datetime.now(timezone.utc).isoformat()
    await db.commit()
    await db.refresh(contact)
    return _to_dict(contact)


async def delete_contact(db: AsyncSession, contact_id: str):
    contact = await db.get(Contact, contact_id)
    if not contact:
        return False
    result = await db.execute(
        select(Transaction.id).where(Transaction.contact_id == contact_id).limit(1)
    )
    if result.first():
        return "in_use"
    await db.delete(contact)
    await db.commit()
    return True
