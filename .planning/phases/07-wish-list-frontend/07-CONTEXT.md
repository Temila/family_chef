# Phase 7: Wish List Frontend - Context

**Gathered:** 2026-07-22
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the **mobile-friendly UI for the v1.1 Dish Wish List** feature, consuming the existing backend API and notification layer:

- **User view** at `/my-wishes` — submit (modal), list own wishes as cards, edit + cancel via inline card actions (modal)
- **Chef view** at `/chef/wishes` — single page with three tabs (全部 / 待处理 / 我的认领), claim/advance/reject via inline card actions; advance uses dish-picker modal
- **Admin view** at `/admin/wishes` — full overview with the same component set + admin can act on any wish
- **Shared WishCard** component reused across all three roles + role-gated action row at card bottom
- **Shared status badge** with 5-state color mapping (待处理/准备中/已上架/已拒绝/已撤销)
- **Unread red dot** on card top-right (only meaningful to the submitter, per Phase 6 NOTIF-03/04)
- **Sidebar nav entries** for all three roles + API client methods for all 8 wish endpoints

**Out of scope (Phase 7):**
- Backend API or DB schema changes — Phases 5 & 6 are complete
- Notification fan-out logic — Phase 6 wired it; Phase 7 only consumes `has_unread`
- Wish status change history (WISH-F04 deferred)
- Wish tagging / multi-link / comments (WISH-F01/02/03 deferred)
- Guest users (PERM-01 + v1.1 scope restricts wishes to registered users)
</domain>

<decisions>
## Implementation Decisions

### 页面架构与路由

- **D-01:** Three independent pages, one per role:
  - `/my-wishes` — user view (own wishes only)
  - `/chef/wishes` — chef view (queue + 我的认领 + 全部)
  - `/admin/wishes` — admin view (all wishes, can act on any)
- **D-02:** Sidebar nav entries (top-level item per role):
  - **user**: `💡 我的愿望` → `/my-wishes` (sibling to `口味偏好` / `我的`)
  - **chef**: `💡 愿望管理` → `/chef/wishes` (one item, tabs handle internal split)
  - **admin**: `💡 愿望总览` → `/admin/wishes` (added in admin sidebar, mirrors chef/admin pattern)
- **D-03:** `/chef/wishes` uses **page-level tabs** for [全部 / 待处理 / 我的认领], not separate sidebar items. Tab state can live in URL query param (`?tab=pending`) for deep-link support.
- **D-04:** `/admin/wishes` is the same component as `/chef/wishes` but with `currentRole === 'admin'` flag passed in to enable action buttons on any wish (admin override of PERM-03).

### 交互模式 (Modals vs Routes)

- **D-05:** Three form surfaces — **submit, edit, reject** — all use **modal overlays**. No new top-level routes for forms.
  - 提交: 右上角「+ 新建愿望」按钮 → `WishFormModal` (create mode)
  - 编辑: WishCard 底部 [编辑] → `WishFormModal` (edit mode, pre-filled)
  - 拒绝: WishCard 底部 [拒绝] (chef only) → `WishRejectModal` (textarea)
  - 推进: WishCard 底部 [推进] (chef only) → `WishAdvanceModal` (dish picker)
- **D-06:** Modals reuse existing `ConfirmModal` pattern (modal-overlay + modal-content) for visual consistency; new `WishFormModal` / `WishRejectModal` / `WishAdvanceModal` follow same shell.

### 行动按钮位置

- **D-07:** Action buttons live at the **bottom of WishCard inline row**, consistent across user and chef views:
  - User view (待处理/准备中): `[编辑] [撤销]`
  - Chef view (待处理, not claimed): `[认领]`
  - Chef view (准备中, is claimer): `[推进] [拒绝]`
  - Chef view (other states): no action row (read-only)
  - Admin view: shows the union of available actions for that wish status
- **D-08:** **Only 拒绝 and 撤销 trigger ConfirmModal** (destructive / hard-to-reverse). 认领 and 推进 execute immediately on click (low cost, easy to undo via reject).
- **D-09:** `WishAdvanceModal` shows a **searchable dish picker filtered to chef's own published dishes** (per Phase 5 D-09 — backend already enforces; UI should reflect by only showing valid options). Search-as-you-type, list shows dish_name + status.
- **D-10:** Concurrent conflict (backend 403 with `claimed_by_chef_name` from Phase 5 D-04):
  - Toast error message: `"该愿望已被 {chef_name} 认领"`
  - Auto-refresh the wish list (refetch `GET /api/wishes`)
  - WishCard re-renders with new status

### WishCard 信息密度

- **D-11:** Top row of WishCard (always visible): **dish_name (large) + status badge (top-right) + submitted time (gray, small)**. Mobile shows ~3-4 cards per viewport.
- **D-12:** Secondary info (reference_url, note, related_dish_name, reject_reason) renders **inline below the top row** — only when present (no empty rows / no placeholder text). Reference URL becomes a clickable link (opens in new tab). Related dish shows as link to `/dishes/{id}`.
- **D-13:** `submitter_name` displays on **chef and admin views** (identity context for the chef queue). On user view (`/my-wishes`), submitter_name is suppressed (the user is always themselves).
- **D-14:** `claimed_by_chef_name` displays on **user view when status is 准备中/已上架/已拒绝** (so the user knows who took their wish). On chef view, suppressed (chef is themselves or another chef — context clear from list grouping).
- **D-15:** Unread red dot: **8px red circle at top-right of WishCard**, adjacent to status badge. Only renders when `has_unread === true` (backend already enforces 身份屏蔽 — non-submitter viewers always see `false`).

### 状态徽章颜色 (UX-03)

- **D-16:** Five status values map to existing badge colors (consistent with order/dish status conventions):
  - `待处理` → `badge-warn` (yellow — "attention needed")
  - `准备中` → `badge-info` (blue — "in progress")
  - `已上架` → `badge-success` (green — "completed/positive")
  - `已拒绝` → `badge-danger` (red — "failed")
  - `已撤销` → `badge-muted` (gray — "withdrawn")
- **D-17:** Extend `frontend/src/utils/index.js:statusBadge()` map with Chinese-key entries for the 5 wish statuses. (Existing keys are English; wish backend returns Chinese per Phase 5 D-11. The lookup is by raw status string — adding Chinese keys is the lowest-friction extension that keeps one source of truth for badge mapping.)
- **D-18:** Status badge renders with `text` directly (the Chinese status string from the API) — no translation layer needed since backend already returns Chinese.

### the agent's Discretion

- **API client methods** — add to `frontend/src/api/client.js`: `getWishes(params)`, `getWish(id)`, `createWish(data)`, `updateWish(id, data)`, `cancelWish(id)`, `claimWish(id)`, `advanceWish(id, related_dish_id)`, `rejectWish(id, reject_reason)`. Follow the existing `getOrders` / `getDishes` URLSearchParams pattern for filter params (`status`, `claimed_by_chef_id`, `page`, `page_size`).
- **List refresh strategy** — recommend polling at 30s interval (matches `usePendingOrderCount` pattern) on chef/admin views for queue freshness; user view can refresh on focus/visibility-change. Agent decides exact mechanism.
- **Chef sidebar badge count** — whether to add a pending-wishes count badge (red dot) on `💡 愿望管理` is at agent's discretion. If added, mirror `usePendingOrderCount` hook shape as `usePendingWishCount` (poll `GET /api/wishes?status=待处理&page=1&page_size=1`, use `total`).
- **Modal close behavior** — clicking the overlay outside the modal closes it (matches existing ConfirmModal). ESC key support optional.
- **Empty state copy** — per-page empty messages (e.g., user: "还没有愿望，去提交一个吧" / chef: "当前没有待处理愿望" / admin: "暂无愿望"). Use existing `emptyState` utility from `frontend/src/utils/index.js`.
- **Loading skeleton / spinner** — use existing `Loading.jsx` component on initial fetch; no fancy skeleton.
- **Mobile breakpoint details** — follow existing `styles.css` responsive breakpoints (420px, 768px, 1200px).
- **Modal form validation** — dish_name required (1-100 chars), reference_url optional (max 500), reject_reason required (1-500). Show inline field errors matching existing patterns.
- **Edit modal pre-fill** — load existing wish on mount of `WishFormModal` edit mode, pre-fill all three fields, allow partial update (only changed fields).
- **`/admin/wishes` vs `/chef/wishes`** — recommend reusing the same page component (`ChefWishesPage`) with a `viewAsAdmin` prop, then admin sidebar navigates to `/admin/wishes` which mounts it with that prop. Avoid code duplication while preserving clean URLs.

### Folded Todos

*(无 — `gsd-sdk query todo.match-phase` returned 0 matches for phase 7)*

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope
- `.planning/REQUIREMENTS.md` §v1.1 — WISH-03, WISH-04, UX-01, UX-02, UX-03 (Phase 7 owns 5 of 23 total)
- `.planning/ROADMAP.md` §Phase 7 — Goal, Depends on (Phase 5 + Phase 6), Success Criteria (6 acceptance points)
- `.planning/PROJECT.md` — Constraints (FastAPI + React, no new frameworks), v1.1 scope boundary, mobile-first directive

### Prior Phase Context (prerequisite)
- `.planning/phases/05-data-foundation-wish-lifecycle-api/05-CONTEXT.md` — Phase 5 backend decisions:
  - D-03/D-04: 404 vs 403 distinction (read-unauth → 404; mutate-unauth → 403 with `claimed_by_chef_name`)
  - D-06/D-07: edit/cancel window (待处理 + 准备中 only); soft-cancel via `status='已撤销'`
  - D-09/D-10: advance requires chef's own published dish; related_dish_id never nulled
  - D-11/D-12: 5 status values + valid_transitions table
- `.planning/phases/06-notifications-integration/06-CONTEXT.md` — Phase 6 notification decisions:
  - D-B01/B02: `has_unread` per-item on list (submitter-only); `submitter_last_viewed_at` written on submitter GET detail
  - D-A01/D-A02: API surface changes (list has `has_unread`; detail triggers clear)

### Backend Contract (the API to consume)
- `backend/app/schemas/wish.py` — `WishBase`, `WishCreate`, `WishUpdate`, `WishAdvance`, `WishReject`, `WishResponse`, `WishListResponse`, `WishDetailResponse` (note: `WishListResponse` has `submitter_name`, `claimed_by_chef_name`, `has_unread`)
- `backend/app/routers/wishes.py` — 8 endpoints: `POST/GET /api/wishes`, `GET/PUT/DELETE /api/wishes/{id}`, `POST /api/wishes/{id}/{claim|advance|reject}`. Error codes: 400 (state machine violation), 403 (not your wish / not your claim), 404 (read-unauthorized hides existence).

### Existing Patterns to Mirror
- `frontend/src/components/Sidebar.jsx` — role-based nav array (admin/chef/user branches); `Badge` component used for pending count
- `frontend/src/components/ConfirmModal.jsx` — modal shell pattern (`modal-overlay` + `modal-content` + header/body/footer)
- `frontend/src/components/Badge.jsx` + `frontend/src/utils/index.js:statusBadge()` — status badge via map lookup (extend with Chinese keys for wish statuses)
- `frontend/src/hooks/usePendingOrderCount.js` — polling hook pattern (useState + setInterval, 30s default) — replicate as `usePendingWishCount` if chef badge added
- `frontend/src/api/client.js` — `ApiClient` class, `getDishes`/`getOrders` URLSearchParams building, 401 → auto-logout-redirect handling
- `frontend/src/contexts/ToastContext.jsx` — toast success/error pattern (`useToast()` returns `{ showToast }`)
- `frontend/src/App.jsx` — `ProtectedRoute requiredRoles={[...]}` wrapping pattern; page route registration
- `frontend/src/css/styles.css` — existing `.badge-*`, `.modal-*`, `.btn-*`, `.pc-layout` / responsive breakpoints (420px, 768px, 1200px)

### Codebase Maps (analysis date 2026-05-24)
- `.planning/codebase/STACK.md` — React 19.2.5, Vite 8, JSX, react-router-dom 7
- `.planning/codebase/ARCHITECTURE.md` — pages/ + components/ + contexts/ + api/ + hooks/ structure
- `.planning/codebase/CONVENTIONS.md` — page naming `PascalCasePage.jsx`, component naming `PascalCase.jsx`, hooks `useXxx.js`, Chinese-first user-facing strings
- `.planning/codebase/STRUCTURE.md` §"Where to Add New Code" — adds: 3 new page files, 4 new component files, 1 new hook file, 8 new API methods

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`ApiClient` class** (`frontend/src/api/client.js`) — add 8 wish methods to existing singleton (`api.getWishes` / `api.createWish` / etc.). No new HTTP wrapper needed.
- **`ConfirmModal`** (`frontend/src/components/ConfirmModal.jsx`) — modal shell + danger mode. Reuse for cancel/reject confirmation; new `WishFormModal` / `WishRejectModal` / `WishAdvanceModal` follow same shell but with custom bodies.
- **`Badge` + `statusBadge()`** (`frontend/src/components/Badge.jsx`, `frontend/src/utils/index.js:52`) — extend existing map with 5 Chinese-key wish status entries (D-17). Single source of truth for badge color mapping.
- **`usePendingOrderCount` hook** (`frontend/src/hooks/usePendingOrderCount.js`) — 30s polling pattern. Replicate as `usePendingWishCount` if chef sidebar badge added.
- **`useAuth()`** + **`<AuthContext>`** — for current user role / id (drives admin override flag + filter "my wishes only" / "claim queue").
- **`useToast()`** — for action feedback ("愿望已提交", "已认领", "已被其他厨师认领").
- **`<ProtectedRoute requiredRoles={['user']}>`** (`frontend/src/App.jsx:37`) — wraps all three new page routes with role-specific gating.
- **Existing dish picker** (search/filter UI pattern in `OrderPage` for dish selection) — reuse the same search input + list rendering for `WishAdvanceModal`'s dish picker.

### Established Patterns

- **Page route registration** — add 3 new `<Route>` entries inside the `<PcLayout>` wrapper, gated by `<ProtectedRoute requiredRoles={['user']}>`, `['chef', 'admin']`, and `['admin']` respectively.
- **Sidebar nav array** — append one item per role's `navItems` array in `Sidebar.jsx`.
- **State management** — page-level `useState` for list/loading/filter; no new global state needed. `useAuth()` + `useToast()` for cross-cutting concerns.
- **API params via URLSearchParams** — `getWishes({ status, claimed_by_chef_id, page, page_size })` mirrors `getOrders({ status, page, page_size })`.
- **Modal open/close via local state** — `const [showModal, setShowModal] = useState(false)`, `setShowModal(true)` on button click, `setShowModal(false)` after submit success or cancel.
- **Error → toast** pattern — `try { await api.xxx() } catch (err) { showToast(err.message, 'error') }`. Backend returns Chinese error messages already (Phase 5 D-02, D-04).
- **Confirmation for destructive ops** — `ConfirmModal` with `danger={true}` for cancel/reject.

### Integration Points

- **New pages**:
  - `frontend/src/pages/UserWishesPage.jsx` — `/my-wishes`, `requiredRoles={['user', 'admin']}` (admin can also visit but admin role's primary entry is `/admin/wishes`)
  - `frontend/src/pages/ChefWishesPage.jsx` — `/chef/wishes`, `requiredRoles={['chef', 'admin']}`, tabs [全部 / 待处理 / 我的认领]
  - `frontend/src/pages/AdminWishesPage.jsx` — `/admin/wishes`, `requiredRoles={['admin']}`. **Recommendation**: render as `<ChefWishesPage viewAsAdmin={true} />` to share logic; or duplicate if route isolation matters more than DRY.
- **New components**:
  - `frontend/src/components/WishCard.jsx` — shared card, props: `{ wish, currentUser, onEdit, onCancel, onClaim, onAdvance, onReject }`. Internal logic decides which actions render based on `wish.status` + `currentUser.role` + `wish.claimed_by_chef_id` + `wish.user_id`.
  - `frontend/src/components/WishFormModal.jsx` — props: `{ wish?, mode: 'create'|'edit', onClose, onSuccess }`. Three fields: dish_name (required), reference_url (optional), note (optional).
  - `frontend/src/components/WishRejectModal.jsx` — props: `{ wish, onClose, onSuccess }`. Single textarea (reject_reason, required 1-500 chars).
  - `frontend/src/components/WishAdvanceModal.jsx` — props: `{ wish, onClose, onSuccess }`. Internal dish search/filter + select + submit.
- **New hook** (optional):
  - `frontend/src/hooks/usePendingWishCount.js` — mirrors `usePendingOrderCount`, returns pending wish count for chef sidebar badge.
- **Modified files**:
  - `frontend/src/api/client.js` — add 8 wish methods (D-Agent)
  - `frontend/src/components/Sidebar.jsx` — append 3 nav items (one per role)
  - `frontend/src/utils/index.js` — extend `statusBadge()` map with 5 Chinese wish status keys
  - `frontend/src/App.jsx` — register 3 new routes with role gating

### Backend Dependency (do not modify)

- 8 wish endpoints exist and are locked from Phase 5 (with Phase 6 unread additions in D-A01).
- `WishListResponse` already returns `has_unread`, `submitter_name`, `claimed_by_chef_name` — frontend does not need to flatten or augment.
- `WishDetailResponse` already returns `related_dish_name` — frontend does not need to call dish detail separately for the related dish display.

</code_context>

<specifics>
## Specific Ideas

- **`usePendingWishCount` for chef sidebar (optional, agent's discretion)** — gives chef at-a-glance "N 个待处理愿望" red dot on `💡 愿望管理` nav item, mirrors the existing `usePendingOrderCount` red dot on `订单管理`. Decided not to lock as required — Phase 7 can ship without it and add later if chef feedback asks.
- **WishCard "claimed by you" indicator** — when chef views their own claimed wishes (in `我的认领` tab), a small 「我的」 tag or accent color makes it instantly scannable. Distinct from `claimed_by_chef_name` text which is more useful in admin view.
- **Advance modal dish picker UX** — show chef's published dishes with their image (if any), with a search-as-you-type filter. Selectable with single tap. Empty state: "你还没有发布任何菜品，无法推进愿望" (with link to `/chef/dishes`).
- **Edit modal diff-style feedback** — when user edits an already-claimed wish (D-08 fires NOTIF-06 to chef), toast confirms "已通知认领厨师" so user understands the side effect.
- **Reference URL safety** — render as `<a target="_blank" rel="noopener noreferrer">` to prevent tab-nabbing and ensure new-tab open. No URL shortener expansion / unfurling needed.

</specifics>

<deferred>
## Deferred Ideas

- **WISH-F01 愿望标签分类** — requires model + UI + filter, deferred to future enhancement.
- **WISH-F02 多参考链接** — current single `reference_url` field sufficient for B站/抖音/微信/小红书 use case.
- **WISH-F03 愿望评论/对话** — out of scope for v1.1; status + reject_reason already close the loop.
- **WISH-F04 愿望状态历史** — `last_status_change_at` from Phase 6 is sufficient for now.
- **Chef sidebar pending count badge** — captured in "agent's discretion"; not a hard requirement.
- **Wish reminder / push to admin when wish sits 待处理 too long** — out of scope; chef queue shows current state.
- **Wish-to-draft auto-conversion** — chef must explicitly advance by linking an existing dish (per Phase 5 D-09). No "create draft dish from wish" feature.

### Reviewed Todos (not folded)

*(无 — 无 todo 匹配本 phase)*

</deferred>

---

*Phase: 7-Wish List Frontend*
*Context gathered: 2026-07-22*
