# 家味 · Family Chef

> 家庭点菜系统 — 让每个家庭成员都能轻松参与每日菜单决策。

家味是一个面向家庭场景的全功能点菜系统。支持多角色协作（管理员、厨师、普通用户），提供菜品管理、在线点餐、口味偏好管理、订单状态流转、飞书实时通知等完整功能链路。系统采用前后端分离架构，内置浅色/深色双主题和响应式布局。

---

## 功能概览

### 菜品管理（双状态模型）

系统采用 **启用/禁用** + **上架/下架** 双状态模型：

- **管理员**控制菜品启用/禁用（决定菜品是否存在于系统中）
- **厨师**独立控制自己负责的菜品上架/下架（决定是否对用户可见）
- 用户点菜页面仅显示已启用且至少一位厨师上架的菜品
- 支持半成品菜品、从菜谱文本智能解析食材、批量导入食材

### 在线点餐与订单管理

- 用户浏览菜品、加入购物车、提交订单
- 厨师实时查看待处理订单，支持 pending → cooking → done 状态流转
- 订单详情页展示下单人信息、口味偏好（忌口/不喜）、完整菜谱
- 菜谱内容以 Markdown 渲染，方便厨师参照操作

### 口味偏好与饮食提醒

- 每位用户可维护自己的忌口和不喜食材清单
- 点菜时自动检测菜品食材与用户偏好的冲突，给出饮食提醒

### 食材管理

- 食材库支持分类、别名（如"番茄"="西红柿"）
- 食材列表显示关联菜品数，被菜品引用的食材禁止删除
- 关联菜品下拉可快速跳转到菜品编辑页面

### 飞书集成

- 通过飞书自建应用（Bot 机器人）推送订单状态变更通知
- 下单时通知厨师，状态变更时通知用户
- 用户需绑定飞书 open_id 后方可接收消息

### 其他

- 用户收藏、厨师管理、分类管理（地区/菜系/口味/季节/食材）
- 管理员仪表盘、操作日志、数据统计
- 浅色/深色主题切换，响应式适配桌面和移动端

---

## 角色与权限

| 能力 | 用户 | 厨师 | 管理员 |
|------|:----:|:----:|:------:|
| 浏览菜品、点餐 | Y | Y | Y |
| 管理口味偏好 | Y | Y | Y |
| 收藏菜品 | Y | Y | Y |
| 创建/编辑菜品 | | Y | Y |
| 上架/下架菜品 | | Y | |
| 接单、管理订单 | | Y | Y |
| 启用/禁用菜品 | | | Y |
| 用户管理 | | | Y |
| 食材管理 | | Y | Y |
| 分类管理 | | Y | Y |
| 系统日志/统计 | | | Y |

---

## 技术栈

### 后端

| 组件 | 技术 |
|------|------|
| 框架 | FastAPI 0.115+ |
| ORM | SQLAlchemy 2.0（异步模式） |
| 数据库 | SQLite + aiosqlite（WAL 模式） |
| 认证 | JWT（python-jose）+ bcrypt |
| 数据验证 | Pydantic V2 |
| 数据库迁移 | Alembic |
| 拼音 | pypinyin |
| 智能食材提取 | llama-cpp-python（可选） |
| 包管理 | uv |
| 测试 | pytest + pytest-asyncio + httpx |
| Python | 3.11+ |

### 前端

| 组件 | 技术 |
|------|------|
| 框架 | React 19 |
| 路由 | React Router 7 |
| 构建 | Vite 8 |
| Markdown 渲染 | marked |
| 样式 | CSS 自定义属性（浅色/深色主题） |
| 字体 | Noto Serif SC + Noto Sans SC |
| 响应式 | 移动优先（420px / 768px / 1200px 断点） |

### 外部集成

| 组件 | 技术 |
|------|------|
| 消息推送 | 飞书开放平台 API（Bot 机器人） |
| 消息格式 | 飞书交互式卡片（Markdown） |

---

## 项目结构

```
family_chef/
├── backend/                    # 后端服务
│   ├── app/
│   │   ├── main.py             # FastAPI 应用入口
│   │   ├── config.py           # 环境变量配置
│   │   ├── database.py         # 异步数据库连接
│   │   ├── initial_data.py     # 初始化数据
│   │   ├── models/             # SQLAlchemy 数据模型
│   │   ├── schemas/            # Pydantic 请求/响应模型
│   │   ├── routers/            # REST API 路由
│   │   ├── services/           # 业务逻辑层
│   │   ├── utils/              # 工具函数
│   │   ├── integrations/       # 外部集成（飞书）
│   │   └── middleware/         # 中间件
│   ├── alembic/                # 数据库迁移
│   ├── tests/                  # 测试套件
│   ├── pyproject.toml          # 依赖管理
│   └── .env.example            # 环境变量模板
│
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── App.jsx             # 路由配置
│   │   ├── pages/              # 页面组件
│   │   ├── components/         # 通用组件
│   │   ├── contexts/           # React Context
│   │   ├── api/                # API 客户端
│   │   ├── utils/              # 工具函数
│   │   └── css/                # 样式
│   ├── package.json
│   └── vite.config.js
│
├── docs-dev/                   # 开发文档
└── README.md
```

---

## 部署指导

### 前置条件

- Python 3.11+
- Node.js 18+
- [uv](https://github.com/astral-sh/uv)（Python 包管理器）

### 1. 克隆项目

```bash
git clone https://github.com/Temila/family_chef.git
cd family_chef
```

### 2. 配置后端环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `.env`，至少修改以下项：

```bash
SECRET_KEY=<替换为随机字符串>
JWT_SECRET_KEY=<替换为随机字符串>
```

完整配置项参见 `backend/.env.example`。

### 3. 安装后端依赖

```bash
cd backend
uv sync
```

### 4. 构建前端

```bash
cd frontend
npm install
npm run build
```

构建产物位于 `frontend/dist/`，后端启动时会自动挂载到 `/app` 路径。

### 5. 启动服务

```bash
cd backend
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

服务启动后自动创建数据库、初始化默认管理员账号和预设分类/食材。

### 6. 访问系统

| 地址 | 说明 |
|------|------|
| `http://localhost:8000/` | 自动跳转前端首页 |
| `http://localhost:8000/docs` | Swagger API 文档 |
| `http://localhost:8000/api/health` | 健康检查 |

### 7. 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| `admin` | `admin` | 管理员 |

> 首次登录后请立即修改密码。

### 8. 开发模式

前端开发服务器（热更新）：

```bash
cd frontend
npm run dev
```

后端开发服务器（自动重载）：

```bash
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 9. 运行测试

```bash
cd backend
uv run pytest tests/ -v
```

---

## 飞书集成指导

系统通过飞书自建应用（Bot 机器人）推送订单状态通知。

### 配置步骤

1. **创建飞书自建应用**
   - 访问 [飞书开放平台](https://open.feishu.cn/app)，创建企业自建应用
   - 记录 **App ID** 和 **App Secret**

2. **启用机器人能力**
   - 应用能力 → 添加应用能力 → **机器人**

3. **配置权限**
   - 权限管理中开通 `im:message` 和 `im:message:send_as_bot`

4. **设置可用范围**
   - 版本管理与发布 → 可用范围 → 添加需要接收通知的成员

5. **发布应用**
   - 创建版本 → 提交审核并发布

6. **填写环境变量**

   ```bash
   # backend/.env
   FEISHU_APP_ID=cli_a5xxxxxxxxxx
   FEISHU_APP_SECRET=xxxxxxxxxxxxxxxx
   ```

7. **用户绑定飞书账号**

   每位用户需要绑定自己的飞书 open_id 才能接收通知：

   ```bash
   POST /api/feishu/bind?feishu_open_id=ou_xxxxxxxxxxxxxx
   Authorization: Bearer <access_token>
   ```

   open_id 可从飞书管理后台 → 组织架构 → 用户详情中获取。

### 通知场景

| 触发事件 | 通知对象 | 消息内容 |
|----------|----------|----------|
| 用户下单 | 厨师/管理员 | 订单号 + 菜品列表 |
| 厨师接单/烹饪/完成 | 点餐用户 | 订单号 + 状态变更 |
| 厨师拒绝/取消订单 | 点餐用户 | 订单号 + 取消原因 |

### 常见问题

| 问题 | 解决方案 |
|------|----------|
| 错误码 `99991400` | 用户不在应用可用范围内 |
| 错误码 `99991401` | 未启用机器人或权限未发布 |
| token 获取失败 | 检查 App ID/Secret 是否正确 |
| 收不到消息 | 确认应用已上线 + 用户已绑定 open_id |

---

## TODO

- [ ] **自动解析菜谱链接**：支持从视频链接、小红书笔记、网页 URL 自动提取结构化菜谱（菜名、食材、步骤），一键录入系统
- [ ] **自动买菜**：用户下单后自动汇总所需食材，对接线上超市 API 完成自动下单
- [ ] **AI 做菜助手**：接入 Agent 框架，为每位厨师生成专属做菜辅助 Agent，提供烹饪建议、替代食材推荐、个性化菜谱调整
