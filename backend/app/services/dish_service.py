"""
家味 · Family Chef - 菜品服务
"""

from typing import Optional, List
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.dish import Dish, DishIngredient, DishCategory
from app.models.ingredient import Ingredient
from app.models.category import Category
from app.models.preference import TastePreference
from app.schemas.dish import (
    DishCreate,
    DishUpdate,
    DishListResponse,
    DishDetailResponse,
    DietaryWarning,
)
from app.utils.pagination import PaginationParams
import pypinyin


class DishService:
    """菜品服务"""

    @staticmethod
    async def get_dish_by_id(
        db: AsyncSession,
        dish_id: int,
        user_id: Optional[int] = None,
    ) -> Optional[Dish]:
        """根据 ID 获取菜品详情"""
        result = await db.execute(
            select(Dish)
            .options(
                selectinload(Dish.ingredients),
                selectinload(Dish.categories),
            )
            .where(Dish.id == dish_id)
        )
        dish = result.scalar_one_or_none()
        return dish

    @staticmethod
    async def list_dishes(
        db: AsyncSession,
        params: PaginationParams,
        search: Optional[str] = None,
        regions: Optional[List[int]] = None,
        cuisines: Optional[List[int]] = None,
        tastes: Optional[List[int]] = None,
        seasons: Optional[List[int]] = None,
        favorites_only: bool = False,
        sort: str = "name",
        user_id: Optional[int] = None,
    ) -> tuple[List[Dish], int]:
        """分页查询菜品列表（支持多维度筛选）"""
        # 基础查询
        query = select(Dish).options(
            selectinload(Dish.ingredients),
            selectinload(Dish.categories),
        ).where(Dish.status == "published")

        # 模糊搜索（菜名、食材名）
        if search:
            search_pattern = f"%{search}%"
            ingredient_subq = (
                select(DishIngredient.dish_id)
                .join(Ingredient, DishIngredient.ingredient_id == Ingredient.id)
                .where(
                    or_(
                        Ingredient.name.like(search_pattern),
                        Ingredient.pinyin.like(search_pattern),
                    )
                )
            )
            query = query.where(
                or_(
                    Dish.name.like(search_pattern),
                    Dish.pinyin.like(search_pattern),
                    Dish.id.in_(ingredient_subq),
                )
            )

        # 按地区筛选
        if regions:
            query = query.join(DishCategory).where(
                and_(
                    DishCategory.category_id.in_(regions),
                    Category.type == "region",
                )
            )

        # 按菜系筛选（复用 categories 关联）
        if cuisines:
            query = query.join(DishCategory).where(
                and_(
                    DishCategory.category_id.in_(cuisines),
                    Category.type == "cuisine",
                )
            )

        # 按口味筛选
        if tastes:
            query = query.join(DishCategory).where(
                and_(
                    DishCategory.category_id.in_(tastes),
                    Category.type == "taste",
                )
            )

        # 按季节筛选
        if seasons:
            query = query.join(DishCategory).where(
                and_(
                    DishCategory.category_id.in_(seasons),
                    Category.type == "season",
                )
            )

        # 按收藏筛选
        if favorites_only and user_id:
            from app.models.favorite import Favorite
            query = query.join(DishCategory, Dish.id == DishCategory.dish_id).join(
                Favorite, Dish.id == Favorite.dish_id
            ).where(Favorite.user_id == user_id)

        # 排序
        if sort == "name":
            query = query.order_by(Dish.pinyin, Dish.name)
        elif sort == "created":
            query = query.order_by(Dish.created_at.desc())
        elif sort == "popular":
            query = query.order_by(Dish.is_popular.desc(), Dish.name)

        # 获取总数
        count_query = select(Dish.id).where(Dish.status == "published")
        if search:
            search_pattern = f"%{search}%"
            ingredient_subq = (
                select(DishIngredient.dish_id)
                .join(Ingredient, DishIngredient.ingredient_id == Ingredient.id)
                .where(
                    or_(
                        Ingredient.name.like(search_pattern),
                        Ingredient.pinyin.like(search_pattern),
                    )
                )
            )
            count_query = count_query.where(
                or_(
                    Dish.name.like(search_pattern),
                    Dish.pinyin.like(search_pattern),
                    Dish.id.in_(ingredient_subq),
                )
            )
        if regions:
            count_query = count_query.join(DishCategory).where(
                and_(
                    DishCategory.category_id.in_(regions),
                    Category.type == "region",
                )
            )
        if cuisines:
            count_query = count_query.join(DishCategory).where(
                and_(
                    DishCategory.category_id.in_(cuisines),
                    Category.type == "cuisine",
                )
            )
        if tastes:
            count_query = count_query.join(DishCategory).where(
                and_(
                    DishCategory.category_id.in_(tastes),
                    Category.type == "taste",
                )
            )
        if seasons:
            count_query = count_query.join(DishCategory).where(
                and_(
                    DishCategory.category_id.in_(seasons),
                    Category.type == "season",
                )
            )
        if favorites_only and user_id:
            from app.models.favorite import Favorite
            count_query = count_query.join(Favorite, Dish.id == Favorite.dish_id).where(
                Favorite.user_id == user_id
            )

        total_result = await db.execute(count_query)
        total = len(total_result.scalars().all())

        # 分页
        query = query.offset(params.offset).limit(params.limit)
        result = await db.execute(query)
        dishes = result.scalars().all()

        return dishes, total

    @staticmethod
    async def create_dish(
        db: AsyncSession,
        dish_data: DishCreate,
        created_by: int,
    ) -> Dish:
        """创建菜品（含食材和分类关联）"""
        # 生成拼音
        pinyin = DishService.generate_pinyin(dish_data.name)

        dish = Dish(
            name=dish_data.name,
            pinyin=pinyin,
            description=dish_data.description,
            image_url=dish_data.image_url,
            is_popular=dish_data.is_popular,
            created_by=created_by,
            status=dish_data.status or "draft",
        )
        db.add(dish)
        await db.flush()

        # 添加分类关联
        if dish_data.category_ids:
            for cat_id in dish_data.category_ids:
                dish_cat = DishCategory(dish_id=dish.id, category_id=cat_id)
                db.add(dish_cat)

        # 添加食材关联
        if dish_data.ingredient_ids:
            for idx, ing_id in enumerate(dish_data.ingredient_ids):
                dish_ing = DishIngredient(
                    dish_id=dish.id,
                    ingredient_id=ing_id,
                    is_main=True,
                    sort_order=idx,
                )
                db.add(dish_ing)

        await db.flush()
        await db.refresh(dish)
        return dish

    @staticmethod
    async def update_dish(
        db: AsyncSession,
        dish_id: int,
        dish_data: DishUpdate,
    ) -> Optional[Dish]:
        """更新菜品"""
        result = await db.execute(select(Dish).where(Dish.id == dish_id))
        dish = result.scalar_one_or_none()
        if not dish:
            return None

        update_data = dish_data.model_dump(exclude_unset=True)
        if "name" in update_data:
            update_data["pinyin"] = DishService.generate_pinyin(update_data["name"])

        for key, value in update_data.items():
            setattr(dish, key, value)

        await db.flush()
        await db.refresh(dish)
        return dish

    @staticmethod
    async def delete_dish(db: AsyncSession, dish_id: int) -> bool:
        """删除菜品"""
        result = await db.execute(select(Dish).where(Dish.id == dish_id))
        dish = result.scalar_one_or_none()
        if not dish:
            return False

        await db.delete(dish)
        await db.flush()
        return True

    @staticmethod
    async def update_dish_status(
        db: AsyncSession,
        dish_id: int,
        status: str,
    ) -> Optional[Dish]:
        """更新菜品状态（draft/published/hidden）"""
        valid_statuses = {"draft", "published", "hidden"}
        if status not in valid_statuses:
            raise ValueError(f"无效的状态: {status}，有效值: {', '.join(valid_statuses)}")

        result = await db.execute(select(Dish).where(Dish.id == dish_id))
        dish = result.scalar_one_or_none()
        if not dish:
            return None

        dish.status = status
        await db.flush()
        await db.refresh(dish)
        return dish

    @staticmethod
    async def get_dietary_warnings(
        db: AsyncSession,
        dish_id: int,
        user_id: int,
    ) -> List[DietaryWarning]:
        """获取菜品忌口提示（对比用户口味偏好）"""
        # 获取菜品的所有食材
        result = await db.execute(
            select(DishIngredient)
            .where(DishIngredient.dish_id == dish_id)
            .options(selectinload(DishIngredient.dish))
        )
        dish_ingredients = result.scalars().all()

        if not dish_ingredients:
            return []

        ingredient_ids = [di.ingredient_id for di in dish_ingredients]

        # 获取用户的口味偏好
        pref_result = await db.execute(
            select(TastePreference).where(
                and_(
                    TastePreference.user_id == user_id,
                    TastePreference.ingredient_id.in_(ingredient_ids),
                )
            )
        )
        preferences = pref_result.scalars().all()

        warnings = []
        for pref in preferences:
            # 获取食材名称
            ing_result = await db.execute(
                select(Ingredient).where(Ingredient.id == pref.ingredient_id)
            )
            ingredient = ing_result.scalar_one_or_none()
            if ingredient:
                warnings.append(
                    DietaryWarning(
                        type=pref.preference_type,
                        ingredient=ingredient.name,
                    )
                )

        return warnings

    @staticmethod
    async def sort_dishes_by_safety(
        db: AsyncSession,
        dishes: List[Dish],
        user_id: int,
    ) -> List[Dish]:
        """按安全优先排序（无标签 > 不爱吃 > 严格忌口）"""
        # 获取用户的所有忌口偏好
        all_ingredient_ids = set()
        for dish in dishes:
            for di in dish.ingredients:
                all_ingredient_ids.add(di.ingredient_id)

        if not all_ingredient_ids:
            return dishes

        pref_result = await db.execute(
            select(TastePreference).where(
                and_(
                    TastePreference.user_id == user_id,
                    TastePreference.ingredient_id.in_(list(all_ingredient_ids)),
                )
            )
        )
        user_prefs = pref_result.scalars().all()

        # 构建食材 -> 偏好类型映射
        pref_map = {}
        for pref in user_prefs:
            pref_map[pref.ingredient_id] = pref.preference_type

        # 为每个菜品计算安全等级
        dish_safety = []
        for dish in dishes:
            max_severity = 0  # 0=无标签, 1=不爱吃, 2=忌口
            for di in dish.ingredients:
                pref_type = pref_map.get(di.ingredient_id)
                if pref_type == "allergy":
                    max_severity = max(max_severity, 2)
                elif pref_type == "dislike":
                    max_severity = max(max_severity, 1)
            dish_safety.append((max_severity, dish))

        # 排序：无标签优先
        dish_safety.sort(key=lambda x: x[0])
        return [dish for _, dish in dish_safety]

    @staticmethod
    def generate_pinyin(name: str) -> str:
        """自动生成菜品拼音首字母"""
        try:
            # 获取全拼
            full_pinyin = pypinyin.pinyin(name, style=pypinyin.Style.NORMAL)
            # 转换为字符串
            pinyin_str = "".join([item[0] for item in full_pinyin])
            return pinyin_str
        except Exception:
            return name


# 全局菜品服务实例
dish_service = DishService()
