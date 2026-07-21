"""
家味 · Family Chef - 测试配置
"""

import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# 使用内存 SQLite 进行测试
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


# 创建测试引擎
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

# 创建测试会话工厂
test_session_factory = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop():
    """创建事件循环"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def setup_database():
    """创建测试数据库表（仅一次）"""
    # 导入 Base 和所有模型，确保表被注册
    from app.database import Base
    
    # 导入所有模型
    from app.models.user import User
    from app.models.ingredient import Ingredient, IngredientAlias
    from app.models.category import Category
    from app.models.dish import Dish, DishIngredient, DishCategory
    from app.models.order import Order, OrderItem
    from app.models.favorite import Favorite
    from app.models.preference import TastePreference
    from app.models.schedule import ChefSchedule
    from app.models.log import SystemLog
    from app.models.guest_invitation import GuestInvitation
    from app.models.wish import Wish
    
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def clean_all_tables():
    """清理所有表数据"""
    async with test_engine.connect() as conn:
        # 禁用外键检查
        await conn.execute(text("PRAGMA foreign_keys = OFF"))
        
        # 删除所有表数据（按依赖顺序）
        tables = [
            "order_items",
            "orders",
            "wishes",
            "guest_invitations",
            "dish_categories",
            "dish_ingredients",
            "dish_chefs",
            "dish_semifinished_ingredients",
            "dishes",
            "taste_preferences",
            "favorites",
            "chef_schedules",
            "ingredient_aliases",
            "ingredients",
            "categories",
            "system_logs",
            "users",
        ]
        for table in tables:
            try:
                await conn.execute(text(f"DELETE FROM {table}"))
            except Exception:
                pass  # 表可能不存在或无数据
        
        # 重置自增 ID
        try:
            await conn.execute(text("DELETE FROM sqlite_sequence"))
        except Exception:
            pass
        
        await conn.commit()
        
        # 重新启用外键检查
        await conn.execute(text("PRAGMA foreign_keys = ON"))
        await conn.commit()


@pytest.fixture(autouse=True)
async def clean_db(setup_database):
    """每次测试前清理数据库"""
    await clean_all_tables()
    # 重置速率限制器（避免跨测试累积）
    from app.middleware.rate_limit import auth_limiter
    auth_limiter._requests.clear()


@pytest.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    """测试数据库会话"""
    async with test_session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client(db) -> AsyncGenerator[AsyncClient, None]:
    """测试 HTTP 客户端"""
    # 覆盖 get_db 依赖
    from app.main import app
    from app.database import get_db
    
    async def override_get_db():
        async with test_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as c:
        yield c
    
    app.dependency_overrides.clear()


@pytest.fixture
async def admin_token(client: AsyncClient) -> str:
    """获取管理员 Token"""
    # 先创建管理员用户
    from app.models.user import User
    from app.utils.security import hash_password
    
    async with test_session_factory() as session:
        admin = User(
            username="admin",
            password_hash=hash_password("admin123"),
            display_name="管理员",
            role="admin",
            is_active=True,
            force_pwd_change=False,
        )
        session.add(admin)
        await session.commit()
    
    response = await client.post("/api/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    data = response.json()
    return data["access_token"]


@pytest.fixture
async def user_token(client: AsyncClient) -> str:
    """获取普通用户 Token"""
    from app.models.user import User
    from app.utils.security import hash_password
    
    async with test_session_factory() as session:
        user = User(
            username="testuser",
            password_hash=hash_password("user123"),
            display_name="测试用户",
            role="user",
            is_active=True,
            force_pwd_change=False,
        )
        session.add(user)
        await session.commit()
    
    response = await client.post("/api/auth/login", json={
        "username": "testuser",
        "password": "user123"
    })
    data = response.json()
    return data["access_token"]


@pytest.fixture
async def chef_token(client: AsyncClient) -> str:
    """获取厨师 Token"""
    from app.models.user import User
    from app.utils.security import hash_password
    
    async with test_session_factory() as session:
        chef = User(
            username="chef",
            password_hash=hash_password("chef123"),
            display_name="厨师",
            role="chef",
            is_active=True,
            force_pwd_change=False,
        )
        session.add(chef)
        await session.commit()
    
    response = await client.post("/api/auth/login", json={
        "username": "chef",
        "password": "chef123"
    })
    data = response.json()
    return data["access_token"]


@pytest.fixture
async def chef2_token(client: AsyncClient) -> str:
    """获取第二个厨师 Token"""
    from app.models.user import User
    from app.utils.security import hash_password

    async with test_session_factory() as session:
        chef2 = User(
            username="chef2",
            password_hash=hash_password("chef123"),
            display_name="厨师二",
            role="chef",
            is_active=True,
            force_pwd_change=False,
        )
        session.add(chef2)
        await session.commit()

    response = await client.post("/api/auth/login", json={
        "username": "chef2",
        "password": "chef123"
    })
    data = response.json()
    return data["access_token"]


@pytest.fixture
async def user2_token(client: AsyncClient) -> str:
    """获取第二个普通用户 Token"""
    from app.models.user import User
    from app.utils.security import hash_password

    async with test_session_factory() as session:
        user2 = User(
            username="testuser2",
            password_hash=hash_password("user123"),
            display_name="测试用户二",
            role="user",
            is_active=True,
            force_pwd_change=False,
        )
        session.add(user2)
        await session.commit()

    response = await client.post("/api/auth/login", json={
        "username": "testuser2",
        "password": "user123"
    })
    data = response.json()
    return data["access_token"]


@pytest.fixture
async def guest_user():
    """创建虚拟访客用户"""
    from app.models.user import User
    from app.utils.security import hash_password

    async with test_session_factory() as session:
        guest = User(
            username="__guest__",
            password_hash=hash_password("test-placeholder-password-for-guest"),
            display_name="访客",
            role="user",
            is_active=False,
            force_pwd_change=False,
        )
        session.add(guest)
        await session.commit()
        return guest.id
