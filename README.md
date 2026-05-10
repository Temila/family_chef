# 🍲 家味 · Family Chef

> 家庭点菜系统 — 解决家庭成员之间的菜品选择、口味偏好管理和厨师协作问题。

家味是一个完整的家庭点菜系统，支持用户浏览菜品、在线点餐、管理口味偏好（忌口/不喜），厨师接单和订单状态管理，以及通过飞书推送实时通知。系统包含完整的后端 API 和响应式前端界面，支持浅色/深色双主题。

---

## 🏗 系统架构

```
┌─────────────────────────────────────────────────────┐
│                   用户浏览器                         │
│  ┌─────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │  登录页  │  │ 用户页面  │  │ 厨师/管理页面     │    │
│  │         │  │ (首页/详情)│  │ (订单管理/菜品管理)│   │
│  └─────────┘  └──────────┘  └──────────────────┘    │
└────────────────────┬────────────────────────────────┘
                     │ HTTP/REST API
                     ▼
┌─────────────────────────────────────────────────────┐
│              FastAPI 后端服务 (port 8000)             │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌───────┐ │
│  │ 认证模块  │ │ 菜品服务  │ │ 订单服务   │ │ 偏好  │ │
│  │ JWT Auth │ │ CRUD     │ │ 状态机     │ │ 忌口   │ │
│  └──────────┘ └──────────┘ └───────────┘ └───────┘ │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌───────┐ │
│  │ 分类管理  │ │ 收藏服务  │ │ 厨师排班   │ │ 管理员│ │
│  │ 树形结构  │ │ 我的收藏  │ │ 工作负荷   │ │ 日志   │ │
│  └──────────┘ └──────────┘ └───────────┘ └───────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │           飞书集成 (Feishu Integration)        │  │
│  │  订单通知推送 ←→ 飞书自建应用 (Bot 机器人)     │  │
│  └───────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────┘
                     │ SQLAlchemy Async
                     ▼
┌─────────────────────────────────────────────────────┐
│               SQLite (异步 WAL 模式)                  │
└─────────────────────────────────────────────────────┘
```

### 角色与权限

| 角色 | 权限 |
|------|------|
| **用户** | 浏览菜品、点餐、收藏、管理口味偏好、查看个人订单 |
| **厨师** | 用户全部权限 + 创建/编辑菜品、接单/管理订单、发送飞书通知 |
| **管理员** | 厨师全部权限 + 用户管理、系统日志、仪表盘 |

---

## 📁 项目结构

```
family_chef/
├── backend/                    # 后端服务
│   ├── app/
│   │   ├── main.py             # FastAPI 应用入口（含前端静态文件挂载）
│   │   ├── config.py           # 环境变量配置管理
│   │   ├── database.py         # 异步数据库连接 + WAL 模式
│   │   ├── initial_data.py     # 初始化数据（管理员账号 + 预设分类）
│   │   ├── models/             # SQLAlchemy 数据模型（10 个模型）
│   │   │   ├── user.py         # 用户（user/chef/admin）
│   │   │   ├── dish.py         # 菜品 + 多对多关联（菜品-分类/食材）
│   │   │   ├── order.py        # 订单 + 订单项
│   │   │   ├── category.py     # 分类（地区/菜系/口味/季节）
│   │   │   ├── ingredient.py   # 食材 + 别名
│   │   │   ├── preference.py   # 口味偏好（忌口/不喜）
│   │   │   ├── favorite.py     # 收藏
│   │   │   ├── schedule.py     # 厨师排班
│   │   │   ├── log.py          # 系统操作日志
│   │   │   └── ...
│   │   ├── schemas/            # Pydantic 请求/响应验证
│   │   ├── routers/            # REST API 路由（14 个模块，44+ 端点）
│   │   ├── services/           # 业务逻辑层（9 个服务类）
│   │   ├── utils/              # 工具函数（安全/分页/拼音）
│   │   ├── integrations/       # 外部集成（飞书通知）
│   │   └── middleware/         # 中间件（操作日志）
│   ├── alembic/                # 数据库迁移（4 个版本）
│   ├── tests/                  # 测试套件（256 个测试，覆盖率 80%）
│   ├── pyproject.toml          # 依赖管理（uv）
│   └── .env.example            # 环境变量模板
│
├── frontend/                   # 前端（纯 HTML/CSS/JS，无框架）
│   ├── index.html              # 根页面（自动重定向）
│   ├── login.html              # 登录/注册页
│   ├── css/styles.css          # v3 设计系统（60-30-10 配色 + 深色模式）
│   ├── js/
│   │   ├── api.js              # API 客户端封装（全部端点）
│   │   ├── auth.js             # Token 管理 + 权限检查
│   │   └── app.js              # 工具（主题/Toast/导航/格式化）
│   └── pages/
│       ├── user-home.html      # 用户首页
│       ├── user-profile.html   # 个人中心
│       ├── dish-detail.html    # 菜品详情
│       ├── order-dish.html     # 点菜页面（购物车）
│       ├── chef-orders.html    # 厨师工作台
│       ├── admin-home.html     # 管理后台首页
│       └── admin-dishes.html   # 菜品管理
│
├── front-end-portotype/        # v2/v3 原型参考设计
├── docs-dev/                   # 开发文档（需求/技术/计划）
└── README.md
```

---

## 🛠 技术栈

### 后端
| 组件 | 技术 |
|------|------|
| **框架** | FastAPI 0.115+ |
| **ORM** | SQLAlchemy 2.0（异步模式） |
| **数据库** | SQLite + aiosqlite（WAL 模式） |
| **认证** | JWT（PyJWT）+ bcrypt |
| **验证** | Pydantic V2 |
| **迁移** | Alembic |
| **拼音** | pypinyin |
| **包管理** | uv |
| **测试** | pytest + pytest-asyncio + httpx + coverage |
| **Python** | 3.11+ |

### 前端
| 组件 | 技术 |
|------|------|
| **技术** | 纯 HTML / CSS / JavaScript（无框架依赖） |
| **HTTP** | Fetch API |
| **设计系统** | CSS 自定义属性 + 60-30-10 配色法则 |
| **字体** | Noto Serif SC（标题） + Noto Sans SC（正文） |
| **主题** | 浅色/深色双模式（localStorage 持久化） |
| **响应式** | 移动优先（420px / 768px / 1200px 断点） |

### 外部集成
| 组件 | 技术 |
|------|------|
| **消息推送** | 飞书开放平台 API（Bot 机器人模式） |
| **消息格式** | 飞书交互式卡片（Markdown） |

---

## 🚀 本地部署

### 前置条件

- Python 3.11+
- [uv](https://github.com/astral-sh/uv) 包管理器（`pip install uv`）

### 1. 克隆项目

```bash
git clone https://github.com/Temila/family_chef.git
cd family_chef
```

### 2. 配置环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件：

```bash
# 应用配置
APP_NAME=家味·Family Chef
APP_VERSION=0.1.0
DEBUG=true
SECRET_KEY=<替换为随机字符串>

# 数据库（默认使用 SQLite，开箱即用）
DATABASE_URL=sqlite+aiosqlite:///./data/family_chef.db

# JWT 配置
JWT_SECRET_KEY=<替换为随机字符串>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# 飞书配置（可选，不填则跳过飞书通知）
FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_APP_TOKEN=

# 文件上传
UPLOAD_DIR=./data/uploads
MAX_UPLOAD_SIZE=5242880
```

### 3. 安装依赖并启动

```bash
cd backend
uv sync

# 启动开发服务器（自动重载）
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

服务启动后会自动创建数据库、初始化默认管理员账号和预设分类。

### 4. 访问系统

| 路径 | 说明 |
|------|------|
| `http://localhost:8000/` | 前端首页（自动跳转登录或首页） |
| `http://localhost:8000/app/login.html` | 登录/注册页 |
| `http://localhost:8000/app/` | 前端应用根目录 |
| `http://localhost:8000/docs` | Swagger API 文档 |
| `http://localhost:8000/api/health` | 健康检查 |

### 5. 默认账号

首次启动自动创建：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| `admin` | `admin` | 管理员 |

### 6. 运行测试

```bash
cd backend
uv run pytest tests/ -v --cov=app
```

当前测试状态：**256 passed, 0 failed, 8 skipped, 覆盖率 80%**。

---

## 📡 API 端点速查

### 认证 (`/api/auth`)
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/login` | 登录 | 无 |
| POST | `/register` | 注册 | 无 |
| POST | `/refresh` | 刷新 Token | 无 |

### 菜品 (`/api/dishes`)
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/` | 菜品列表（分页/搜索/筛选） | 登录 |
| GET | `/{id}` | 菜品详情 | 登录 |
| POST | `/` | 创建菜品 | admin/chef |
| PUT | `/{id}` | 更新菜品 | 登录 |
| DELETE | `/{id}` | 删除菜品 | 登录 |
| PUT | `/{id}/status` | 更新状态 | 登录 |
| GET | `/{id}/dietary_warning` | 忌口提示 | 登录 |

### 订单 (`/api/orders`)
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/` | 创建订单 | 登录 |
| GET | `/` | 订单列表（分页/状态筛选） | 登录 |
| GET | `/{id}` | 订单详情 | 本人/admin |
| PUT | `/{id}/status` | 更新状态 | chef/admin |
| DELETE | `/{id}` | 取消订单 | 本人 |
| GET | `/stats` | 订单统计 | 登录 |

### 收藏 (`/api/favorites`)
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/` | 添加收藏 | 登录 |
| DELETE | `/{dish_id}` | 取消收藏 | 登录 |
| GET | `/` | 收藏列表 | 登录 |

### 偏好 (`/api/preferences`)
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/` | 获取偏好 | 登录 |
| PUT | `/` | 更新偏好 | 登录 |

### 分类 (`/api/categories`)
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/` | 分类列表/树形 | 无 |
| POST | `/` | 创建分类 | admin/chef |
| PUT | `/{id}` | 更新分类 | admin/chef |
| DELETE | `/{id}` | 删除分类 | admin |

### 食材 (`/api/ingredients`)
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/` | 食材列表 | 无 |
| POST | `/` | 创建食材 | admin/chef |
| PUT | `/{id}` | 更新食材 | admin/chef |
| DELETE | `/{id}` | 删除食材 | admin |

### 用户 (`/api/users`)
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/` | 用户列表（分页/搜索） | 无 |
| GET | `/{id}` | 用户详情 | 无 |
| PUT | `/{id}` | 更新用户 | admin |
| PUT | `/{id}/password` | 修改密码 | 本人/admin |
| DELETE | `/{id}` | 删除用户 | admin |

### 厨师 (`/api/chefs`)
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/` | 厨师列表 | 登录 |
| GET | `/schedules` | 排班列表 | 登录 |
| PUT | `/schedules` | 更新排班 | admin/chef |

### 管理 (`/api/admin`)
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/logs` | 操作日志 | admin |
| GET | `/stats` | 统计数据 | admin |
| GET | `/dashboard` | 仪表盘 | admin |

### 其他
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/feishu/bind` | 绑定飞书账号 | 登录 |
| POST | `/api/feishu/notify` | 发送飞书通知 | admin/chef |
| POST | `/api/upload/image` | 上传图片 | 登录 |
| POST | `/api/tools/extract-ingredients` | AI 食材抽取 | 登录 |

---

## 🔔 飞书集成

系统通过飞书自建应用（Bot 机器人）向用户推送订单状态变更通知。

### 通知场景

| 触发事件 | 通知对象 | 消息内容 |
|----------|----------|----------|
| 用户下单 | 厨师/管理员 | 订单号 + 菜品列表 |
| 厨师接单/烹饪/完成 | 点餐用户 | 订单号 + 状态变更 |
| 厨师拒绝/取消订单 | 点餐用户 | 订单号 + 取消原因 |

### 配置步骤

#### 1. 创建飞书自建应用

1. 访问 [飞书开放平台](https://open.feishu.cn/app)，登录并创建应用
2. 记录 **App ID** 和 **App Secret**

#### 2. 启用机器人能力

应用能力 → 添加应用能力 → **机器人**

#### 3. 配置权限

权限管理中开通：
- `im:message` — 获取与发送单聊、群组消息
- `im:message:send_as_bot` — 以应用身份发消息

#### 4. 设置可用范围

版本管理与发布 → 可用范围 → 添加需要接收通知的成员

#### 5. 发布应用

版本管理与发布 → 创建版本 → 提交发布

#### 6. 配置环境变量

```bash
# backend/.env
FEISHU_APP_ID=cli_a5xxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxx
```

#### 7. 用户绑定飞书账号

```bash
# 调用绑定接口（需登录态）
POST /api/feishu/bind?feishu_open_id=ou_xxxxxxxxxxxxxx
Authorization: Bearer <access_token>
```

`open_id` 可从飞书管理后台 → 组织架构 → 用户详情中获取。

### 常见问题

| 问题 | 解决方案 |
|------|----------|
| 错误码 `99991400` | 用户不在可用范围内 |
| 错误码 `99991401` | 未启用机器人或权限未发布 |
| token 获取失败 | 检查 App ID/Secret 是否正确 |
| 收不到消息 | 确认应用已上线 + 用户已绑定 open_id |

### 配置检查清单

- [ ] 应用已创建，App ID / Secret 已记录
- [ ] 机器人能力已启用
- [ ] `im:message:send_as_bot` 权限已开通
- [ ] 可用范围已添加目标用户
- [ ] 应用已发布上线
- [ ] `.env` 中飞书配置已填写
- [ ] 用户已绑定 `open_id`

---

## 📈 开发进度

| Phase | 内容 | 状态 |
|-------|------|------|
| 0-1 | 项目初始化 + 数据模型 | ✅ |
| 2-3 | 认证 + 用户管理 | ✅ |
| 4-5 | 菜品 + 分类 + 食材 | ✅ |
| 6 | 订单 + 收藏 + 偏好 | ✅ |
| 7 | 厨师排班 + 飞书集成 + 管理功能 | ✅ |
| 8 | 测试覆盖率 80% | ✅ |
| 9 | 前后端集成（v3 前端） | ✅ |

---

## 📄 许可证

Private
