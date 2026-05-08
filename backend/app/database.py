"""
家味 · Family Chef - 数据库连接
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


# 创建异步引擎
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False},  # SQLite 需要
)

# 配置 SQLite WAL 模式（提升并发性能）
async def setup_wal_mode():
    """启用 SQLite WAL 模式"""
    async with engine.connect() as conn:
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.commit()


# 创建异步会话工厂
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """SQLAlchemy 基类"""
    pass


async def get_db():
    """数据库依赖注入"""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """初始化数据库（自动建表）"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await setup_wal_mode()
