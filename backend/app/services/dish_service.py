"""
家味 · Family Chef - 菜品服务
"""

from typing import Optional, List
from sqlalchemy import select, and_, or_, exists, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, aliased
from app.models.dish import Dish, DishIngredient, DishCategory, DishSemifinishedIngredient, DishChef
from app.models.ingredient import Ingredient
from app.models.category import Category
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
                selectinload(Dish.ingredients).selectinload(DishIngredient.ingredient),
                selectinload(Dish.categories).selectinload(DishCategory.category),
                selectinload(Dish.semifinished_ingredients).selectinload(DishSemifinishedIngredient.semifinished_dish),
                selectinload(Dish.dish_chefs).selectinload(DishChef.chef),
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
        status_filter: Optional[str] = None,
        chef_filter: Optional[str] = None,
        is_semifinished: Optional[bool] = None,
    ) -> tuple[List[Dish], int]:
        """分页查询菜品列表（支持多维度筛选）"""
        # 基础查询
        query = select(Dish).options(
            selectinload(Dish.ingredients).selectinload(DishIngredient.ingredient),
            selectinload(Dish.categories).selectinload(DishCategory.category),
            selectinload(Dish.dish_chefs).selectinload(DishChef.chef),
        )
        if status_filter and status_filter != "all":
            query = query.where(Dish.status == status_filter)
        elif not status_filter:
            query = query.where(
                Dish.status == "enabled",
                Dish.is_semifinished == False,
                exists(
                    select(DishChef.id).where(
                        and_(DishChef.dish_id == Dish.id, DishChef.status == "published")
                    )
                ),
            )

        if is_semifinished is not None:
            query = query.where(Dish.is_semifinished == is_semifinished)

        # 厨师绑定筛选
        if chef_filter == "my-published" and user_id:
            query = query.where(
                exists(
                    select(DishChef.id).where(
                        and_(DishChef.dish_id == Dish.id, DishChef.chef_id == user_id, DishChef.status == "published")
                    )
                )
            )
        elif chef_filter == "my-hidden" and user_id:
            query = query.where(
                exists(
                    select(DishChef.id).where(
                        and_(DishChef.dish_id == Dish.id, DishChef.chef_id == user_id, DishChef.status == "hidden")
                    )
                )
            )
        elif chef_filter == "not-yet-published" and user_id:
            query = query.where(
                ~exists(
                    select(DishChef.id).where(
                        and_(DishChef.dish_id == Dish.id, DishChef.chef_id == user_id)
                    )
                )
            )

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
            dc = aliased(DishCategory)
            ct = aliased(Category)
            query = query.where(
                exists(
                    select(dc.id).where(
                        and_(
                            dc.dish_id == Dish.id,
                            dc.category_id.in_(regions),
                            dc.category_id == ct.id,
                            ct.type == "region",
                        )
                    )
                )
            )

        # 按菜系筛选
        if cuisines:
            dc = aliased(DishCategory)
            ct = aliased(Category)
            query = query.where(
                exists(
                    select(dc.id).where(
                        and_(
                            dc.dish_id == Dish.id,
                            dc.category_id.in_(cuisines),
                            dc.category_id == ct.id,
                            ct.type == "cuisine",
                        )
                    )
                )
            )

        # 按口味筛选
        if tastes:
            dc = aliased(DishCategory)
            ct = aliased(Category)
            query = query.where(
                exists(
                    select(dc.id).where(
                        and_(
                            dc.dish_id == Dish.id,
                            dc.category_id.in_(tastes),
                            dc.category_id == ct.id,
                            ct.type == "taste",
                        )
                    )
                )
            )

        # 按季节筛选
        if seasons:
            dc = aliased(DishCategory)
            ct = aliased(Category)
            query = query.where(
                exists(
                    select(dc.id).where(
                        and_(
                            dc.dish_id == Dish.id,
                            dc.category_id.in_(seasons),
                            dc.category_id == ct.id,
                            ct.type == "season",
                        )
                    )
                )
            )

        # 按收藏筛选
        if favorites_only and user_id:
            from app.models.favorite import Favorite
            query = query.join(
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
        count_query = select(func.count(Dish.id))
        if status_filter and status_filter != "all":
            count_query = count_query.where(Dish.status == status_filter)
        elif not status_filter:
            count_query = count_query.where(
                Dish.status == "enabled",
                Dish.is_semifinished == False,
                exists(
                    select(DishChef.id).where(
                        and_(DishChef.dish_id == Dish.id, DishChef.status == "published")
                    )
                ),
            )

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
            dc = aliased(DishCategory)
            ct = aliased(Category)
            count_query = count_query.where(
                exists(
                    select(dc.id).where(
                        and_(
                            dc.dish_id == Dish.id,
                            dc.category_id.in_(regions),
                            dc.category_id == ct.id,
                            ct.type == "region",
                        )
                    )
                )
            )
        if cuisines:
            dc = aliased(DishCategory)
            ct = aliased(Category)
            count_query = count_query.where(
                exists(
                    select(dc.id).where(
                        and_(
                            dc.dish_id == Dish.id,
                            dc.category_id.in_(cuisines),
                            dc.category_id == ct.id,
                            ct.type == "cuisine",
                        )
                    )
                )
            )
        if tastes:
            dc = aliased(DishCategory)
            ct = aliased(Category)
            count_query = count_query.where(
                exists(
                    select(dc.id).where(
                        and_(
                            dc.dish_id == Dish.id,
                            dc.category_id.in_(tastes),
                            dc.category_id == ct.id,
                            ct.type == "taste",
                        )
                    )
                )
            )
        if seasons:
            dc = aliased(DishCategory)
            ct = aliased(Category)
            count_query = count_query.where(
                exists(
                    select(dc.id).where(
                        and_(
                            dc.dish_id == Dish.id,
                            dc.category_id.in_(seasons),
                            dc.category_id == ct.id,
                            ct.type == "season",
                        )
                    )
                )
            )
        if favorites_only and user_id:
            from app.models.favorite import Favorite
            count_query = count_query.join(Favorite, Dish.id == Favorite.dish_id).where(
                Favorite.user_id == user_id
            )

        if chef_filter == "my-published" and user_id:
            count_query = count_query.where(
                exists(
                    select(DishChef.id).where(
                        and_(DishChef.dish_id == Dish.id, DishChef.chef_id == user_id, DishChef.status == "published")
                    )
                )
            )
        elif chef_filter == "my-hidden" and user_id:
            count_query = count_query.where(
                exists(
                    select(DishChef.id).where(
                        and_(DishChef.dish_id == Dish.id, DishChef.chef_id == user_id, DishChef.status == "hidden")
                    )
                )
            )
        elif chef_filter == "not-yet-published" and user_id:
            count_query = count_query.where(
                ~exists(
                    select(DishChef.id).where(
                        and_(DishChef.dish_id == Dish.id, DishChef.chef_id == user_id)
                    )
                )
            )

        total_result = await db.execute(count_query)
        total = total_result.scalar()

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
            recipe=dish_data.recipe,
            image_url=dish_data.image_url,
            is_popular=dish_data.is_popular,
            is_semifinished=dish_data.is_semifinished,
            created_by=created_by,
            status=dish_data.status or "enabled",
        )
        db.add(dish)
        await db.flush()

        if dish_data.category_ids:
            for cat_id in dish_data.category_ids:
                dish_cat = DishCategory(dish_id=dish.id, category_id=cat_id)
                db.add(dish_cat)

        if dish_data.ingredient_ids:
            for idx, ing_id in enumerate(dish_data.ingredient_ids):
                dish_ing = DishIngredient(
                    dish_id=dish.id,
                    ingredient_id=ing_id,
                    is_main=True,
                    sort_order=idx,
                )
                db.add(dish_ing)

        if dish_data.semifinished_dish_ids:
            for idx, sf_dish_id in enumerate(dish_data.semifinished_dish_ids):
                sf_ing = DishSemifinishedIngredient(
                    dish_id=dish.id,
                    semifinished_dish_id=sf_dish_id,
                    sort_order=idx,
                )
                db.add(sf_ing)

        if dish_data.chef_ids:
            for chef_id in dish_data.chef_ids:
                db.add(DishChef(dish_id=dish.id, chef_id=chef_id, status="hidden"))

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

        simple_fields = dish_data.model_dump(exclude_unset=True, exclude={"category_ids", "ingredient_ids", "semifinished_dish_ids", "chef_ids"})
        if "name" in simple_fields:
            simple_fields["pinyin"] = DishService.generate_pinyin(simple_fields["name"])

        for key, value in simple_fields.items():
            setattr(dish, key, value)

        if dish_data.category_ids is not None:
            result = await db.execute(
                select(DishCategory).where(DishCategory.dish_id == dish_id)
            )
            for old in result.scalars().all():
                await db.delete(old)
            for cat_id in dish_data.category_ids:
                db.add(DishCategory(dish_id=dish_id, category_id=cat_id))

        if dish_data.ingredient_ids is not None:
            result = await db.execute(
                select(DishIngredient).where(DishIngredient.dish_id == dish_id)
            )
            for old in result.scalars().all():
                await db.delete(old)
            for idx, ing_id in enumerate(dish_data.ingredient_ids):
                db.add(DishIngredient(dish_id=dish_id, ingredient_id=ing_id, is_main=True, sort_order=idx))

        if dish_data.semifinished_dish_ids is not None:
            result = await db.execute(
                select(DishSemifinishedIngredient).where(DishSemifinishedIngredient.dish_id == dish_id)
            )
            for old in result.scalars().all():
                await db.delete(old)
            for idx, sf_dish_id in enumerate(dish_data.semifinished_dish_ids):
                db.add(DishSemifinishedIngredient(dish_id=dish_id, semifinished_dish_id=sf_dish_id, sort_order=idx))

        if dish_data.chef_ids is not None:
            result = await db.execute(
                select(DishChef).where(DishChef.dish_id == dish_id)
            )
            old_chefs = result.scalars().all()
            existing = {dc.chef_id: dc.status for dc in old_chefs}
            for old in old_chefs:
                await db.delete(old)
            for chef_id in dish_data.chef_ids:
                db.add(DishChef(dish_id=dish_id, chef_id=chef_id, status=existing.get(chef_id, "hidden")))

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
        """更新菜品启用/禁用状态"""
        valid_statuses = {"enabled", "disabled"}
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
    async def toggle_chef_publish(
        db: AsyncSession,
        dish_id: int,
        chef_id: int,
        publish: bool,
    ) -> Optional[DishChef]:
        """厨师上架/下架菜品"""
        result = await db.execute(
            select(DishChef).where(
                and_(DishChef.dish_id == dish_id, DishChef.chef_id == chef_id)
            )
        )
        dc = result.scalar_one_or_none()
        if dc:
            dc.status = "published" if publish else "hidden"
            await db.flush()
            await db.refresh(dc)
            return dc

        dc = DishChef(dish_id=dish_id, chef_id=chef_id, status="published" if publish else "hidden")
        db.add(dc)
        await db.flush()
        await db.refresh(dc)
        return dc

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
    async def get_dietary_warnings_batch(
        db: AsyncSession,
        dishes: List[Dish],
        user_id: int,
    ) -> dict:
        """批量获取多个菜品的忌口提示，返回 {dish_id: [DietaryWarning]}"""
        all_ingredient_ids = set()
        dish_ing_map = {}
        for dish in dishes:
            for di in dish.ingredients:
                all_ingredient_ids.add(di.ingredient_id)
                dish_ing_map.setdefault(dish.id, []).append(di.ingredient_id)

        if not all_ingredient_ids:
            return {}

        pref_result = await db.execute(
            select(TastePreference).where(
                and_(
                    TastePreference.user_id == user_id,
                    TastePreference.ingredient_id.in_(list(all_ingredient_ids)),
                )
            )
        )
        user_prefs = pref_result.scalars().all()

        pref_map = {}
        for pref in user_prefs:
            pref_map[pref.ingredient_id] = pref.preference_type

        ing_names = {}
        if user_prefs:
            ing_ids = list(pref_map.keys())
            ing_result = await db.execute(
                select(Ingredient).where(Ingredient.id.in_(ing_ids))
            )
            for ing in ing_result.scalars().all():
                ing_names[ing.id] = ing.name

        result = {}
        for dish in dishes:
            warnings = []
            seen = set()
            for ing_id in dish_ing_map.get(dish.id, []):
                pref_type = pref_map.get(ing_id)
                if pref_type and ing_id not in seen:
                    seen.add(ing_id)
                    warnings.append(
                        DietaryWarning(
                            type=pref_type,
                            ingredient=ing_names.get(ing_id, ""),
                        )
                    )
            if warnings:
                result[dish.id] = warnings

        return result

    @staticmethod
    async def list_semifinished_dishes(db: AsyncSession) -> List[Dish]:
        """获取所有半成品菜品列表（用于作为食材选择）"""
        result = await db.execute(
            select(Dish).where(
                Dish.is_semifinished == True,
                Dish.status == "enabled",
            ).order_by(Dish.name)
        )
        return result.scalars().all()

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
