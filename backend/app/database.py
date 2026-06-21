from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# For SQLite, we need to ensure the URL has the correct driver and settings
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite://"):
    # Replace standard sqlite with async sqlite
    db_url = db_url.replace("sqlite://", "sqlite+aiosqlite://")

# Create async engine
# For SQLite, disable pool_pre_ping and check_same_thread configuration
connect_args = {}
if "sqlite" in db_url:
    connect_args["check_same_thread"] = False

engine = create_async_engine(
    db_url,
    echo=False,
    connect_args=connect_args if connect_args else {}
)

# Async sessionmaker
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for acquiring async database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
