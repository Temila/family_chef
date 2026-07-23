---
phase: 07-wish-list-frontend
verified: 2026-07-23T12:30:00Z
status: human_needed
score: 6/6 ROADMAP success criteria verified; 11/11 Plan-level must_haves verified (after gap closure)
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 6/6 ROADMAP SCs (happy path); 1 Plan must_have FAILED (deep-link)
  is_re_verification: true
  gaps_closed:
    - "CR-01 deep-link highlight race — fixed in commit f9d1839; verified in actual code"
    - "CR-02 modal submit-state never resets on API failure — fixed in commit f9d1839; verified in actual code"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Mobile UX feel for user wish list on 375px viewport"
    expected: "FAB thumb-reachable, cards stack single-column, modal doesn't overflow, bottom-bar 愿望 tab visible"
    why_human: "Pixel-level mobile readability and thumb-reach geometry cannot be asserted by grep"
  - test: "Mobile UX feel for chef wish queue on 375px viewport"
    expected: "Tab pills fit horizontally, 44px action buttons tappable, dish picker modal scrolls internally"
    why_human: "Touch-target sizing and modal scroll containment require visual inspection"
  - test: "Deep-link highlight after CR-01 fix — navigate to /wishes/<existing-id> as a user"
    expected: "Redirect to /my-wishes?wish=<id>; matching card gets blue outline + box-shadow for 4s, scrolls into view; URL param cleared after 4s; NO missing-wish toast"
    why_human: "Visual highlight + scroll animation + real-network timing require browser verification"
  - test: "Deep-link missing-wish toast — navigate to /wishes/999999"
    expected: "After list loads, '未找到该愿望' toast appears once and URL param is cleared"
    why_human: "Toast timing relative to list load needs visual confirmation"
  - test: "Modal accessibility — open each modal via keyboard + screen reader"
    expected: "First input autofocused, ESC closes (except when submitting — now reset works), title announced via aria-labelledby"
    why_human: "Focus management and screen-reader announcements require interactive testing"
---

# Phase 7: Wish List Frontend — Verification Report

**Phase Goal:** 注册用户和厨师都能通过移动端友好的 UI 完成各自的愿望单工作流——用户提交/查看/编辑/撤销，厨师认领/推进/关联菜品/拒绝/查看我的认领——共用统一的 WishCard + 状态徽章组件
**Verified:** 2026-07-23T12:30:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (commit `f9d1839`)

## Re-verification Summary

The previous verification run found `gaps_found` with two BLOCKER gaps (CR-01 deep-link race, CR-02 modal submit-state). Both have been **genuinely closed** in commit `f9d1839` ("fix(07): close verification gaps CR-01 deep-link race + CR-02 modal submit reset"). The fix touched exactly the 5 files claimed.

### CR-01 — Deep-link highlight race — CONFIRMED CLOSED

**Fix verified in actual current code:**

| File | Line(s) | Evidence |
| ---- | ------- | -------- |
| `frontend/src/pages/UserWishesPage.jsx` | 138 | `if (loading) return undefined;` gates the missing-toast branch on `loading === false` — exactly the review's recommended fix |
| `frontend/src/pages/UserWishesPage.jsx` | 176 | Deps array is `[wishes, highlightId, setSearchParams, showToast, loading]` — `loading` added so the effect re-runs after the initial fetch resolves |
| `frontend/src/pages/ChefWishesPage.jsx` | 165 | Same `if (loading) return undefined;` guard |
| `frontend/src/pages/ChefWishesPage.jsx` | 201 | Same `loading` dep added |

**Behavioral trace (post-fix):** On mount after a Feishu deep-link → `/wishes/123` → redirect → `/my-wishes?wish=123`:
1. Initial render: `wishes=[]`, `loading=true`, `highlightId="123"`.
2. Highlight effect runs → `targetWish=undefined` → `if (loading) return undefined;` → no missing-toast scheduled. Effect cleanup returns `undefined`.
3. Mount-fetch resolves → `setWishes(items)` + `setLoading(false)` → re-render.
4. Highlight effect re-runs (deps changed: `loading` flipped to `false`, `wishes` updated) → `targetWish` found → `applyTimer` schedules `setHighlightedId` + `scrollIntoView` → `clearTimer` schedules 4s highlight/URL cleanup.
5. No spurious "未找到该愿望" toast. ✓

The race is defeated because the missing-toast branch can no longer fire while `loading === true`.

### CR-02 — Modal submit-state never resets on API failure — CONFIRMED CLOSED

**Fix verified in actual current code:**

| File | Line(s) | Evidence |
| ---- | ------- | -------- |
| `frontend/src/components/WishFormModal.jsx` | 115-119 | `try { await onSuccess?.(payload); } finally { setSubmitting(false); }` |
| `frontend/src/components/WishAdvanceModal.jsx` | 87-91 | `try { await onSuccess?.(selectedDishId, selectedDishName); } finally { setSubmitting(false); }` |
| `frontend/src/components/WishRejectModal.jsx` | 45-49 | `try { await onSuccess?.(trimmed); } finally { setSubmitting(false); }` |

**Parent-handler compatibility verified:** All four parent handlers are `async` (return promises) and swallow errors internally with try/catch — so `onSuccess?.(...)` resolves normally on failure and the `finally` fires. Even if a parent re-threw, the `finally` would still fire. The `setSubmitting(false)` reset now happens on **every** path: success, parent-swallowed failure, and unexpected rejection.

- `UserWishesPage.handleCreateSubmit:178-190` — `async`, try/catch swallows → finally fires ✓
- `UserWishesPage.handleEditSubmit:192-...` — `async`, try/catch swallows → finally fires ✓
- `ChefWishesPage.handleAdvance:222-238` — `async`, try/catch swallows, modal stays open → finally fires ✓
- `ChefWishesPage.handleReject:241-257` — `async`, try/catch swallows, modal stays open → finally fires ✓

After the fix: submit/cancel buttons re-enable, ESC handler unsuppressed (`!submitting` check passes) — users can retry or cancel after an API error. ✓

### Build / Lint regression check

| Check | Command | Result | Status |
| ----- | ------- | ------ | ------ |
| Frontend build | `cd frontend && npm run build` | Exit 0; 75 modules transformed; dist/index-DMn_ME0f.js (486.41 KB) | ✓ PASS |
| ESLint over 5 fixed files | `npx eslint <5 files> --max-warnings=0` | Exit 0 (no output) | ✓ PASS |
| Commit scope | `git show f9d1839 --stat` | Exactly 5 files: 3 modals + 2 pages; +28/-9 lines | ✓ PASS |

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | User can submit a wish from a mobile-friendly form (dish name required, optional reference link and note) and browse their own wish list as cards | ✓ VERIFIED | `UserWishesPage.jsx:313-319` mounts `WishFormModal` in create mode; `handleCreateSubmit:178-190` calls `api.createWish`. `WishFormModal.jsx:151-204` has 3 fields (dish_name required w/ maxLength=100; reference_url optional w/ http/https validation; note optional w/ maxLength=500). FAB + Header action button. `api.createWish` → POST `/api/wishes`. Mobile feel → H-1. |
| 2   | User can edit a wish's content while it is not yet "已上架", and the change is reflected immediately in the list | ✓ VERIFIED | `WishCard.jsx:42-65` renders `[编辑愿望]` only when viewer is submitter and status is non-terminal. `handleEditSubmit` calls `api.updateWish` then `loadWishes({page:1, background:true})`. `buildWishPatch:21-44` sends diff-only payload. CR-02 fixed → retry path works after API error. |
| 3   | User can cancel (delete) a wish while it is not yet "已上架", with the card disappearing from the list | ✓ VERIFIED | `WishCard.jsx:55-62` renders `[撤销愿望]` only for submitter + non-terminal. `handleCancelConfirm` calls `api.cancelWish` then refetches page 1, replacing state so the card disappears. ConfirmModal asks for confirmation. (WR-01: ConfirmModal has no `disabled` prop — non-blocker warning.) |
| 4   | Wish cards show clear status badges/colors distinguishing 待处理 / 准备中 / 已上架 / 已拒绝 — same WishCard + status badge reused across user list and chef queue | ✓ VERIFIED | `utils/index.js:69-74` maps all 5 Chinese statuses to badge classes: 待处理→badge-warn, 准备中→badge-info, 已上架→badge-success, 已拒绝→badge-danger, 已撤销→badge-muted. `WishCard.jsx:164` renders `<Badge status={wish.status} />` (no role branching). Same component consumed by UserWishesPage, ChefWishesPage, and AdminWishesPage. |
| 5   | Chef can view the wish queue on mobile with filters by status and claiming chef, and a separate "我的认领" view showing only their claimed wishes | ✓ VERIFIED | `ChefWishesPage.jsx:42-45, 267-295` implements URL-backed tabs (all / pending / mine) via `useSearchParams`; `buildWishParams:26-31` serializes `status=待处理` for pending, `mine=true` for mine. `client.js:163-167` correctly serializes `status_filter` and `mine=true` per backend contract. Mobile feel → H-2. |
| 6   | Chef can claim a pending wish, advance it by linking a published dish (→ 已上架), or reject it with a required reason — all from the shared card affordances | ✓ VERIFIED | `WishCard.jsx:70-100` D-07 status matrix: `[认领愿望]` only when status==='待处理' && no claimer; `[推进愿望]+[拒绝愿望]` when status==='准备中' && (viewAsAdmin \|\| own claim). `handleClaim:204-219` → `api.claimWish`; `handleAdvance:222-238` → `api.advanceWish`; `handleReject:241-257` → `api.rejectWish`. `WishRejectModal` requires 1-500 char reason. CR-02 fixed → retry works on advance/reject API error. |

**Score:** 6/6 ROADMAP success criteria verified.

### Phase Plan must_haves (additional)

| Plan | must_have | Status | Evidence |
| ---- | --------- | ------ | -------- |
| 07-03 | Deep-link `?wish=:id` highlight + scroll-to + auto-clear | ✓ VERIFIED (was FAILED) | **CR-01 closed in f9d1839.** `UserWishesPage.jsx:133-176` + `ChefWishesPage.jsx:160-201` now gate missing-toast on `loading===false` and add `loading` to deps. Effect re-runs after initial fetch resolves; highlight appears for 4s, scrolls into view, clears URL param. Visual confirmation → H-3 / H-4. |
| 07-03 | `/wishes/:id` redirects to role page preserving `?wish=:id` | ✓ VERIFIED | `App.jsx:88-99` `WishDeepLinkRedirect` builds target via role→path map; `Navigate to={base+'?wish='+id} replace`. Route registered before `*` wildcard at App.jsx:111-118. |
| 07-03 | Sidebar + BottomBar wish nav entries per role | ✓ VERIFIED | Sidebar.jsx:33,43,51 (admin/chef/user). BottomBar.jsx:26,34,42 (mobile 愿望 label). |
| 07-01 | Eight ApiClient wish methods with status→status_filter serialization | ✓ VERIFIED | client.js:156-198 — 8 methods; `qs.set('status_filter', params.status)` at line 163. |
| 07-01 | Five Chinese status → badge class mappings | ✓ VERIFIED | utils/index.js:69-74 — all 5 keys present with locked classes. |
| 07-01 | WishCard presentational, callback-driven, D-07 status matrix | ✓ VERIFIED | WishCard.jsx 203 lines, pure presentation (no `api` import), full action matrix at 39-103. |
| 07-01 | WishFormModal create+edit, diff payload, URL validation, NOTIF-06 disclosure | ✓ VERIFIED (CR-02 closed) | WishFormModal.jsx 223 lines, buildWishPatch diff logic, http/https validation, info-pill at 145-149. handleSubmit now wrapped in try/finally. |
| 07-01 | WishRejectModal self-confirming destructive (D-08) | ✓ VERIFIED (CR-02 closed) | WishRejectModal.jsx 109 lines, single textarea, red submit, 1-500 length check. handleSubmit now wrapped in try/finally. |
| 07-01 | WishAdvanceModal searchable my-published dish picker | ✓ VERIFIED (CR-02 closed) | WishAdvanceModal.jsx 185 lines, debounced (200ms) my-published query at 42-69. handleSubmit now wrapped in try/finally. |
| 07-01 | ConfirmModal a11y hooks (role/aria-modal/aria-labelledby/ESC/body-lock) | ✓ VERIFIED (partial) | ConfirmModal.jsx has role/aria-modal/aria-labelledby/ESC/body-lock. (WR-08: no focus trap / autofocus / aria-describedby — non-blocker warning; modal a11y → H-5.) |

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `frontend/src/api/client.js` | 8 wish methods with status→status_filter serialization | ✓ VERIFIED | Lines 156-198 |
| `frontend/src/utils/index.js` | 5 Chinese status entries | ✓ VERIFIED | Lines 69-74 |
| `frontend/src/css/styles.css` | wish-card/picker/unread-dot/sr-only rules + tokens | ✓ VERIFIED | Tokens + wish CSS |
| `frontend/src/components/ConfirmModal.jsx` | a11y hooks | ⚠️ Partial a11y | Role/aria-modal/aria-labelledby/ESC present; missing focus trap, autofocus, aria-describedby (WR-08) — non-blocker |
| `frontend/src/components/WishCard.jsx` | Shared role/status-aware card | ✓ VERIFIED | 203 lines, D-07 matrix at 39-103, data-wish-id at 148, highlight class at 113 |
| `frontend/src/components/WishFormModal.jsx` | Create+edit modal | ✓ VERIFIED (CR-02 fixed) | 223 lines, handleSubmit try/finally at 115-119 |
| `frontend/src/components/WishRejectModal.jsx` | Required-reason destructive | ✓ VERIFIED (CR-02 fixed) | 109 lines, handleSubmit try/finally at 45-49 |
| `frontend/src/components/WishAdvanceModal.jsx` | Searchable dish picker | ✓ VERIFIED (CR-02 fixed) | 185 lines, handleSubmit try/finally at 87-91 |
| `frontend/src/pages/UserWishesPage.jsx` | Own list + create/edit/cancel/FAB | ✓ VERIFIED (CR-01 fixed) | 344 lines; highlight effect gates on `loading===false` (line 138), `loading` in deps (line 176) |
| `frontend/src/pages/ChefWishesPage.jsx` | Shared chef/admin engine | ✓ VERIFIED (CR-01 fixed) | 358 lines; highlight effect gates on `loading===false` (line 165), `loading` in deps (line 201) |
| `frontend/src/pages/AdminWishesPage.jsx` | Thin wrapper | ✓ VERIFIED | 6 lines, pure wrapper |
| `frontend/src/App.jsx` | 3 wish routes + /wishes/:id redirect | ✓ VERIFIED | Routes + redirect component |
| `frontend/src/components/Sidebar.jsx` | 3 wish nav entries per role | ✓ VERIFIED | admin (33), chef (43), user (51) |
| `frontend/src/components/BottomBar.jsx` | 3 wish mobile tabs per role | ✓ VERIFIED | admin (26), chef (34), user (42) |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| App.jsx | UserWishesPage / ChefWishesPage / AdminWishesPage | ProtectedRoute + element | ✓ WIRED | Routes at App.jsx:266-289 |
| App.jsx | WishDeepLinkRedirect (inline) | useAuth + useParams + Navigate | ✓ WIRED | App.jsx:88-99, route before wildcard |
| UserWishesPage | api.createWish / api.updateWish / api.cancelWish | handleCreateSubmit / handleEditSubmit / handleCancelConfirm | ✓ WIRED | Pages call API; result refreshes list |
| UserWishesPage | WishFormModal | onSuccess(payload) callback | ✓ WIRED | try/finally in modal resets submitting on any path |
| UserWishesPage | ConfirmModal | onConfirm={handleCancelConfirm} | ✓ WIRED | (WR-01: no disabled prop — non-blocker) |
| ChefWishesPage | api.getWishes (status_filter / mine) + claimWish / advanceWish / rejectWish | useSearchParams tabs + lifecycle handlers | ✓ WIRED | buildWishParams + handleClaim/Advance/Reject |
| ChefWishesPage | WishAdvanceModal | onSuccess(dishId, dishName) → api.advanceWish | ✓ WIRED | try/finally resets submitting |
| ChefWishesPage | WishRejectModal | onSuccess(reason) → api.rejectWish | ✓ WIRED | try/finally resets submitting |
| AdminWishesPage | ChefWishesPage | `<ChefWishesPage viewAsAdmin={true} />` | ✓ WIRED | AdminWishesPage.jsx:5 |
| Sidebar / BottomBar | 3 role-branch wish entries | navItems / tabs arrays | ✓ WIRED | All 6 entries verified |
| api/client.js | backend /api/wishes endpoints | fetch + URLSearchParams | ✓ WIRED | client.js:157-198 |
| WishCard → Badge | utils statusBadge lookup | `<Badge status={wish.status} />` | ✓ WIRED | WishCard.jsx:164 |
| `?wish=:id` highlight | WishCard root + `data-wish-id` + `.wish-card-highlight` class | searchParams + setTimeout + scrollIntoView, gated on `loading===false` | ✓ WIRED (CR-01 fixed) | UserWishesPage:133-176; ChefWishesPage:160-201. Race eliminated. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| UserWishesPage | wishes | api.getWishes → backend wish_service.list_wishes (select) | ✓ DB query | ✓ FLOWING |
| ChefWishesPage | wishes | api.getWishes with status_filter/mine → wish_service.list_wishes | ✓ DB query | ✓ FLOWING |
| WishCard | wish prop | passed from parent's wishes state | ✓ Real data | ✓ FLOWING |
| WishFormModal | form state | useState initializer from wish prop | ✓ Real data on edit | ✓ FLOWING |
| WishAdvanceModal | dishes | api.getDishes({chef_filter:'my-published'}) → dish_service | ✓ DB query (chef); ✗ empty for admin (WR-02, non-blocker) | ✓ FLOWING (chef) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Frontend builds clean | `cd frontend && npm run build` | Exit 0; 75 modules transformed; dist/index-DMn_ME0f.js (486.41 KB) | ✓ PASS |
| ESLint over 5 fixed files (post-fix) | `npx eslint <5 files> --max-warnings=0` | Exit 0 (no output) | ✓ PASS |
| CR-01 fix present in UserWishesPage | `grep -n "if (loading) return undefined" frontend/src/pages/UserWishesPage.jsx` | Line 138 matches | ✓ PASS |
| CR-01 fix present in ChefWishesPage | `grep -n "if (loading) return undefined" frontend/src/pages/ChefWishesPage.jsx` | Line 165 matches | ✓ PASS |
| CR-01 `loading` in deps (both pages) | `grep -nE "}, \[wishes, highlightId.*loading\]" frontend/src/pages/{User,Chef}WishesPage.jsx` | UserWishesPage:176; ChefWishesPage:201 | ✓ PASS |
| CR-02 try/finally in 3 modals | `grep -l "finally {" frontend/src/components/Wish{Form,Advance,Reject}Modal.jsx` | All 3 files match | ✓ PASS |
| Backend wish router exposes status_filter/mine/claimed_by_chef_id | `grep -n "status_filter\|mine\|claimed_by_chef_id" backend/app/routers/wishes.py` | All three query params present | ✓ PASS |
| Commit scope matches claim | `git show f9d1839 --stat` | Exactly 5 files: 3 modals + 2 pages; +28/-9 | ✓ PASS |

### Probe Execution

| Probe | Command | Result | Status |
| ----- | ------- | ------ | ------ |
| Phase-specific probe | N/A | N/A | SKIP — no probe-*.sh scripts declared in any Plan/SUMMARY; not a migration/tooling phase |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| WISH-03 | 07-02 | 用户可在愿望"已上架"前编辑愿望内容（菜名/参考链接/备注） | ✓ SATISFIED | WishCard renders `[编辑愿望]` only for non-terminal; handleEditSubmit → api.updateWish with diff payload; CR-02 fix makes retry path robust |
| WISH-04 | 07-02 | 用户可在愿望"已上架"前撤销（软删除, status='已撤销'）愿望 | ✓ SATISFIED | WishCard renders `[撤销愿望]` only for non-terminal; handleCancelConfirm → api.cancelWish → card disappears |
| UX-01 | 07-01, 07-02, 07-03 | 用户端愿望列表与提交入口移动端友好 | ✓ SATISFIED (needs human) | FAB + Header action button; mobile card layout; BottomBar 愿望 tab. Mobile feel → H-1 |
| UX-02 | 07-01, 07-02, 07-03 | 厨师端愿望管理界面（认领/推进/拒绝）移动端友好 | ✓ SATISFIED (needs human) | URL tabs, 44px action buttons, BottomBar 愿望 tab, dish picker modal. Mobile feel → H-2 |
| UX-03 | 07-01 | 状态在愿望卡片上有清晰视觉标识（徽章/颜色） | ✓ SATISFIED | 5 Chinese statuses → 5 distinct badge classes |

No ORPHANED requirements — all 5 phase-7 IDs appear in Plan frontmatter and are addressed.

### Anti-Patterns Found (post-fix)

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| ConfirmModal.jsx | 69-79 | No `disabled` / `confirming` prop | ⚠️ Warning | Double-submit possible on rapid cancel click (WR-01) |
| WishAdvanceModal.jsx | 131-134 | Empty-state copy + link wrong for search-no-match and admin | ⚠️ Warning | Admin dead-end (WR-02); confusing copy on search-no-match (WR-03) |
| UserWishesPage.jsx | 44-72 | Side effects inside setState updater | ⚠️ Warning | StrictMode dev-mode double API calls (WR-04) |
| ChefWishesPage.jsx | 76-100 | Same pattern | ⚠️ Warning | Same StrictMode issue (WR-04) |
| UserWishesPage.jsx | 238-242 | `handleLoadMore` stale-closure on rapid double-click | ⚠️ Warning | Page counter drift on rapid pagination (WR-05) |
| ChefWishesPage.jsx | 257-261 | Same pattern | ⚠️ Warning | Same race (WR-05) |
| UserWishesPage.jsx | 117-128 | `visibilitychange` + `focus` both fire on tab regain | ⚠️ Warning | Double API call on every tab return (WR-06) |
| ChefWishesPage.jsx | 267-268 | Tab counts derived from loaded items, not backend totals | ⚠️ Warning | Misleading badges (WR-07) |
| All 4 modals | — | No focus trap, no autofocus (except modal form inputs), no aria-describedby, no focus restore | ⚠️ Warning | Incomplete WAI modal pattern (WR-08); partial mitigation: body-overflow lock + ESC + aria-labelledby |
| App.jsx | 88-99 | `WishDeepLinkRedirect` does not encodeURIComponent(id) | ℹ️ Info | Low-impact (IN-01) |
| ChefWishesPage.jsx | 148-155 | `setInterval` keeps firing while tab hidden | ℹ️ Info | CPU/battery waste (IN-03) |

**No BLOCKER anti-patterns remain.** All 🛑 BLOCKER findings from the prior run (CR-01 race in UserWishesPage/ChefWishesPage highlight effects; CR-02 missing try/finally in 3 modals) are fixed. The 8 remaining items are ⚠️ warnings (non-blocker code-quality concerns) and ℹ️ info items. No TBD/FIXME/XXX/TODO/HACK markers in any Phase-7 file.

### Human Verification Required

### H-1: Mobile UX feel for user wish list

**Test:** On a 375px-wide viewport (iPhone-class), open `/my-wishes`, submit a wish via the FAB, browse the list, edit a wish, and cancel one.
**Expected:** FAB is reachable by thumb; form fields are scannable; cards stack single-column with readable text; modal doesn't overflow; bottom-bar 愿望 tab is visible.
**Why human:** Pixel-level mobile readability, thumb-reach geometry, and modal scrolling behavior cannot be asserted by grep.

### H-2: Mobile UX feel for chef wish queue

**Test:** On a 375px viewport, open `/chef/wishes`, switch between 全部/待处理/我的认领 tabs, claim a 待处理 wish, advance it via the dish picker, reject one with a reason.
**Expected:** Tab pills fit horizontally without wrapping; action buttons (44px tap targets) are tappable; dish picker modal scrolls inside the picker list; reject textarea is reachable.
**Why human:** Touch-target sizing and modal scroll containment require visual inspection.

### H-3: Deep-link highlight after CR-01 fix (POST-FIX CRITICAL CHECK)

**Test:** Log in as a user with at least one wish, then navigate directly to `/wishes/<existing-id>` (simulating a Phase-6 Feishu tap).
**Expected:** Browser redirects to `/my-wishes?wish=<id>`; the matching wish card receives a blue outline + accent box-shadow for 4 seconds; the card is scrolled smoothly into the center of the viewport; the URL param is cleared after 4s; **no "未找到该愿望" toast appears.**
**Why human:** Visual highlight + scroll animation + real-network timing cannot be asserted by grep; this is the precise behavior CR-01 broke and must be confirmed working end-to-end in a real browser.

### H-4: Deep-link missing-wish toast (after fix)

**Test:** Navigate to `/wishes/999999` (a non-existent id) as a user.
**Expected:** Page redirects to `/my-wishes?wish=999999`; the wish list loads; once loaded, the "未找到该愿望，可能已撤销或需要切换标签" toast appears once and the URL param is cleared.
**Why human:** Toast timing relative to list load needs visual confirmation (verifies the `if (loading) return undefined;` guard does not suppress the legitimate missing-wish path).

### H-5: Modal accessibility for keyboard + screen reader

**Test:** Open each modal (WishForm create/edit, WishReject, WishAdvance, ConfirmModal for cancel) using keyboard only; verify with a screen reader (VoiceOver/NVDA).
**Expected:** First input is autofocused (WishFormModal/WishRejectModal/WishAdvanceModal — but ConfirmModal has no autofocus, see WR-08); ESC closes (now reliably, since CR-02 fix ensures `submitting` resets on API failure — ESC suppression no longer sticks); title is announced via aria-labelledby; body text announced (currently missing aria-describedby — WR-08); Tab cycles within modal or traps focus (current impl: Tab can leave modal — WR-08); focus returns to trigger button on close (currently missing — WR-08).
**Why human:** Focus management and screen-reader announcements require interactive testing.

### Gaps Summary

**Both prior BLOCKER gaps are closed:**

1. **CR-01 — Deep-link highlight race — FIXED & VERIFIED.** Commit `f9d1839` added `if (loading) return undefined;` to the missing-toast branch in both `UserWishesPage.jsx:138` and `ChefWishesPage.jsx:165`, and added `loading` to both effects' deps arrays (`:176` and `:201`). The effect no longer schedules the 0ms missing-toast on mount; it waits for the initial fetch to resolve before declaring a wish "not found". This restores the Phase-6 `/wishes/:id` Feishu deep-link integration. Visual confirmation deferred to H-3 / H-4.

2. **CR-02 — Modal submit-state never resets on API failure — FIXED & VERIFIED.** Commit `f9d1839` wrapped `await onSuccess?.(...)` in `try { ... } finally { setSubmitting(false); }` in all three modals (`WishFormModal:115-119`, `WishAdvanceModal:87-91`, `WishRejectModal:45-49`). The parent handlers are `async` and swallow errors internally, so the promise resolves normally on failure and the `finally` fires — `submitting` resets on every path. Edit/reject/advance retry flows are no longer dead after an API error.

**Status: human_needed.** All 6 ROADMAP success criteria and all 11 Plan-level must_haves are verified in code (happy path + error path). No BLOCKER anti-patterns remain. Five human verification items remain — three of which (H-3, H-4, H-5) directly validate the closed gaps in a real browser, and two of which (H-1, H-2) cover mobile UX feel that the "移动端友好" (mobile-friendly) phase goal explicitly requires but grep cannot verify.

---

_Verified: 2026-07-23T12:30:00Z_
_Verifier: the agent (gsd-verifier)_
_Re-verification of commit f9d1839 ("fix(07): close verification gaps CR-01 deep-link race + CR-02 modal submit reset")_
