# Phase 3: Frontend Authenticated - Research

**Researched:** 2026-05-25
**Domain:** React SPA — invitation management UI, guest order badge integration
**Confidence:** HIGH

## Summary

Phase 3 delivers the authenticated user's invitation management interface and guest order visibility. The work spans two layers: extending the backend with two new endpoints (list invitations, revoke invitation) and building the full frontend UI — invitation section on UserHomePage, three modal types (invitation list, chef selector, link display, revoke confirm), status badge extension, and guest order badge integration in the chef order views.

**Primary recommendation:** Build a modular `InvitationsSection` component for UserHomePage embedding (`InvitationsSection.jsx`) with four modal sub-components (`InvitationsModal.jsx`, `ChefSelectModal.jsx`, `CreateLinkModal.jsx`, `ConfirmModal.jsx`). Extend `Badge.jsx` and `utils/index.js` `statusBadge` map with invitation statuses. Add three API methods to `client.js`. Add two backend endpoints to the guest router. Modify ChefOrdersPage (guest badge + filter chip) and OrderDetailPage (guest badge).

**Key architectural insight:** The user role flow requires a two-step modal sequence (chef select → create link), while the chef role flow is one-step (create link immediately). These share the same create-link modal but differ in the triggering interaction — implement branching via `user.role` check, not separate components.

**No new npm packages needed.** This phase uses only existing frontend dependencies (React, React Router DOM) and existing CSS classes. All UI is vanilla JSX + CSS.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01 through D-24)

**邀请入口与导航**
- D-01: 邀请管理功能以区块形式嵌入用户首页（UserHomePage），不创建独立页面
- D-02: "查看全部"按钮打开全屏 Modal 展示完整邀请列表，不通过路由跳转
- D-03: Chef 和 User 两个角色在首页均可见邀请区块
- D-04: "创建邀请"按钮仅在首页区块展示，不在全屏 Modal 中重复

**邀请列表展示**
- D-05: 列表采用行布局（非卡片），每行展示一条邀请
- D-06: 每行展示：状态 Badge、创建时间、过期时间、厨师名称（User 角色显示）、复制链接图标、撤销按钮
- D-07: 状态语义色：活跃=绿色、已使用=灰色、已过期=橙色、已撤销=红色
- D-08: 列表按 created_at 降序排列（最新在前）
- D-09: 首页区块展示最近 5 条邀请，"查看全部"打开全屏 Modal

**创建邀请流程**
- D-10: Chef 角色：点击"创建邀请"→ 一键生成 → 弹窗展示链接（含复制 + 分享按钮）
- D-11: User 角色：点击"创建邀请"→ 弹出厨师选择 Modal → 选择厨师 → 生成邀请 → 同一 Modal 展示链接
- D-12: 两角色按钮文字统一为"创建邀请"
- D-13: 创建后弹窗展示：完整链接、复制按钮、Web Share 按钮、"2小时内有效"提示

**分享与复制交互**
- D-14: 复制到剪贴板后仅显示 Toast 通知（无需按钮状态变化）
- D-15: Web Share 按钮和复制按钮并排显示，用户自选方式
- D-16: 每行"活跃"状态的邀请显示复制链接图标，支持重新复制
- D-17: 前端拼接完整链接：`window.location.origin + '/guest/' + token`

**撤销确认交互**
- D-18: 撤销操作需要二次确认弹窗
- D-19: 撤销按钮直接展示在行内（非下拉菜单）
- D-20: 撤销后乐观更新：行内状态立即变更为"已撤销"（红色），不刷新整个列表
- D-21: 仅"活跃"状态的邀请显示撤销按钮

**访客订单标识**
- D-22: 厨师订单列表中，访客订单在卡片头部 Order ID 旁显示橙色"访客订单"Badge
- D-23: 筛选 Tab 增加"访客订单"筛选芯片
- D-24: 订单详情页（/orders/{id}）同样显示橙色"访客订单"Badge

### the agent's Discretion
- 全屏 Modal 的具体 UI 风格（是否有搜索栏、分页方式）由 planner 决定
- 厨师选择 Modal 的 chef 列表格式（头像+姓名、下拉列表）由 planner 根据现有 chef_service.list_chefs() 决定
- 确认弹窗的具体文字和样式由 planner 根据现有 ToastContext / confirm 模式决定
- 筛选芯片的布局（数量、样式）由 planner 根据现有 ChefOrdersPage filter-chips 模式决定
- Order API 返回的 `is_guest` 字段名和结构由 planner 根据后端已有实现决定
- 链接在行内的截断显示形式由 planner 决定

### Deferred Ideas (OUT OF SCOPE)
- 邀请剩余时间倒计时（EUX-01）— v2 需求
- 二维码生成（EUX-02）— v2 需求
- 访客显示名（EUX-03）— v2 需求
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INV-04 | 用户可复制邀请链接到剪贴板 | Clipboard API via `navigator.clipboard.writeText()`. Pattern: `showToast('链接已复制到剪贴板')` on success, `showToast('复制失败，请手动复制', 'error')` on failure. No button state change needed (D-14). |
| INV-05 | 用户可通过微信/短信分享链接（Web Share API + 剪贴板降级） | `navigator.share()` with `{ title, text, url }`. Fallback: toast "当前浏览器不支持分享功能，请使用复制链接". Copy button always available side-by-side (D-15). |
| INV-06 | 用户可查看自己生成的邀请链接列表及状态 | New GET /api/guest/invitations endpoint returns paginated list. Frontend row layout (D-05) with Badge showing status (D-07). Section on UserHomePage shows latest 5 (D-09); full-screen modal shows all (D-02). |
| INV-07 | 用户可提前撤销尚未使用的邀请链接 | New PUT /api/guest/invitations/{id}/revoke endpoint. Optimistic update (D-20): set status=revoked in local state immediately, rollback on error. Confirm dialog (D-18). Revoke button only on active invitations (D-21). |
| NOTIF-02 | 访客订单在厨师订单列表中带"访客"标识 | Orange badge-warn "访客订单" next to order-no in ChefOrdersPage (D-22) and OrderDetailPage (D-24). "访客订单" filter chip on ChefOrdersPage (D-23). Uses `order.is_guest` field from API. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Invitation list data fetching | API / Backend | Browser | List invitations via GET /api/guest/invitations. Browser renders the list, backend provides paginated data. |
| Invitation creation | API / Backend | Browser | POST /api/guest/invitations creates the record. Browser collects `chef_id` input for user role. |
| Invitation revocation | API / Backend | Browser | PUT /api/guest/invitations/{id}/revoke updates status atomically. Browser optimistically updates local state. |
| Clipboard copy | Browser | — | Pure client-side via `navigator.clipboard.writeText()`. No server involved. |
| Web Share API | Browser | — | Pure client-side via `navigator.share()`. No server involved. |
| Guest order badge rendering | Browser | — | Conditional rendering of `<Badge>` based on `order.is_guest` field. Data comes from existing GET /api/orders and GET /api/orders/{id} endpoints. |
| Guest order filter chip | Browser | — | Local filter state in ChefOrdersPage. No additional API call needed — filters existing orders array client-side. |
| Full-screen invitation list modal | Browser | — | Pure UI component. Fetches data independently via API, renders in overlay. |
| Chef selection modal (user role) | API / Backend | Browser | Fetches chef list via existing GET /api/chefs. Browser handles selection UI. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.5 | UI framework | Existing project framework — all pages and components |
| React Router DOM | ^7.15.0 | Routing | Existing — ProtectedRoute with role gating |
| ApiClient (singleton) | — | API calls | Existing — auto-handles JWT auth, 401 redirect |

### Supporting (all existing — no new packages)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ToastContext | — | Toast notifications | Copy, create, revoke feedback |
| Badge | — | Status labels | Invitation status + guest order badge |
| Loading | — | Loading spinner | Invitation list loading state |
| EmptyState | — | Empty state display | "还没有邀请记录" fallback |
| Web Share API | Browser API | Share links | Create-link modal share button |
| Clipboard API | Browser API | Copy links | Create-link modal + row-level copy icon |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline modals in UserHomePage | Separate page (e.g. /invitations) | D-01 locked — modals embedded in home page |
| Branching logic in one section component | Separate Section + FullPage components | Simpler to have one `InvitationsSection` handling both home-section and modal states via `viewMode` prop |
| window.confirm for revoke | Custom confirm modal | D-18 locked — custom modal for severity consistency |
| react-icons / icon library | Emoji characters | Existing project convention — no icon framework imported |

**Installation:**
```bash
# No new packages needed — all dependencies are existing
```

**Version verification:** No new packages required. All UI uses existing React 19.2.5, React Router DOM 7.15.0, and vanilla CSS.

## Package Legitimacy Audit

> **No external packages required for this phase.** All UI is built with existing project dependencies (React, React Router DOM, vanilla CSS). No npm install needed.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| *(none)* | — | — | — | — | — | Not applicable |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Browser (React SPA)                           │
│                                                                      │
│  ┌─────────────────────────────────────────────────────┐             │
│  │                  UserHomePage.jsx                    │             │
│  │                                                      │             │
│  │  ┌────────────────────────────────────────┐          │             │
│  │  │    InvitationsSection                   │          │             │
│  │  │  ┌──────────────────────────────────┐  │          │             │
│  │  │  │ Section Header: "邀请访客" +     │  │          │             │
│  │  │  │ "创建邀请" btn + "查看全部"      │  │          │             │
│  │  │  └──────────────┬───────────────────┘  │          │             │
│  │  │                 │                       │          │             │
│  │  │  ┌──────────────▼───────────────────┐  │          │             │
│  │  │  │ Recent 5 Invitation Rows         │  │          │             │
│  │  │  │ [Badge] [created] [expires]      │  │          │             │
│  │  │  │ [chef_name*] [📋] [撤销]        │  │          │             │
│  │  │  └──────────────────────────────────┘  │          │             │
│  │  └──────────────────┬─────────────────────┘          │             │
│  │                     │                                │             │
│  │  ┌──────────────────▼─────────────────────┐          │             │
│  │  │  Modals (conditional rendering)         │          │             │
│  │  │  ┌──────────┐ ┌──────────┐ ┌────────┐  │          │             │
│  │  │  │Invitation│ │ChefSelect│ │Create  │  │          │             │
│  │  │  │sModal    │ │Modal     │ │LinkModal│  │          │             │
│  │  │  │(full-    │ │(user     │ │(both   │  │          │             │
│  │  │  │ screen)  │ │ role)    │ │ roles) │  │          │             │
│  │  │  └──────────┘ └──────────┘ └────────┘  │          │             │
│  │  └─────────────────────────────────────────┘          │             │
│  └─────────────────────────────────────────────────────┘             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────┐             │
│  │              ChefOrdersPage.jsx                      │             │
│  │  ┌────────────────────────────────────────────────┐  │             │
│  │  │ filter-chips: [全部] [待处理] ... [访客订单]     │  │             │
│  │  └────────────────────────────────────────────────┘  │             │
│  │  ┌────────────────────────────────────────────────┐  │             │
│  │  │ Order Card (when order.is_guest === true)       │  │             │
│  │  │  ┌─────────────────────────────────────────┐   │  │             │
│  │  │  │ order-header: #123 [badge-warn:访客订单]  │   │  │             │
│  │  │  └─────────────────────────────────────────┘   │  │             │
│  │  └────────────────────────────────────────────────┘  │             │
│  └─────────────────────────────────────────────────────┘             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────┐             │
│  │              OrderDetailPage.jsx                     │             │
│  │  Card header: "订单 #N" + [badge-warn:访客订单]      │             │
│  └─────────────────────────────────────────────────────┘             │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │ HTTPS / API
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                                    │
│                                                                      │
│  ┌────────────────────────────────────────────────┐                  │
│  │  Guest Router (/api/guest)                      │                  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐   │                  │
│  │  │POST      │ │GET       │ │PUT           │   │                  │
│  │  │/invitat- │ │/invitat- │ │/invitations/ │   │                  │
│  │  │ions      │ │ions      │ │{id}/revoke   │   │                  │
│  │  │(EXISTS)  │ │(NEW)     │ │(NEW)         │   │                  │
│  │  └──────────┘ └──────────┘ └──────────────┘   │                  │
│  └────────────────────┬───────────────────────────┘                  │
│                       │                                             │
│  ┌────────────────────▼───────────────────────────┐                 │
│  │  GuestService                                   │                 │
│  │  ┌────────────────┐ ┌──────────────┐          │                  │
│  │  │list_invitations │ │revoke_invita│          │                  │
│  │  │(NEW)            │ │tion (NEW)    │          │                  │
│  │  └────────────────┘ └──────────────┘          │                  │
│  └────────────────────────────────────────────────┘                  │
│                                                                      │
│  ┌────────────────────────────────────────────────┐                  │
│  │  Order Router (/api/orders)                     │                  │
│  │  GET /orders (EXISTS) — returns is_guest field  │                  │
│  │  GET /orders/{id} (EXISTS) — returns is_guest   │                  │
│  └────────────────────────────────────────────────┘                  │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Flow — Primary Use Cases

**Use Case 1: Chef creates invitation → shares link**
1. Chef clicks "创建邀请" button on UserHomePage
2. Frontend calls `api.createInvitation()` → `POST /api/guest/invitations` (no body)
3. Backend returns `GuestInvitationResponse` with `token`
4. Frontend opens CreateLinkModal with `window.location.origin + '/guest/' + token`
5. Chef taps "复制链接" → Clipboard API → toast
6. Chef taps "分享" → Web Share API → native share sheet

**Use Case 2: User creates invitation → shares link**
1. User clicks "创建邀请" button on UserHomePage
2. Frontend opens ChefSelectModal → calls `api.getChefs()` → shows chef list
3. User selects a chef → calls `api.createInvitation(chefId)` → `POST /api/guest/invitations { chef_id: N }`
4. Same CreateLinkModal flow as chef (steps 4-6 above)

**Use Case 3: User views invitation list**
1. On load, `InvitationsSection` calls `api.getInvitations()` → `GET /api/guest/invitations?page=1&page_size=5`
2. Renders latest 5 rows with Badge, dates, copy icon, revoke button
3. "查看全部" click → opens full-screen InvitationsModal
4. Modal calls `api.getInvitations()` with larger page_size → renders all rows
5. Modal body scrollable, close via × or overlay click

**Use Case 4: User revokes an active invitation**
1. User clicks "撤销" on an active invitation row
2. Opens revoke confirm dialog
3. User confirms "确定撤销"
4. Optimistic update: row status immediately changes to "revoked" (red)
5. Background: `api.revokeInvitation(id)` → `PUT /api/guest/invitations/{id}/revoke`
6. On API failure: rollback status, show error toast

**Use Case 5: Chef sees guest order in order list**
1. ChefOrdersPage loads via `api.getOrders()`
2. Each order has `is_guest: true/false` from API
3. If `order.is_guest`: render `<Badge status="" type="warn" text="访客订单" />` next to `order-no`
4. Filter chip "访客订单" added to filter-chips row → sets `filterStatus === 'guest'`
5. When active, shows only orders where `order.is_guest === true`

### Recommended Project Structure
```
frontend/src/
├── components/
│   ├── Badge.jsx                          # [MODIFY] — extend for invitation statuses
│   └── ... (existing)
├── pages/
│   ├── UserHomePage.jsx                   # [MODIFY] — add InvitationsSection
│   ├── ChefOrdersPage.jsx                 # [MODIFY] — add guest badge + filter chip
│   └── OrderDetailPage.jsx                # [MODIFY] — add guest badge
├── api/
│   └── client.js                          # [MODIFY] — add getInvitations, createInvitation, revokeInvitation
├── components/
│   ├── InvitationsSection.jsx             # [NEW] — home page section + state management for modals
│   ├── InvitationsModal.jsx               # [NEW] — full-screen invitation list
│   ├── ChefSelectModal.jsx                # [NEW] — chef picker for user role
│   ├── CreateLinkModal.jsx                # [NEW] — link display with copy + share
│   └── ConfirmModal.jsx                   # [NEW] — reusable confirm dialog (revoke)
├── utils/
│   └── index.js                           # [MODIFY] — add invitation statuses to statusBadge map
├── css/
│   └── styles.css                         # [MODIFY] — add .badge-muted class
└── App.jsx                                # [NO CHANGE] — no new routes needed

backend/
├── app/
│   ├── services/
│   │   └── guest_service.py               # [MODIFY] — add list_invitations, revoke_invitation
│   ├── routers/
│   │   └── guest.py                       # [MODIFY] — add GET /invitations, PUT /{id}/revoke
│   └── schemas/
│       └── guest.py                       # [MODIFY] — add InvitationListResponse if needed
```

### Pattern 1: Invitation Section with Modal Layering

**What:** A parent state machine controls which view is shown: home section (default) → modals stack up as overlay. Each modal is a simple `showModal` state variable. The section component owns the invitation data and passes it down to child modals.

**When to use:** When D-01 embeds the feature in an existing page but needs full-screen modal for overflow.

**Data ownership model:**
```
InvitationsSection
  - owns: invitations[], loading, error
  - owns: modal visibility state (showFullList, showChefSelect, showCreateLink, showRevokeConfirm)
  - owns: optimistic update logic (revoke)
  - passes: invitations → InvitationsModal (full list), invitations rows → direct render (section)
  - passes: api.createInvitation → flows from ChefSelectModal → CreateLinkModal
```

**Example structure (invitations + modals):**
```jsx
// Pattern: Section component with modal branching
export default function InvitationsSection() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFullList, setShowFullList] = useState(false);
  const [showChefSelect, setShowChefSelect] = useState(false);
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [newLink, setNewLink] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);

  const loadInvitations = async () => { /* calls api.getInvitations */ };

  const handleCreate = async (chefId) => {
    const res = await api.createInvitation(chefId);
    setNewLink(window.location.origin + '/guest/' + res.token);
    setShowCreateLink(true);
  };

  const handleRevoke = async (id) => {
    // Optimistic update
    setInvitations(prev => prev.map(inv =>
      inv.id === id ? { ...inv, status: 'revoked' } : inv
    ));
    setRevokeTarget(null);
    try {
      await api.revokeInvitation(id);
      showToast('邀请已撤销');
    } catch {
      // Rollback: re-fetch
      showToast('撤销失败，请稍后重试', 'error');
      loadInvitations();
    }
  };

  // ... render
}
```

### Pattern 2: Optimistic Update with Rollback (D-20)

**What:** For revocation, update local state immediately with the new status, then send API request. On failure, roll back by re-fetching the full list.

**When to use:** When the UI response to a user action should be instant, and the failure case is rare enough that the UX benefit outweighs the complexity.

**Implementation:**
```jsx
const handleRevoke = async (invitationId) => {
  // Save snapshot for potential rollback
  const prevInvitations = [...invitations];
  
  // Optimistic update
  setInvitations(prev => prev.map(inv =>
    inv.id === invitationId ? { ...inv, status: 'revoked' } : inv
  ));
  
  try {
    await api.revokeInvitation(invitationId);
    showToast('邀请已撤销');
  } catch (err) {
    // Rollback to previous state
    setInvitations(prevInvitations);
    showToast('撤销失败，请稍后重试', 'error');
  }
};
```

### Pattern 3: Invitation Row Layout (D-05, D-06)

**What:** A horizontal row matching the existing `.list-item` CSS class. Each row shows status badge, timestamps, optional chef name, and action icons.

**Data mapping for each row:**
| UI Element | Source | Conditions |
|---|---|---|
| Status Badge | `invitation.status` → `statusBadge()` | Always shown |
| Created time | `formatDate(invitation.created_at)` | Always shown |
| Expiry time | `formatDate(invitation.expires_at)` | Always shown |
| Chef name | `invitation.chef_name` | Only for `user` role (not chef) |
| Copy icon 📋 | `window.location.origin + '/guest/' + invitation.token` | Only when status === 'active' (D-16) |
| Revoke button | `invitation.id` | Only when status === 'active' (D-21) |

### Pattern 4: Chef Orders Filter Chip Integration (D-23)

**What:** Add a "访客订单" chip to the existing `filter-chips` row that filters to show only guest orders.

**Implementation:**
```jsx
// In ChefOrdersPage.jsx filter-chips — add after existing chips:
<button
  className={`filter-chip ${filterStatus === 'guest' ? 'active' : ''}`}
  onClick={() => setFilterStatus('guest')}
>
  访客订单 ({orders.filter(o => o.is_guest).length})
</button>

// In filteredOrders filter logic — add case:
const filteredOrders = orders.filter(order => {
  if (filterStatus === 'all') return true;
  if (filterStatus === 'guest') return order.is_guest;
  return order.status === filterStatus;
});
```

### Anti-Patterns to Avoid

- **Separate page for invitation management (anti D-01):** Don't create a `/invitations` route. The feature is embedded in UserHomePage.
- **Re-fetching full list on revoke:** D-20 mandates optimistic update — don't call `loadInvitations()` after successful revoke; only on failure.
- **Duplicate "创建邀请" button in modal (anti D-04):** Only the section-level button creates invitations; the full-screen modal shows only the list.
- **Using browser's native confirm for revoke (anti D-18):** D-18 demands a modal confirmation, not `window.confirm`.
- **Hardcoding the link hostname:** Use `window.location.origin` per D-17.
- **Rendering guest badge for non-guest orders:** Always gate on `order.is_guest === true`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Copy to clipboard | Custom copy logic | `navigator.clipboard.writeText()` | Built into all modern browsers. Handle with try/catch for Safari compatibility. |
| Web sharing | Custom share dialog | `navigator.share()` (Web Share API) | Native OS share sheet (微信, 短信, etc.). Check `typeof navigator.share === 'function'` before showing button. |
| Toast notifications | Toast from scratch | Existing `ToastContext.showToast()` | Project already has a robust toast system. |
| Loading states | Custom loading | Existing `<Loading />` component | Project already has spinner + text pattern. |
| Empty states | Custom empty | Existing `<EmptyState />` component | Project already has empty state component. |
| Modal boilerplate | Write modals from scratch | Reuse `.modal-overlay` / `.modal-content` / `.modal-header` / `.modal-body` / `.modal-footer` CSS pattern | Existing CSS classes support standard and full-screen modals — just compose JSX. |
| Chef selection UI | Custom chef selector | Reuse existing `.chef-select-item` CSS + getChefs() API | Existing CSS at `styles.css:409` supports clickable chef selection cards. |

**Key insight:** This phase requires zero new external dependencies. Every UI pattern (modals, badges, toasts, loading, empty states, filter chips, list items) already exists in the project. The work is composing existing components with new logic.

## Common Pitfalls

### Pitfall 1: Missing Backend Endpoints

**What goes wrong:** The plan creates frontend API calls to endpoints that don't exist yet (`GET /api/guest/invitations`, `PUT /api/guest/invitations/{id}/revoke`).

**Why it happens:** Phase 2 only created the invitation creation, guest dish browsing, and guest order submission endpoints. The listing and revocation endpoints are new for Phase 3.

**How to avoid:** Create both backend endpoints first (or in parallel). The GuestService needs two new methods: `list_invitations(inviter_id)` with pagination and `revoke_invitation(invitation_id)` with ownership validation.

**Warning signs:** Frontend tests fail with 404 or 405 on GET `/api/guest/invitations` or PUT `/api/guest/invitations/{id}/revoke`.

**Backend tasks needed:**
- `GuestService.list_invitations(db, inviter_id, params)` — query by `inviter_id`, ordered by `created_at DESC`, with pagination. Include `chef` name in response.
- `GuestService.revoke_invitation(db, invitation_id, current_user_id)` — verify ownership (`inviter_id == current_user_id`), check status is `'active'`, set to `'revoked'`.
- Guest router: `GET /api/guest/invitations` (Depends on `require_role("chef", "user")`)
- Guest router: `PUT /api/guest/invitations/{id}/revoke` (Depends on `require_role("chef", "user")`)

### Pitfall 2: is_guest Field Not Available on Orders API

**What goes wrong:** Frontend checks `order.is_guest` but the existing order API doesn't return this field.

**Why it happens:** Phase 2 stores `guest_invitation_id` on orders, which is `NULL` for non-guest orders. The frontend needs a derived `is_guest` boolean.

**How to avoid:** The order serialization (likely in `OrderResponse` Pydantic schema or the router's response builder) must include `is_guest: bool` — computed as `guest_invitation_id is not None`. Verify this exists before building the frontend. If it doesn't exist in the order schemas, the `is_guest` field needs to be added to the order response schema (`OrderResponse` in `backend/app/schemas/order.py`).

**Warning signs:** Check `backend/app/schemas/order.py` for an `is_guest` field. Check the Phase 2 summaries — they mention extending Feishu notifications with `is_guest`, not the order API response.

### Pitfall 3: Invitation Row Layout Breaks on Mobile

**What goes wrong:** Too many elements in one row (Badge + 2 dates + chef name + copy icon + revoke button) overflow on narrow screens.

**Why it happens:** Mobile-first but 6 elements per row is too many for 420px max-width.

**How to avoid:** Use a two-line row layout:
- Line 1: Status Badge (left) + Copy/Revoke actions (right)
- Line 2: Created time | Expiry time (small, muted, one line)
- Line 3 (if user role): Chef name
This matches the `.list-item` pattern where `list-item-info` wraps multiple lines. On wider screens it can be a single horizontal row.

**Warning signs:** Row looks cramped or wraps awkwardly at 420px viewport width.

### Pitfall 4: Disappearing toast after web share

**What goes wrong:** After successful Web Share API call, the toast "链接已复制到剪贴板" appears even though the user shared the link.

**Why it happens:** The copy button and share button both trigger the same toast.

**How to avoid:** Only show "链接已复制到剪贴板" when the clipboard copy button is used. For Web Share API, either show no toast (native share sheet is its own feedback) or show "分享已发送". The UI Spec contract says toast is for copy only.

### Pitfall 5: Full-Screen Modal Overrides BottomBar

**What goes wrong:** The full-screen modal overlays the BottomBar (which is part of the page-container). When the modal closes, the page scroll position may shift.

**Why it happens:** Modals use `position: fixed` with `z-index: 500`, which sits above the BottomBar (`z-index: 200`). This is correct for the overlay, but the page content underneath may shift.

**How to avoid:** Prevent body scroll when modal is open. Use `document.body.style.overflow = 'hidden'` when the modal mounts and restore on unmount. This prevents the page underneath from scrolling.

### Pitfall 6: Chef Name Not Included in Invitation Response

**What goes wrong:** The GuestInvitationResponse schema (Phase 2) doesn't include `chef_name` — only `chef_id`. The row needs to show the chef's name for user-role inviters.

**Why it happens:** Phase 2 only needed `GuestInvitationResponse` for the create response, which the frontend doesn't display in detail. Phase 3's list view needs the chef's display name.

**How to avoid:** Either extend `GuestInvitationResponse` (or create a new list response schema) to include `chef_name: Optional[str]`. The `GuestInvitation` model has a `chef` relationship that can be eager-loaded with `selectinload(GuestInvitation.chef)`.

## Code Examples

### Code Example 1: API Client Additions (frontend/src/api/client.js)

```javascript
// Source: [CITED: existing project patterns — matches existing API methods]

// ─── Guest Invitations ─────────────────────────────────────
async getInvitations(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', params.page);
  if (params.page_size) qs.set('page_size', params.page_size);
  return this.get(`/guest/invitations?${qs}`);
}

async createInvitation(chefId) {
  const body = chefId ? { chef_id: chefId } : undefined;
  return this.post('/guest/invitations', body);
}

async revokeInvitation(id) {
  return this.put(`/guest/invitations/${id}/revoke`);
}
```

### Code Example 2: Badge Extension (frontend/src/utils/index.js)

```javascript
// Source: [CITED: existing statusBadge map — extend with invitation statuses]
// Add to statusBadge map:
active: { text: '活跃', cls: 'badge-success' },
used: { text: '已使用', cls: 'badge-muted' },
expired: { text: '已过期', cls: 'badge-warn' },
revoked: { text: '已撤销', cls: 'badge-danger' },
```

### Code Example 3: CSS Addition for muted badge (frontend/src/css/styles.css)

```css
/* Add after existing badge classes at line 117 */
.badge-muted { background: var(--bg-elevated); color: var(--text-muted); }
```

### Code Example 4: Full-Screen Modal with Guest Order Badge (OrderDetailPage.jsx)

```javascript
// Source: [CITED: existing OrderDetailPage.jsx patterns]
// Near line 64, in the card header area:
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
  <h3 style={{ margin: 0 }}>订单 #{order.id}
    {order.is_guest && (
      <span className="badge badge-warn" style={{ marginLeft: 8, verticalAlign: 'middle' }}>
        访客订单
      </span>
    )}
  </h3>
  <Badge status={order.status} />
</div>
```

### Code Example 5: Clipboard Copy + Web Share Side-by-Side (CreateLinkModal.jsx)

```javascript
// Source: [CITED: D-14, D-15 — side by side buttons]
const [copyBtnDisabled, setCopyBtnDisabled] = useState(false);

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(linkUrl);
    showToast('链接已复制到剪贴板');
  } catch {
    showToast('复制失败，请手动复制', 'error');
  }
};

const handleShare = async () => {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: '家味 · Family Chef',
        text: '来点菜吧！',
        url: linkUrl,
      });
    } catch {
      // User cancelled — no feedback needed
    }
  } else {
    showToast('当前浏览器不支持分享功能，请使用复制链接', 'error');
  }
};

// Render:
<div style={{ display: 'flex', gap: 12 }}>
  <button className="btn btn-primary flex-1" onClick={handleCopy}>
    📋 复制链接
  </button>
  <button className="btn btn-outline flex-1" onClick={handleShare}>
    🚀 分享
  </button>
</div>
```

### Code Example 6: GuestService Extensions (backend)

```python
# Source: [CITED: existing GuestService patterns — static methods]

@staticmethod
async def list_invitations(
    db: AsyncSession,
    inviter_id: int,
    params,
) -> tuple[list[GuestInvitation], int]:
    """获取用户创建的邀请列表"""
    from sqlalchemy.orm import selectinload

    # Count total
    count_q = select(func.count()).select_from(GuestInvitation).where(
        GuestInvitation.inviter_id == inviter_id
    )
    result = await db.execute(count_q)
    total = result.scalar()

    # Query with eager load of chef name
    q = (
        select(GuestInvitation)
        .where(GuestInvitation.inviter_id == inviter_id)
        .options(selectinload(GuestInvitation.chef))
        .order_by(GuestInvitation.created_at.desc())
        .offset(params.offset)
        .limit(params.limit)
    )
    result = await db.execute(q)
    invitations = result.scalars().all()
    return list(invitations), total

@staticmethod
async def revoke_invitation(
    db: AsyncSession,
    invitation_id: int,
    current_user_id: int,
) -> GuestInvitation:
    """撤销邀请（仅创建者可撤销，仅活跃状态可撤销）"""
    result = await db.execute(
        select(GuestInvitation).where(GuestInvitation.id == invitation_id)
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise ValueError("邀请不存在")
    if invitation.inviter_id != current_user_id:
        raise ValueError("无权撤销此邀请")
    if invitation.status != "active":
        raise ValueError("仅活跃状态的邀请可撤销")
    if invitation.expires_at < datetime.now():
        invitation.status = "expired"
        await db.flush()
        raise ValueError("邀请已过期，无法撤销")
    invitation.status = "revoked"
    await db.flush()
    await db.refresh(invitation)
    return invitation
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No invitation management UI | Embedded section on UserHomePage | Phase 3 | Authenticated users can create/share/manage invitations |
| Chef sees undifferentiated orders | Guest orders with orange badge | Phase 3 | Chef can identify guest orders at a glance |
| No guest order filtering | "访客订单" filter chip | Phase 3 | Chef can filter to see only guest orders |
| Custom share/copy build | Web Share API + Clipboard API | Phase 3 | Standard browser APIs, no extra dependencies |

**Deprecated/outdated:**
- N/A — this is the first implementation of this feature

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Order` API response from Phase 2 already includes `is_guest` boolean field | Architectural Responsibility Map / Pitfall 2 | If missing, needs backend schema change — planner must add `is_guest` to OrderResponse schema and verify in order router |
| A2 | `GuestInvitationResponse` schema includes or can be extended with `chef_name` | Pitfall 6 | If chef name not in response, user-role row will show chef_id instead of name — needs schema change |
| A3 | Backend review endpoint only needs `PUT` (not `POST`) for revoke | Requires planner verification | The existing project pattern uses `PUT` for status changes (e.g., `PUT /api/orders/{id}/status`) — consistent |
| A4 | `GET /api/chefs` returns a list with `id` and `display_name` (or `username`) | ChefSelectModal | Using existing getChefs() — verify the response shape before building the modal |
| A5 | Web Share API requires HTTPS to function | CreateLinkModal | In dev mode over localhost, Web Share API may be unavailable. Graceful fallback to copy is already planned. |

## Open Questions

1. **Does `is_guest` exist in the order API response?**
   - What we know: Phase 2 added `guest_invitation_id` on orders. Feishu notification uses `is_guest` flag. But the order API response schema (`OrderResponse`) may not include a derived `is_guest` field.
   - What's unclear: Whether the frontend can simply read `order.is_guest` or needs a backend schema change.
   - Recommendation: **Planner must check `backend/app/schemas/order.py` for `is_guest` field.** If absent, add it as computed field: `is_guest: bool = Field(default=False)` and update the response builder.

2. **Does `GuestInvitationResponse` include chef name?**
   - What we know: The schema has `chef_id: int` but no `chef_name`.
   - What's unclear: Whether the list endpoint should include chef name or the frontend should make a separate call.
   - Recommendation: **Extend the invitation list response** to include `chef_name: Optional[str]` for user-role list display. Create a new schema `GuestInvitationListResponse` or extend the existing one.

3. **How does pagination work for the invitations list?**
   - What we know: Section shows 5, Modal shows all.
   - What's unclear: Should the modal load all at once (large page_size) or implement client-side pagination?
   - Recommendation: **Use a generous `page_size=50` for the modal** — realistic maximum invitations. The project doesn't use server-side pagination in modals elsewhere.

## Validation Architecture

> **Skipped:** `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`.

## Security Domain

**Status:** `security_enforcement` is enabled (absent = enabled per config, and the flag is `true`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | All guest endpoints are intentionally JWT-free. Authenticated endpoints use existing `require_role` dependency. |
| V3 Session Management | No | Stateless JWT — no changes to session handling. |
| V4 Access Control | Yes | Revoke endpoint must verify ownership: only `inviter_id` can revoke. List endpoint must filter by `inviter_id` — users cannot see other users' invitations. |
| V5 Input Validation | Yes | Via existing patterns — Pydantic schemas for POST body, path param validation. |
| V6 Cryptography | No | No new cryptographic operations. Existing UUID4 token generation is sufficient. |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Invitation list privilege escalation | Information Disclosure | Filter list by `inviter_id = current_user.id` in GuestService. Never return other users' invitations. |
| Revoke a non-owned invitation | Tampering | Verify `invitation.inviter_id == current_user.id` before revoke. Return 403 if mismatch. |
| Revoke an already-used/expired invitation | Tampering | Check `invitation.status == "active"` before allowing revoke. Return 400 if not active. |
| XSS via invitation data (chef name, dates) | Spoofing | Data rendered as JSX text content (auto-escaped). Eager loading prevents raw SQL content exposure. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend build / dev server | ✓ | 22 | — |
| npm | Package management | ✓ | (part of Node) | — |
| Modern browser | Clipboard API, Web Share API | ✓ (runtime) | — | Copy fallback to textarea.select() for older browsers |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

## Sources

### Primary (HIGH confidence)
- [Codebase] — Frontend source files: UserHomePage.jsx, ChefOrdersPage.jsx, OrderDetailPage.jsx, Badge.jsx, client.js, styles.css, utils/index.js
- [Codebase] — Backend source files: guest_service.py, guest.py (router), guest_invitation.py (model), guest.py (schemas), order.py (model)
- [Codebase] — Phase 2 summaries: 02-01-SUMMARY.md, 02-02-SUMMARY.md
- [Codebase] — UI design contract: 03-UI-SPEC.md
- [Codebase] — User decisions: 03-CONTEXT.md (D-01 through D-24)

### Secondary (MEDIUM confidence)
- [Codebase] — ROADMAP.md: Success criteria for Phase 3
- [Codebase] — REQUIREMENTS.md: INV-04, INV-05, INV-06, INV-07, NOTIF-02 definitions
- [Codebase] — AGENTS.md: Project constraints, tech stack, conventions
- [Codebase] — ARCHITECTURE.md: System architecture patterns, service layer conventions

### Tertiary (LOW confidence)
- [ASSUMED] — Web Share API behavior on iOS WeChat browser (may not be supported — fallback to clipboard copy is required)
- [ASSUMED] — `is_guest` field in order API response (needs verification)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing project dependencies, no new packages needed
- Architecture: HIGH — follows established project patterns (ApiClient, modals, filter-chips, Badge)
- Pitfalls: HIGH — based on codebase inspection and understanding of the Phase 2 deliverables
- Backend extension needs: MEDIUM — depends on verifying `is_guest` field and invitation response schema include chef name

**Research date:** 2026-05-25
**Valid until:** 2026-06-24 (stable project, no fast-moving dependencies)
