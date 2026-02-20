from typing import Any, Generic, TypeVar, List

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    code: int = 0
    message: str = "success"
    data: T


class PaginatedData(BaseModel, Generic[T]):
    data: List[T]
    total: int
    page: int
    pageSize: int


def success(data: Any = None, message: str = "success") -> dict:
    return {"code": 0, "message": message, "data": data}


def error(message: str = "error", code: int = 1) -> dict:
    return {"code": code, "message": message, "data": None}
