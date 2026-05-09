# 家味 · Family Chef

家庭点菜系统 - 解决家庭成员之间的菜品选择、口味偏好管理和厨师协作问题。

## 项目结构

```
family_chef/
├── backend/                  # 后端项目 (FastAPI + Python)
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
│   └── .env.example
│
├── frontend/                 # 前端项目 (React + Vite)
│   └── ...
│
├── docker/                   # Docker 配置
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── nginx.conf
│
├── docs-dev/                 # 开发文档
│   ├── 01-requirements.md    # 需求文档
│   ├── 02-technical.md       # 技术文档
│   └── 03-backend-development-plan.md  # 后端开发计划
│
└── front-end-portotype/      # 前端原型
    ├── v1/                   # 旧版原型
    └── v2/                   # 新版响应式原型
```

## 技术栈

- **后端**: Python 3.11+ / FastAPI / SQLAlchemy / SQLite
- **前端**: React 18 / Vite / Zustand
- **部署**: Docker / Nginx

## 快速开始

### 后端开发

```bash
cd backend

# 安装依赖
uv sync

# 复制配置文件
cp .env.example .env

# 启动开发服务器
uv run uvicorn app.main:app --reload

# 访问 API 文档
# http://localhost:8000/docs
```

### 运行测试

```bash
cd backend
uv run pytest tests/ -v --cov=app
```

## 飞书消息推送配置

系统支持通过飞书向厨师/管理员推送订单状态变更通知。配置步骤如下：

### 步骤 1：创建飞书应用

1. 打开 [飞书开发者控制台](https://open.feishu.cn/)，创建自建应用
2. 在 **凭证与基础信息** 中复制 **App ID** 和 **App Secret**
3. 为应用启用 **机器人** 能力（应用功能 → 添加应用能力 → 机器人）

### 步骤 2：配置权限

在飞书开发者控制台的 **权限管理** 中，开通以下权限：

| 权限 | 权限标识 | 用途 |
|------|----------|------|
| 获取与发送单聊、群组消息 | `im:message` | 接收和发送消息 |
| 以应用的身份发消息 | `im:message:send_as_bot` | 向用户推送订单通知 |

> 权限开通后需要 **发布应用版本** 才能生效。

### 步骤 3：配置后端环境变量

在 `backend/.env` 中填入飞书应用凭据：

```bash
# 飞书配置（必填）
FEISHU_APP_ID=cli_xxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

`FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` 来自步骤 1。`FEISHU_APP_TOKEN` 为可选配置，仅用于事件订阅验证。

### 步骤 4：用户绑定飞书账号

每个需要接收通知的用户需将自己的飞书 `open_id` 绑定到系统：

```bash
# 调用绑定接口（需登录态）
POST /api/feishu/bind
Content-Type: application/json

{
  "feishu_open_id": "ou_xxxxxxxxxxxxxx"
}
```

用户的 `open_id` 可在飞书管理后台查看，或通过飞书 API 获取。

### 工作流程

配置完成后，系统会自动在以下场景推送飞书消息：

1. **用户下单** → 通知厨师（卡片消息，含订单号、菜品列表）
2. **厨师接单/完成/取消** → 通知点餐用户（卡片消息，含订单状态变更）

消息格式为飞书交互式卡片，包含订单状态标题和 Markdown 格式的菜品列表。

## 开发计划

详见 [后端开发计划](docs-dev/03-backend-development-plan.md)

## 许可证

Private
