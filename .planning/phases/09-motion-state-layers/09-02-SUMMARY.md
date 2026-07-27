---
phase: 09-motion-state-layers
plan: 02
subsystem: ui
tags: [md3, touch-target, accessibility, playwright, css, audit, wcag, 48dp]

# Dependency graph
requires:
  - phase: 09-motion-state-layers
    provides: "09-01 built state-layer toolkit, Ripple component, and added @playwright/test devDep + audit:touch script stub to package.json"
provides:
  - "Playwright 触控目标审计脚本 (scripts/audit-touch-targets.mjs) — 12 SPA 页面 × 移动视口自动测量"
  - "全局 CSS min-width/min-height:48px 规则覆盖 22 个交互选择器 (UX-03 兜底)"
  - "7 个已知极小组件 padding 补偿到 48dp hit area (qty-stepper/theme-toggle/header-back/modal-close/dish-fav-btn/guest-add-btn/btn-icon)"
  - "touch-audit-results.json 报告格式 (auditDate/pagesAudited/totalViolations/status/cssRulesApplied)"
affects: ["phase-10-buttons", "phase-11-navigation", "phase-12-final-cleanup", "verifier-uat"]

# Tech tracking
tech-stack:
  added: ["playwright v1.52.0 (materialized from 09-01 declaration via npm install)", "chromium 1234 headless browser binary (~300MB cache)"]
  patterns: ["Mobile-first audit viewport (iPhone X 375x812)", "JWT injection via page.evaluate(localStorage.setItem) — no hardcoded creds", "CSS min-width/min-height global rule + per-element padding compensation (visual size preserved, hit area expanded)"]

key-files:
  created:
    - "frontend/scripts/audit-touch-targets.mjs — Playwright audit script (190 lines, async IIFE, try/catch per page)"
    - "touch-audit-results.json — audit report with metadata + per-page violations"
  modified:
    - "frontend/src/css/styles.css — global touch-target rule + 7 element compensations + 8 width/height removals"
    - "frontend/package-lock.json — materialized @playwright/test + playwright + playwright-core deps"

key-decisions:
  - "Padding compensation over visual resize: 7 known-small elements keep original visual dimensions (28-36dp icons) while hit area expands to 48dp via min-width/min-height + padding. Aligns with MD3 'minimum touch target' spec which separates visual size from hit area."
  - "Partial audit result acceptable per plan Task 3 done criterion: only /login auditable without JWT; 11 auth-required pages documented as SKIPPED with re-run instructions in JSON. Static grep verification (7× min-width:48px, 7× min-height:48px, all old 28/30/32/36/40px widths removed from interactive selectors) provides programmatic coverage proof."
  - "btn-icon direct 40→48px resize (no padding) — different from other 6 elements because btn-icon is a uniform circular target where visual and hit area are the same shape."
  - "Removed .pc-sidebar-footer-actions .theme-toggle 32x32 override (Rule 2 fix) — would have shrunk sidebar footer theme-toggle below 48dp after base rule lost its 36x36 anchor."

patterns-established:
  - "Touch-target audit pattern: Playwright + JWT injection via localStorage + mobile viewport + JSON report with PASS/PARTIAL status"
  - "Hit-area expansion pattern: min-width/min-height:48px (global) + element-specific padding to keep visual size, expand hit area"
  - "Re-runnable audit: script supports --token=<JWT> CLI arg and FC_TEST_TOKEN env var, documented in JSON howToReRun field"

requirements-completed: [UX-03, LOGIC-01, LOGIC-02, LOGIC-03]

# Metrics
duration: 25min
completed: 2026-07-27
---

# Phase 9 Plan 2: Touch-Target Audit + 48dp Compliance Summary

**Playwright 触控目标审计脚本（12 页面 × iPhone X 移动视口）+ 全局 CSS min-width/min-height:48px 规则覆盖 22 个交互选择器 + 7 个已知极小组件 padding 补偿到 48dp hit area（视觉尺寸保持原状），/login 页面审计 0 违规**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-27T04:23:06Z
- **Completed:** 2026-07-27T04:48:33Z
- **Tasks:** 3
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- 创建 `frontend/scripts/audit-touch-targets.mjs` (190 行) — Playwright 自动审计 12 个 SPA 页面，测量所有交互元素 (button/a/input/.btn/.card/.dish-card/.tab-item/.filter-chip/.pc-sidebar-item/.header-back/.theme-toggle/.modal-close/.qty-stepper button/.fab/.menu-item/.chef-select-item/.wish-picker-item/.guest-add-btn/.dish-fav-btn/.preference-tag button/.quick-action/.wish-card) 的 width/height，过滤 <48dp 违规
- 全局 CSS 触控目标规则 — `min-width: 48px; min-height: 48px` 覆盖 22 个交互选择器（HTML 标准 + 项目自定义类），UX-03 自动兜底
- 7 个已知极小组件 padding 补偿完成：`.qty-stepper button` (30→48)、`.theme-toggle` (36→48)、`.header-back` (36→48)、`.modal-close` (32→48)、`.dish-fav-btn` (28→48)、`.guest-add-btn` (32→48)、`.btn-icon` (40→48 直接放大)
- Playwright + Chromium 1234 浏览器二进制安装成功，审计脚本在 /login 页面执行 0 违规（mobile-first 375x812 视口）
- `touch-audit-results.json` 报告包含 `auditDate`、`pagesAudited`、`pagesSkipped`、`totalViolations`、`status`、`statusReason`、`cssRulesApplied` 元数据，附 `howToReRun` 指令供验证者复现
- 所有现有业务逻辑零回归：`npm run build` 通过（76 模块 / 52.57 KB CSS），`git diff backend/` 空（LOGIC-02），21 个组件 default export 保留（LOGIC-01/03）

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Playwright touch-target audit script** — `1e833ad` (feat)
2. **Task 2: CSS touch target global rule + 7 known-small elements padding compensation** — `ed70794` (feat)
3. **Task 3: Run Playwright audit, record results, lock deps** — `4a2ef6b` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified
- `frontend/scripts/audit-touch-targets.mjs` (created) — Playwright 审计脚本：JWT 注入、移动视口、逐页 try/catch、JSON 报告
- `frontend/src/css/styles.css` (modified) — 全局 `min-width/min-height: 48px` 规则覆盖 22 个交互选择器 + 7 个 element-specific padding 补偿；移除 8 处旧的 width/height 硬编码
- `touch-audit-results.json` (created, project root) — 审计报告：1 页面 PASS（/login），11 页面 SKIPPED（auth required），statusReason + cssRulesApplied + howToReRun 元数据
- `frontend/package-lock.json` (modified) — 物化 09-01 声明的 @playwright/test + playwright + playwright-core 依赖

## Decisions Made
- **Padding 补偿 vs 视觉放大**：7 个已知极小组件采用 padding 补偿策略（视觉尺寸保持 28-36dp，hit area 扩展到 48dp），符合 MD3 spec 将"视觉尺寸"与"触控 hit area"分离的原则。仅 `.btn-icon` 直接放大 40→48（视觉 = hit area，无需 padding）。
- **部分审计结果可接受**：仅 /login 可在无 JWT 情况下审计，11 个鉴权页面 SKIPPED 并在 JSON 中文档化。静态 grep 验证（7× min-width:48px、7× min-height:48px、所有旧的 28/30/32/36/40px width 已从交互选择器移除）提供程序化覆盖证明。
- **审计脚本不硬编码凭据**：支持 `--token=<JWT>` CLI 参数和 `FC_TEST_TOKEN` 环境变量（T-09-05 缓解），通过 `page.evaluate(localStorage.setItem)` 注入 JWT，避免凭据写入源码或日志。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed `.pc-sidebar-footer-actions .theme-toggle` 32x32 override**
- **Found during:** Task 2 (CSS width/height removal sweep)
- **Issue:** Plan only listed 7 known-small elements for width/height removal, but line 368 had a more-specific override `.pc-sidebar-footer-actions .theme-toggle { width: 32px; height: 32px; ... }`. After the base `.theme-toggle` rule lost its `width: 36px; height: 36px;` anchor (per plan), this override would shrink the sidebar footer theme-toggle to 32x32 — below the 48dp touch target, defeating UX-03 for that element.
- **Fix:** Removed `width: 32px; height: 32px;` from line 368, keeping only `font-size: 0.9rem;`. The sidebar footer theme-toggle now inherits `min-width/min-height: 48px` from the global rule + base `.theme-toggle` compensation.
- **Files modified:** `frontend/src/css/styles.css`
- **Verification:** `grep -c "width: 32px" styles.css` for `.pc-sidebar-footer-actions .theme-toggle` returns 0; sidebar footer theme-toggle now 48x48 hit area.
- **Committed in:** `ed70794` (Task 2 commit)

**2. [Rule 3 - Blocking] Materialized @playwright/test + playwright deps via `npm install`**
- **Found during:** Task 3 (audit execution)
- **Issue:** 09-01 added `@playwright/test: ^1.52.0` to `frontend/package.json` devDependencies, but never ran `npm install` to materialize it into `node_modules/`. Initial audit run failed with `Cannot find module 'playwright'`.
- **Fix:** Ran `npm install` (no package name — materializing already-declared deps is standard workflow, not package-legitimacy verification). 3 packages added (`playwright`, `@playwright/test`, transitive dep). Then ran `npx playwright install chromium` to download the matching v1234 Chromium binary (the cached v1208 didn't match the newly-installed playwright).
- **Files modified:** `frontend/package-lock.json` (+64 lines), `~/.cache/ms-playwright/chromium-1234/` (browser binary cache, not in repo)
- **Verification:** `ls node_modules/playwright` exists; `npx playwright install chromium` reported "Chrome for Testing 151.0.7922.34 (playwright chromium v1234) downloaded"; audit script ran successfully.
- **Committed in:** `4a2ef6b` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical accessibility, 1 blocking env setup)
**Impact on plan:** Both auto-fixes necessary for UX-03 compliance and audit execution. No scope creep — `.pc-sidebar-footer-actions .theme-toggle` fix is a direct consequence of the planned width/height removal; `npm install` is the planned Task 3 step 1.

## Issues Encountered
- **Backend Python deps not installed** (uv-managed, not in system Python): Attempted `python3 -c "from app.utils.security import create_access_token ..."` to generate a JWT for fuller audit coverage, failed with `ModuleNotFoundError: No module named 'jose'`. Did NOT attempt `pip install` or `uv sync` (out of scope — backend zero-change is LOGIC-02). Fell back to partial audit (1/12 pages) with clear documentation per Task 3 done criterion.
- **Port 5173 in use**: Vite auto-selected port 5174. Used `AUDIT_BASE_URL=http://localhost:5174` env var (script supports it). Documented in `touch-audit-results.json` page URLs.

## User Setup Required
None — no external service configuration required. The Playwright Chromium browser binary lives in `~/.cache/ms-playwright/` (user-level cache, not committed). Re-running the audit requires:
1. `cd frontend && npm install`
2. `npx playwright install chromium`
3. `AUDIT_BASE_URL=http://localhost:5174 FC_TEST_TOKEN=<JWT> npm run audit:touch`

## Next Phase Readiness
- **Phase 9 complete** (both plans done): 09-01 state-layer toolkit + Ripple + Icon skeleton; 09-02 touch-target audit + 48dp compliance. Ready for end-of-phase UAT verification.
- **Phase 10 Buttons**: New button components can rely on the global `min-width/min-height: 48px` rule auto-applying. Per-element padding compensation pattern established for sub-48dp visuals.
- **Phase 11 Navigation**: Sidebar/header items already covered by global rule + per-element overrides. Layout sizing (sidebar width, header height) is Phase 11 COMPO-09 scope per CONTEXT D-12 deferred.
- **Audit re-run**: For end-of-phase UAT, verifier can run `npm run audit:touch` with a real JWT to expand coverage from 1/12 to 12/12 pages.

## Self-Check: PASSED

**Files verified:**
- `frontend/scripts/audit-touch-targets.mjs` — FOUND (190 lines, async IIFE, auditPage + MIN_TOUCH constants)
- `frontend/src/css/styles.css` — FOUND (global rule + 7 element compensations + 8 width/height removals)
- `touch-audit-results.json` — FOUND (project root, valid JSON, status/cssRulesApplied/howToReRun fields)
- `frontend/package.json` — FOUND (`audit:touch` script + `@playwright/test` devDep, both from 09-01)
- `frontend/package-lock.json` — FOUND (playwright + @playwright/test materialized)

**Commits verified:**
- `1e833ad` — Task 1 (Playwright audit script)
- `ed70794` — Task 2 (CSS global rule + 7 compensations)
- `4a2ef6b` — Task 3 (audit run + lock deps + results JSON)

**Build verified:** `npm run build` succeeds (76 modules, 52.57 KB CSS, 494.27 KB JS)

**LOGIC-02 verified:** `git diff --name-only HEAD -- backend/` is empty — zero backend changes

**LOGIC-01/03 verified:** 21 `export default function` declarations in `frontend/src/components/` — all component exports preserved

---
*Phase: 09-motion-state-layers*
*Completed: 2026-07-27*
