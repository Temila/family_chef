# Roadmap: 家味 · Family Chef

## Milestones

- ✅ **v1.0 访客点菜邀请** — Phases 1-4 (shipped 2026-05-29)
- 🚧 **v1.1 菜品愿望单** — Phases 5-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 访客点菜邀请 (Phases 1-4) — SHIPPED 2026-05-29</summary>

- [x] Phase 1: Data Foundation (1/1 plans) — completed 2026-05-24
- [x] Phase 2: Backend Core (2/2 plans) — completed 2026-05-25
- [x] Phase 3: Frontend Authenticated (2/2 plans) — completed 2026-05-25
- [x] Phase 4: Frontend Guest (1/1 plan) — completed 2026-05-26

</details>

### 🚧 v1.1 菜品愿望单 (In Progress)

**Milestone Goal:** 让注册用户在菜单里找不到想吃的菜时，向厨师提交"愿望单"，厨师认领并推进（准备中 → 已上架 / 已拒绝），形成完整闭环。

- [x] **Phase 5: Data Foundation & Wish Lifecycle API** - Wish model, Alembic migration, service layer with status machine, permissions, and REST endpoints (completed 2026-07-21)
- [x] **Phase 6: Notifications Integration** - In-app unread badge backend for submitters + Feishu push reuse for chefs (completed 2026-07-22)
- [x] **Phase 7: Wish List Frontend** - Unified mobile UI for users (submit/list/edit/cancel) and chefs (claim/advance/link/reject/my-claims), reusing a shared WishCard + status badge (completed 2026-07-23)

## Phase Details

### Phase 5: Data Foundation & Wish Lifecycle API

**Goal**: Wish data model, migration, and complete lifecycle API (submit, list, claim, advance, reject) with visibility/permission enforcement — ready for frontend and notifications to consume
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: DATA-06, DATA-07, DATA-08, WISH-01, WISH-02, FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, PERM-01, PERM-02, PERM-03, PERM-04
**Success Criteria** (what must be TRUE):

  1. A registered user can submit a wish (dish name + optional reference URL/note) via API and retrieve their own wish list
  2. A chef can claim a pending wish; the wish becomes "准备中" with that chef as exclusive owner, and concurrent claims are safely rejected (no double-claim)
  3. The claiming chef can advance a wish to "已上架" by linking a published dish, or reject it with a required reason; both terminal transitions lock further user edits
  4. Chefs/admins can list all wishes filtered by status and claiming chef, and a chef can list their own "我的认领"
  5. Visibility and ownership rules are enforced — non-permitted users receive 403/404; users can only edit/cancel their own non-published wishes

**Plans**: 3 plansPlans:
**Wave 1**

- [x] 05-01-PLAN.md — Wish model + Pydantic schemas + Alembic migration (DATA-06, DATA-07)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 05-02-PLAN.md — WishService + WishPermissionError + 8 lifecycle/permission methods (DATA-08, PERM-01..04)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 05-03-PLAN.md — Wishes router + main.py registration + 22 tests incl. 8 STRIDE security cases (WISH-01/02, FLOW-01..05)

### Phase 6: Notifications Integration

**Goal**: Wish lifecycle events trigger the right notifications — in-app unread badges for submitters and Feishu pushes for chefs
**Depends on**: Phase 5
**Requirements**: NOTIF-03, NOTIF-04, NOTIF-05, NOTIF-06
**Success Criteria** (what must be TRUE):

  1. When a wish's status changes (claimed / 准备中 / 已上架 / 已拒绝), the submitter has an unread badge surfaced via API
  2. After the submitter views the wish detail, the unread badge is cleared
  3. When a new wish is submitted, chefs receive a Feishu push notification carrying the wish info
  4. When a submitter edits or cancels a claimed wish, the claiming chef receives a Feishu notification

**Plans**: 3 plansPlans:
**Wave 1**

- [x] 06-01-PLAN.md — Data layer: naive_utc_now helper + APP_URL setting + 2 Wish columns + Alembic batch migration (NOTIF-03/04 foundation)

**Wave 2** *(blocked on Wave 1 completion; 06-02 and 06-03 are parallel — non-overlapping files)*

- [x] 06-02-PLAN.md — Badge API: WishListResponse.has_unread + router compute/clear side-effect + badge lifecycle tests (NOTIF-03/04)
- [x] 06-03-PLAN.md — Feishu + Service + Hooks: send_wish_notification + WishNotificationService + 5 hook wirings + integration tests (NOTIF-03/05/06)

### Phase 7: Wish List Frontend

**Goal**: 注册用户和厨师都能通过移动端友好的 UI 完成各自的愿望单工作流——用户提交/查看/编辑/撤销，厨师认领/推进/关联菜品/拒绝/查看我的认领——共用统一的 WishCard + 状态徽章组件
**Depends on**: Phase 5 (Phase 6 may run in parallel — no UI dependency on notifications)
**Requirements**: WISH-03, WISH-04, UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):

  1. User can submit a wish from a mobile-friendly form (dish name required, optional reference link and note) and browse their own wish list as cards
  2. User can edit a wish's content (name / link / note) while it is not yet "已上架", and the change is reflected immediately in the list
  3. User can cancel (delete) a wish while it is not yet "已上架", with the card disappearing from the list
  4. Wish cards show clear status badges/colors distinguishing 待处理 / 准备中 / 已上架 / 已拒绝 — the same WishCard + status badge component is reused across user list and chef queue
  5. Chef can view the wish queue on mobile with filters by status and claiming chef, and a separate "我的认领" view showing only their claimed wishes
  6. Chef can claim a pending wish (immediately shows as theirs "准备中"), advance it by linking a published dish (→ 已上架), or reject it with a required reason — all from the shared card affordances

**Plans**: 4 plans + 1 gap-closure plan
Plans:
**Wave 1**

- [x] 07-01-PLAN.md — Foundation: ApiClient 8 wish methods (status→status_filter) + statusBadge extension + CSS tokens + ConfirmModal a11y + WishCard + WishFormModal + WishRejectModal + WishAdvanceModal

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-02-PLAN.md — Pages: UserWishesPage (create/edit/cancel/FAB) + ChefWishesPage (tabs/polling/claim/advance/reject) + AdminWishesPage (viewAsAdmin wrapper)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 07-03-PLAN.md — Integration: App.jsx routes + Sidebar/BottomBar nav entries + Phase-6 /wishes/:id deep-link redirect + ?wish=:id highlight + verification gate

**Gap-closure wave** *(post-verification, H-3 deep-link highlight race)*

- [ ] 07-05-PLAN.md — Gap closure: fix deep-link highlight race (fetchedOnce flag + setTimeout(100) in UserWishesPage + ChefWishesPage) + Playwright regression script

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 5 → (6 ∥ 7). Phase 5 is the foundation; Phase 6 (Notifications) and Phase 7 (Wish List Frontend) may run in parallel after Phase 5 completes, as they have no mutual dependency (frontend consumes Phase 5 APIs; notifications wire up Phase 5 events).

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Data Foundation | v1.0 | 1/1 | ✓ Complete | 2026-05-24 |
| 2. Backend Core | v1.0 | 2/2 | ✓ Complete | 2026-05-25 |
| 3. Frontend Authenticated | v1.0 | 2/2 | ✓ Complete | 2026-05-25 |
| 4. Frontend Guest | v1.0 | 1/1 | ✓ Complete | 2026-05-26 |
| 5. Data Foundation & Wish Lifecycle API | v1.1 | 3/3 | Complete   | 2026-07-21 |
| 6. Notifications Integration | v1.1 | 3/3 | Complete   | 2026-07-22 |
| 7. Wish List Frontend | v1.1 | 4/4 + 1 gap-closure | Complete (gap-closure 07-05 pending) | 2026-07-23 |
