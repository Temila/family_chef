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
    
    async with async_session_factory() as session:
        result = await session.execute(select(Category))
        existing = result.scalars().all()
        
        if existing:
            print("✅ 分类数据已存在，跳过初始化")
            return

        preset_categories = [
            {"name": "中餐", "type": "region", "parent_id": None},
            {"name": "西餐", "type": "region", "parent_id": None},
            {"name": "日料", "type": "region", "parent_id": None},
            {"name": "印度菜", "type": "region", "parent_id": None},
            {"name": "东南亚菜", "type": "region", "parent_id": None},
            {"name": "黑暗料理界", "type": "region", "parent_id": None},
            {"name": "其他", "type": "region", "parent_id": None},

            {"name": "辣", "type": "taste", "parent_id": None},
            {"name": "甜", "type": "taste", "parent_id": None},
            {"name": "酸", "type": "taste", "parent_id": None},
            {"name": "清淡", "type": "taste", "parent_id": None},

            {"name": "春季", "type": "season", "parent_id": None},
            {"name": "夏季", "type": "season", "parent_id": None},
            {"name": "秋季", "type": "season", "parent_id": None},
            {"name": "冬季", "type": "season", "parent_id": None},
        ]
        
        for cat_data in preset_categories:
            session.add(Category(**cat_data))
        
        await session.flush()

        regions = {c.name: c.id for c in (await session.execute(select(Category).where(Category.type == "region"))).scalars().all()}
        
        zhongcan_id = regions.get("中餐")
        xican_id = regions.get("西餐")
        riliao_id = regions.get("日料")
        yindu_id = regions.get("印度菜")
        dongnanya_id = regions.get("东南亚菜")
        qita_id = regions.get("其他")

        cuisine_data = []
        if zhongcan_id:
            cuisine_data += [
                {"name": "川菜", "type": "cuisine", "parent_id": zhongcan_id},
                {"name": "鲁菜", "type": "cuisine", "parent_id": zhongcan_id},
                {"name": "粤菜", "type": "cuisine", "parent_id": zhongcan_id},
                {"name": "苏菜", "type": "cuisine", "parent_id": zhongcan_id},
                {"name": "浙菜", "type": "cuisine", "parent_id": zhongcan_id},
                {"name": "闽菜", "type": "cuisine", "parent_id": zhongcan_id},
                {"name": "湘菜", "type": "cuisine", "parent_id": zhongcan_id},
                {"name": "徽菜", "type": "cuisine", "parent_id": zhongcan_id},
            ]
        if xican_id:
            cuisine_data += [
                {"name": "法餐", "type": "cuisine", "parent_id": xican_id},
                {"name": "意餐", "type": "cuisine", "parent_id": xican_id},
                {"name": "美式", "type": "cuisine", "parent_id": xican_id},
                {"name": "英式", "type": "cuisine", "parent_id": xican_id},
                {"name": "德式", "type": "cuisine", "parent_id": xican_id},
                {"name": "俄式", "type": "cuisine", "parent_id": xican_id},
            ]
        if riliao_id:
            cuisine_data += [
                {"name": "寿司", "type": "cuisine", "parent_id": riliao_id},
                {"name": "拉面", "type": "cuisine", "parent_id": riliao_id},
                {"name": "居酒屋", "type": "cuisine", "parent_id": riliao_id},
            ]
        if yindu_id:
            cuisine_data += [
                {"name": "咖喱", "type": "cuisine", "parent_id": yindu_id},
                {"name": "唐杜里", "type": "cuisine", "parent_id": yindu_id},
            ]
        if dongnanya_id:
            cuisine_data += [
                {"name": "泰餐", "type": "cuisine", "parent_id": dongnanya_id},
                {"name": "越南菜", "type": "cuisine", "parent_id": dongnanya_id},
            ]
        if qita_id:
            cuisine_data += [
                {"name": "其他菜系", "type": "cuisine", "parent_id": qita_id},
            ]

        for cat_data in cuisine_data:
            session.add(Category(**cat_data))
        
        await session.commit()
        print(f"✅ 预设分类数据创建成功 ({len(preset_categories) + len(cuisine_data)} 个分类)")
