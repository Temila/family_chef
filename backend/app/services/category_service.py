"""分类服务"""
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.category import Category


class CategoryService:
    """分类服务"""
    
    @staticmethod
    async def get_category_by_id(db: AsyncSession, category_id: int) -> Optional[Category]:
        """根据 ID 获取分类"""
        result = await db.execute(
            select(Category).where(Category.id == category_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def list_categories(
        db: AsyncSession,
        category_type: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> List[Category]:
        """查询分类列表"""
        query = select(Category)
        
        if category_type:
            query = query.where(Category.type == category_type)
        if is_active is not None:
            query = query.where(Category.is_active == is_active)
        
        query = query.order_by(Category.sort_order, Category.name)
        
        result = await db.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def get_category_tree(db: AsyncSession, category_type: Optional[str] = None) -> List[dict]:
        """获取分类树形结构"""
        categories = await CategoryService.list_categories(db, category_type)
        
        # 构建树形结构
        category_dict = {}
        roots = []
        
        for cat in categories:
            category_dict[cat.id] = {
                "id": cat.id,
                "name": cat.name,
                "type": cat.type,
                "parent_id": cat.parent_id,
                "sort_order": cat.sort_order,
                "is_active": cat.is_active,
                "children": [],
            }
        
        for cat_id, cat_data in category_dict.items():
            if cat_data["parent_id"] is None:
                roots.append(cat_data)
            else:
                parent = category_dict.get(cat_data["parent_id"])
                if parent:
                    parent["children"].append(cat_data)
        
        return roots
    
    @staticmethod
    async def create_category(
        db: AsyncSession,
        name: str,
        category_type: str,
        parent_id: Optional[int] = None,
        sort_order: int = 0,
    ) -> Category:
        """创建分类"""
        # 检查父分类是否存在
        if parent_id:
            parent = await CategoryService.get_category_by_id(db, parent_id)
            if not parent:
                raise ValueError(f"父分类 {parent_id} 不存在")
        
        category = Category(
            name=name,
            type=category_type,
            parent_id=parent_id,
            sort_order=sort_order,
        )
        db.add(category)
        await db.flush()
        await db.refresh(category)
        return category
    
    @staticmethod
    async def update_category(
        db: AsyncSession,
        category_id: int,
        name: Optional[str] = None,
        category_type: Optional[str] = None,
        parent_id: Optional[int] = None,
        sort_order: Optional[int] = None,
        is_active: Optional[bool] = None,
    ) -> Optional[Category]:
        """更新分类"""
        category = await CategoryService.get_category_by_id(db, category_id)
        if not category:
            return None
        
        if name is not None:
            category.name = name
        if category_type is not None:
            category.type = category_type
        if parent_id is not None:
            if parent_id:
                parent = await CategoryService.get_category_by_id(db, parent_id)
                if not parent:
                    raise ValueError(f"父分类 {parent_id} 不存在")
            category.parent_id = parent_id
        if sort_order is not None:
            category.sort_order = sort_order
        if is_active is not None:
            category.is_active = is_active
        
        await db.flush()
        await db.refresh(category)
        return category
    
    @staticmethod
    async def delete_category(db: AsyncSession, category_id: int) -> bool:
        """删除分类（软删除）"""
        category = await CategoryService.get_category_by_id(db, category_id)
        if not category:
            return False
        
        # 检查是否有子分类
        result = await db.execute(
            select(Category).where(Category.parent_id == category_id)
        )
        children = result.scalars().all()
        if children:
            raise ValueError("该分类下有子分类，无法删除")
        
        category.is_active = False
        await db.flush()
        return True


# 全局分类服务实例
category_service = CategoryService()
