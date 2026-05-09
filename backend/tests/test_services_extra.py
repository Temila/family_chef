"""
家味 · Family Chef — 服务层测试（补充覆盖率）
直接调用服务层方法，覆盖更多业务逻辑分支
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.dish_service import DishService
from app.services.order_service import OrderService
from app.services.category_service import CategoryService
from app.services.chef_service import ChefService
from app.services.ingredient_service import IngredientService
from app.services.user_service import UserService
from app.services.preference_service import PreferenceService
from app.services.admin_service import AdminService
from app.schemas.dish import DishCreate, DishUpdate
from app.schemas.order import OrderCreate
from app.utils.pagination import PaginationParams
from app.models.user import User
from app.models.ingredient import Ingredient
from app.models.category import Category
from app.models.dish import Dish
from app.utils.security import hash_password


async def _create_user(db: AsyncSession, username: str = "svc_user", role: str = "user") -> User:
    user = User(
        username=username,
        password_hash=hash_password("test123"),
        display_name=username,
        role=role,
        is_active=True,
        force_pwd_change=False,
    )
    db.add(user)
    await db.flush()
    return user


async def _create_ingredient(db: AsyncSession, name: str = "土豆") -> Ingredient:
    ing = Ingredient(name=name, pinyin=name, category="vegetable", is_active=True)
    db.add(ing)
    await db.flush()
    return ing


async def _create_category(db: AsyncSession, name: str = "川菜", cat_type: str = "cuisine") -> Category:
    cat = Category(name=name, type=cat_type, is_active=True, sort_order=0)
    db.add(cat)
    await db.flush()
    return cat


async def _create_dish_with_relations(
    db: AsyncSession,
    name: str = "测试菜",
    ingredient_ids: list = None,
    category_ids: list = None,
) -> Dish:
    dish = Dish(name=name, pinyin=name, status="published", is_popular=False)
    db.add(dish)
    await db.flush()

    if category_ids:
        from app.models.dish import DishCategory
        for cid in category_ids:
            db.add(DishCategory(dish_id=dish.id, category_id=cid))

    if ingredient_ids:
        from app.models.dish import DishIngredient
        for idx, iid in enumerate(ingredient_ids):
            db.add(DishIngredient(dish_id=dish.id, ingredient_id=iid, is_main=True, sort_order=idx))

    await db.flush()
    return dish


# ─── DishService ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_dish_create_with_categories_and_ingredients(db: AsyncSession):
    """创建菜品时同时关联分类和食材"""
    user = await _create_user(db, "chef_a", "chef")
    cat = await _create_category(db, "湘菜")
    ing = await _create_ingredient(db, "辣椒")

    dish_data = DishCreate(
        name="剁椒鱼头",
        category_ids=[cat.id],
        ingredient_ids=[ing.id],
    )
    dish = await DishService.create_dish(db, dish_data, user.id)
    await db.flush()
    assert dish.name == "剁椒鱼头"
    assert dish.pinyin is not None


@pytest.mark.asyncio
async def test_dish_get_dietary_warnings(db: AsyncSession):
    """获取菜品忌口提示"""
    user = await _create_user(db, "allergy_user")
    ing = await _create_ingredient(db, "花生")
    dish = await _create_dish_with_relations(db, "宫保鸡丁", ingredient_ids=[ing.id])

    # 添加用户偏好（忌口）
    from app.models.preference import TastePreference
    pref = TastePreference(
        user_id=user.id,
        ingredient_id=ing.id,
        preference_type="allergy",
    )
    db.add(pref)
    await db.flush()

    warnings = await DishService.get_dietary_warnings(db, dish.id, user.id)
    assert len(warnings) >= 1
    assert warnings[0].type == "allergy"
    assert warnings[0].ingredient == "花生"


@pytest.mark.asyncio
async def test_dish_get_dietary_warnings_no_ingredients(db: AsyncSession):
    """菜品无食材时忌口提示为空"""
    user = await _create_user(db, "no_ing_user")
    dish = await _create_dish_with_relations(db, "白开水")
    warnings = await DishService.get_dietary_warnings(db, dish.id, user.id)
    assert warnings == []


@pytest.mark.asyncio
async def test_dish_sort_by_safety(db: AsyncSession):
    """按安全优先排序"""
    user = await _create_user(db, "sort_user")
    ing1 = await _create_ingredient(db, "牛奶")
    ing2 = await _create_ingredient(db, "番茄")

    dish1 = await _create_dish_with_relations(db, "牛奶蛋糕", ingredient_ids=[ing1.id])
    dish2 = await _create_dish_with_relations(db, "番茄炒蛋", ingredient_ids=[ing2.id])

    # 用户对牛奶过敏
    from app.models.preference import TastePreference
    pref = TastePreference(user_id=user.id, ingredient_id=ing1.id, preference_type="allergy")
    db.add(pref)
    await db.flush()

    # 需要预加载 ingredients
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.models.dish import Dish
    result = await db.execute(
        select(Dish).options(selectinload(Dish.ingredients)).where(Dish.id.in_([dish1.id, dish2.id]))
    )
    dishes = list(result.scalars().all())

    sorted_dishes = await DishService.sort_dishes_by_safety(db, dishes, user.id)
    # 番茄炒蛋（无过敏）应该排在牛奶蛋糕（过敏）前面
    assert sorted_dishes[0].name == "番茄炒蛋"


@pytest.mark.asyncio
async def test_dish_update_with_name_change(db: AsyncSession):
    """更新菜品名称时自动更新拼音"""
    dish = await _create_dish_with_relations(db, "旧名")
    updated = await DishService.update_dish(db, dish.id, DishUpdate(name="新名菜"))
    await db.flush()
    assert updated is not None
    assert updated.name == "新名菜"


@pytest.mark.asyncio
async def test_dish_update_not_found(db: AsyncSession):
    updated = await DishService.update_dish(db, 99999, DishUpdate(name="不存在"))
    assert updated is None


@pytest.mark.asyncio
async def test_dish_delete(db: AsyncSession):
    dish = await _create_dish_with_relations(db, "待删除菜")
    assert await DishService.delete_dish(db, dish.id) is True
    assert await DishService.delete_dish(db, 99999) is False


@pytest.mark.asyncio
async def test_dish_update_status_invalid(db: AsyncSession):
    """无效状态"""
    with pytest.raises(ValueError):
        await DishService.update_dish_status(db, 1, "invalid_status")


@pytest.mark.asyncio
async def test_dish_update_status_not_found(db: AsyncSession):
    result = await DishService.update_dish_status(db, 99999, "published")
    assert result is None


@pytest.mark.asyncio
async def test_dish_list_with_filters(db: AsyncSession):
    """带筛选条件的菜品列表"""
    cat = await _create_category(db, "粤菜")
    await _create_dish_with_relations(db, "白切鸡", category_ids=[cat.id])
    await _create_dish_with_relations(db, "烧鹅", category_ids=[cat.id])

    params = PaginationParams(page=1, page_size=10)
    dishes, total = await DishService.list_dishes(
        db, params, cuisines=[cat.id], sort="name",
    )
    assert total >= 2


# ─── OrderService ────────────────────────────────────────

@pytest.mark.asyncio
async def test_order_generate_order_no(db: AsyncSession):
    no = await OrderService.generate_order_no(db)
    assert no.startswith("ORD")
    assert len(no) > 5


@pytest.mark.asyncio
async def test_order_create_and_full_lifecycle(db: AsyncSession):
    """订单完整生命周期：创建 → 接受 → 烹饪 → 完成"""
    user = await _create_user(db, "order_user")
    dish = await _create_dish_with_relations(db, "红烧肉")

    order = await OrderService.create_order(db, OrderCreate(items=[
        {"dish_id": dish.id, "quantity": 2},
    ]), user.id)
    await db.flush()
    assert order.status == "pending"

    # pending → accepted
    order = await OrderService.update_order_status(db, order.id, "accepted")
    await db.flush()
    assert order.status == "accepted"

    # accepted → cooking
    order = await OrderService.update_order_status(db, order.id, "cooking")
    await db.flush()
    assert order.status == "cooking"

    # cooking → completed
    order = await OrderService.update_order_status(db, order.id, "completed")
    await db.flush()
    assert order.status == "completed"
    assert order.completed_at is not None


@pytest.mark.asyncio
async def test_order_invalid_transition(db: AsyncSession):
    """无效状态转换"""
    user = await _create_user(db, "bad_order_user")
    dish = await _create_dish_with_relations(db, "坏菜")
    order = await OrderService.create_order(db, OrderCreate(items=[
        {"dish_id": dish.id, "quantity": 1},
    ]), user.id)
    await db.flush()

    # pending → completed（不合法）
    with pytest.raises(ValueError):
        await OrderService.update_order_status(db, order.id, "completed")


@pytest.mark.asyncio
async def test_order_cancel(db: AsyncSession):
    """用户取消订单"""
    user = await _create_user(db, "cancel_user")
    dish = await _create_dish_with_relations(db, "可取消菜")
    order = await OrderService.create_order(db, OrderCreate(items=[
        {"dish_id": dish.id, "quantity": 1},
    ]), user.id)
    await db.flush()

    cancelled = await OrderService.cancel_order(db, order.id, user.id)
    await db.flush()
    assert cancelled is not None
    assert cancelled.status == "cancelled"


@pytest.mark.asyncio
async def test_order_cancel_wrong_user(db: AsyncSession):
    """其他用户不能取消订单"""
    user1 = await _create_user(db, "owner_user")
    user2 = await _create_user(db, "other_user")
    dish = await _create_dish_with_relations(db, "别人的菜")
    order = await OrderService.create_order(db, OrderCreate(items=[
        {"dish_id": dish.id, "quantity": 1},
    ]), user1.id)
    await db.flush()

    with pytest.raises(ValueError):
        await OrderService.cancel_order(db, order.id, user2.id)


@pytest.mark.asyncio
async def test_order_get_stats(db: AsyncSession):
    """用户订单统计"""
    user = await _create_user(db, "stats_user")
    stats = await OrderService.get_user_order_stats(db, user.id)
    assert "total" in stats


@pytest.mark.asyncio
async def test_order_list_by_status(db: AsyncSession):
    """按状态筛选订单"""
    user = await _create_user(db, "filter_user")
    dish = await _create_dish_with_relations(db, "筛选菜")
    order = await OrderService.create_order(db, OrderCreate(items=[
        {"dish_id": dish.id, "quantity": 1},
    ]), user.id)
    await db.flush()

    params = PaginationParams(page=1, page_size=10)
    orders, total = await OrderService.list_orders(db, params, status="pending")
    assert total >= 1


# ─── CategoryService ─────────────────────────────────────

@pytest.mark.asyncio
async def test_category_tree(db: AsyncSession):
    """分类树形结构"""
    parent = await CategoryService.create_category(db, name="中餐", category_type="cuisine")
    await db.flush()
    child = await CategoryService.create_category(
        db, name="川菜", category_type="cuisine", parent_id=parent.id
    )
    await db.flush()

    tree = await CategoryService.get_category_tree(db, "cuisine")
    assert isinstance(tree, list)
    assert len(tree) >= 1
    # 父节点应该有 children
    parent_node = next((n for n in tree if n["id"] == parent.id), None)
    assert parent_node is not None


@pytest.mark.asyncio
async def test_category_update(db: AsyncSession):
    """更新分类"""
    cat = await CategoryService.create_category(db, name="旧名", category_type="region")
    await db.flush()

    updated = await CategoryService.update_category(db, cat.id, name="新名")
    await db.flush()
    assert updated.name == "新名"


@pytest.mark.asyncio
async def test_category_update_not_found(db: AsyncSession):
    result = await CategoryService.update_category(db, 99999, name="不存在")
    assert result is None


@pytest.mark.asyncio
async def test_category_get_by_id(db: AsyncSession):
    cat = await CategoryService.create_category(db, name="测试", category_type="taste")
    await db.flush()
    found = await CategoryService.get_category_by_id(db, cat.id)
    assert found is not None
    assert found.name == "测试"
    assert await CategoryService.get_category_by_id(db, 99999) is None


@pytest.mark.asyncio
async def test_category_delete(db: AsyncSession):
    cat = await CategoryService.create_category(db, name="待删", category_type="season")
    await db.flush()
    assert await CategoryService.delete_category(db, cat.id) is True
    assert await CategoryService.delete_category(db, 99999) is False


@pytest.mark.asyncio
async def test_category_list_with_filters(db: AsyncSession):
    await CategoryService.create_category(db, name="甜", category_type="taste")
    await db.flush()
    cats = await CategoryService.list_categories(db, category_type="taste")
    assert len(cats) >= 1


# ─── ChefService ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_chef_list(db: AsyncSession):
    """列出所有厨师"""
    await _create_user(db, "chef_list1", "chef")
    chefs = await ChefService.list_chefs(db)
    assert isinstance(chefs, list)
    assert len(chefs) >= 1


@pytest.mark.asyncio
async def test_chef_schedule_crud(db: AsyncSession):
    """厨师排班 CRUD"""
    chef = await _create_user(db, "sched_chef", "chef")
    import datetime
    today = datetime.date.today()

    # 创建排班
    schedule = await ChefService.update_schedule(
        db, chef.id, today, "lunch", status="available", notes="可做午餐"
    )
    await db.flush()
    assert schedule is not None

    # 查询排班
    schedules = await ChefService.get_schedules(db, schedule_date=today)
    assert len(schedules) >= 1

    # 更新排班
    updated = await ChefService.update_schedule(
        db, chef.id, today, "lunch", status="busy", notes="已满"
    )
    await db.flush()
    assert updated.status == "busy"


@pytest.mark.asyncio
async def test_chef_workload(db: AsyncSession):
    """厨师工作负荷"""
    chef = await _create_user(db, "wl_chef", "chef")
    import datetime
    workload = await ChefService.get_chef_workload(db, chef.id, datetime.date.today())
    assert isinstance(workload, dict)


# ─── IngredientService ───────────────────────────────────

@pytest.mark.asyncio
async def test_ingredient_create_and_find(db: AsyncSession):
    """食材创建和查找"""
    ing = await IngredientService.create_ingredient(
        db, name="西红柿", pinyin="xihongshi", category="vegetable",
        aliases=["番茄", "洋柿子"],
    )
    await db.flush()
    assert ing.name == "西红柿"

    # 通过 ID 查找
    found = await IngredientService.get_ingredient_by_id(db, ing.id)
    assert found is not None

    # 不存在
    assert await IngredientService.get_ingredient_by_id(db, 99999) is None


@pytest.mark.asyncio
async def test_ingredient_update(db: AsyncSession):
    ing = await _create_ingredient(db, "黄瓜")
    await db.flush()
    updated = await IngredientService.update_ingredient(db, ing.id, name="小黄瓜")
    await db.flush()
    assert updated is not None
    assert updated.name == "小黄瓜"

    # 更新不存在的
    assert await IngredientService.update_ingredient(db, 99999, name="不存在") is None


# ─── UserService ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_user_update_password(db: AsyncSession):
    """用户修改密码"""
    user = await _create_user(db, "pwd_user")
    await db.flush()

    success = await UserService.update_user_password(db, user.id, "test123", "newpass999")
    await db.flush()
    assert success is True


@pytest.mark.asyncio
async def test_user_update_password_wrong_old(db: AsyncSession):
    """旧密码错误"""
    user = await _create_user(db, "bad_pwd_user")
    await db.flush()

    with pytest.raises(ValueError):
        await UserService.update_user_password(db, user.id, "wrong_old", "newpass")


@pytest.mark.asyncio
async def test_user_delete(db: AsyncSession):
    user = await _create_user(db, "del_user")
    await db.flush()
    assert await UserService.delete_user(db, user.id) is True
    assert await UserService.delete_user(db, 99999) is False


# ─── PreferenceService ───────────────────────────────────

@pytest.mark.asyncio
async def test_preference_set_and_get(db: AsyncSession):
    """设置和获取口味偏好"""
    user = await _create_user(db, "pref_user")
    ing = await _create_ingredient(db, "香菜")
    await db.flush()

    from app.services.preference_service import PreferenceService
    pref_svc = PreferenceService()
    pref = await pref_svc.add_dislike(db, user.id, ing.id)
    await db.flush()
    assert pref is not None

    prefs = await pref_svc.get_preferences(db, user.id)
    assert isinstance(prefs, dict)


# ─── AdminService ────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_list_logs(db: AsyncSession):
    """管理员日志列表"""
    from app.services.admin_service import AdminService
    from app.utils.pagination import PaginationParams
    params = PaginationParams(page=1, page_size=10)
    logs, total = await AdminService.list_logs(db, params)
    assert isinstance(logs, list)
    assert isinstance(total, int)
