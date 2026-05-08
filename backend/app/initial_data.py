"""
家味 · Family Chef - 初始化数据
"""

from sqlalchemy import select
from app.database import async_session_factory
from app.models.user import User
from app.utils.security import hash_password


async def create_initial_data():
    """创建初始化数据（默认管理员账号）"""
    async with async_session_factory() as session:
        # 检查是否已存在管理员
        result = await session.execute(
            select(User).where(User.username == "admin")
        )
        admin = result.scalar_one_or_none()
        
        if admin:
            print("✅ 管理员账号已存在，跳过初始化")
            return
        
        # 创建默认管理员账号
        admin = User(
            username="admin",
            password_hash=hash_password("admin"),
            display_name="管理员",
            role="admin",
            force_pwd_change=True,
        )
        session.add(admin)
        await session.commit()
        
        print("✅ 默认管理员账号创建成功 (admin/admin)")
        print("⚠️  首次登录后请修改密码")


async def create_preset_categories():
    """创建预设分类数据"""
    from app.models.category import Category
    
    preset_categories = [
        # 地区分类
        {"name": "中餐", "type": "region", "parent_id": None},
        {"name": "西餐", "type": "region", "parent_id": None},
        {"name": "日料", "type": "region", "parent_id": None},
        {"name": "印度菜", "type": "region", "parent_id": None},
        {"name": "东南亚菜", "type": "region", "parent_id": None},
        {"name": "黑暗料理界", "type": "region", "parent_id": None},
        {"name": "其他", "type": "region", "parent_id": None},
        
        # 口味分类
        {"name": "辣", "type": "taste", "parent_id": None},
        {"name": "甜", "type": "taste", "parent_id": None},
        {"name": "酸", "type": "taste", "parent_id": None},
        {"name": "清淡", "type": "taste", "parent_id": None},
        
        # 季节分类
        {"name": "春季", "type": "season", "parent_id": None},
        {"name": "夏季", "type": "season", "parent_id": None},
        {"name": "秋季", "type": "season", "parent_id": None},
        {"name": "冬季", "type": "season", "parent_id": None},
    ]
    
    async with async_session_factory() as session:
        # 检查是否已存在分类
        result = await session.execute(select(Category))
        existing = result.scalars().all()
        
        if existing:
            print("✅ 分类数据已存在，跳过初始化")
            return
        
        for cat_data in preset_categories:
            category = Category(**cat_data)
            session.add(category)
        
        await session.commit()
        print(f"✅ 预设分类数据创建成功 ({len(preset_categories)} 个分类)")
