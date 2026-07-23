---
status: diagnosed
phase: 07-wish-list-frontend
source: [07-VERIFICATION.md]
started: 2026-07-23T12:30:00Z
updated: 2026-07-23T16:25:00Z
---

## Current Test

[testing complete]

## Tests

### H-1: Mobile UX feel for user wish list

**Test:** On a 375px-wide viewport (iPhone-class), open `/my-wishes`, submit a wish via the FAB, browse the list, edit a wish, and cancel one.
expected: FAB is reachable by thumb; form fields are scannable; cards stack single-column with readable text; modal doesn't overflow; bottom-bar 愿望 tab is visible.
result: pass
note: "Backend blocker RESOLVED by 07-04 gap closure (GET /api/wishes now returns 200 — live-probed this run). Wish list loads without error. Remaining scope is broader mobile-feel (thumb-reach, stacking, overflow) which still needs human eyes."

### H-2: Mobile UX feel for chef wish queue

**Test:** On a 375px viewport, open `/chef/wishes`, switch between 全部/待处理/我的认领 tabs, claim a 待处理 wish, advance it via the dish picker, reject one with a reason.
expected: Tab pills fit horizontally without wrapping; action buttons (44px tap targets) are tappable; dish picker modal scrolls inside the picker list; reject textarea is reachable.
result: pass

### H-3: Deep-link highlight after CR-01 fix (POST-FIX CRITICAL CHECK)

**Test:** Log in as a user with at least one wish, then navigate directly to `/wishes/<existing-id>` (simulating a Phase-6 Feishu tap).
expected: Browser redirects to `/my-wishes?wish=<id>`; the matching wish card receives a blue outline + accent box-shadow for 4 seconds; the card is scrolled smoothly into the center of the viewport; the URL param is cleared after 4s; **no "未找到该愿望" toast appears.**
result: issue
reported: "提示"未找到该愿望，可能已撤销或需要切换标签"，测试了1、2、3都出现了这个现象"
severity: blocker

### H-4: Deep-link missing-wish toast (after fix)

**Test:** Navigate to `/wishes/999999` (a non-existent id) as a user.
expected: Page redirects to `/my-wishes?wish=999999`; the wish list loads; once loaded, the "未找到该愿望，可能已撤销或需要切换标签" toast appears once and the URL param is cleared.
result: pass

### H-5: Modal accessibility for keyboard + screen reader

**Test:** Open each modal (WishForm create/edit, WishReject, WishAdvance, ConfirmModal for cancel) using keyboard only; verify with a screen reader (VoiceOver/NVDA).
expected: First input is autofocused (WishFormModal/WishRejectModal/WishAdvanceModal); ESC closes reliably (CR-02 fix ensures `submitting` resets on API failure — ESC suppression no longer sticks); title is announced via aria-labelledby. (Known gaps: ConfirmModal has no autofocus, missing aria-describedby, Tab can leave modal, focus not returned to trigger — tracked as WR-08 polish items, non-blocking.)
result: pass

## Summary

total: 5
passed: 4
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

<!-- YAML format for plan-phase --gaps consumption -->
- truth: "深链 /wishes/<已存在id> 跳转后能定位到对应卡片并高亮，且不触发'未找到该愿望'提示"
  status: failed
  reason: "用户报告：测试了 wish id 1、2、3（均属于当前登录用户 user1），访问 /wishes/1、/wishes/2、/wishes/3 都出现'未找到该愿望，可能已撤销或需要切换标签'提示。CR-01 修复未生效——深链高亮的关键链路仍然以'未找到'分支收尾。"
  severity: blocker
  test: 3
  root_cause: "UserWishesPage.jsx 的挂载 effect 用 requestSeqRef 丢弃过期响应，但 `.finally(() => setLoading(false))` 仍会执行——导致 wishes=[] 但 loading=false 的瞬态窗口。当 StrictMode 二次挂载或焦点事件触发 loadWishes({background:true}) 抢占 seq 时，初次请求被丢弃，loading 立刻翻为 false，但 wishes 仍未填充。高亮 effect 看到 wishes=[] + loading=false 即触发 setTimeout(0) 排程'未找到'toast。setTimeout(0) 在 React 19 异步 effect 调度下会先于下一轮 setWishes 的 cleanup 执行，因此即便愿望随后加载完成也无法撤销已弹出的 toast。ChefWishesPage.jsx:166-207 同型问题。CR-01 的 `if (loading) return undefined;` 仅在初始 mount 时 loading=true 阻挡，进入瞬态窗口后失效。"
  artifacts:
    - path: "frontend/src/pages/UserWishesPage.jsx"
      issue: "lines 105-118: mount effect 的 .finally() 在请求被 requestSeqRef 丢弃时仍 setLoading(false)，造成 wishes=[] 与 loading=false 同时存在；lines 142-185: 高亮 effect 仅以 loading 作为'列表已加载'判据，不足以防止瞬态窗口触发 toast"
    - path: "frontend/src/pages/ChefWishesPage.jsx"
      issue: "lines 134-151 与 166-207 存在完全同构的 race（mount/focus 抢占 → 丢弃 → .finally → loading=false → 高亮 effect 误判）"
    - path: "frontend/src/contexts/ToastContext.jsx"
      issue: "lines 12-18: showToast 排程 3000ms 自动消失，且无幂等键——同一 effect 触发多次会叠出多个 toast"
  missing:
    - "引入 'hasFetched' 或 'fetchedOnce' 状态：仅当 wishes 至少被成功填充过一次才允许触发 missing toast"
    - "或：把 mount 请求改成不会被 requestSeqRef 抢占的形态（例如不参与共享 seq，或在 StrictMode 下跳过 background refresh 抢占）"
    - "或：在排程 missing toast 前 await 一个最小延迟（如 100ms），给下一轮 setWishes 留出 commit+cleanup 窗口"
    - "ToastContext.showToast 增加幂等键：当同 key 在 1s 内已触发则丢弃，避免短暂抖动时叠出多个"
  debug_session: ".planning/debug/wish-deeplink-false-missing-toast.md"

- truth: "用户打开 /my-wishes 可以正常加载并浏览自己的愿望卡片列表"
  status: resolved
  resolved_at: 2026-07-23T15:45:00Z
  resolution: "07-04 gap-closure plan applied the pending Phase-6 Alembic migration 3a41e4977098 to backend/data/family_chef.db. wishes table now has last_status_change_at and submitter_last_viewed_at columns; alembic_version at head. Live HTTP probe confirms GET /api/wishes returns HTTP 200 with has_unread field. NOTE(07-04) comment added to backend/app/main.py flagging the absence of an automatic alembic upgrade on startup."
  severity: blocker
  test: 1
  root_cause: "Phase 6 Alembic migration `3a41e4977098_add_wish_notification_timestamps.py` was never applied to backend/data/family_chef.db. The wishes table is missing `last_status_change_at` and `submitter_last_viewed_at` columns that backend/app/models/wish.py:33-34 declares. Every SELECT against wishes fails with `sqlite3.OperationalError: no such column: wishes.last_status_change_at` → HTTP 500 → frontend toast '加载愿望失败'."
  artifacts:
    - path: "backend/data/family_chef.db"
      issue: "alembic_version stuck at 72b56533bb6d; wishes table missing last_status_change_at and submitter_last_viewed_at columns"
    - path: "backend/alembic/versions/3a41e4977098_add_wish_notification_timestamps.py"
      issue: "Migration exists but was never applied to the running DB"
    - path: "backend/app/models/wish.py"
      issue: "Lines 33-34 declare the columns that the DB lacks"
    - path: "backend/app/routers/wishes.py"
      issue: "compute_has_unread (lines 34-38) reads missing columns on every list query"
  fixed_by:
    - "07-04 gap-closure plan: applied alembic upgrade head to backend/data/family_chef.db"
    - "NOTE(07-04) comment in backend/app/main.py:232-234 flags absence of auto-migration on startup"
  debug_session: .planning/debug/resolved/wish-list-load-failure.md
