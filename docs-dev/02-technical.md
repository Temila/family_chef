# 家味 · Family Chef — 技术文档

> 版本：v1.0 | 日期：2026-05-08 | 状态：设计阶段

---

## 一、系统架构设计

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      Docker Container                    │
│  ┌─────────────────┐        ┌─────────────────────────┐ │
│  │   Frontend      │        │        Backend          │ │
│  │  React + Vite   │ ─HTTP─>│   FastAPI + Python      │ │
│  │   (Port 3000)   │        │   (Port 8000)           │ │
│  └─────────────────┘        └──────────┬──────────────┘ │
│                                        │                 │
│                              ┌─────────▼──────────────┐ │
│                              │       SQLite           │ │
│                              │   (Docker Volume)      │ │
│                              └────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              External Integrations               │  │
│  │  ┌─────────────┐    ┌─────────────────────────┐  │  │
│  │  │  Feishu API │    │   NLP Ingredient Parser  │  │  │
│  │  │  (Messages) │    │   (Text → Ingredients)   │  │  │
│  │  └─────────────┘    └─────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 1.2 技术栈选型

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **前端框架** | React | 18.x | 组件化开发 |
| **构建工具** | Vite | 5.x | 快速热更新 |
| **状态管理** | Zustand | 4.x | 轻量级状态管理 |
| **HTTP 客户端** | Axios | 1.x | API 请求 |
| **UI 样式** | CSS Modules + 自定义主题 | - | 深色温暖食欲系 |
| **后端框架** | FastAPI | 0.100+ | 高性能异步 API |
| **语言运行时** | Python | 3.11+ | 后端语言 |
| **包管理** | UV | 0.2+ | 极速 Python 包管理 |
| **数据库** | SQLite | 3.40+ | 轻量级嵌入式数据库 |
| **ORM** | SQLAlchemy | 2.x | 异步 ORM |
| **认证** | python-jose + passlib | - | JWT Token |
| **容器化** | Docker | 24+ | 单镜像部署 |

### 1.3 项目目录结构

```
order-system/
├── frontend/                 # 前端项目
│   ├── src/
│   │   ├── components/       # 通用组件
│   │   ├── pages/            # 页面组件
│   │   ├── stores/           # Zustand 状态管理
│   │   ├── services/         # API 服务层
│   │   ├── utils/            # 工具函数
│   │   ├── styles/           # 全局样式
│   │   └── types/            # TypeScript 类型定义
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                  # 后端项目
│   ├── app/
│   │   ├── main.py           # FastAPI 应用入口
│   │   ├── config.py         # 配置管理
│   │   ├── database.py       # 数据库连接
│   │   ├── models/           # SQLAlchemy 模型
│   │   ├── schemas/          # Pydantic 数据模型
│   │   ├── routers/          # API 路由
│   │   ├── services/         # 业务逻辑层
│   │   ├── utils/            # 工具函数
│   │   └── integrations/     # 外部集成（飞书等）
│   ├── tests/                # 测试文件
│   ├── pyproject.toml
│   └── uv.lock
│
├── docker/                   # Docker 配置
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── nginx.conf            # Nginx 反向代理配置
│
├── docs-dev/                 # 开发文档
│   ├── 01-requirements.md    # 需求文档
│   └── 02-technical.md       # 技术文档（本文档）
│
├── front-end-portotype/      # 前端原型
│   ├── v1/                   # 旧版原型
│   └── v2/                   # 新版响应式原型
│
└── README.md
```

---

## 二、数据库设计

### 2.1 ER 关系图

```
users 1──N orders 1──N order_items
  │                       │
  │                       └──N dishes (via order_items)
  │
  ├──N taste_preferences ──N ingredients
  │
  └──N favorites ──────────N dishes

dishes N──N ingredients (via dish_ingredients)
  │
  ├──N categories (via dish_categories)
  │
  └──1 category_type (categories table)

ingredients 1──N ingredient_aliases
```

### 2.2 表结构定义

#### 2.2.1 users — 用户表

```sql
CREATE TABLE users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        VARCHAR(50) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100),
    email           VARCHAR(100),
    avatar_url      VARCHAR(500),
    role            VARCHAR(20) NOT NULL DEFAULT 'user',
                   -- 'user': 普通用户, 'chef': 家庭厨师, 'admin': 超级管理员
    feishu_open_id  VARCHAR(100),
                   -- 关联的飞书 open_id
    is_active       BOOLEAN NOT NULL DEFAULT 1,
    force_pwd_change BOOLEAN NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_feishu ON users(feishu_open_id);
```

#### 2.2.2 ingredients — 食材主数据表

```sql
CREATE TABLE ingredients (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            VARCHAR(50) NOT NULL UNIQUE,
    pinyin          VARCHAR(100),
                   -- 拼音首字母，用于搜索
    category        VARCHAR(50),
                   -- 食材分类：肉类/蔬菜/调料/海鲜等
    description     TEXT,
    image_url       VARCHAR(500),
    is_active       BOOLEAN NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_ingredients_pinyin ON ingredients(pinyin);
```

#### 2.2.3 ingredient_aliases — 食材别名映射表

```sql
CREATE TABLE ingredient_aliases (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id   INTEGER NOT NULL,
    alias           VARCHAR(50) NOT NULL,
                   -- 别名，如 "西红柿" → "番茄"
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    UNIQUE(ingredient_id, alias)
);

CREATE INDEX idx_aliases_alias ON ingredient_aliases(alias);
```

#### 2.2.4 categories — 分类表

```sql
CREATE TABLE categories (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            VARCHAR(50) NOT NULL,
    type            VARCHAR(20) NOT NULL,
                   -- 分类类型：region(地区), cuisine(菜系),
                   -- taste(口味), season(季节)
    parent_id       INTEGER,
                   -- 父分类 ID（用于二级分类，如川菜属于中餐）
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);

CREATE INDEX idx_categories_type ON categories(type);
```

**预设分类数据：**

| type | name | parent | 说明 |
|------|------|--------|------|
| region | 中餐 | NULL | 地区 |
| region | 西餐 | NULL | 地区 |
| region | 日料 | NULL | 地区 |
| region | 印度菜 | NULL | 地区 |
| region | 东南亚菜 | NULL | 地区 |
| region | 黑暗料理界 | NULL | 地区 |
| cuisine | 川菜 | 中餐ID | 菜系 |
| cuisine | 鲁菜 | 中餐ID | 菜系 |
| cuisine | 粤菜 | 中餐ID | 菜系 |
| cuisine | 苏菜 | 中餐ID | 菜系 |
| cuisine | 浙菜 | 中餐ID | 菜系 |
| cuisine | 闽菜 | 中餐ID | 菜系 |
| cuisine | 湘菜 | 中餐ID | 菜系 |
| cuisine | 徽菜 | 中餐ID | 菜系 |
| cuisine | 法国 | 西餐ID | 西餐国家 |
| cuisine | 美国 | 西餐ID | 西餐国家 |
| cuisine | 意大利 | 西餐ID | 西餐国家 |
| taste | 辣 | NULL | 口味 |
| taste | 甜 | NULL | 口味 |
| taste | 酸 | NULL | 口味 |
| taste | 清淡 | NULL | 口味 |
| season | 春季 | NULL | 季节 |
| season | 夏季 | NULL | 季节 |
| season | 秋季 | NULL | 季节 |
| season | 冬季 | NULL | 季节 |

#### 2.2.5 dishes — 菜品表

```sql
CREATE TABLE dishes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            VARCHAR(100) NOT NULL,
    pinyin          VARCHAR(200),
                   -- 拼音首字母，用于排序和搜索
    description     TEXT,
                   -- 菜品介绍
    image_url       VARCHAR(500),
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
                   -- 'draft': 草稿, 'published': 上架, 'hidden': 隐藏
    is_popular      BOOLEAN NOT NULL DEFAULT 0,
                   -- 是否热门菜品
    created_by      INTEGER,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_dishes_name ON dishes(name);
CREATE INDEX idx_dishes_status ON dishes(status);
```

#### 2.2.6 dish_ingredients — 菜品-食材关联表

```sql
CREATE TABLE dish_ingredients (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    dish_id         INTEGER NOT NULL,
    ingredient_id   INTEGER NOT NULL,
    is_main         BOOLEAN NOT NULL DEFAULT 1,
                   -- 是否主要食材
    sort_order      INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
    UNIQUE(dish_id, ingredient_id)
);
```

#### 2.2.7 dish_categories — 菜品-分类关联表

```sql
CREATE TABLE dish_categories (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    dish_id         INTEGER NOT NULL,
    category_id     INTEGER NOT NULL,
    FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    UNIQUE(dish_id, category_id)
);
```

#### 2.2.8 orders — 订单表

```sql
CREATE TABLE orders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no        VARCHAR(20) NOT NULL UNIQUE,
                   -- 订单号，如 ORD20260508001
    user_id         INTEGER NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
                   -- 'pending': 待确认, 'accepted': 已接受,
                   -- 'cooking': 制作中, 'completed': 已完成,
                   -- 'cancelled': 已取消
    chef_id         INTEGER,
                   -- 分配的厨师 ID
    notes           TEXT,
                   -- 用户备注
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at    DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (chef_id) REFERENCES users(id)
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_chef ON orders(chef_id);
```

#### 2.2.9 order_items — 订单详情表

```sql
CREATE TABLE order_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id        INTEGER NOT NULL,
    dish_id         INTEGER NOT NULL,
    quantity        INTEGER NOT NULL DEFAULT 1,
    special_notes   TEXT,
                   -- 单品备注，如"不要辣"
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (dish_id) REFERENCES dishes(id)
);
```

#### 2.2.10 favorites — 收藏表

```sql
CREATE TABLE favorites (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    dish_id         INTEGER NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
    UNIQUE(user_id, dish_id)
);
```

#### 2.2.11 taste_preferences — 口味偏好表

```sql
CREATE TABLE taste_preferences (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    ingredient_id   INTEGER NOT NULL,
    preference_type VARCHAR(20) NOT NULL,
                   -- 'dislike': 不爱吃 (黄色标签)
                   -- 'allergy': 严格忌口 (红色标签)
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
    UNIQUE(user_id, ingredient_id, preference_type)
);
```

#### 2.2.12 chef_schedules — 厨师排班表

```sql
CREATE TABLE chef_schedules (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    chef_id         INTEGER NOT NULL,
    schedule_date   DATE NOT NULL,
    meal_type       VARCHAR(20) NOT NULL,
                   -- 'breakfast': 早餐, 'lunch': 午餐, 'dinner': 晚餐
    is_available    BOOLEAN NOT NULL DEFAULT 1,
    notes           TEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chef_id) REFERENCES users(id),
    UNIQUE(chef_id, schedule_date, meal_type)
);
```

#### 2.2.13 system_logs — 系统日志表

```sql
CREATE TABLE system_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER,
    action          VARCHAR(50) NOT NULL,
                   -- 操作类型：create_dish, update_user, submit_order 等
    target_type     VARCHAR(50),
                   -- 目标类型：dish, user, order 等
    target_id       INTEGER,
                   -- 目标 ID
    detail          TEXT,
                   -- 操作详情（JSON）
    ip_address      VARCHAR(45),
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_logs_user ON system_logs(user_id);
CREATE INDEX idx_logs_action ON system_logs(action);
CREATE INDEX idx_logs_created ON system_logs(created_at);
```

---

## 三、接口设计

### 3.1 接口总览

| 组别 | 路由前缀 | 端点数 | 说明 |
|------|----------|--------|------|
| 认证 | `/api/auth` | 3 | 登录、注册、Token 刷新 |
| 用户 | `/api/users` | 5 | 用户 CRUD、角色管理 |
| 菜品 | `/api/dishes` | 6 | 菜品 CRUD、搜索、筛选 |
| 订单 | `/api/orders` | 5 | 订单创建、查询、状态更新 |
| 食材 | `/api/ingredients` | 4 | 食材 CRUD、别名管理 |
| 分类 | `/api/categories` | 3 | 分类 CRUD、列表查询 |
| 收藏 | `/api/favorites` | 2 | 添加/取消收藏、收藏列表 |
| 口味偏好 | `/api/preferences` | 2 | 偏好设置、偏好查询 |
| 厨师 | `/api/chefs` | 3 | 排班管理、工作量统计 |
| 系统 | `/api/admin` | 4 | 日志查询、系统配置 |
| 飞书 | `/api/feishu` | 2 | 消息推送、账号绑定 |
| 工具 | `/api/tools` | 1 | 文本食材抽取 |
| 文件 | `/api/upload` | 1 | 图片上传 |

### 3.2 详细接口定义

#### 3.2.1 认证接口 `/api/auth`

**POST /api/auth/login** — 用户登录
```json
// Request
{
  "username": "string",
  "password": "string"
}

// Response (200)
{
  "access_token": "string (JWT)",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": 1,
    "username": "string",
    "display_name": "string",
    "role": "user|chef|admin",
    "force_pwd_change": false
  }
}
```

**POST /api/auth/register** — 用户注册（可选，默认由管理员创建）
```json
// Request
{
  "username": "string",
  "password": "string",
  "display_name": "string",
  "email": "string"
}

// Response (201)
{
  "id": 2,
  "username": "string",
  "display_name": "string",
  "role": "user"
}
```

**POST /api/auth/refresh** — 刷新 Token
```json
// Request
{
  "refresh_token": "string"
}

// Response (200)
{
  "access_token": "string (JWT)",
  "refresh_token": "string",
  "expires_in": 86400
}
```

#### 3.2.2 用户管理接口 `/api/users`

**GET /api/users** — 用户列表
```
Query Params: page=1, page_size=20, role=user|chef|admin, search=string

// Response (200)
{
  "total": 6,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "id": 1,
      "username": "string",
      "display_name": "string",
      "role": "admin",
      "is_active": true,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

**GET /api/users/{user_id}** — 用户详情

**PUT /api/users/{user_id}** — 更新用户信息
```json
// Request
{
  "display_name": "string",
  "email": "string",
  "role": "user|chef|admin",
  "is_active": true
}
```

**PUT /api/users/{user_id}/password** — 修改密码
```json
// Request
{
  "old_password": "string",
  "new_password": "string"
}
```

**DELETE /api/users/{user_id}** — 删除用户（软删除，设置 is_active=false）

#### 3.2.3 菜品管理接口 `/api/dishes`

**GET /api/dishes** — 菜品列表（支持搜索和筛选）
```
Query Params:
  page=1, page_size=20
  search=string (菜名/食材模糊搜索)
  regions=1,2,3 (地区 ID 列表)
  cuisines=4,5 (菜系 ID 列表)
  tastes=6,7 (口味 ID 列表)
  seasons=8,9 (季节 ID 列表)
  favorites_only=true|false
  sort=alpha|safety (按字母排序 / 安全优先)
  user_id=1 (用于安全优先排序的忌口判断)

// Response (200)
{
  "total": 128,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "id": 1,
      "name": "麻婆豆腐",
      "pinyin": "MPDF",
      "image_url": "string",
      "status": "published",
      "categories": [
        {"id": 1, "name": "川菜", "type": "cuisine"}
      ],
      "dietary_warnings": [
        {"type": "dislike", "ingredient": "花生"}
        // 或 {"type": "allergy", "ingredient": "鱼类"}
        // 或 null (无警告)
      ]
    }
  ]
}
```

**GET /api/dishes/{dish_id}** — 菜品详情
```json
// Response (200)
{
  "id": 1,
  "name": "麻婆豆腐",
  "description": "string",
  "image_url": "string",
  "is_popular": true,
  "categories": [...],
  "ingredients": [
    {
      "id": 1,
      "name": "豆腐",
      "is_main": true
    }
  ],
  "nutrition": {
    "calories": 156,
    "protein": "8.1g",
    "fat": "10.2g"
  },
  "dietary_warning": null
}
```

**POST /api/dishes** — 新增菜品
```json
// Request
{
  "name": "string",
  "description": "string",
  "image_url": "string",
  "is_popular": false,
  "category_ids": [1, 17, 21],
  "ingredient_ids": [1, 2, 3, 4]
}
```

**PUT /api/dishes/{dish_id}** — 更新菜品

**DELETE /api/dishes/{dish_id}** — 删除菜品

**PUT /api/dishes/{dish_id}/status** — 更新菜品状态
```json
// Request
{
  "status": "draft|published|hidden"
}
```

#### 3.2.4 订单管理接口 `/api/orders`

**POST /api/orders** — 创建订单
```json
// Request
{
  "items": [
    {"dish_id": 1, "quantity": 1, "special_notes": "string"},
    {"dish_id": 2, "quantity": 1}
  ],
  "notes": "string (用户备注)"
}

// Response (201)
{
  "id": 1028,
  "order_no": "ORD20260508001",
  "user_id": 1,
  "status": "pending",
  "items": [...],
  "created_at": "2026-05-08T10:30:00Z"
}
```

**GET /api/orders** — 订单列表
```
Query Params:
  user_id=1 (查看自己的订单)
  chef_id=1 (厨师查看所有订单)
  status=pending|accepted|cooking|completed|cancelled
  page=1, page_size=20
```

**GET /api/orders/{order_id}** — 订单详情

**PUT /api/orders/{order_id}/status** — 更新订单状态
```json
// Request (厨师操作)
{
  "status": "accepted|cooking|completed"
}
```

**DELETE /api/orders/{order_id}** — 取消订单（仅用户自己可取消 pending 状态的订单）

#### 3.2.5 食材管理接口 `/api/ingredients`

**GET /api/ingredients** — 食材列表
```
Query Params: page, page_size, search, category
```

**POST /api/ingredients** — 新增食材
```json
// Request
{
  "name": "string",
  "category": "肉类|蔬菜|调料|海鲜|豆制品|其他",
  "description": "string",
  "aliases": ["别名1", "别名2"]
}
```

**PUT /api/ingredients/{ingredient_id}** — 更新食材

**DELETE /api/ingredients/{ingredient_id}** — 删除食材

#### 3.2.6 分类管理接口 `/api/categories`

**GET /api/categories** — 分类列表
```
Query Params: type=region|cuisine|taste|season, tree=true (树形结构)
```

**POST /api/categories** — 新增分类

**PUT /api/categories/{category_id}** — 更新分类

#### 3.2.7 收藏管理接口 `/api/favorites`

**POST /api/favorites** — 添加收藏
```json
// Request
{
  "dish_id": 1
}
```

**DELETE /api/favorites/{dish_id}** — 取消收藏

**GET /api/favorites** — 收藏列表
```
Query Params: user_id=1, page, page_size
```

#### 3.2.8 口味偏好接口 `/api/preferences`

**GET /api/preferences** — 获取当前用户口味偏好
```json
// Response (200)
{
  "dislikes": [
    {"id": 1, "name": "花生"},
    {"id": 2, "name": "葱"}
  ],
  "allergies": [
    {"id": 3, "name": "鱼类"}
  ]
}
```

**PUT /api/preferences** — 更新口味偏好
```json
// Request
{
  "dislikes": [1, 2, 3],
  "allergies": [4, 5]
}
// 传入食材 ID 列表，全量替换
```

#### 3.2.9 厨师管理接口 `/api/chefs`

**GET /api/chefs** — 厨师列表

**GET /api/chefs/schedules** — 排班查询
```
Query Params: date=2026-05-08, chef_id=1
```

**PUT /api/chefs/schedules** — 更新排班
```json
// Request
{
  "chef_id": 1,
  "schedule_date": "2026-05-08",
  "meal_type": "dinner",
  "is_available": true
}
```

#### 3.2.10 系统管理接口 `/api/admin`

**GET /api/admin/logs** — 系统日志查询
```
Query Params: user_id, action, start_date, end_date, page, page_size
```

**GET /api/admin/stats** — 系统统计数据
```json
// Response (200)
{
  "total_users": 6,
  "total_dishes": 128,
  "total_ingredients": 86,
  "today_orders": 23,
  "week_orders": 45
}
```

**GET /api/admin/dashboard** — 管理后台仪表盘数据
```json
// Response (200)
{
  "stats": {...},
  "recent_orders": [...],
  "recent_activities": [...],
  "chef_workload": [
    {"chef_id": 1, "chef_name": "string", "today_completed": 5}
  ]
}
```

**PUT /api/admin/config** — 系统配置更新

#### 3.2.11 飞书集成接口 `/api/feishu`

**POST /api/feishu/bind** — 绑定飞书账号
```json
// Request
{
  "feishu_open_id": "string",
  "feishu_union_id": "string"
}
```

**POST /api/feishu/notify** — 发送飞书消息（内部调用）
```json
// Request
{
  "user_open_id": "string",
  "title": "string",
  "content": "string",
  "order_no": "string (可选)"
}
```

#### 3.2.12 工具接口 `/api/tools`

**POST /api/tools/extract-ingredients** — 从文本中抽取食材
```json
// Request
{
  "text": "麻婆豆腐主要使用豆腐、猪肉末、豆瓣酱、花椒等食材制作"
}

// Response (200)
{
  "extracted": [
    {"name": "豆腐", "matched_id": 1, "confidence": 0.95},
    {"name": "猪肉末", "matched_id": 2, "confidence": 0.90},
    {"name": "豆瓣酱", "matched_id": 3, "confidence": 0.88},
    {"name": "花椒", "matched_id": 4, "confidence": 0.92}
  ],
  "unmatched": []
}
```

#### 3.2.13 文件上传接口 `/api/upload`

**POST /api/upload/image** — 上传图片
```
Content-Type: multipart/form-data
Fields: file (image file)

// Response (200)
{
  "url": "/uploads/dishes/mapo_tofu_20260508.jpg"
}
```

---

## 四、认证与安全

### 4.1 JWT Token 结构

```json
{
  "sub": "1",                    // user_id
  "username": "temila",
  "role": "admin",
  "exp": 1715174400,             // 过期时间（24小时）
  "iat": 1715088000              // 签发时间
}
```

### 4.2 权限矩阵

| 接口 | 普通用户 | 家庭厨师 | 超级管理员 |
|------|----------|----------|------------|
| 浏览菜品 | ✅ | ✅ | ✅ |
| 创建订单 | ✅ | ✅ | ✅ |
| 管理自己的订单 | ✅ | ✅ | ✅ |
| 查看所有订单 | ❌ | ✅ | ✅ |
| 更新订单状态 | ❌ | ✅ | ✅ |
| 管理菜品 | ❌ | ❌ | ✅ |
| 管理食材 | ❌ | ❌ | ✅ |
| 管理用户 | ❌ | ❌ | ✅ |
| 查看系统日志 | ❌ | ❌ | ✅ |

### 4.3 安全措施

- 密码使用 bcrypt 加密存储
- JWT Token 有效期 24 小时，支持 refresh token 续期
- 首次登录强制修改密码（force_pwd_change 标志）
- API 请求需要携带 Authorization: Bearer <token>
- 敏感操作记录系统日志

---

## 五、部署方案

### 5.1 Docker 单镜像部署

```dockerfile
# Dockerfile
FROM python:3.11-slim AS backend-builder
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen

FROM python:3.11-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app

# Backend
COPY --from=backend-builder /app/backend/.venv /app/.venv
COPY backend/ /app/backend/

# Frontend (served by Nginx)
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Nginx config
COPY docker/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["sh", "-c", "uv run --project /app/backend uvicorn app.main:app --host 0.0.0.0 --port 8000 & nginx -g 'daemon off;'"]
```

### 5.2 Docker Compose 配置

```yaml
# docker-compose.yml
version: '3.8'
services:
  family-chef:
    build: .
    ports:
      - "80:80"
    volumes:
      - sqlite-data:/app/data
    environment:
      - SECRET_KEY=<random-secret-key>
      - FEISHU_APP_ID=<feishu-app-id>
      - FEISHU_APP_SECRET=<feishu-app-secret>
    restart: unless-stopped

volumes:
  sqlite-data:
```

### 5.3 Nginx 反向代理配置

```nginx
# nginx.conf
server {
    listen 80;
    server_name _;

    # Frontend static files
    location / {
        root /app/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Upload files
    location /uploads/ {
        alias /app/data/uploads/;
        expires 30d;
    }
}
```

---

## 六、开发计划

### 6.1 里程碑

| 阶段 | 内容 | 预计时间 |
|------|------|----------|
| Phase 1 | 项目初始化、数据库搭建、认证系统 | 2 天 |
| Phase 2 | 核心 API（菜品、订单、食材） | 3 天 |
| Phase 3 | 前端页面开发 | 3 天 |
| Phase 4 | 飞书集成、食材抽取 | 2 天 |
| Phase 5 | 测试、优化、部署 | 2 天 |

### 6.2 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| SQLite 并发写入限制 | 多用户同时下单可能冲突 | 使用 WAL 模式，合理设置超时 |
| 飞书 API 限流 | 消息推送延迟 | 异步队列处理，失败重试 |
| 食材抽取准确率 | 自动识别可能不准确 | 提供人工校正界面 |

---

*文档结束*
