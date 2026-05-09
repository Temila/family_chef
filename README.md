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

## 飞书集成配置

系统通过飞书自建应用向厨师/管理员推送订单状态变更通知。以下为完整的飞书开放平台后台配置步骤。

> 💡 **前置条件**：拥有飞书团队的管理员或开发者权限。个人用户可前往 [飞书开放平台](https://open.feishu.cn) 注册开发者账号。

---

### 步骤 1：创建飞书自建应用

1. 访问 [飞书开放平台 → 开发者后台](https://open.feishu.cn/app)，使用飞书账号登录
2. 点击页面右上角的 **创建自建应用** 按钮
3. 填写基本信息：
   - **应用名称**：如「家味通知」（将显示在机器人对话中）
   - **应用描述**：如「家味点菜系统订单通知推送」
   - **应用图标**：上传一个图标（可选，默认使用飞书占位图标）
4. 点击 **创建** 进入应用详情页
5. 在左侧菜单 → **凭证与基础信息**，记录以下凭据：

| 字段 | 格式示例 | 说明 |
|------|----------|------|
| **App ID** | `cli_a5xxxxxxxxxx` | 应用唯一标识，配置到 `FEISHU_APP_ID` |
| **App Secret** | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | 点击「显示」→ 复制，配置到 `FEISHU_APP_SECRET` |

> ⚠️ **App Secret 是敏感信息**，请勿提交到 Git 仓库。`.env` 文件已在 `.gitignore` 中排除。

---

### 步骤 2：启用机器人能力

应用需要具备「机器人」能力才能调用消息发送 API：

1. 在应用详情页，点击左侧菜单 **应用能力** → **添加应用能力**
2. 在弹出的能力列表中，找到 **机器人**，点击 **添加**
3. 添加成功后，页面会显示机器人配置区域（可设置机器人名称和头像）
4. 无需填写回调地址（本项目使用主动推送模式，不接收用户消息）

> ⚠️ **未启用机器人能力将无法调用消息发送接口**，调用时会返回权限错误。

---

### 步骤 3：配置应用权限

机器人能力启用后，还需要授予消息发送权限：

1. 点击左侧菜单 **权限管理**
2. 在搜索框中逐个搜索以下权限并点击 **开通**：

| 权限名称 | 权限标识 | 必选 | 用途 |
|----------|----------|:----:|------|
| 获取与发送单聊、群组消息 | `im:message` | ✅ | 以应用身份发送单聊/群聊消息 |
| 以应用的身份发消息 | `im:message:send_as_bot` | ✅ | 以机器人身份向用户推送订单通知 |
| 获取用户基本信息 | `contact:user.base:readonly` | 可选 | 通过 open_id 获取用户显示名等信息 |

3. 开通后页面会显示「已申请」状态

> ⚠️ **权限修改后需要发布新版本才能生效**（见步骤 6）。开发调试阶段可以先设置「可用范围」为全部员工来快速验证。

---

### 步骤 4：设置应用可用范围

不在可用范围内的用户将无法收到机器人消息，这是最常见的配置遗漏：

1. 点击左侧菜单 **版本管理与发布** → 顶部 **可用范围** 标签
2. 点击 **添加可用范围**
3. 选择 **指定成员** 或 **指定部门**：
   - **推荐做法**：选择「全部员工」用于开发测试，上线后改为指定成员
   - **生产做法**：逐一添加需要接收通知的家庭成员
4. 点击 **确认**

> ⚠️ 如果消息发送返回错误码 `99991400`，说明目标用户不在可用范围内。

---

### 步骤 5：发布应用

首次配置完成后，需要创建并发布一个版本才能让权限和可用范围生效：

1. 点击左侧菜单 **版本管理与发布**
2. 点击 **创建版本**
3. 填写：
   - **版本号**：如 `1.0.0`
   - **更新说明**：如「首次发布，订单通知推送功能」
4. 确认可用范围无误后，点击 **提交发布**
5. 根据团队设置，可能需要管理员审批：
   - **自建团队**（默认）：自动通过
   - **企业团队**：需要在 [飞书管理后台](https://feishu.cn/admin) → 工作台 → 应用审核 中审批
6. 发布成功后，状态变为「已上线」

> 💡 后续修改权限或可用范围后，需要 **重新发布版本** 才能生效。开发阶段可多次发布小版本（如 `1.0.1`、`1.0.2`）。

---

### 步骤 6：配置后端环境变量

在 `backend/.env` 中填入步骤 1 获取的应用凭据：

```bash
# 飞书配置（必填 — 从飞书开放平台「凭证与基础信息」页面获取）
FEISHU_APP_ID=cli_a5xxxxxxxxxx          # App ID
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxx      # App Secret

# 飞书配置（可选）
FEISHU_APP_TOKEN=                        # 留空即可，仅用于事件订阅验证
```

完整的配置模板参见 `backend/.env.example`。

---

### 步骤 7：验证配置

启动后端服务后，可以通过 API 测试飞书通知是否正常：

```bash
# 1. 启动后端
cd backend
uv run uvicorn app.main:app --reload

# 2. 登录获取 Token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# 3. 发送测试通知（替换 ACCESS_TOKEN 和 RECEIVE_ID）
curl -X POST "http://localhost:8000/api/feishu/notify?receive_id=ou_xxxxxxxxx&order_no=TEST-001&order_status=pending&items=[{\"name\":\"测试菜品\",\"quantity\":1}]" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

> `receive_id` 为目标用户的飞书 `open_id`（格式：`ou_xxxxxxxxxxxxxx`），获取方式见下方步骤 8。

---

### 步骤 8：用户绑定飞书账号

每个需要接收通知的用户需将自己的飞书 `open_id` 绑定到系统：

```bash
# 调用绑定接口（需登录态）
POST /api/feishu/bind?feishu_open_id=ou_xxxxxxxxxxxxxx
Authorization: Bearer ***
```

获取 `open_id` 的方式：
- **方式一（推荐）**：在飞书管理后台 → 组织架构 → 点击用户 → 「用户详情」中查看「Open ID」字段
- **方式二**：联系用户在飞书中给机器人发一条消息，然后从后端日志中查看发送者的 `open_id`
- **方式三**：调用飞书 API `GET /open-apis/contact/v3/users/:user_id` 获取（需额外开通通讯录权限）

---

### 通知工作流程

配置完成后，系统会在以下场景自动推送飞书卡片消息：

| 触发事件 | 通知对象 | 消息内容 |
|----------|----------|----------|
| 用户下单 | 厨师/管理员 | 订单号 + 菜品列表（蓝色卡片） |
| 厨师接单/完成/取消 | 点餐用户 | 订单号 + 状态变更（蓝色卡片） |

消息格式为飞书交互式卡片，包含订单状态标题和 Markdown 格式的菜品列表。

---

### 常见问题

**Q: 发送消息返回错误码 `99991400`？**
A: 目标用户不在应用可用范围内。请检查 **步骤 4**，将该用户添加到可用范围。

**Q: 发送消息返回错误码 `99991401`？**
A: 应用未启用机器人能力，或权限未生效。请按顺序检查：
1. **步骤 2**：确认机器人能力已启用
2. **步骤 3**：确认 `im:message:send_as_bot` 权限已开通
3. **步骤 5**：确认应用已发布上线（权限变更需重新发布）

**Q: 获取 tenant_access_token 失败？**
A: 检查以下几点：
1. `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` 是否正确（注意前后不要有空格）
2. 应用是否已创建并发布上线
3. App Secret 是否被重置过（飞书后台可以重置 Secret）

**Q: 配置了但收不到消息？**
A: 逐项排查：
1. 应用是否已上线（步骤 5 状态为「已上线」）
2. 目标用户是否在可用范围内（步骤 4）
3. 用户是否已绑定 `open_id`（步骤 8）
4. 后端日志中是否有 `⚠️ 飞书应用凭证未配置` 提示（说明环境变量未生效）

**Q: 如何在开发阶段快速调试？**
A: 建议在飞书开放平台的「API 调试台」中直接测试消息发送接口，确认应用配置无误后再集成到后端。

---

### 后台配置检查清单

完成所有配置后，对照以下清单逐项确认：

- [ ] 应用已创建，App ID / App Secret 已记录
- [ ] 机器人能力已启用
- [ ] `im:message:send_as_bot` 权限已开通
- [ ] 可用范围已添加所有目标用户
- [ ] 应用已发布上线（状态：已上线）
- [ ] `backend/.env` 中 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` 已填写
- [ ] 目标用户的 `open_id` 已绑定到系统

## 开发计划

详见 [后端开发计划](docs-dev/03-backend-development-plan.md)

## 许可证

Private
