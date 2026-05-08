# 家味 · Family Chef — 后端服务开发计划

> 版本：v1.0 | 日期：2026-05-08 | 状态：待执行

---

## 开发策略

**先搭建整体框架，再分模块实现功能点**

```
Phase 0: 项目初始化与环境配置
  ↓
Phase 1: 整体框架搭建（核心基础设施）
  ↓
Phase 2: 认证模块（基础依赖）
  ↓
Phase 3: 数据模型模块（用户、食材、分类）
  ↓
Phase 4: 核心业务模块（菜品、订单）
  ↓
Phase 5: 辅助功能模块（收藏、口味偏好、厨师管理）
  ↓
Phase 6: 管理后台模块（系统管理、仪表盘）
  ↓
Phase 7: 外部集成（飞书、食材抽取）
  ↓
Phase 8: 测试与优化
  ↓
Phase 9: 部署与上线
```

---

## Phase 0: 项目初始化与环境配置

### 0.1 项目结构创建

- [ ] 创建后端项目目录结构
  ```
  backend/
  ├── app/
  │   ├── __init__.py
  │   ├── main.py
  │   ├── config.py
  │   ├── database.py
  │   ├── models/
  │   │   ├── __init__.py
  │   │   ├── user.py
  │   │   ├── ingredient.py
  │   │   ├── category.py
  │   │   ├── dish.py
  │   │   ├── order.py
  │   │   ├── favorite.py
  │   │   ├── preference.py
  │   │   ├── schedule.py
  │   │   └── log.py
  │   ├── schemas/
  │   │   ├── __init__.py
  │   │   ├── user.py
  │   │   ├── ingredient.py
  │   │   ├── category.py
  │   │   ├── dish.py
  │   │   ├── order.py
  │   │   ├── favorite.py
  │   │   ├── preference.py
  │   │   └── common.py
  │   ├── routers/
  │   │   ├── __init__.py
  │   │   ├── auth.py
  │   │   ├── users.py
  │   │   ├── dishes.py
  │   │   ├── orders.py
  │   │   ├── ingredients.py
  │   │   ├── categories.py
  │   │   ├── favorites.py
  │   │   ├── preferences.py
  │   │   ├── chefs.py
  │   │   ├── admin.py
  │   │   ├── feishu.py
  │   │   ├── tools.py
  │   │   └── upload.py
  │   ├── services/
  │   │   ├── __init__.py
  │   │   ├── auth_service.py
  │   │   ├── user_service.py
  │   │   ├── dish_service.py
  │   │   ├── order_service.py
  │   │   ├── ingredient_service.py
  │   │   ├── category_service.py
  │   │   ├── favorite_service.py
  │   │   ├── preference_service.py
  │   │   ├── chef_service.py
  │   │   ├── admin_service.py
  │   │   └── dashboard_service.py
  │   ├── utils/
  │   │   ├── __init__.py
  │   │   ├── security.py
  │   │   ├── pagination.py
  │   │   ├── response.py
  │   │   └── pinyin.py
  │   └── integrations/
  │       ├── __init__.py
  │       └── feishu.py
  ├── tests/
  │   ├── __init__.py
  │   ├── conftest.py
  │   ├── test_auth.py
  │   ├── test_users.py
  │   ├── test_dishes.py
  │   └── test_orders.py
  ├── pyproject.toml
  └── .env.example
  ```

- [ ] 初始化 Git 仓库（如未初始化）
- [ ] 创建 `.gitignore` 文件
- [ ] 创建 `README.md` 文件

### 0.2 依赖安装与配置

- [ ] 创建 `pyproject.toml`，配置项目元数据和依赖
  ```toml
  [project]
  name = "family-chef-backend"
  version = "0.1.0"
  requires-python = ">=3.11"
  dependencies = [
      "fastapi>=0.100.0",
      "uvicorn[standard]>=0.23.0",
      "sqlalchemy>=2.0.0",
      "pydantic>=2.0.0",
      "python-jose[cryptography]>=3.3.0",
      "passlib[bcrypt]>=1.7.4",
      "python-multipart>=0.0.6",
      "aiofiles>=23.0.0",
      "httpx>=0.24.0",
      "pypinyin>=0.49.0",
  ]
  ```

- [ ] 运行 `uv sync` 安装依赖
- [ ] 创建 `.env.example` 配置文件模板
  ```env
  # 应用配置
  APP_NAME=家味·Family Chef
  APP_VERSION=0.1.0
  DEBUG=true
  SECRET_KEY=your-secret-key-here-change-in-production

  # 数据库配置
  DATABASE_URL=sqlite+aiosqlite:///./data/family_chef.db

  # JWT 配置
  JWT_SECRET_KEY=your-jwt-secret-key
  JWT_ALGORITHM=HS256
  JWT_EXPIRE_MINUTES=1440

  # 飞书配置
  FEISHU_APP_ID=
  FEISHU_APP_SECRET=
  FEISHU_APP_TOKEN=

  # 文件上传配置
  UPLOAD_DIR=./data/uploads
  MAX_UPLOAD_SIZE=5242880  # 5MB
  ```

- [ ] 创建 `.env` 本地开发配置文件
- [ ] 创建 `data/` 目录（SQLite 数据库和上传文件存储）

---

## Phase 1: 整体框架搭建

### 1.1 配置管理

- [ ] 实现 `app/config.py`
  - [ ] 使用 `pydantic.BaseSettings` 定义配置类
  - [ ] 从环境变量加载配置
  - [ ] 配置日志输出格式和级别
  - [ ] 配置 CORS 允许前端访问

- [ ] 验证配置加载
  ```bash
  python -c "from app.config import settings; print(settings.APP_NAME)"
  ```

### 1.2 数据库连接

- [ ] 实现 `app/database.py`
  - [ ] 配置 SQLAlchemy 异步引擎（`create_async_engine`）
  - [ ] 配置 SQLite WAL 模式（提升并发性能）
  - [ ] 创建异步会话工厂（`async_sessionmaker`）
  - [ ] 实现数据库依赖注入（`get_db`）
  - [ ] 实现数据库初始化和自动建表（`Base.metadata.create_all`）

- [ ] 创建 `app/models/__init__.py`，导入所有模型
- [ ] 验证数据库连接
  ```bash
  python -c "from app.database import engine; print('DB connected')"
  ```

### 1.3 FastAPI 应用入口

- [ ] 实现 `app/main.py`
  - [ ] 创建 FastAPI 应用实例
  - [ ] 配置 CORS 中间件
  - [ ] 配置日志中间件
  - [ ] 注册所有路由（暂时返回占位响应）
  - [ ] 实现应用启动和关闭事件
  - [ ] 实现全局异常处理器

- [ ] 验证应用启动
  ```bash
  uv run uvicorn app.main:app --reload
  # 访问 http://localhost:8000/docs 确认 Swagger UI 正常
  ```

### 1.4 通用工具模块

- [ ] 实现 `app/utils/response.py`
  - [ ] 统一响应格式封装（`ApiResponse`）
  - [ ] 分页响应封装（`PaginatedResponse`）
  - [ ] 错误响应封装（`ErrorResponse`）

- [ ] 实现 `app/utils/pagination.py`
  - [ ] 分页参数解析（`PaginationParams`）
  - [ ] 分页查询辅助函数

- [ ] 实现 `app/utils/security.py`
  - [ ] 密码哈希生成（`hash_password`）
  - [ ] 密码验证（`verify_password`）
  - [ ] JWT Token 生成（`create_access_token`）
  - [ ] JWT Token 验证（`decode_access_token`）

- [ ] 实现 `app/utils/pinyin.py`
  - [ ] 中文转拼音首字母（`get_pinyin_initial`）
  - [ ] 用于菜品排序和搜索

### 1.5 基础 Pydantic Schema

- [ ] 实现 `app/schemas/common.py`
  - [ ] 通用响应 schema（`BaseResponse`）
  - [ ] 分页参数 schema（`PageParams`）
  - [ ] 分页响应 schema（`PageResponse[T]`）
  - [ ] 错误响应 schema（`ErrorDetail`）

---

## Phase 2: 认证模块

> **依赖**：Phase 1 完成
> **涉及文件**：`routers/auth.py`, `services/auth_service.py`, `schemas/user.py`
> **涉及接口**：`POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/refresh`

### 2.1 数据模型

- [ ] 完善 `app/models/user.py`
  - [ ] 定义 `User` 模型类
  - [ ] 添加字段：id, username, password_hash, display_name, email, avatar_url, role, feishu_open_id, is_active, force_pwd_change, created_at, updated_at
  - [ ] 添加索引：username (unique), feishu_open_id
  - [ ] 添加 `__repr__` 方法

### 2.2 Schema 定义

- [ ] 实现 `app/schemas/user.py`
  - [ ] `UserCreate` — 创建用户请求
  - [ ] `UserUpdate` — 更新用户请求
  - [ ] `UserLogin` — 登录请求
  - [ ] `UserResponse` — 用户响应（不含密码）
  - [ ] `TokenResponse` — Token 响应（含 access_token, refresh_token, expires_in, user）
  - [ ] `RefreshTokenRequest` — 刷新 Token 请求

### 2.3 认证服务

- [ ] 实现 `app/services/auth_service.py`
  - [ ] `authenticate_user` — 验证用户名和密码
  - [ ] `create_user` — 创建新用户（含密码哈希）
  - [ ] `create_tokens` — 生成 access_token 和 refresh_token
  - [ ] `refresh_access_token` — 刷新 Token
  - [ ] `get_current_user` — 从 Token 获取当前用户（依赖注入）
  - [ ] `require_role` — 角色权限检查装饰器

### 2.4 认证路由

- [ ] 实现 `app/routers/auth.py`
  - [ ] `POST /api/auth/login` — 用户登录
    - [ ] 验证用户名和密码
    - [ ] 返回 JWT Token 和用户信息
    - [ ] 检查 force_pwd_change 标志
  - [ ] `POST /api/auth/register` — 用户注册（可选）
    - [ ] 验证用户名唯一性
    - [ ] 创建用户（默认角色 user）
    - [ ] 返回用户信息
  - [ ] `POST /api/auth/refresh` — 刷新 Token
    - [ ] 验证 refresh_token
    - [ ] 返回新的 access_token 和 refresh_token

### 2.5 初始化数据

- [ ] 创建 `app/initial_data.py`
  - [ ] 创建默认超级管理员账号（admin/admin）
  - [ ] 设置 force_pwd_change = True
  - [ ] 在应用启动时自动执行

### 2.6 测试

- [ ] 编写 `tests/test_auth.py`
  - [ ] 测试登录成功
  - [ ] 测试登录失败（错误密码）
  - [ ] 测试 Token 刷新
  - [ ] 测试默认管理员账号登录
  - [ ] 测试 force_pwd_change 标志

---

## Phase 3: 数据模型模块

> **依赖**：Phase 2 完成
> **包含子模块**：用户管理、食材管理、分类管理

### 3.1 用户管理模块

> **涉及接口**：`GET/POST/PUT/DELETE /api/users/*`

- [ ] 实现 `app/services/user_service.py`
  - [ ] `get_user_by_id` — 根据 ID 获取用户
  - [ ] `get_user_by_username` — 根据用户名获取用户
  - [ ] `list_users` — 分页查询用户列表（支持 role 筛选、search 搜索）
  - [ ] `create_user` — 创建用户
  - [ ] `update_user` — 更新用户信息
  - [ ] `update_user_password` — 修改密码
  - [ ] `delete_user` — 软删除用户（设置 is_active=False）
  - [ ] `get_user_stats` — 获取用户统计数据（本周已点、收藏数、忌口数）

- [ ] 实现 `app/routers/users.py`
  - [ ] `GET /api/users` — 用户列表
  - [ ] `GET /api/users/{user_id}` — 用户详情
  - [ ] `PUT /api/users/{user_id}` — 更新用户
  - [ ] `PUT /api/users/{user_id}/password` — 修改密码
  - [ ] `DELETE /api/users/{user_id}` — 删除用户

- [ ] 编写测试
  - [ ] 测试用户列表查询（分页、筛选）
  - [ ] 测试用户详情查询
  - [ ] 测试用户信息更新
  - [ ] 测试密码修改
  - [ ] 测试用户删除（软删除）

### 3.2 食材管理模块

> **涉及接口**：`GET/POST/PUT/DELETE /api/ingredients/*`

- [ ] 实现 `app/models/ingredient.py`
  - [ ] 定义 `Ingredient` 模型
  - [ ] 定义 `IngredientAlias` 模型
  - [ ] 添加索引和关联关系

- [ ] 实现 `app/schemas/ingredient.py`
  - [ ] `IngredientCreate` — 创建食材请求
  - [ ] `IngredientUpdate` — 更新食材请求
  - [ ] `IngredientResponse` — 食材响应
  - [ ] `IngredientAliasCreate` — 创建别名请求

- [ ] 实现 `app/services/ingredient_service.py`
  - [ ] `get_ingredient_by_id` — 根据 ID 获取食材
  - [ ] `get_ingredient_by_name` — 根据名称获取食材（含别名匹配）
  - [ ] `list_ingredients` — 分页查询食材列表（支持分类筛选、搜索）
  - [ ] `create_ingredient` — 创建食材（含别名）
  - [ ] `update_ingredient` — 更新食材
  - [ ] `delete_ingredient` — 删除食材
  - [ ] `add_alias` — 添加食材别名
  - [ ] `remove_alias` — 删除食材别名

- [ ] 实现 `app/routers/ingredients.py`
  - [ ] `GET /api/ingredients` — 食材列表
  - [ ] `POST /api/ingredients` — 新增食材
  - [ ] `PUT /api/ingredients/{ingredient_id}` — 更新食材
  - [ ] `DELETE /api/ingredients/{ingredient_id}` — 删除食材

- [ ] 编写测试
  - [ ] 测试食材 CRUD
  - [ ] 测试别名管理
  - [ ] 测试别名匹配查询

### 3.3 分类管理模块

> **涉及接口**：`GET/POST/PUT /api/categories/*`

- [ ] 实现 `app/models/category.py`
  - [ ] 定义 `Category` 模型
  - [ ] 添加自引用外键（parent_id）
  - [ ] 添加索引：type

- [ ] 实现 `app/schemas/category.py`
  - [ ] `CategoryCreate` — 创建分类请求
  - [ ] `CategoryUpdate` — 更新分类请求
  - [ ] `CategoryResponse` — 分类响应（含子分类）

- [ ] 实现 `app/services/category_service.py`
  - [ ] `get_category_by_id` — 根据 ID 获取分类
  - [ ] `list_categories` — 查询分类列表（支持 type 筛选）
  - [ ] `get_category_tree` — 获取分类树形结构
  - [ ] `create_category` — 创建分类
  - [ ] `update_category` — 更新分类

- [ ] 实现 `app/routers/categories.py`
  - [ ] `GET /api/categories` — 分类列表（支持 tree 参数）
  - [ ] `POST /api/categories` — 新增分类
  - [ ] `PUT /api/categories/{category_id}` — 更新分类

- [ ] 初始化预设分类数据
  - [ ] 创建地区分类（中餐、西餐、日料、印度菜、东南亚菜、黑暗料理界、其他）
  - [ ] 创建菜系分类（川菜、鲁菜、粤菜、苏菜、浙菜、闽菜、湘菜、徽菜）
  - [ ] 创建西餐国家分类（法国、美国、意大利）
  - [ ] 创建口味分类（辣、甜、酸、清淡）
  - [ ] 创建季节分类（春季、夏季、秋季、冬季）

- [ ] 编写测试
  - [ ] 测试分类列表查询
  - [ ] 测试分类树形结构
  - [ ] 测试预设分类数据初始化

---

## Phase 4: 核心业务模块

> **依赖**：Phase 3 完成
> **包含子模块**：菜品管理、订单管理

### 4.1 菜品管理模块

> **涉及接口**：`GET/POST/PUT/DELETE /api/dishes/*`
> **核心功能**：多维度筛选、忌口提示、排序

- [ ] 实现 `app/models/dish.py`
  - [ ] 定义 `Dish` 模型
  - [ ] 定义 `DishIngredient` 模型（菜品-食材关联）
  - [ ] 定义 `DishCategory` 模型（菜品-分类关联）
  - [ ] 添加索引：name, status
  - [ ] 添加关联关系

- [ ] 实现 `app/schemas/dish.py`
  - [ ] `DishCreate` — 创建菜品请求
  - [ ] `DishUpdate` — 更新菜品请求
  - [ ] `DishListResponse` — 菜品列表项响应
  - [ ] `DishDetailResponse` — 菜品详情响应（含食材、分类、忌口提示）
  - [ ] `DishQueryParams` — 菜品查询参数（search, regions, cuisines, tastes, seasons, favorites_only, sort, user_id）
  - [ ] `DietaryWarning` — 忌口提示 schema

- [ ] 实现 `app/services/dish_service.py`
  - [ ] `get_dish_by_id` — 根据 ID 获取菜品详情
  - [ ] `list_dishes` — 分页查询菜品列表（支持多维度筛选）
    - [ ] 按地区筛选（region category_ids）
    - [ ] 按菜系筛选（cuisine category_ids）
    - [ ] 按口味筛选（taste category_ids）
    - [ ] 按季节筛选（season category_ids）
    - [ ] 按收藏筛选（favorites_only）
    - [ ] 模糊搜索（菜名、食材名）
  - [ ] `create_dish` — 创建菜品（含食材和分类关联）
  - [ ] `update_dish` — 更新菜品
  - [ ] `delete_dish` — 删除菜品
  - [ ] `update_dish_status` — 更新菜品状态（draft/published/hidden）
  - [ ] `get_dietary_warnings` — 获取菜品忌口提示（对比用户口味偏好）
  - [ ] `sort_dishes_by_safety` — 按安全优先排序（无标签 > 不爱吃 > 严格忌口）
  - [ ] `generate_pinyin` — 自动生成菜品拼音首字母

- [ ] 实现 `app/routers/dishes.py`
  - [ ] `GET /api/dishes` — 菜品列表（支持搜索和筛选）
  - [ ] `GET /api/dishes/{dish_id}` — 菜品详情
  - [ ] `POST /api/dishes` — 新增菜品
  - [ ] `PUT /api/dishes/{dish_id}` — 更新菜品
  - [ ] `DELETE /api/dishes/{dish_id}` — 删除菜品
  - [ ] `PUT /api/dishes/{dish_id}/status` — 更新菜品状态

- [ ] 添加示例菜品数据
  - [ ] 麻婆豆腐（川菜、辣、春季）
  - [ ] 红烧肉（鲁菜、甜、冬季）
  - [ ] 宫保鸡丁（川菜、辣、全年）
  - [ ] 番茄炒蛋（家常菜、甜、全年）
  - [ ] 清蒸鲈鱼（粤菜、清淡、春季）
  - [ ] 糖醋排骨（苏菜、甜酸、全年）
  - [ ] 意大利面（意大利、酸甜、全年）
  - [ ] 天妇罗（日料、清淡、春季）
  - [ ] 咖喱鸡（印度菜、辣、全年）
  - [ ] 冬阴功汤（东南亚、酸辣、全年）
  - [ ] 饺子拼盘（北方菜、清淡、冬季）
  - [ ] 酸辣汤（川菜、酸辣、冬季）

- [ ] 编写测试
  - [ ] 测试菜品列表查询（分页）
  - [ ] 测试多维度筛选（地区、菜系、口味、季节）
  - [ ] 测试模糊搜索（菜名、食材）
  - [ ] 测试忌口提示（黄色/红色标签）
  - [ ] 测试安全优先排序
  - [ ] 测试菜品 CRUD
  - [ ] 测试菜品状态更新

### 4.2 订单管理模块

> **涉及接口**：`GET/POST/PUT/DELETE /api/orders/*`
> **核心功能**：订单创建、状态流转、厨师处理

- [ ] 实现 `app/models/order.py`
  - [ ] 定义 `Order` 模型
  - [ ] 定义 `OrderItem` 模型
  - [ ] 添加索引：order_no (unique), user_id, status, chef_id
  - [ ] 添加关联关系

- [ ] 实现 `app/schemas/order.py`
  - [ ] `OrderItemCreate` — 订单项创建请求
  - [ ] `OrderCreate` — 创建订单请求
  - [ ] `OrderStatusUpdate` — 订单状态更新请求
  - [ ] `OrderListResponse` — 订单列表项响应
  - [ ] `OrderDetailResponse` — 订单详情响应（含订单项）

- [ ] 实现 `app/services/order_service.py`
  - [ ] `generate_order_no` — 生成订单号（ORD + 日期 + 序号）
  - [ ] `create_order` — 创建订单
    - [ ] 验证菜品存在且已上架
    - [ ] 创建订单和订单项
    - [ ] 触发飞书通知（异步）
  - [ ] `get_order_by_id` — 根据 ID 获取订单详情
  - [ ] `list_orders` — 查询订单列表
    - [ ] 用户查看自己的订单
    - [ ] 厨师查看所有订单
    - [ ] 支持 status 筛选
  - [ ] `update_order_status` — 更新订单状态
    - [ ] 状态流转验证（pending → accepted → cooking → completed）
    - [ ] 记录 completed_at 时间
    - [ ] 触发飞书通知（异步）
  - [ ] `cancel_order` — 取消订单（仅用户可取消 pending 状态）
  - [ ] `get_user_order_stats` — 获取用户订单统计

- [ ] 实现 `app/routers/orders.py`
  - [ ] `POST /api/orders` — 创建订单
  - [ ] `GET /api/orders` — 订单列表
  - [ ] `GET /api/orders/{order_id}` — 订单详情
  - [ ] `PUT /api/orders/{order_id}/status` — 更新订单状态
  - [ ] `DELETE /api/orders/{order_id}` — 取消订单

- [ ] 编写测试
  - [ ] 测试订单创建
  - [ ] 测试订单号生成
  - [ ] 测试订单列表查询（用户视角、厨师视角）
  - [ ] 测试订单状态流转
  - [ ] 测试订单取消
  - [ ] 测试权限控制（用户只能取消自己的订单）

---

## Phase 5: 辅助功能模块

> **依赖**：Phase 4 完成
> **包含子模块**：收藏管理、口味偏好、厨师管理

### 5.1 收藏管理模块

> **涉及接口**：`GET/POST/DELETE /api/favorites/*`

- [ ] 实现 `app/models/favorite.py`
  - [ ] 定义 `Favorite` 模型
  - [ ] 添加唯一约束：(user_id, dish_id)

- [ ] 实现 `app/schemas/favorite.py`
  - [ ] `FavoriteCreate` — 添加收藏请求
  - [ ] `FavoriteResponse` — 收藏响应

- [ ] 实现 `app/services/favorite_service.py`
  - [ ] `add_favorite` — 添加收藏
  - [ ] `remove_favorite` — 取消收藏
  - [ ] `list_favorites` — 获取收藏列表（分页）
  - [ ] `is_favorited` — 检查是否已收藏

- [ ] 实现 `app/routers/favorites.py`
  - [ ] `POST /api/favorites` — 添加收藏
  - [ ] `DELETE /api/favorites/{dish_id}` — 取消收藏
  - [ ] `GET /api/favorites` — 收藏列表

- [ ] 编写测试
  - [ ] 测试添加/取消收藏
  - [ ] 测试收藏列表查询
  - [ ] 测试重复收藏处理

### 5.2 口味偏好模块

> **涉及接口**：`GET/PUT /api/preferences/*`

- [ ] 实现 `app/models/preference.py`
  - [ ] 定义 `TastePreference` 模型
  - [ ] 添加唯一约束：(user_id, ingredient_id, preference_type)

- [ ] 实现 `app/schemas/preference.py`
  - [ ] `PreferenceUpdate` — 更新偏好请求（dislikes, allergies 食材 ID 列表）
  - [ ] `PreferenceResponse` — 偏好响应

- [ ] 实现 `app/services/preference_service.py`
  - [ ] `get_preferences` — 获取用户口味偏好
  - [ ] `update_preferences` — 更新口味偏好（全量替换）
  - [ ] `add_dislike` — 添加不爱吃的食材
  - [ ] `remove_dislike` — 移除不爱吃的食材
  - [ ] `add_allergy` — 添加严格忌口食材
  - [ ] `remove_allergy` — 移除严格忌口食材

- [ ] 实现 `app/routers/preferences.py`
  - [ ] `GET /api/preferences` — 获取当前用户口味偏好
  - [ ] `PUT /api/preferences` — 更新口味偏好

- [ ] 编写测试
  - [ ] 测试偏好查询
  - [ ] 测试偏好更新（全量替换）
  - [ ] 测试偏好与菜品忌口提示联动

### 5.3 厨师管理模块

> **涉及接口**：`GET/PUT /api/chefs/*`

- [ ] 实现 `app/models/schedule.py`
  - [ ] 定义 `ChefSchedule` 模型
  - [ ] 添加唯一约束：(chef_id, schedule_date, meal_type)

- [ ] 实现 `app/services/chef_service.py`
  - [ ] `list_chefs` — 获取厨师列表（role=chef 的用户）
  - [ ] `get_schedules` — 查询排班（支持日期、厨师筛选）
  - [ ] `update_schedule` — 更新排班
  - [ ] `get_chef_workload` — 获取厨师工作量统计（今日完成订单数）

- [ ] 实现 `app/routers/chefs.py`
  - [ ] `GET /api/chefs` — 厨师列表
  - [ ] `GET /api/chefs/schedules` — 排班查询
  - [ ] `PUT /api/chefs/schedules` — 更新排班

- [ ] 编写测试
  - [ ] 测试厨师列表查询
  - [ ] 测试排班管理
  - [ ] 测试工作量统计

---

## Phase 6: 管理后台模块

> **依赖**：Phase 5 完成
> **包含子模块**：系统管理、仪表盘

### 6.1 系统管理模块

> **涉及接口**：`GET /api/admin/*`
> **权限要求**：仅超级管理员可访问

- [ ] 实现 `app/models/log.py`
  - [ ] 定义 `SystemLog` 模型
  - [ ] 添加索引：user_id, action, created_at

- [ ] 实现 `app/services/admin_service.py`
  - [ ] `list_logs` — 查询系统日志（支持筛选、分页）
  - [ ] `get_stats` — 获取系统统计数据
  - [ ] `log_action` — 记录系统操作日志（依赖注入）

- [ ] 实现 `app/routers/admin.py`
  - [ ] `GET /api/admin/logs` — 系统日志查询
  - [ ] `GET /api/admin/stats` — 系统统计数据
  - [ ] `GET /api/admin/dashboard` — 管理后台仪表盘数据
  - [ ] `PUT /api/admin/config` — 系统配置更新

- [ ] 实现日志中间件
  - [ ] 自动记录敏感操作（创建/更新/删除）
  - [ ] 记录操作人、操作类型、目标、IP 地址

- [ ] 编写测试
  - [ ] 测试日志查询
  - [ ] 测试统计数据
  - [ ] 测试权限控制（非管理员拒绝访问）

### 6.2 仪表盘服务

- [ ] 实现 `app/services/dashboard_service.py`
  - [ ] `get_dashboard_data` — 聚合仪表盘数据
    - [ ] 用户统计（总数、活跃数）
    - [ ] 菜品统计（总数、上架数、草稿数）
    - [ ] 订单统计（今日、本周、本月）
    - [ ] 最近订单列表
    - [ ] 最近活动列表
    - [ ] 厨师工作量排行

- [ ] 编写测试
  - [ ] 测试仪表盘数据聚合

---

## Phase 7: 外部集成

> **依赖**：Phase 6 完成
> **包含子模块**：飞书集成、食材抽取、文件上传

### 7.1 飞书集成模块

> **涉及接口**：`POST /api/feishu/*`

- [ ] 实现 `app/integrations/feishu.py`
  - [ ] `FeishuClient` 类
  - [ ] `get_tenant_access_token` — 获取飞书 tenant_access_token
  - [ ] `send_message` — 发送飞书消息（卡片消息）
  - [ ] `bind_user` — 绑定飞书账号

- [ ] 实现飞书消息模板
  - [ ] 订单提交通知模板
  - [ ] 订单状态变更通知模板

- [ ] 实现 `app/routers/feishu.py`
  - [ ] `POST /api/feishu/bind` — 绑定飞书账号
  - [ ] `POST /api/feishu/notify` — 发送飞书消息（内部调用）

- [ ] 集成飞书通知到订单流程
  - [ ] 订单创建时通知厨师
  - [ ] 订单状态变更时通知用户

- [ ] 编写测试
  - [ ] 测试飞书消息发送（Mock）
  - [ ] 测试账号绑定
  - [ ] 测试通知触发

### 7.2 食材抽取模块

> **涉及接口**：`POST /api/tools/extract-ingredients`

- [ ] 实现 `app/services/ingredient_extractor.py`
  - [ ] `extract_ingredients` — 从文本中抽取食材
    - [ ] 使用食材主数据进行关键词匹配
    - [ ] 使用别名进行模糊匹配
    - [ ] 返回匹配结果和置信度
    - [ ] 返回未匹配的文本片段

- [ ] 实现 `app/routers/tools.py`
  - [ ] `POST /api/tools/extract-ingredients` — 文本食材抽取

- [ ] 编写测试
  - [ ] 测试精确匹配
  - [ ] 测试别名匹配
  - [ ] 测试模糊匹配
  - [ ] 测试未匹配处理

### 7.3 文件上传模块

> **涉及接口**：`POST /api/upload/image`

- [ ] 实现 `app/routers/upload.py`
  - [ ] `POST /api/upload/image` — 上传图片
    - [ ] 验证文件类型（jpg, png, webp）
    - [ ] 验证文件大小（≤5MB）
    - [ ] 生成唯一文件名
    - [ ] 保存到 upload_dir
    - [ ] 返回文件 URL

- [ ] 配置静态文件服务
  - [ ] 挂载 `/uploads/` 路径到 upload_dir

- [ ] 编写测试
  - [ ] 测试图片上传
  - [ ] 测试文件类型验证
  - [ ] 测试文件大小限制

---

## Phase 8: 测试与优化

### 8.1 单元测试

- [ ] 完善所有模块的单元测试
  - [ ] `tests/test_auth.py` — 认证模块测试
  - [ ] `tests/test_users.py` — 用户模块测试
  - [ ] `tests/test_ingredients.py` — 食材模块测试
  - [ ] `tests/test_categories.py` — 分类模块测试
  - [ ] `tests/test_dishes.py` — 菜品模块测试
  - [ ] `tests/test_orders.py` — 订单模块测试
  - [ ] `tests/test_favorites.py` — 收藏模块测试
  - [ ] `tests/test_preferences.py` — 口味偏好测试
  - [ ] `tests/test_chefs.py` — 厨师模块测试
  - [ ] `tests/test_admin.py` — 管理模块测试

- [ ] 配置测试数据库（使用内存 SQLite）
- [ ] 配置测试 fixtures（`tests/conftest.py`）
- [ ] 运行测试并修复问题
  ```bash
  uv run pytest tests/ -v --cov=app
  ```
- [ ] 目标：测试覆盖率 ≥ 80%

### 8.2 集成测试

- [ ] 测试完整业务流程
  - [ ] 用户注册 → 登录 → 浏览菜品 → 添加收藏 → 创建订单 → 厨师处理 → 订单完成
  - [ ] 管理员创建用户 → 分配角色 → 管理菜品 → 查看日志

- [ ] 测试 API 文档生成
  ```bash
  # 访问 http://localhost:8000/docs 确认所有接口文档正常
  ```

### 8.3 性能优化

- [ ] 数据库优化
  - [ ] 确认 SQLite WAL 模式已启用
  - [ ] 添加必要的数据库索引
  - [ ] 优化慢查询（菜品列表筛选、订单列表查询）

- [ ] API 响应优化
  - [ ] 菜品列表支持游标分页（替代 offset 分页）
  - [ ] 添加响应缓存（分类列表、食材列表）

- [ ] 并发测试
  - [ ] 使用 `ab` 或 `wrk` 进行压力测试
  - [ ] 目标：10 并发用户，响应时间 < 1 秒

### 8.4 安全加固

- [ ] 密码安全
  - [ ] 确认 bcrypt 加密强度
  - [ ] 确认 force_pwd_change 机制

- [ ] JWT 安全
  - [ ] 确认 Token 过期时间（24 小时）
  - [ ] 确认 refresh_token 机制

- [ ] API 安全
  - [ ] 确认所有接口都有权限控制
  - [ ] 确认敏感操作有日志记录
  - [ ] 确认文件上传有类型和大小限制

- [ ] CORS 配置
  - [ ] 确认仅允许前端域名访问

---

## Phase 9: 部署与上线

### 9.1 Docker 配置

- [ ] 创建 `docker/Dockerfile`
  - [ ] 多阶段构建（backend + frontend）
  - [ ] 配置 Python 运行时
  - [ ] 配置 Nginx 反向代理

- [ ] 创建 `docker/docker-compose.yml`
  - [ ] 配置服务
  - [ ] 配置环境变量
  - [ ] 配置 volume 持久化

- [ ] 创建 `docker/nginx.conf`
  - [ ] 配置前端静态文件服务
  - [ ] 配置 API 反向代理
  - [ ] 配置上传文件服务

### 9.2 部署脚本

- [ ] 创建部署脚本
  - [ ] `scripts/init_db.sh` — 初始化数据库
  - [ ] `scripts/seed_data.sh` — 填充初始数据
  - [ ] `scripts/deploy.sh` — 一键部署

- [ ] 创建环境变量模板
  - [ ] `.env.production` — 生产环境配置

### 9.3 上线检查清单

- [ ] 数据库备份机制
- [ ] 日志输出配置
- [ ] 错误监控配置
- [ ] 健康检查端点
  ```
  GET /api/health — 返回 {"status": "ok"}
  ```
- [ ] API 文档可访问
- [ ] 默认管理员账号已创建
- [ ] 飞书集成配置完成
- [ ] 示例菜品数据已填充

---

## 开发进度跟踪

| Phase | 内容 | 预计工时 | 状态 |
|-------|------|----------|------|
| Phase 0 | 项目初始化与环境配置 | 0.5 天 | ⏳ 待开始 |
| Phase 1 | 整体框架搭建 | 1 天 | ⏳ 待开始 |
| Phase 2 | 认证模块 | 1 天 | ⏳ 待开始 |
| Phase 3 | 数据模型模块 | 1.5 天 | ⏳ 待开始 |
| Phase 4 | 核心业务模块 | 2 天 | ⏳ 待开始 |
| Phase 5 | 辅助功能模块 | 1 天 | ⏳ 待开始 |
| Phase 6 | 管理后台模块 | 1 天 | ⏳ 待开始 |
| Phase 7 | 外部集成 | 1.5 天 | ⏳ 待开始 |
| Phase 8 | 测试与优化 | 1.5 天 | ⏳ 待开始 |
| Phase 9 | 部署与上线 | 0.5 天 | ⏳ 待开始 |
| **总计** | | **10.5 天** | |

---

## 附录：接口实现优先级

| 优先级 | 接口组 | 原因 |
|--------|--------|------|
| P0 | 认证 | 所有接口的前置依赖 |
| P0 | 菜品 | 核心业务，用户端主要功能 |
| P0 | 订单 | 核心业务，订单流转 |
| P1 | 用户 | 用户管理，管理端功能 |
| P1 | 食材 | 菜品管理的基础数据 |
| P1 | 分类 | 菜品筛选的基础数据 |
| P2 | 收藏 | 辅助功能 |
| P2 | 口味偏好 | 辅助功能，与菜品联动 |
| P2 | 厨师 | 厨师订单处理 |
| P3 | 系统管理 | 管理后台功能 |
| P3 | 飞书集成 | 外部集成，可后续补充 |
| P3 | 食材抽取 | 工具功能，可后续补充 |
| P3 | 文件上传 | 辅助功能 |

---

*文档结束*
