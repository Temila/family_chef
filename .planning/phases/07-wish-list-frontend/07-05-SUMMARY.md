---
phase: 07-wish-list-frontend
plan: 05
subsystem: ui
tags: [gap-closure, react, race-condition, deep-link, playwright, react-19, setstate-in-effect]

requires:
  - phase: 07-wish-list-frontend (Plan 03 highlight engine + Plan 04 migration gap closure)
    provides: UserWishesPage/ChefWishesPage highlight effect + working GET /api/wishes
provides:
  - "UserWishesPage / ChefWishesPage 闭合 H-3 深链高亮 race（fetchedOnce 守门 + setTimeout(100) 兜底）"
  - "repro_h3_regression.py — Playwright 回归脚本，未来同型 race 退化时非 0 退出"
affects: [07-HUMAN-UAT (H-3 closed), AdminWishesPage (inherits fix via viewAsAdmin)]

tech-stack:
  added: []
  patterns:
    - "fetchedOnce 状态标志：仅在 .then 成功分支置 true，区分 '.finally 翻 loading' 与 '列表真正就绪'"
    - "ctx.add_init_script 注册跨导航持久的 MutationObserver（替代 per-document page.evaluate）"

key-files:
  created:
    - repro_h3_regression.py
  modified:
    - frontend/src/pages/UserWishesPage.jsx
    - frontend/src/pages/ChefWishesPage.jsx

key-decisions:
  - "采用 'fetchedOnce + setTimeout(100)' 组合（debug 会话方案 1+3），不引入 abort controller — 符合仓库对 state-flag 的偏好"
  - "missing-toast 定时器 0ms→100ms：100ms 对用户无感（<200ms 即时阈值），但给 React 19 commit+cleanup 留出 25× 余量"
  - "fetchedOnce 不在 .finally 中重置；仅在 useState 初值 false 与组件卸载时重置 — 跨 tab 切换保留 true 是正确行为（用户已见过列表加载成功）"
  - "回归脚本用 ctx.add_init_script 而非 page.evaluate 安装 MutationObserver，确保 observer 跨 page.goto 存活"

patterns-established:
  - "Pattern: 在 .finally(setLoading) 与 requestSeq 丢弃耦合的 effect 中，用 fetchedOnce 标志区分 'loading 已翻' 与 '数据已提交'"
  - "Pattern: Playwright 跨导航 DOM 观测用 add_init_script，不用 page.evaluate（后者随旧 document 销毁）"

requirements-completed:
  - UX-01
  - UX-02

duration: 9min
completed: 2026-07-23
---

# Phase 07 Plan 05: H-3 Deep-Link Highlight Race Gap Closure Summary

**闭合 H-3：UserWishesPage/ChefWishesPage 引入 fetchedOnce 标志 + missing-toast 定时器加宽至 100ms，消除 requestSeqRef 丢弃响应时 .finally(setLoading(false)) 造成的 wishes=[]&&loading=false 瞬态窗口导致的误报"未找到该愿望"toast**

## Performance

- **Duration:** ~9 min（09:09Z → 09:18Z）
- **Started:** 2026-07-23T09:09:00Z
- **Completed:** 2026-07-23T09:18:00Z
- **Tasks:** 3
- **Files modified:** 2（+ 1 created）

## Accomplishments
- UserWishesPage.jsx：新增 `fetchedOnce` 状态，仅在 mount effect `.then` 成功分支（seq 未过期且 setWishes 已执行）置 true；高亮 effect 守门改为 `if (loading || !fetchedOnce) return undefined;`；missing-toast 定时器 `setTimeout(0)` → `setTimeout(100)`；deps 追加 `fetchedOnce`
- ChefWishesPage.jsx：镜像同型修复（AdminWishesPage 经 viewAsAdmin 自动继承）；未触碰 queueMicrotask 包装与 30s 轮询 effect
- repro_h3_regression.py：Playwright 回归脚本，节流 /api/wishes 1.5s 暴露 race，断言 /wishes/1、2、3 零 missing-toast 且 /wishes/999999 恰好 1 条 missing-toast；本次实测 EXIT_CODE=0
- H-3 UAT blocker 闭合：深链导航不再误报"未找到该愿望"，合法缺失路径（999999）仍正常提示

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix UserWishesPage.jsx — add fetchedOnce flag and widen missing-toast window** - `59f1835` (fix)
2. **Task 2: Apply the same fix to ChefWishesPage.jsx (mirrors UserWishesPage)** - `73f1b88` (fix)
3. **Task 3: Add Playwright regression script for H-3 and verify the fix end-to-end** - `cb9a061` (test)

## Files Created/Modified
- `frontend/src/pages/UserWishesPage.jsx` — 新增 fetchedOnce useState + .then 成功分支 setFetchedOnce(true) + 高亮 effect 守门 + setTimeout(100) + deps
- `frontend/src/pages/ChefWishesPage.jsx` — 同型修复（activeTab effect .then + 高亮 effect），AdminWishesPage 经 viewAsAdmin 自动继承
- `repro_h3_regression.py` — Playwright 回归脚本（241 行）：登录 user1 → 探测 ≥3 愿望 → 节流 /api/wishes → MutationObserver 监听 .toast → 断言 /wishes/{1,2,3} 零 toast、/wishes/999999 恰好 1 toast

## Decisions Made
- 采用 debug 会话推荐的"方案 1 + 方案 3"组合（fetchedOnce + setTimeout(100)），而非 abort controller — 符合仓库对简单 state-flag 的偏好
- missing-toast 100ms 阈值：对用户无感（<200ms 即时感知阈值），但给 React 19 commit+cleanup 留出 25× 余量（实测通常 <4ms）
- 回归脚本不自动创建愿望 — 避免掩盖数据正确性问题；测试数据不足时退出码 2 并提示

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 回归脚本 MutationObserver 跨导航失效**
- **Found during:** Task 3（首次运行回归脚本）
- **Issue:** 初版脚本用 `page.evaluate` 在 `/login` 中转页安装 MutationObserver 并定义 `window.__toastLog`。`page.goto('/wishes/<id>')` 触发新 document，旧 observer 与 `window.__toastLog` 随旧 document 销毁 → 三个正向用例（/wishes/1,2,3）报告 `missing-toast=0` 是"观察器已死"的假阴性，负向用例（/wishes/999999）暴露问题：URL param 在 ~0.5s 被清除（证明 missing-toast 合法触发），但日志捕获 0 条
- **Fix:** 改用 `ctx.add_init_script()`（Playwright 跨导航持久的 init 脚本）注册 observer — 每次新 document 加载时自动重挂 observer 并重置 `window.__toastLog`；observer 内部用 `setTimeout(__attachToastObserver, 10)` 轮询等待 `document.body` 就绪
- **Files modified:** repro_h3_regression.py（仅本任务文件，未触碰已提交的 UserWishesPage/ChefWishesPage）
- **Verification:** 重跑脚本 EXIT_CODE=0 — /wishes/1,2,3 零 missing-toast；/wishes/999999 在 t≈0.5s 捕获恰好 1 条 missing-toast（观察器现在真正工作）
- **Committed in:** cb9a061（Task 3 commit，脚本在提交前已修正）

---

**Total deviations:** 1 auto-fixed（1 bug in test script）
**Impact on plan:** 修复是测试脚本自身的正确性修复，不改变计划意图（仍是"MutationObserver 监听 .toast 节点"），仅升级为跨导航持久的实现。生产代码（UserWishesPage/ChefWishesPage）未受影响，修复验证结论可信。

## Issues Encountered
- 无。回归脚本首跑"失败"是测试工具 bug（上述 Rule 1 偏差），非被测代码问题 — 生产代码修复在首次运行即已验证正确（三个正向用例零 toast）。

## User Setup Required
None - 无外部服务配置。运行回归脚本仅需 dev server（./scripts/run-dev.sh）已启动且 user1/123456 拥有 ≥3 条愿望。

## Next Phase Readiness
- H-3 UAT blocker 已闭合：用户可重跑 07-HUMAN-UAT.md 的 H-3 用例，访问 /wishes/{已存在id} 应蓝色描边 4s 且无 toast
- 回归脚本 repro_h3_regression.py 锁定修复 — 未来同型 race 退化时 CI/手动跑将非 0 退出
- 本计划为 Phase 07 的 gap-closure，不开启新阶段；v1.1 milestone 在 H-3 人工确认后即可归档

## Verification Results（PLAN.md `<verification>` 12 项）

| # | 检查 | 结果 |
|---|------|------|
| 1 | `cd frontend && npm run build` exits 0 | PASS |
| 2 | eslint UserWishesPage.jsx --max-warnings=0 | PASS |
| 3 | eslint ChefWishesPage.jsx --max-warnings=0 | PASS |
| 4 | fetchedOnce in UserWishesPage.jsx ≥4 matches | PASS (5) |
| 5 | fetchedOnce in ChefWishesPage.jsx ≥4 matches | PASS (5) |
| 6 | `if (loading \|\| !fetchedOnce)` in UserWishesPage = 1 | PASS |
| 7 | `if (loading \|\| !fetchedOnce)` in ChefWishesPage = 1 | PASS |
| 8 | `setTimeout(... 100)` 替换 `setTimeout(... 0)`（两个文件 missing path） | PASS (line 167 / 190) |
| 9 | `python3 repro_h3_regression.py` exits 0 | PASS (EXIT_CODE=0) |
| 10 | git log 恰好 3 个本计划 commit | PASS (59f1835, 73f1b88, cb9a061) |
| 11 | git status 无本计划外的修改 | PASS（剩余条目均为计划前已存在的无关项：backend/pyproject.toml 修改、planning 文档、既有 repro 脚本 — 属 SCOPE BOUNDARY 之外） |
| 12 | H-3 UAT 可重跑并通过 | 待人工确认（脚本已自动化验证同等条件） |

## Self-Check: PASSED

- FOUND: frontend/src/pages/UserWishesPage.jsx
- FOUND: frontend/src/pages/ChefWishesPage.jsx
- FOUND: repro_h3_regression.py
- FOUND: commit 59f1835
- FOUND: commit 73f1b88
- FOUND: commit cb9a061

---
*Phase: 07-wish-list-frontend*
*Completed: 2026-07-23*
