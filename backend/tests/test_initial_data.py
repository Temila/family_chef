"""
家味 · Family Chef - initial_data 注入测试 (Phase 15 DATA-01)

验证 create_seed_test_dishes() 的环境守卫、幂等性、8 种组合覆盖、
admin 关联、category 关联、以及 production 默认跳过行为。

注意：initial_data.py 的 seed 函数使用 app.database.async_session_factory
（生产会话工厂）。为让这些测试在 in-memory test DB 上验证 seed 逻辑，
patch_session_factory autouse fixture 将 app.initial_data.async_session_factory
重定向到 conftest.py 的 test_session_factory。
"""

import pytest
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.initial_data import (
    create_seed_test_dishes,
    create_preset_categories,
    create_initial_data,
)
from app.models.dish import Dish
from app.models.user import User


@pytest.fixture(autouse=True)
def enable_seed_env(monkeypatch):
    """自动启用 seed 环境变量（production 守卫放行）。"""
    monkeypatch.setenv("ENVIRONMENT", "development")


@pytest.fixture(autouse=True)
def patch_session_factory(monkeypatch):
    """
    将 initial_data 模块的生产会话工厂重定向到测试用 in-memory 工厂。

    create_seed_test_dishes / create_preset_categories / create_initial_data
    均直接 import async_session_factory（模块级绑定），故需在
    app.initial_data 命名空间内替换为 conftest.test_session_factory，
    使 seed 写入与断言查询落在同一 in-memory DB。
    """
    from tests.conftest import test_session_factory
    import app.initial_data as initial_data_module
    monkeypatch.setattr(initial_data_module, "async_session_factory", test_session_factory)


@pytest.mark.asyncio
async def test_seed_test_dishes_creates_eight_combinations(db):
    """seed 注入 8 道菜品，覆盖 recipe × description × image 的 2³ = 8 种组合。"""
    await create_initial_data()
    await create_preset_categories()
    await create_seed_test_dishes()

    res = await db.execute(select(Dish).where(Dish.name.like("测试菜品 %")))
    dishes = res.scalars().all()

    assert len(dishes) == 8
    # 验证字段组合的 8 种状态都覆盖
    combinations = set()
    for d in dishes:
        combinations.add((d.recipe is not None, d.description is not None, d.image_url is not None))
    assert len(combinations) == 8  # 2³ = 8


@pytest.mark.asyncio
async def test_seed_test_dishes_is_idempotent(db):
    """二次调用不产生重复（幂等）。"""
    await create_initial_data()
    await create_preset_categories()
    await create_seed_test_dishes()
    await create_seed_test_dishes()  # 第二次

    res = await db.execute(select(Dish).where(Dish.name.like("测试菜品 %")))
    dishes = res.scalars().all()
    assert len(dishes) == 8


@pytest.mark.asyncio
async def test_seed_test_dishes_attaches_to_admin(db):
    """seed 菜品的 created_by 指向默认 admin。"""
    await create_initial_data()
    await create_preset_categories()
    await create_seed_test_dishes()

    admin_res = await db.execute(select(User).where(User.username == "admin"))
    admin = admin_res.scalar_one()

    res = await db.execute(select(Dish).where(Dish.name.like("测试菜品 %")))
    for dish in res.scalars().all():
        assert dish.created_by == admin.id


@pytest.mark.asyncio
async def test_seed_test_dishes_attaches_to_category(db):
    """seed 菜品至少有一个 category 关联（来自 region 分类）。

    使用 selectinload 预加载 Dish.categories，避免 session 关闭后的
    lazy-load I/O（async SQLAlchemy 默认禁用隐式 lazy load）。
    """
    await create_initial_data()
    await create_preset_categories()
    await create_seed_test_dishes()

    result = await db.execute(
        select(Dish)
        .where(Dish.name.like("测试菜品 %"))
        .options(selectinload(Dish.categories))
    )
    dishes = result.scalars().all()

    assert len(dishes) == 8
    for d in dishes:
        assert len(d.categories) > 0


@pytest.mark.asyncio
async def test_seed_test_dishes_skipped_when_env_not_set(db, monkeypatch):
    """ENVIRONMENT != development 且 AUTO_SEED_DEMO_DISHES != 1 → 跳过注入。"""
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("AUTO_SEED_DEMO_DISHES", raising=False)

    await create_initial_data()
    await create_preset_categories()
    await create_seed_test_dishes()  # 应直接 return

    res = await db.execute(select(Dish).where(Dish.name.like("测试菜品 %")))
    assert len(res.scalars().all()) == 0


@pytest.mark.asyncio
async def test_seed_test_dishes_skipped_without_admin(db):
    """默认 admin 不存在时跳过（不抛错）。"""
    # 不调用 create_initial_data()，admin 不存在
    await create_preset_categories()
    await create_seed_test_dishes()

    res = await db.execute(select(Dish).where(Dish.name.like("测试菜品 %")))
    assert len(res.scalars().all()) == 0
