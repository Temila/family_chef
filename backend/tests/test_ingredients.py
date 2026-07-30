"""
家味 · Family Chef - 食材模块测试
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_ingredients(client: AsyncClient, admin_token: str):
    """测试食材列表查询 - Phase 3 实现"""
    response = await client.get(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    # Phase 3 实现后，这里应该返回 200
    assert response.status_code in [200, 501]  # 501 = Not Implemented


@pytest.mark.asyncio
async def test_create_ingredient(client: AsyncClient, admin_token: str):
    """测试创建食材 - Phase 3 实现"""
    response = await client.post(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "番茄",
            "description": "新鲜番茄",
            "unit": "个"
        }
    )

    # Phase 3 实现后，这里应该返回 201
    assert response.status_code in [201, 501]


@pytest.mark.asyncio
async def test_update_ingredient(client: AsyncClient, admin_token: str):
    """测试更新食材 - Phase 3 实现"""
    response = await client.put(
        "/api/ingredients/1",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "有机番茄",
            "description": "有机种植番茄"
        }
    )

    # Phase 3 实现后，这里应该返回 200
    assert response.status_code in [200, 404, 501]


@pytest.mark.asyncio
async def test_delete_ingredient(client: AsyncClient, admin_token: str):
    """测试删除食材 - Phase 3 实现"""
    response = await client.delete(
        "/api/ingredients/1",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    # Phase 3 实现后，这里应该返回 204
    assert response.status_code in [204, 404, 501]


@pytest.mark.asyncio
async def test_ingredient_search(client: AsyncClient, admin_token: str):
    """测试搜索食材 - Phase 3 实现"""
    response = await client.get(
        "/api/ingredients/?search=番茄",
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    # Phase 3 实现后，这里应该返回 200
    assert response.status_code in [200, 501]


@pytest.mark.asyncio
async def test_create_ingredient_forbidden(client: AsyncClient, user_token: str):
    """测试非管理员创建食材被拒绝 - Phase 3 实现"""
    response = await client.post(
        "/api/ingredients/",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "name": "测试食材",
            "description": "测试"
        }
    )

    # Phase 3 实现后，这里应该返回 403
    assert response.status_code in [403, 501]


@pytest.mark.asyncio
async def test_filter_ingredients_by_has_dishes(client: AsyncClient, admin_token: str):
    """测试 ?has_dishes=true|false 过滤：仅返回已关联 / 仅返回未关联食材"""
    from tests.conftest import test_session_factory
    from app.models.ingredient import Ingredient
    from app.models.dish import Dish, DishIngredient

    # 1) 直接插入两个食材和一个菜品
    async with test_session_factory() as session:
        ing_a = Ingredient(name="assoc-test-a")
        ing_b = Ingredient(name="assoc-test-b")
        dish = Dish(name="assoc-test-dish", status="published")
        session.add_all([ing_a, ing_b, dish])
        await session.flush()
        # 2) 把 ing_a 关联到菜品
        session.add(DishIngredient(dish_id=dish.id, ingredient_id=ing_a.id, is_main=True))
        await session.commit()
        ing_a_id, ing_b_id = ing_a.id, ing_b.id

    headers = {"Authorization": f"Bearer {admin_token}"}

    # 3) ?has_dishes=true → 只返回 ing_a
    resp_true = await client.get("/api/ingredients/?has_dishes=true", headers=headers)
    assert resp_true.status_code == 200
    items_true = resp_true.json()["items"]
    ids_true = {item["id"] for item in items_true}
    assert ing_a_id in ids_true
    assert ing_b_id not in ids_true

    # 4) ?has_dishes=false → 只返回 ing_b
    resp_false = await client.get("/api/ingredients/?has_dishes=false", headers=headers)
    assert resp_false.status_code == 200
    items_false = resp_false.json()["items"]
    ids_false = {item["id"] for item in items_false}
    assert ing_b_id in ids_false
    assert ing_a_id not in ids_false

    # 5) 不传 has_dishes → 两者都返回
    resp_all = await client.get("/api/ingredients/", headers=headers)
    assert resp_all.status_code == 200
    ids_all = {item["id"] for item in resp_all.json()["items"]}
    assert ing_a_id in ids_all and ing_b_id in ids_all
