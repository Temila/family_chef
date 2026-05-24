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

        result = await session.execute(
            select(User).where(User.username == "__guest__")
        )
        guest = result.scalar_one_or_none()

        if guest:
            print("✅ 虚拟访客用户已存在，跳过创建")
            return

        guest_user = User(
            username="__guest__",
            password_hash=hash_password("never-used-guest-account-placeholder-password-!@#$%"),
            display_name="访客",
            role="user",
            is_active=False,
            force_pwd_change=False,
        )
        session.add(guest_user)
        await session.commit()
        print("✅ 虚拟访客用户创建成功 (__guest__, is_active=False)")


async def create_preset_categories():
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

            {"name": "肉类", "type": "ingredient", "parent_id": None},
            {"name": "蔬菜", "type": "ingredient", "parent_id": None},
            {"name": "海鲜", "type": "ingredient", "parent_id": None},
            {"name": "水果", "type": "ingredient", "parent_id": None},
            {"name": "调味品", "type": "ingredient", "parent_id": None},
            {"name": "其他", "type": "ingredient", "parent_id": None},
            {"name": "辅料", "type": "ingredient", "parent_id": None},
            {"name": "蘑菇", "type": "ingredient", "parent_id": None},
        ]

        for cat_data in preset_categories:
            session.add(Category(**cat_data))

        await session.flush()

        regions = {c.name: c.id for c in (await session.execute(select(Category).where(Category.type == "region"))).scalars().all()}

        cuisine_data = []
        zhongcan_id = regions.get("中餐")
        xican_id = regions.get("西餐")
        riliao_id = regions.get("日料")
        yindu_id = regions.get("印度菜")
        dongnanya_id = regions.get("东南亚菜")
        heian_id = regions.get("黑暗料理界")
        qita_id = regions.get("其他")

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
                {"name": "其他", "type": "cuisine", "parent_id": zhongcan_id},
            ]
        if xican_id:
            cuisine_data += [
                {"name": "法餐", "type": "cuisine", "parent_id": xican_id},
                {"name": "意餐", "type": "cuisine", "parent_id": xican_id},
                {"name": "美式", "type": "cuisine", "parent_id": xican_id},
                {"name": "英式", "type": "cuisine", "parent_id": xican_id},
                {"name": "德式", "type": "cuisine", "parent_id": xican_id},
                {"name": "俄式", "type": "cuisine", "parent_id": xican_id},
                {"name": "西班牙菜", "type": "cuisine", "parent_id": xican_id},
                {"name": "其他", "type": "cuisine", "parent_id": xican_id},
            ]
        if riliao_id:
            cuisine_data += [
                {"name": "寿司", "type": "cuisine", "parent_id": riliao_id},
                {"name": "拉面", "type": "cuisine", "parent_id": riliao_id},
                {"name": "居酒屋", "type": "cuisine", "parent_id": riliao_id},
                {"name": "其他", "type": "cuisine", "parent_id": riliao_id},
            ]
        if yindu_id:
            cuisine_data += [
                {"name": "咖喱", "type": "cuisine", "parent_id": yindu_id},
                {"name": "唐杜里", "type": "cuisine", "parent_id": yindu_id},
                {"name": "其他", "type": "cuisine", "parent_id": yindu_id},
            ]
        if dongnanya_id:
            cuisine_data += [
                {"name": "泰餐", "type": "cuisine", "parent_id": dongnanya_id},
                {"name": "越南菜", "type": "cuisine", "parent_id": dongnanya_id},
                {"name": "其他", "type": "cuisine", "parent_id": dongnanya_id},
            ]
        if heian_id:
            cuisine_data += [
                {"name": "其他", "type": "cuisine", "parent_id": heian_id},
            ]
        if qita_id:
            cuisine_data += [
                {"name": "其他", "type": "cuisine", "parent_id": qita_id},
            ]

        for cat_data in cuisine_data:
            session.add(Category(**cat_data))

        await session.commit()
        print(f"✅ 预设分类数据创建成功 ({len(preset_categories) + len(cuisine_data)} 个分类)")


PRESET_INGREDIENTS = [
    ("猪肉", "肉类", ["鲜肉", "猪五花", "五花肉"]),
    ("排骨", "肉类", ["猪排骨", "肋排", "小排"]),
    ("猪蹄", "肉类", ["猪脚", "猪爪"]),
    ("猪肝", "肉类", []),
    ("猪大肠", "肉类", ["肥肠", "大肠"]),
    ("牛肉", "肉类", ["牛腩", "牛腱"]),
    ("牛百叶", "肉类", ["毛肚"]),
    ("羊肉", "肉类", ["羊腿肉", "羊排"]),
    ("鸡肉", "肉类", ["鸡胸肉", "整鸡"]),
    ("鸡翅", "肉类", ["鸡翅中", "鸡翅根"]),
    ("鸡腿", "肉类", ["大鸡腿"]),
    ("鸡爪", "肉类", ["凤爪", "鸡脚"]),
    ("鸭肉", "肉类", ["鸭胸", "鸭腿"]),
    ("鸭血", "肉类", []),
    ("鸭肠", "肉类", []),
    ("鹅肉", "肉类", []),
    ("五花肉", "肉类", ["肋条肉", "三层肉"]),
    ("里脊肉", "肉类", ["猪里脊", "牛里脊"]),
    ("培根", "肉类", ["烟肉"]),
    ("香肠", "肉类", ["腊肠", "广式香肠"]),
    ("火腿", "肉类", ["金华火腿", "火腿肠"]),
    ("肉末", "肉类", ["肉糜", "肉馅", "绞肉"]),
    ("腊肉", "肉类", ["咸肉"]),
    ("兔肉", "肉类", []),

    ("白菜", "蔬菜", ["大白菜", "小白菜"]),
    ("青菜", "蔬菜", ["小油菜", "上海青"]),
    ("生菜", "蔬菜", []),
    ("菠菜", "蔬菜", ["波菜"]),
    ("芹菜", "蔬菜", ["旱芹"]),
    ("西芹", "蔬菜", ["西洋芹"]),
    ("韭菜", "蔬菜", []),
    ("香菜", "蔬菜", ["芫荽"]),
    ("茼蒿", "蔬菜", ["蒿子杆"]),
    ("空心菜", "蔬菜", ["蕹菜"]),
    ("芥蓝", "蔬菜", []),
    ("油麦菜", "蔬菜", ["莜麦菜"]),
    ("西兰花", "蔬菜", ["花椰菜", "绿花菜"]),
    ("菜花", "蔬菜", ["花菜", "白花菜"]),
    ("西红柿", "蔬菜", ["番茄"]),
    ("黄瓜", "蔬菜", ["青瓜"]),
    ("茄子", "蔬菜", []),
    ("青椒", "蔬菜", ["菜椒", "甜椒"]),
    ("辣椒", "蔬菜", ["小米辣", "尖椒", "杭椒"]),
    ("南瓜", "蔬菜", ["倭瓜"]),
    ("冬瓜", "蔬菜", []),
    ("苦瓜", "蔬菜", ["凉瓜"]),
    ("丝瓜", "蔬菜", []),
    ("西葫芦", "蔬菜", ["角瓜"]),
    ("豆角", "蔬菜", ["四季豆", "长豆角", "扁豆"]),
    ("毛豆", "蔬菜", []),
    ("豇豆", "蔬菜", ["长豆"]),
    ("豌豆", "蔬菜", ["青豆"]),
    ("土豆", "蔬菜", ["马铃薯", "洋芋"]),
    ("红薯", "蔬菜", ["地瓜", "番薯", "山芋"]),
    ("山药", "蔬菜", ["淮山"]),
    ("芋头", "蔬菜", ["芋艿"]),
    ("莲藕", "蔬菜", ["藕", "莲菜"]),
    ("白萝卜", "蔬菜", ["萝卜"]),
    ("胡萝卜", "蔬菜", ["红萝卜", "甘笋"]),
    ("洋葱", "蔬菜", ["圆葱", "葱头"]),
    ("大蒜", "蔬菜", ["蒜", "蒜头"]),
    ("蒜苗", "蔬菜", ["蒜薹", "青蒜"]),
    ("大葱", "蔬菜", ["葱", "老葱"]),
    ("小葱", "蔬菜", ["香葱"]),
    ("生姜", "蔬菜", ["姜"]),
    ("竹笋", "蔬菜", ["春笋", "冬笋"]),
    ("莴笋", "蔬菜", ["莴苣"]),
    ("木耳", "蔬菜", ["黑木耳", "云耳"]),
    ("银耳", "蔬菜", ["白木耳", "雪耳"]),

    ("香菇", "蘑菇", ["冬菇"]),
    ("金针菇", "蘑菇", []),
    ("平菇", "蘑菇", []),
    ("杏鲍菇", "蘑菇", []),
    ("茶树菇", "蘑菇", []),
    ("干香菇", "蘑菇", ["冬菇干"]),
    ("白蘑菇", "蘑菇", ["口蘑"]),

    ("海带", "蔬菜", ["昆布"]),
    ("紫菜", "蔬菜", []),
    ("豆芽", "蔬菜", ["黄豆芽", "绿豆芽"]),
    ("豆腐", "蔬菜", ["老豆腐", "北豆腐"]),
    ("嫩豆腐", "蔬菜", ["南豆腐", "内酯豆腐"]),
    ("豆腐干", "蔬菜", ["豆干", "香干"]),
    ("豆腐皮", "蔬菜", ["千张", "百叶"]),
    ("腐竹", "蔬菜", ["豆腐棍"]),

    ("草鱼", "海鲜", []),
    ("鲤鱼", "海鲜", []),
    ("鲫鱼", "海鲜", []),
    ("鲈鱼", "海鲜", []),
    ("带鱼", "海鲜", ["刀鱼"]),
    ("黄鱼", "海鲜", ["黄花鱼", "大黄鱼"]),
    ("三文鱼", "海鲜", ["鲑鱼"]),
    ("鳕鱼", "海鲜", []),
    ("鲳鱼", "海鲜", ["平鱼"]),
    ("鲢鱼", "海鲜", ["白鲢"]),
    ("黑鱼", "海鲜", ["乌鱼", "蛇头鱼"]),
    ("罗非鱼", "海鲜", ["非洲鲫鱼"]),
    ("对虾", "海鲜", ["大虾", "明虾"]),
    ("基围虾", "海鲜", ["沙虾"]),
    ("虾仁", "海鲜", ["去壳虾"]),
    ("小龙虾", "海鲜", ["克氏原螯虾"]),
    ("蟹", "海鲜", ["螃蟹", "大闸蟹"]),
    ("花蛤", "海鲜", ["蛤蜊", "文蛤"]),
    ("扇贝", "海鲜", ["干贝"]),
    ("生蚝", "海鲜", ["牡蛎", "海蛎子"]),
    ("鲍鱼", "海鲜", []),
    ("鱿鱼", "海鲜", ["枪乌贼"]),
    ("墨鱼", "海鲜", ["乌贼", "墨斗鱼"]),
    ("章鱼", "海鲜", ["八爪鱼", "八带"]),
    ("海参", "海鲜", []),
    ("海蜇", "海鲜", ["水母"]),
    ("蚬子", "海鲜", ["花蚬"]),

    ("苹果", "水果", []),
    ("梨", "水果", ["鸭梨", "雪梨"]),
    ("香蕉", "水果", []),
    ("橙子", "水果", ["脐橙", "甜橙"]),
    ("橘子", "水果", ["柑橘", "桔子"]),
    ("柚子", "水果", ["文旦"]),
    ("柠檬", "水果", []),
    ("草莓", "水果", []),
    ("蓝莓", "水果", []),
    ("葡萄", "水果", []),
    ("西瓜", "水果", []),
    ("哈密瓜", "水果", []),
    ("芒果", "水果", []),
    ("菠萝", "水果", ["凤梨"]),
    ("荔枝", "水果", []),
    ("桂圆", "水果", ["龙眼"]),
    ("猕猴桃", "水果", ["奇异果"]),
    ("石榴", "水果", []),
    ("樱桃", "水果", ["车厘子"]),
    ("桃子", "水果", ["水蜜桃", "毛桃"]),
    ("木瓜", "水果", []),
    ("椰子", "水果", []),
    ("枣", "水果", ["红枣", "大枣"]),

    ("葱", "辅料", ["大葱", "小葱", "香葱"]),
    ("姜", "辅料", ["生姜", "老姜"]),
    ("蒜", "辅料", ["大蒜", "蒜瓣"]),
    ("干辣椒", "辅料", ["干红椒"]),
    ("花椒", "辅料", ["川椒", "蜀椒"]),
    ("八角", "辅料", ["大料", "大茴香"]),
    ("桂皮", "辅料", ["肉桂", "川桂"]),
    ("香叶", "辅料", ["月桂叶", "桂叶"]),
    ("丁香", "辅料", []),
    ("小茴香", "辅料", ["茴香"]),
    ("孜然", "辅料", ["孜然粉"]),
    ("草果", "辅料", []),
    ("山奈", "辅料", ["沙姜"]),
    ("白芷", "辅料", []),
    ("陈皮", "辅料", ["橘子皮"]),
    ("鲜辣椒", "辅料", ["青辣椒", "红尖椒"]),
    ("泡椒", "辅料", ["泡辣椒"]),
    ("花椒油", "辅料", []),
    ("辣椒油", "辅料", ["红油"]),
    ("芝麻", "辅料", ["白芝麻", "黑芝麻"]),
    ("豆豉", "辅料", ["黑豆豉"]),
    ("腐乳", "辅料", ["豆腐乳", "红腐乳"]),
    ("豆瓣酱", "辅料", ["郫县豆瓣"]),
    ("甜面酱", "辅料", []),
    ("柱侯酱", "辅料", []),
    ("虾皮", "辅料", []),
    ("紫苏", "辅料", []),
    ("薄荷", "辅料", []),
    ("枸杞", "辅料", ["枸杞子"]),
    ("当归", "辅料", []),
    ("党参", "辅料", []),
    ("黄芪", "辅料", []),
    ("山楂干", "辅料", ["干山楂"]),
    ("罗汉果", "辅料", []),
    ("青花椒", "辅料", ["藤椒"]),
    ("白蔻", "辅料", ["白豆蔻"]),
    ("牛奶", "辅料", ["鲜奶"]),
    ("淡奶油", "辅料", ["淡忌廉", "鲜奶油"]),
    ("干木耳", "辅料", []),
    ("虾米", "辅料", ["海米", "金钩"]),
    ("干贝", "辅料", ["瑶柱"]),

    ("盐", "调味品", ["食盐", "精盐"]),
    ("白糖", "调味品", ["白砂糖"]),
    ("冰糖", "调味品", []),
    ("红糖", "调味品", ["黑糖"]),
    ("酱油", "调味品", ["生抽", "老抽"]),
    ("生抽", "调味品", ["淡酱油"]),
    ("老抽", "调味品", ["浓酱油"]),
    ("醋", "调味品", ["陈醋", "米醋"]),
    ("料酒", "调味品", ["黄酒", "绍兴酒"]),
    ("蚝油", "调味品", []),
    ("鸡精", "调味品", ["鸡粉"]),
    ("味精", "调味品", ["味素"]),
    ("番茄酱", "调味品", []),
    ("辣椒酱", "调味品", ["辣酱"]),
    ("芝麻酱", "调味品", ["麻酱"]),
    ("花生酱", "调味品", []),
    ("沙茶酱", "调味品", []),
    ("沙拉酱", "调味品", ["蛋黄酱"]),
    ("花生油", "调味品", []),
    ("菜籽油", "调味品", []),
    ("大豆油", "调味品", ["豆油"]),
    ("玉米油", "调味品", []),
    ("橄榄油", "调味品", []),
    ("猪油", "调味品", ["大油", "荤油"]),
    ("香油", "调味品", ["芝麻油", "麻油"]),
    ("十三香", "调味品", []),
    ("五香粉", "调味品", []),
    ("胡椒粉", "调味品", ["白胡椒", "黑胡椒"]),
    ("辣椒粉", "调味品", ["辣椒面"]),
    ("孜然粉", "调味品", []),
    ("咖喱粉", "调味品", ["咖喱"]),
    ("孜然粒", "调味品", []),
    ("淀粉", "调味品", ["生粉", "太白粉", "玉米淀粉"]),
    ("面粉", "调味品", ["小麦粉"]),
    ("糯米粉", "调味品", []),
    ("面包糠", "调味品", []),
    ("泡打粉", "调味品", ["发酵粉"]),
    ("酵母", "调味品", ["酵母粉"]),
    ("蜂蜜", "调味品", []),
    ("黄油", "调味品", ["牛油"]),
    ("黑胡椒", "调味品", ["黑胡椒粒", "黑胡椒粉"]),
]


async def create_preset_ingredients():
    from app.models.ingredient import Ingredient, IngredientAlias

    async with async_session_factory() as session:
        result = await session.execute(select(Ingredient))
        existing = result.scalars().first()

        if existing:
            print("✅ 食材数据已存在，跳过初始化")
            return

        for name, category, aliases in PRESET_INGREDIENTS:
            ingredient = Ingredient(name=name, category=category)
            session.add(ingredient)
            await session.flush()

            for alias in aliases:
                if alias.strip():
                    session.add(IngredientAlias(ingredient_id=ingredient.id, alias=alias.strip()))

        await session.commit()
        print(f"✅ 预设食材数据创建成功 ({len(PRESET_INGREDIENTS)} 个食材)")
