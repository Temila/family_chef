"""
家味 · Family Chef - 数据库连接
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import event, text
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


# 创建异步引擎
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False},  # SQLite 需要
)


# CR-01 修复（Phase 19 UAT 测试 8 复现）：SQLite 默认 PRAGMA foreign_keys=OFF，
# 导致所有 FK CASCADE 声明（含 user_theme_preferences.user_id、custom_themes.user_id
# 等）形同虚设——删 user 时偏好行变孤儿。
# 在每个新连接建立时同步开启外键（aiosqlite 连接是同步底层，需用 sync_engine 监听）。
@event.listens_for(engine.sync_engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, connection_record):
    """每个新 SQLite 连接建立时强制开启外键约束"""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.close()


# 配置 SQLite WAL 模式（提升并发性能）
async def setup_wal_mode():
    """启用 SQLite WAL 模式"""
    async with engine.connect() as conn:
        await conn.execute(text("PRAGMA journal_mode=WAL"))
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
