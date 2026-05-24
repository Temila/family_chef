# Phase 2: Backend Core - Research

**Researched:** 2026-05-24
**Domain:** FastAPI backend — 邀请服务、访客下单 API、飞书通知集成
**Confidence:** HIGH

## Summary

Phase 2 在 Phase 1 数据层（GuestInvitation 模型、虚拟 guest 用户、Order FK）之上构建完整的后端 API。核心交付物为 5 个 API 端点：邀请创建（Chef 自建 / User 指定厨师）、访客菜品浏览、访客订单提交、已使用链接的只读订单摘要，以及飞书通知的访客订单标注。

代码库采用清晰的 Router → Service → Model 三层架构，所有 Service 是 `@staticmethod` + 模块级单例模式。访客端点不走 JWT 认证，通过路径参数中的 UUID4 token 做权限验证。现有 `DishService.list_dishes()` 和 `OrderService.generate_order_no()` 可直接复用，访客订单创建是 `OrderService.create_order()` 的简化版（厨师已绑定，无需 auto-split）。飞书通知 `send_order_notification` 的 data dict 可扩展 `is_guest` 字段实现访客标注。

**Primary recommendation:** 创建 `GuestService`（新文件）封装邀请 CRUD + 访客订单创建逻辑，创建 `guest.py` 路由（prefix `/api/guest`），复用现有 dish_service 和 order_service 的核心方法。访客订单提交使用事务内状态检查（D-05/D-06/D-07），飞书通知在现有 `send_order_notification` 中扩展 `is_guest` 标识（D-08）。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 访客看到完整菜品详情 — 图片、名称、描述、食材列表、分类标签，与注册用户一致。仅过滤为指定厨师上架的菜品
- **D-02:** 复用现有 DishListResponse schema，不创建专用 GuestDishResponse
- **D-03:** 访客菜品列表支持分页和分类筛选，与注册用户的菜品列表 API 一致
- **D-04:** 不显示饮食警告 — 访客无偏好数据
- **D-05:** 使用事务内状态检查 — 在 async session 同一个事务中执行 status 检查 + 订单创建 + status 更新
- **D-06:** 采用检查-操作-更新模式 — 先检查 status=active + expires_at 未过期，不满足则返回错误，满足后继续
- **D-07:** 标记邀请为 used 和创建访客订单在同一个数据库事务中，失败整体回滚
- **D-08:** 修复现有 `send_order_notification` 调用签名不匹配 bug（order_service.py:347 传 4 个位置参数但方法期望 `(self, receive_id, data: dict)`）+ 扩展 data dict 增加 `is_guest` 标识
- **D-09:** 访客订单飞书通知在订单号后加【访客订单】标签，点单人名称显示"访客"
- **D-10:** 访客订单飞书通知采用同步发送 + 失败忽略（try/except）
- **D-11:** CORS allow_origins=["*"] 和无 rate limiting 标记为已知风险，不在 Phase 2 处理
- **D-12:** 访客 API 端点组织在独立的 router 文件（`guest.py`），使用 `/api/guest` 前缀

### the agent's Discretion
- 邀请创建端点的具体请求/响应 schema 设计由 planner 决定
- 访客订单提交端点的请求体结构由 planner 根据现有 OrderCreate schema 决定
- 已使用链接的只读订单摘要返回格式由 planner 决定
- 惰性过期检查的具体实现位置（service 层 helper 还是 query 级别）由 planner 决定

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INV-01 | Chef 角色用户可一键生成访客邀请链接（自动绑定自己为厨师） | GuestService.create_invitation() — chef_id=current_user.id，无需额外参数。参考 auth.py 的 require_role("chef") 依赖 |
| INV-02 | User 角色用户生成邀请链接时可选择指定一位厨师 | GuestService.create_invitation() — user 角色必须传 chef_id 参数，验证 chef 存在且 role="chef" + is_active=True。参考 chef_service.list_chefs() |
| GORD-01 | 访客通过邀请链接访问点菜页面，无需注册或登录 | Guest router 的菜品端点使用 token 路径参数验证，不依赖 get_current_user_from_token |
| GORD-02 | 访客仅能看到邀请绑定的厨师所上架的菜品 | 复用 dish_service.list_dishes() 的 chef_filter + DishChef.status="published" 过滤逻辑 |
| GORD-05 | 一链接仅能提交一次订单，提交后链接变为只读 | 事务内 status 检查 + 原子更新（D-05/D-06/D-07） |
| GUX-04 | 链接已使用时显示已提交的订单摘要（只读） | GuestService.get_used_invitation_summary() — 通过 guest_invitation_id 查询关联 Order |
| NOTIF-01 | 访客提交订单后通过飞书通知绑定的厨师（标注"访客订单"） | 扩展 send_order_notification 的 data dict 增加 is_guest=True，飞书卡片模板增加【访客订单】标签 |
| DATA-04 | 一次性使用通过原子性状态检查实现 | 同一事务内 check status=active → create order → update status=used |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 邀请创建（INV-01/02） | API / Backend | — | 需要 JWT 认证和角色检查，纯服务端逻辑 |
| 访客菜品浏览（GORD-01/02） | API / Backend | — | 通过 token 路径参数验证，不需要前端认证层 |
| 访客订单提交（GORD-05） | API / Backend | — | 事务内原子性操作，纯服务端 |
| 已使用链接只读摘要（GUX-04） | API / Backend | — | 通过 token 查询关联订单 |
| 飞书通知（NOTIF-01） | API / Backend | External (Feishu API) | 后端发起 HTTP 调用，外部服务投递 |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | >=0.100.0 | Web framework — all router endpoints | Existing project standard [VERIFIED: pyproject.toml] |
| SQLAlchemy | >=2.0.0 | Async ORM — model queries, sessions | Existing project standard [VERIFIED: pyproject.toml] |
| Pydantic | >=2.0.0 | Schema validation — request/response models | Existing project standard [VERIFIED: pyproject.toml] |
| aiosqlite | >=0.19.0 | Async SQLite driver | Existing project standard [VERIFIED: pyproject.toml] |
| python-jose | >=3.3.0 | JWT token verification for auth'd endpoints | Existing project standard [VERIFIED: pyproject.toml] |
| httpx | >=0.24.0 | Async HTTP client for Feishu API | Existing project standard [VERIFIED: pyproject.toml] |
| uuid (stdlib) | 3.11+ | UUID4 token generation | Existing model uses String(36) [VERIFIED: guest_invitation.py] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pytest + pytest-asyncio | >=7.0 / >=0.21 | Backend testing | All endpoint testing |
| httpx (test client) | >=0.24.0 | ASGI test client | API endpoint integration tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 事务内状态检查 (D-05) | SELECT FOR UPDATE | SQLite 不支持行级锁，当前方案在单写者模式下足够安全 |
| 虚拟 guest 用户 | nullable user_id | 虚拟用户方案避免修改 NOT NULL constraint (Phase 1 D-04 决策) |

**Installation:**
无新包安装。Phase 2 完全复用现有技术栈。

## Package Legitimacy Audit

> Phase 2 不安装任何新包。所有依赖已存在于 pyproject.toml 中。

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI App (main.py)                    │
│                                                              │
│  ┌──────────────────┐    ┌──────────────────────────────┐   │
│  │  Auth'd Endpoints│    │  Guest Endpoints (no JWT)     │   │
│  │  /api/guest/     │    │  /api/guest/{token}/...       │   │
│  │  invitations     │    │  dishes, orders               │   │
│  │  (JWT required)  │    │  (token-based auth)           │   │
│  └────────┬─────────┘    └──────────┬───────────────────┘   │
│           │                         │                        │
│  ┌────────▼─────────────────────────▼───────────────────┐   │
│  │                  GuestService                         │   │
│  │  create_invitation()                                  │   │
│  │  get_invitation_by_token()  → validates + lazy expiry │   │
│  │  submit_guest_order()       → atomic check+create     │   │
│  │  get_used_invitation_summary()                        │   │
│  └────────┬────────────────────────┬────────────────────┘   │
│           │                        │                        │
│  ┌────────▼──────┐  ┌──────────────▼──────┐  ┌───────────┐ │
│  │ DishService   │  │ OrderService        │  │ FeishuClient│ │
│  │ (reuse        │  │ (reuse generate_    │  │ (extend     │ │
│  │  list_dishes) │  │  order_no + create) │  │  is_guest)  │ │
│  └───────────────┘  └─────────────────────┘  └───────────┘ │
│           │                        │               │        │
│  ┌────────▼────────────────────────▼───────────────▼─────┐ │
│  │               SQLite (aiosqlite)                       │ │
│  │  guest_invitations | orders | order_items | ...        │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```text
backend/app/
├── routers/
│   └── guest.py              # 新建 — 访客 API 端点（/api/guest 前缀）
├── services/
│   └── guest_service.py      # 新建 — 邀请 CRUD + 访客订单逻辑
├── schemas/
│   └── guest.py              # 新建 — 访客相关 Pydantic schemas
├── models/
│   └── guest_invitation.py   # 已存在 — Phase 1 创建
├── integrations/
│   └── feishu.py             # 修改 — 扩展 is_guest 标识
├── services/
│   └── order_service.py      # 修改 — 修复 notify_order bug
└── main.py                   # 修改 — 注册 guest router
```

### Pattern 1: Service Static Method + Module Singleton
**What:** 每个 Service 是一个类，所有方法为 `@staticmethod`，模块底部创建全局实例
**When to use:** 所有新建 Service 必须遵循此模式
**Example:**
```python
# backend/app/services/guest_service.py
class GuestService:
    """访客邀请服务"""

    @staticmethod
    async def create_invitation(db: AsyncSession, ...) -> GuestInvitation:
        ...

    @staticmethod
    async def get_invitation_by_token(db: AsyncSession, token: str) -> Optional[GuestInvitation]:
        ...

# 全局访客邀请服务实例
guest_service = GuestService()
```
[Source: Existing pattern in dish_service.py, order_service.py, chef_service.py — VERIFIED in codebase]

### Pattern 2: Router → Service Layer Separation
**What:** Router 处理 HTTP 关注点（认证、参数解析、错误转换），Service 处理业务逻辑
**When to use:** 所有新端点
**Example:**
```python
# backend/app/routers/guest.py
@router.post("/invitations", status_code=status.HTTP_201_CREATED)
async def create_invitation(
    invitation_data: GuestInvitationCreate,
    current_user: User = Depends(require_role("chef", "user")),
    db: AsyncSession = Depends(get_db),
):
    try:
        invitation = await guest_service.create_invitation(db, ...)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return invitation_response
```
[Source: Existing pattern in all routers — VERIFIED in codebase]

### Pattern 3: Token-Based Access (No JWT)
**What:** 访客端点通过路径参数中的 UUID4 token 验证访问权限，不使用 `get_current_user_from_token`
**When to use:** 访客菜品浏览和订单提交端点
**Example:**
```python
@router.get("/{token}/dishes", response_model=PageResponse[DishListResponse])
async def guest_list_dishes(
    token: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    invitation = await guest_service.validate_invitation(db, token)
    # ... filter dishes by invitation.chef_id
```
[Source: CONTEXT.md D-12 — `/api/guest` prefix, no auth dependency]

### Pattern 4: Atomic Status Check + Order Create (D-05/D-06/D-07)
**What:** 在同一个数据库事务中检查邀请状态、创建订单、更新邀请状态
**When to use:** 访客订单提交
**Example:**
```python
@staticmethod
async def submit_guest_order(db: AsyncSession, token: str, order_data: GuestOrderCreate) -> Order:
    # 1. 查询邀请并检查状态
    result = await db.execute(
        select(GuestInvitation).where(GuestInvitation.token == token)
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise ValueError("无效的邀请链接")
    if invitation.status != "active":
        raise ValueError("邀请链接已被使用")
    if invitation.expires_at < datetime.now():
        invitation.status = "expired"
        await db.flush()
        raise ValueError("邀请链接已过期")

    # 2. 创建订单（chef_id 已绑定）
    order_no = await OrderService.generate_order_no(db)
    # ... 创建 Order + OrderItems, user_id=guest_user.id

    # 3. 标记邀请为 used
    invitation.status = "used"
    await db.flush()
    # commit 由 get_db 依赖自动处理
    return order
```
[Source: CONTEXT.md D-05/D-06/D-07 decisions — VERIFIED]

### Anti-Patterns to Avoid
- **在 Router 中写业务逻辑:** Router 只做 HTTP 关注点，所有业务逻辑必须在 GuestService 中
- **访客端点使用 JWT 依赖:** 访客端点不能有 `Depends(get_current_user_from_token)`，否则未认证访客会收到 401
- **创建专用 GuestDishResponse schema:** D-02 明确要求复用 DishListResponse
- **飞书通知失败导致订单回滚:** D-10 明确要求 try/except 包裹通知，失败不影响主流程
- **忘记惰性过期:** 每次通过 token 查询邀请时，必须检查 expires_at 并更新 status（D-02 Phase 1 决策）

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 订单号生成 | 自己写序号生成 | OrderService.generate_order_no() | 已有冲突重试逻辑，包含日期+序号+UUID降级 |
| 菜品过滤 + 分页 | 重复 dish_service 的查询逻辑 | dish_service.list_dishes() 的过滤模式 | 复杂的 DishChef exists 子查询、分类筛选、分页计数 |
| UUID4 token 生成 | 自己拼接随机字符串 | `import uuid; uuid.uuid4().hex` 或 `str(uuid.uuid4())` | 标准库保证唯一性和不可猜测性 |
| 密码哈希 | 自己写哈希函数 | utils/security.py 的 hash_password() | 已有 bcrypt 实现 |
| 分页参数 | 自己解析 page/page_size | PaginationParams 类 | 已有 offset/limit 属性计算 |

**Key insight:** Phase 2 的核心复杂度在业务逻辑（原子性保证、角色判断、token 验证），不在基础设施。最大程度复用现有 Service 方法。

## Common Pitfalls

### Pitfall 1: 访客端点误用 JWT 认证依赖
**What goes wrong:** 访客端点加了 `Depends(get_current_user_from_token)`，访客无 token 导致 401
**Why it happens:** 复制粘贴现有路由代码时忘了移除认证依赖
**How to avoid:** 访客路由文件中不 import `get_current_user_from_token`，通过 `Depends(get_db)` 获取数据库会话，通过路径参数 `token` 验证身份
**Warning signs:** 访客端点返回 401/403

### Pitfall 2: 事务外检查邀请状态导致竞态条件
**What goes wrong:** 先查询邀请状态（事务 A），检查通过后创建订单（事务 B），两个操作之间另一个请求也通过了检查
**Why it happens:** 不理解 SQLite 单写者模式下的并发行为
**How to avoid:** D-05 决策 — 所有操作（status 检查 + 订单创建 + status 更新）在同一个 async session 事务内完成。get_db 依赖自动管理 commit/rollback
**Warning signs:** 同一邀请链接产生多个订单

### Pitfall 3: 忘记惰性过期检查
**What goes wrong:** 邀请已超过 expires_at 但 status 仍为 "active"，访客仍可下单
**Why it happens:** 只检查 status 字段不检查 expires_at
**How to avoid:** 每次通过 token 查询邀请时，同时检查 `invitation.status == "active" AND invitation.expires_at > datetime.now()`。过期时主动更新 status 为 "expired"
**Warning signs:** 2 小时前的邀请仍能下单

### Pitfall 4: User 角色创建邀请时未验证 chef_id
**What goes wrong:** User 创建邀请时传入无效或非 chef 的 chef_id
**Why it happens:** 只检查了用户角色，未验证 chef_id 指向的用户确实是活跃的 chef
**How to avoid:** 在 GuestService.create_invitation() 中验证 chef_id 对应的 User 存在、role="chef"、is_active=True
**Warning signs:** 邀请绑定了不存在的厨师，访客看到空菜品列表

### Pitfall 5: 虚拟 guest 用户 ID 硬编码
**What goes wrong:** 硬编码 guest 用户 ID 为某个固定值，但不同环境中 ID 可能不同
**Why it happens:** 迁移脚本中 INSERT 的记录 ID 不确定（autoincrement）
**How to avoid:** 在 GuestService 中通过 `select(User).where(User.username == "__guest__")` 查询获取 guest 用户 ID，不硬编码
**Warning signs:** 访客订单创建失败（外键约束 violation）

### Pitfall 6: conftest.py clean_all_tables 缺少 guest_invitations
**What goes wrong:** 测试清理不包含 guest_invitations 表，导致测试间数据泄露
**Why it happens:** Phase 1 新增了表但未更新 conftest.py
**How to avoid:** 在 conftest.py clean_all_tables() 中添加 "guest_invitations" 到 tables 列表，并添加 GuestInvitation model import 到 setup_database fixture
**Warning signs:** 测试间歇性失败（邀请 token 冲突）

### Pitfall 7: 飞书通知 is_guest 字段未正确传递
**What goes wrong:** notification_data 中遗漏 is_guest=True，飞书消息没有【访客订单】标签
**Why it happens:** 通知代码路径复杂，在 order_service.notify_order 和 order_service.update_order_status 中都有发送逻辑
**How to avoid:** 在访客订单提交流程中显式设置 `notification_data["is_guest"] = True` 和 `notification_data["user_name"] = "访客"`
**Warning signs:** 飞书卡片中不显示访客标识

## Code Examples

### 邀请创建 — Chef 角色 (INV-01)
```python
# Router: backend/app/routers/guest.py
@router.post("/invitations", status_code=status.HTTP_201_CREATED)
async def create_invitation(
    current_user: User = Depends(require_role("chef", "user")),
    db: AsyncSession = Depends(get_db),
):
    """创建访客邀请链接"""
    try:
        invitation = await guest_service.create_invitation(db, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return GuestInvitationResponse.model_validate(invitation)
```
[Source: Pattern derived from existing routers — VERIFIED in codebase patterns]

### 邀请创建 — User 指定厨师 (INV-02)
```python
@router.post("/invitations", status_code=status.HTTP_201_CREATED)
async def create_invitation(
    request: Optional[GuestInvitationCreate] = None,
    current_user: User = Depends(require_role("chef", "user")),
    db: AsyncSession = Depends(get_db),
):
    try:
        invitation = await guest_service.create_invitation(
            db, current_user,
            chef_id=request.chef_id if request else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return GuestInvitationResponse.model_validate(invitation)
```

### 访客菜品浏览 (GORD-01/02)
```python
@router.get("/{token}/dishes", response_model=PageResponse[DishListResponse])
async def guest_list_dishes(
    token: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """访客浏览指定厨师的上架菜品"""
    invitation = await guest_service.validate_invitation(db, token)
    # 复用 dish_service 查询逻辑，按 invitation.chef_id 过滤
    from app.utils.pagination import PaginationParams
    params = PaginationParams(page=page, page_size=page_size)
    dishes, total = await dish_service.list_dishes(
        db, params, status_filter=None,  # 使用默认 enabled + published 过滤
        # 需要新增或复用 chef_filter 机制来按指定厨师过滤
    )
    # ...
```

### 飞书通知访客标注扩展
```python
# feishu.py send_order_notification 扩展
async def send_order_notification(self, receive_id: str, data: dict) -> bool:
    order_no = data.get("order_no", "")
    is_guest = data.get("is_guest", False)
    user_name = data.get("user_name", "未知用户")

    # 访客订单标注
    if is_guest:
        order_no_display = f"{order_no}【访客订单】"
        user_name = "访客"
    else:
        order_no_display = order_no

    # ... 在卡片模板中使用 order_no_display 和 user_name
```
[Source: CONTEXT.md D-08/D-09 — VERIFIED in existing feishu.py structure]

### 飞书卡片模板变更（D-09）
```python
# 原有 header title:
# f"📋 订单 {order_no}"
# 改为:
if is_guest:
    header_title = f"📋 订单 {order_no}【访客订单】"
    header_template = "orange"  # 用不同颜色区分访客订单
else:
    header_title = f"📋 订单 {order_no}"
    header_template = "blue"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pydantic V1 `.dict()` | Pydantic V2 `.model_dump()` | Pydantic 2.0 | 所有新 schema 使用 model_dump() |
| FastAPI `on_event` | Lifespan handlers | FastAPI 0.100+ | 现有代码仍用 on_event（tech debt），新代码可用 lifespan |
| Sync SQLAlchemy | Async SQLAlchemy 2.0 | SQLAlchemy 2.0 | 所有查询使用 AsyncSession + await |

**Deprecated/outdated:**
- FastAPI `@app.on_event("startup")` 已 deprecated，但现有代码使用此模式。Phase 2 不涉及修改启动逻辑，无需变更。

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | dish_service.list_dishes() 可通过现有参数或简单扩展实现按单个 chef_id 过滤 | Architecture Patterns | 如果不能直接复用，需要新增查询方法 |
| A2 | 虚拟 guest 用户通过 `username="__guest__"` 查询可获取，且 initial_data.py 保证创建 | Common Pitfalls | 如果 initial_data 未运行或被清理，guest 用户不存在 |
| A3 | 飞书通知的 data dict 可安全扩展 is_guest 字段而不影响现有调用点 | Code Examples | 现有调用点需检查是否受影响 |

**Risk assessment:**
- A1: LOW risk — `chef_filter` 参数已支持 "my-published" 等模式，访客查询可能需要传入特定的 chef_id。最坏情况是新增一个简单的查询方法。
- A2: LOW risk — initial_data.py 已确认包含 guest 用户创建逻辑（VERIFIED in initial_data.py lines 38-57）。
- A3: LOW risk — `data.get("is_guest", False)` 默认 False，现有调用点不传此字段，行为不变。

## Open Questions

1. **访客菜品查询是否需要新建专用方法？**
   - What we know: dish_service.list_dishes() 支持多种过滤参数，包括 chef_filter
   - What's unclear: chef_filter 的现有选项（"my-published", "my-hidden", "not-yet-published"）都基于 user_id（即当前用户 = 厨师），访客场景需要按任意 chef_id 过滤 DishChef.status="published" 的菜品
   - Recommendation: 最简洁方案是在 dish_service.list_dishes() 中新增 `target_chef_id: Optional[int] = None` 参数，当提供时过滤 `DishChef.chef_id == target_chef_id AND DishChef.status == "published"`。或在 GuestService 中写一个简化的菜品查询方法

2. **邀请创建是否需要请求体？**
   - What we know: Chef 角色不需要任何额外参数（自动绑定自己），User 角色需要指定 chef_id
   - What's unclear: 是否需要统一的请求体（chef_id 为 Optional），还是两个独立端点
   - Recommendation: 单一端点 + 可选请求体（planner's discretion per CONTEXT.md）

3. **访客订单的 meal_date 和 meal_type 如何处理？**
   - What we know: 访客点菜是"提前点菜"场景，通常有明确的用餐日期和餐次
   - What's unclear: 访客是否需要填写 meal_date/meal_type，还是使用默认值
   - Recommendation: 访客订单请求体中 meal_date 和 meal_type 为可选字段（与现有 OrderCreate 一致），不填写时为 None

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python | Backend runtime | ✓ | 3.12.3 | — |
| Node.js | Frontend build (not this phase) | ✓ | 26.1.0 | — |
| SQLite | Database | ✓ | (via aiosqlite) | — |
| pytest | Testing | ✓ | (via pyproject.toml) | — |
| httpx | Test client + Feishu API | ✓ | (via pyproject.toml) | — |
| uvicorn | Dev server | ✓ | (via pyproject.toml) | — |

**Missing dependencies with no fallback:** None
**Missing dependencies with fallback:** None

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Partial — auth'd endpoints only | JWT via get_current_user_from_token + require_role() |
| V3 Session Management | No — 访客无 session，auth'd 用户用无状态 JWT | — |
| V4 Access Control | Yes | require_role("chef", "user") for invitation creation; token-based for guest access |
| V5 Input Validation | Yes | Pydantic schemas (GuestInvitationCreate, GuestOrderCreate, etc.) |
| V6 Cryptography | Yes | UUID4 token (不可猜测), bcrypt for password hashing |
| V8 Data Protection | Partial | CORS allow_origins=["*"] — acknowledged risk (D-11) |

### Known Threat Patterns for FastAPI + SQLite Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| UUID token brute force | Information Disclosure | UUID4 entropy (122 bits) makes guessing infeasible [ASSUMED] |
| CSRF on guest POST endpoints | Tampering | CORS ["*"] risk acknowledged (D-11), deferred to security phase |
| Race condition on one-time link | Tampering | Transaction-level atomic check (D-05/D-06/D-07) |
| SQL injection | Tampering | SQLAlchemy ORM parameterized queries (no raw SQL) |
| Path traversal via token parameter | Tampering | Pydantic str validation + DB lookup (token is always a DB query value) |

## Sources

### Primary (HIGH confidence)
- Codebase review — all files in backend/app/{routers,services,models,schemas,integrations}/
- Phase 1 CONTEXT.md — locked data layer decisions
- Phase 2 CONTEXT.md — locked implementation decisions (D-01 through D-12)
- REQUIREMENTS.md — INV-01, INV-02, GORD-01, GORD-02, GORD-05, GUX-04, NOTIF-01, DATA-04

### Secondary (MEDIUM confidence)
- Existing Alembic migration a9b1c2d3e4f5 — verified GuestInvitation table structure + guest user creation
- Existing test infrastructure (conftest.py) — verified testing patterns

### Tertiary (LOW confidence)
- None — all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all existing codebase
- Architecture: HIGH — follows established patterns, codebase thoroughly reviewed
- Pitfalls: HIGH — derived from codebase analysis and CONTEXT.md locked decisions

**Research date:** 2026-05-24
**Valid until:** 30 days (stable stack, no fast-moving dependencies)

---

## Key Files to Create/Modify (Summary for Planner)

### New Files
1. `backend/app/routers/guest.py` — 访客 API 路由（5 endpoints）
2. `backend/app/services/guest_service.py` — 邀请 CRUD + 访客订单逻辑
3. `backend/app/schemas/guest.py` — Pydantic schemas（GuestInvitationCreate, GuestInvitationResponse, GuestOrderCreate, GuestOrderSummary）
4. `backend/tests/test_guest.py` — 访客模块测试

### Files to Modify
1. `backend/app/main.py` line 77 — 注册 guest router
2. `backend/app/integrations/feishu.py` — 扩展 send_order_notification 支持 is_guest
3. `backend/app/services/order_service.py` — 修复 notify_order 调用签名 bug（D-08）
4. `backend/tests/conftest.py` — 添加 guest_invitations 到 clean_all_tables 和 setup_database

### Files NOT to Modify (Reference Only)
- `backend/app/models/guest_invitation.py` — Phase 1 已完成
- `backend/app/models/order.py` — Phase 1 已添加 guest_invitation_id FK
- `backend/app/initial_data.py` — Phase 1 已添加虚拟 guest 用户创建
