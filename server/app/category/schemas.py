from typing import Optional, List
from pydantic import BaseModel


class CategoryCreate(BaseModel):
    name: str
    type: str
    icon: str = ""
    color: str = ""
    parentId: Optional[str] = None
    sort: int = 0


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    parentId: Optional[str] = None
    sort: Optional[int] = None


class CategoryOut(BaseModel):
    id: str
    name: str
    type: str
    icon: str
    color: str
    parentId: Optional[str]
    sort: int
    createdAt: str
    children: List["CategoryOut"] = []
