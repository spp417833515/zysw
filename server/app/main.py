from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import UPLOAD_DIR
from app.database import Base, async_session, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Seed data
    from app.seed import seed
    async with async_session() as db:
        await seed(db)
    yield


app = FastAPI(title="小微企业财务记账系统", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import models so Base.metadata knows about them
from app.account import models as _account_models  # noqa: F401, E402
from app.category import models as _category_models  # noqa: F401, E402
from app.transaction import models as _transaction_models  # noqa: F401, E402
from app.invoice import models as _invoice_models  # noqa: F401, E402
from app.budget import models as _budget_models  # noqa: F401, E402
from app.recurring_expense import models as _recurring_expense_models  # noqa: F401, E402

# Register routers
from app.account.router import router as account_router  # noqa: E402
from app.category.router import router as category_router  # noqa: E402
from app.transaction.router import router as transaction_router  # noqa: E402
from app.invoice.router import router as invoice_router  # noqa: E402
from app.budget.router import router as budget_router  # noqa: E402
from app.report.router import router as report_router  # noqa: E402
from app.recurring_expense.router import router as recurring_expense_router  # noqa: E402
from app.upload.router import router as upload_router  # noqa: E402

app.include_router(account_router)
app.include_router(category_router)
app.include_router(transaction_router)
app.include_router(invoice_router)
app.include_router(budget_router)
app.include_router(report_router)
app.include_router(recurring_expense_router)
app.include_router(upload_router)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


if __name__ == "__main__":
    import uvicorn
    from app.config import settings

    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
