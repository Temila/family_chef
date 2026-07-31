"""
家味 · Family Chef - 服务层单元测试（直接调用服务函数）
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.order_service import OrderService
from app.services.dish_service import DishService
from app.services.category_service import CategoryService
from app.services.user_service import UserService
from app.services.auth_service import AuthService
from app.services.chef_service import ChefService
from app.services.dashboard_service import DashboardService
from app.services.preference_service import PreferenceService
from app.services.ingredient_service import IngredientService
from app.services.favorite_service import FavoriteService
from app.services.admin_service import AdminService
from app.utils.pagination import PaginationParams
from app.schemas.dish import DishCreate, DishUpdate
from app.schemas.order import OrderCreate, OrderItemCreate


async def _create_admin(db: AsyncSession):
    """创建管理员用户用于 FK 关联"""
    admin = await UserService.create_user(
        db, username="svc_admin", password="admin123",
        display_name="管理员", role="admin"
    )
    await db.commit()
    return admin


# ========== DishService ==========

@pytest.mark.asyncio
async def test_dish_service_crud(db: AsyncSession):
    """测试菜品完整 CRUD"""
    admin = await _create_admin(db)
    
    # Create
    dish_data = DishCreate(name="服务层测试菜品CRUD", description="测试")
    dish = await DishService.create_dish(db, dish_data, created_by=admin.id)
    await db.commit()
    assert dish.name == "服务层测试菜品CRUD"
    
    # Read
    found = await DishService.get_dish_by_id(db, dish.id)
    assert found is not None
    
    # Update
    update_data = DishUpdate(description="更新描述", status="published")
    updated = await DishService.update_dish(db, dish.id, update_data)
    await db.commit()
    assert updated.description == "更新描述"
    
    # Delete
    deleted = await DishService.delete_dish(db, dish.id)
    assert deleted is True


@pytest.mark.asyncio
async def test_dish_service_list_with_filters(db: AsyncSession):
    """测试菜品列表过滤"""
    admin = await _create_admin(db)
    
    for i in range(3):
        dish_data = DishCreate(name=f"过滤测试菜品{i}")
        await DishService.create_dish(db, dish_data, created_by=admin.id)
    await db.commit()
    
    params = PaginationParams(page=1, page_size=10)
    
    # 无过滤
    dishes, total = await DishService.list_dishes(db, params)
    assert isinstance(total, int)
    
    # 搜索
    dishes, total = await DishService.list_dishes(db, params, search="过滤")
    assert isinstance(total, int)
    
    # 排序
    for sort in ["name", "created", "popular"]:
        dishes, total = await DishService.list_dishes(db, params, sort=sort)
        assert isinstance(total, int)


# ========== CategoryService ==========

@pytest.mark.asyncio
async def test_category_service_crud(db: AsyncSession):
    """测试分类完整 CRUD"""
    cat = await CategoryService.create_category(db, name="服务层分类", category_type="cuisine")
    await db.commit()
    assert cat.name == "服务层分类"
    
    found = await CategoryService.get_category_by_id(db, cat.id)
    assert found is not None
    
    updated = await CategoryService.update_category(db, cat.id, name="更新分类")
    await db.commit()
    assert updated.name == "更新分类"
    
    cats = await CategoryService.list_categories(db)
    assert isinstance(cats, list)
    
    cats = await CategoryService.list_categories(db, category_type="cuisine")
    assert isinstance(cats, list)
    
    deleted = await CategoryService.delete_category(db, cat.id)
    assert deleted is True


# ========== UserService ==========

@pytest.mark.asyncio
async def test_user_service_crud(db: AsyncSession):
    """测试用户完整 CRUD"""
    user = await UserService.create_user(
        db, username="svc_crud_user3", password="test123",
        display_name="服务CRUD用户", role="user",
    )
    await db.commit()
    assert user.username == "svc_crud_user3"
    
    found = await UserService.get_user_by_id(db, user.id)
    assert found is not None
    
    found = await UserService.get_user_by_username(db, "svc_crud_user3")
    assert found is not None
    
    result = await UserService.list_users(db)
    assert isinstance(result, dict)
    assert "items" in result
    
    updated = await UserService.update_user(db, user.id, display_name="更新显示名")
    await db.commit()
    assert updated.display_name == "更新显示名"
    
    deleted = await UserService.delete_user(db, user.id)
    assert deleted is True


# ========== AuthService ==========

@pytest.mark.asyncio
async def test_auth_service_authenticate(db: AsyncSession):
    """测试认证服务"""
    await AuthService.create_user(
        db, username="auth_svc_test2", password="test123", display_name="认证测试",
    )
    await db.commit()
    
    user = await AuthService.authenticate_user(db, "auth_svc_test2", "test123")
    assert user is not None
    
    user = await AuthService.authenticate_user(db, "auth_svc_test2", "wrong")
    assert user is None


# ========== OrderService ==========

@pytest.mark.asyncio
async def test_order_service_generate_order_no(db: AsyncSession):
    """测试生成订单号"""
    order_no = await OrderService.generate_order_no(db)
    assert order_no is not None


@pytest.mark.asyncio
async def test_order_service_create_and_get(db: AsyncSession):
    """测试创建和获取订单"""
    admin = await _create_admin(db)
    
    dish_data = DishCreate(name="订单测试菜品")
    dish = await DishService.create_dish(db, dish_data, created_by=admin.id)
    await db.commit()
    
    update_data = DishUpdate(status="enabled")
    await DishService.update_dish(db, dish.id, update_data)
    await db.commit()
    
    user = await UserService.create_user(
        db, username="order_svc_user2", password="test123", display_name="订单用户", role="user"
    )
    await db.commit()
    
    order_create = OrderCreate(
        items=[OrderItemCreate(dish_id=dish.id, quantity=2)],
        notes="服务层测试订单",
    )
    order = await OrderService.create_order(db, order_create, user.id)
    await db.commit()
    assert order is not None
    
    found = await OrderService.get_order_by_id(db, order.id)
    assert found is not None
    
    updated = await OrderService.update_order_status(db, order.id, "accepted")
    assert updated is not None
    assert updated.status == "accepted"


@pytest.mark.asyncio
async def test_order_service_list(db: AsyncSession):
    """测试列出订单"""
    params = PaginationParams(page=1, page_size=10)
    orders, total = await OrderService.list_orders(db, params)
    assert isinstance(orders, list)
    assert isinstance(total, int)


# ========== ChefService ==========

@pytest.mark.asyncio
async def test_chef_service_list(db: AsyncSession):
    """测试列出厨师"""
    chefs = await ChefService.list_chefs(db)
    assert isinstance(chefs, list)


# ========== DashboardService ==========

@pytest.mark.asyncio
async def test_dashboard_service_data(db: AsyncSession):
    """测试仪表盘数据"""
    data = await DashboardService.get_dashboard_data(db)
    assert isinstance(data, dict)


# ========== PreferenceService ==========

@pytest.mark.asyncio
async def test_preference_service(db: AsyncSession):
    """测试偏好服务"""
    user = await UserService.create_user(
        db, username="pref_svc_user2", password="test123", display_name="偏好用户", role="user"
    )
    ing = await IngredientService.create_ingredient(db, name="偏好测试食材2")
    await db.commit()
    
    prefs = await PreferenceService.update_preferences(db, user.id, dislikes=[ing.id])
    await db.commit()
    assert "dislikes" in prefs
    
    prefs = await PreferenceService.get_preferences(db, user.id)
    assert "dislikes" in prefs
    
    pref = await PreferenceService.add_dislike(db, user.id, ing.id)
    await db.commit()
    assert pref is not None
    
    removed = await PreferenceService.remove_dislike(db, user.id, ing.id)
    await db.commit()
    assert removed is True


# ========== IngredientService ==========

@pytest.mark.asyncio
async def test_ingredient_service_crud(db: AsyncSession):
    """测试食材完整 CRUD"""
    ing = await IngredientService.create_ingredient(db, name="服务层食材CRUD2", category="fruit")
    await db.commit()
    assert ing.name == "服务层食材CRUD2"
    
    found = await IngredientService.get_ingredient_by_id(db, ing.id)
    assert found is not None
    
    ings = await IngredientService.list_ingredients(db)
    assert isinstance(ings, list)
    
    ings = await IngredientService.list_ingredients(db, search="CRUD2")
    assert isinstance(ings, list)
    
    ings = await IngredientService.list_ingredients(db, category="fruit")
    assert isinstance(ings, list)
    
    updated = await IngredientService.update_ingredient(db, ing.id, description="服务层更新")
    await db.commit()
    assert updated is not None
    
    deleted = await IngredientService.delete_ingredient(db, ing.id)
    assert deleted is True


# ========== FavoriteService ==========

@pytest.mark.asyncio
async def test_favorite_service(db: AsyncSession):
    """测试收藏服务"""
    admin = await _create_admin(db)
    user = await UserService.create_user(
        db, username="fav_svc_user2", password="test123", display_name="收藏用户", role="user"
    )
    dish_data = DishCreate(name="收藏测试菜品2")
    dish = await DishService.create_dish(db, dish_data, created_by=admin.id)
    await db.commit()
    
    fav = await FavoriteService.add_favorite(db, user.id, dish.id)
    await db.commit()
    assert fav is not None
    
    params = PaginationParams(page=1, page_size=10)
    favs, total = await FavoriteService.list_favorites(db, user.id, params)
    assert isinstance(favs, list)
    
    removed = await FavoriteService.remove_favorite(db, user.id, dish.id)
    await db.commit()
    assert removed is True


# ========== AdminService ==========

@pytest.mark.asyncio
async def test_admin_service_logs(db: AsyncSession):
    """测试管理员日志"""
    admin = await _create_admin(db)
    
    await AdminService.log_action(db, user_id=admin.id, action="test", detail="服务层测试日志")
    await db.commit()
    
    params = PaginationParams(page=1, page_size=10)
    logs, total = await AdminService.list_logs(db, params)
    assert isinstance(logs, list)
    assert isinstance(total, int)
