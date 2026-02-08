from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.account import service
from app.account.schemas import AccountCreate, AccountUpdate
from app.deps import get_db
from app.response import error, success

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("")
async def list_accounts(db: AsyncSession = Depends(get_db)):
    accounts = await service.get_accounts(db)
    return success(accounts)


@router.get("/{account_id}")
async def get_account(account_id: str, db: AsyncSession = Depends(get_db)):
    account = await service.get_account_by_id(db, account_id)
    if not account:
        return error("Account not found", code=404)
    return success(account)


@router.post("")
async def create_account(data: AccountCreate, db: AsyncSession = Depends(get_db)):
    account = await service.create_account(db, data)
    return success(account)


@router.put("/{account_id}")
async def update_account(account_id: str, data: AccountUpdate, db: AsyncSession = Depends(get_db)):
    account = await service.update_account(db, account_id, data)
    if not account:
        return error("Account not found", code=404)
    return success(account)


@router.delete("/{account_id}")
async def delete_account(account_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await service.delete_account(db, account_id)
    if deleted == "in_use":
        return error("该账户下有交易记录，无法删除", code=409)
    if not deleted:
        return error("Account not found", code=404)
    return success(None)
