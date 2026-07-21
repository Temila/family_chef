# Roadmap: 家味 · Family Chef

## Milestones

- ✅ **v1.0 访客点菜邀请** — Phases 1-4 (shipped 2026-05-29)
- 🚧 **v1.1 菜品愿望单** — Phases 5-8 (in progress)

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

- [ ] **Phase 5: Data Foundation & Wish Lifecycle API** - Wish model, Alembic migration, service layer with status machine, permissions, and REST endpoints
- [ ] **Phase 6: Notifications Integration** - In-app unread badge backend for submitters + Feishu push reuse for chefs
- [ ] **Phase 7: User Wish List Frontend** - User-side mobile UI: submit, list, edit, cancel with status badges
- [ ] **Phase 8: Chef Workflow Frontend** - Chef-side mobile UI: claim, advance, link dish, reject, my claims

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
**Plans**: TBD

### Phase 6: Notifications Integration
**Goal**: Wish lifecycle events trigger the right notifications — in-app unread badges for submitters and Feishu pushes for chefs
**Depends on**: Phase 5
**Requirements**: NOTIF-03, NOTIF-04, NOTIF-05, NOTIF-06
**Success Criteria** (what must be TRUE):
  1. When a wish's status changes (claimed / 准备中 / 已上架 / 已拒绝), the submitter has an unread badge surfaced via API
  2. After the submitter views the wish detail, the unread badge is cleared
  3. When a new wish is submitted, chefs receive a Feishu push notification carrying the wish info
  4. When a submitter edits or cancels a claimed wish, the claiming chef receives a Feishu notification
**Plans**: TBD

### Phase 7: User Wish List Frontend
**Goal**: Registered users can submit, browse, edit, and cancel their wishes from a mobile-friendly UI with clear status visuals
**Depends on**: Phase 5
**Requirements**: WISH-03, WISH-04, UX-01, UX-03
**Success Criteria** (what must be TRUE):
  1. User can submit a wish from a mobile-friendly form (dish name required, reference link and note optional)
  2. User sees their wish list as cards with clear status badges/colors distinguishing 待处理 / 准备中 / 已上架 / 已拒绝
  3. User can edit a wish's content (name / link / note) while it is not yet "已上架"
  4. User can cancel (delete) a wish while it is not yet "已上架"
**Plans**: TBD
**UI hint**: yes

### Phase 8: Chef Workflow Frontend
**Goal**: Chefs can manage wishes end-to-end from a mobile-friendly interface — claim, advance, link to dish, reject, and track their own claims (reuses the WishCard + status badge component from Phase 7)
**Depends on**: Phase 5, Phase 7
**Requirements**: UX-02
**Success Criteria** (what must be TRUE):
  1. Chef can view the wish queue on mobile with filters by status and claiming chef
  2. Chef can claim a pending wish; it immediately shows as theirs ("准备中")
  3. Chef can advance a claimed wish by linking it to a published dish (→ 已上架) or reject it with a required reason
  4. Chef can view their "我的认领" list of claimed wishes
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 5 → 6 → 7 → 8. Phase 6 and Phase 7 may run in parallel after Phase 5; Phase 8 depends on Phase 7 (shared WishCard component).

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Data Foundation | v1.0 | 1/1 | ✓ Complete | 2026-05-24 |
| 2. Backend Core | v1.0 | 2/2 | ✓ Complete | 2026-05-25 |
| 3. Frontend Authenticated | v1.0 | 2/2 | ✓ Complete | 2026-05-25 |
| 4. Frontend Guest | v1.0 | 1/1 | ✓ Complete | 2026-05-26 |
| 5. Data Foundation & Wish Lifecycle API | v1.1 | 0/TBD | Not started | - |
| 6. Notifications Integration | v1.1 | 0/TBD | Not started | - |
| 7. User Wish List Frontend | v1.1 | 0/TBD | Not started | - |
| 8. Chef Workflow Frontend | v1.1 | 0/TBD | Not started | - |
