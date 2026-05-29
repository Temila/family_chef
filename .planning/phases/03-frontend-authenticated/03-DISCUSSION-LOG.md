# Phase 3: Frontend Authenticated - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 3-Frontend Authenticated
**Areas discussed:** 邀请入口与导航, 邀请列表展示, 创建邀请流程, 分享与复制交互, 撤销确认交互, 访客订单标识

---

## 邀请入口与导航

| # | Question | Option | Selected |
|---|----------|--------|----------|
| 1 | Should invitation management be a dedicated page with sidebar link, or a section on the user home page? | Dedicated page + sidebar | |
| 1 | | Home page section | ✓ |
| 2 | When user needs to see all invitations (not just recent), how do they get there? | Button on home section -> full page | |
| 2 | | Button navigates to modal/drawer | ✓ |
| 2 | | Home page is the only page with pagination | |
| 3 | Modal or drawer for the full invitation list? | Full-screen modal | ✓ |
| 3 | | Slide-in drawer | |
| 4 | Should both Chef and User roles see the Invitations section on the home page? | Both roles | ✓ |
| 4 | | Only User role | |
| 5 | Where should the 'Create Invitation' button be? | Button in home section only | ✓ |
| 5 | | Both home section and modal | |

**User's choice:** Home page section + full-screen modal for full list; both roles see it; create button only in home section.
**Notes:** User prefers keeping the invitation feature accessible but not creating a new top-level nav item.

---

## 邀请列表展示

| # | Question | Option | Selected |
|---|----------|--------|----------|
| 1 | How should each invitation be displayed in the list? | Card layout | |
| 1 | | Table/row layout | ✓ |
| 2 | What info should each row show? | Essential: status + date + chef | |
| 2 | | Detailed: status + dates + chef + actions | ✓ |
| 3 | How should statuses be color-coded? | Semantic colors (green/gray/orange/red) | ✓ |
| 3 | | Single color with text | |
| 4 | Default sort order for the list? | Newest first (by created_at) | ✓ |
| 4 | | Active first, then by date | |
| 5 | How many recent invitations on home page before 'View All'? | Show last 5 | ✓ |
| 5 | | Show last 10 | |

**User's choice:** Row layout with all details visible; semantic status colors; newest first; 5 on home section.

---

## 创建邀请流程

| # | Question | Option | Selected |
|---|----------|--------|----------|
| 1 | Chef clicks 'Create Invitation': what happens? | One-click create + show link modal | ✓ |
| 1 | | One-click create + toast + link inline | |
| 2 | For User role: how do they select a chef? | Inline dropdown selector | |
| 2 | | Small modal with chef list | ✓ |
| 3 | Create button text — should it differ by role? | Same text: 'Create Invitation' | ✓ |
| 3 | | Different text per role | |
| 4 | What should the post-creation link modal show? | Link + copy + share + 2hr note | ✓ |
| 4 | | Minimal: just the link | |

**User's choice:** Chef = one-click create -> modal; User = chef picker modal -> create -> link; same button text; rich link modal with copy + share + expiry note.

---

## 分享与复制交互

| # | Question | Option | Selected |
|---|----------|--------|----------|
| 1 | Copy to clipboard: what feedback? | Toast notification + button state change | |
| 1 | | Toast notification only | ✓ |
| 2 | Web Share API: preferred over clipboard copy? | Web Share primary, copy fallback | |
| 2 | | Both always shown side by side | ✓ |
| 3 | Copy-link button on every active row? | Yes — copy icon on every active row | ✓ |
| 3 | | No — link shown only at creation | |
| 4 | How is the full invitation URL constructed? | Frontend constructs it | ✓ |
| 4 | | API returns full URL | |

**User's choice:** Toast only for copy feedback; both Web Share and copy buttons shown; copy icon on every active row; frontend constructs URL from token.

---

## 撤销确认交互

| # | Question | Option | Selected |
|---|----------|--------|----------|
| 1 | Revoke flow: confirmation dialog or one-click? | One-click revoke | |
| 1 | | Confirmation dialog first | ✓ |
| 2 | Where is the revoke action in the row? | Inline revoke button | ✓ |
| 2 | | Revoke in a dropdown menu | |
| 3 | After revoking: optimistic update or reload? | Optimistic update in-place | ✓ |
| 3 | | Reload the list | |
| 4 | Revoke scope: Active only or Active + Expired? | Active only | ✓ |
| 4 | | Active + Expired | |

**User's choice:** Confirmation dialog; inline revoke button; optimistic in-place update; Active only.

---

## 访客订单标识

| # | Question | Option | Selected |
|---|----------|--------|----------|
| 1 | How should guest orders be visually identified? | Orange 'Guest' badge in order header | ✓ |
| 1 | | Different card background | |
| 1 | | Both — badge + tinted background | |
| 2 | Should the filter tabs include a 'Guest Orders' option? | Add 'Guest' filter chip | ✓ |
| 2 | | No separate filter | |
| 3 | Should guest order badge appear on detail page? | Yes — show badge on detail page too | ✓ |
| 3 | | No — list page only | |

**User's choice:** Orange badge in order card header + filter chip + badge on order detail page.

---

## the agent's Discretion

- 全屏 Modal 的具体 UI 风格（搜索栏、分页方式）由 planner 决定
- 厨师选择 Modal 的 chef 列表格式由 planner 决定
- 确认弹窗的具体文字和样式由 planner 决定
- 筛选芯片的布局由 planner 根据现有 ChefOrdersPage 模式决定
- Order API 的 `is_guest` 字段名和结构由 planner 根据后端实现决定
- 链接在行内的截断显示形式由 planner 决定

## Deferred Ideas

- **邀请剩余时间倒计时（EUX-01）** — v2 需求，不在 Phase 3 范围
- **二维码生成（EUX-02）** — v2 需求，面对面扫码场景
- **访客显示名（EUX-03）** — v2 需求，方便厨师知道谁点的菜
