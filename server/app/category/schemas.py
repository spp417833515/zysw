from pydantic import BaseModel


class CategoryCreate(BaseModel):
    name: str
    type: str
    icon: str = ""
    color: str = ""
    parentId: str | None = None
    sort: int = 0


class CategoryUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    icon: str | None = None
    color: str | None = None
    parentId: str | None = None
    sort: int | None = None


class CategoryOut(BaseModel):
    id: str
    name: str
    type: str
    icon: str
    color: str
    parentId: str | None
    sort: int
    createdAt: str
    children: list["CategoryOut"] = []
