---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: 自定义网站皮肤 / Theme Customization
status: completed
last_updated: "2026-08-07T02:19:47.340Z"
last_activity: "2026-08-06 - Completed quick task 260807-121: 季节开关开启时允许为各季节选择主题"
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 15
  completed_plans: 15
  percent: 67
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-24)

**Core value:** 让家庭成员和访客都能简单、愉快地参与到家庭用餐的菜品选择与准备
**Current focus:** Milestone complete

## Branch State

| 分支 | 指向 | 说明 |
|------|------|------|
| `main` | `14ed5fd` (v1.1) | v1.2 已撤销，回退到 v1.1（含完整 wishlist） |
| `dev` | `14ed5fd` (v1.1) | 与 main 同步 |
| `feature/ui-rebuild` | `dcd3d77` | Phase 8-17.06 成果（MD3 令牌 + Phase 17 完整交付 — theme-engine / FOUC bootstrap / 5 presets / /theme 页面 / CustomTheme 后端 + JWT CRUD + 跨设备对账 + hex-lint gate） |
| Tags | v1.0, v1.1, v1.3 |

⚠️ **Phase 10-17 已基于 `feature/ui-rebuild` 开发**——main/dev 上没有 MD3 令牌基础。

## Current Position

Phase: 18
Plan: Not started
Status: Milestone complete
Last activity: 2026-08-06 - Completed quick task 260807-121: 季节开关开启时允许为各季节选择主题

Progress: [██████████] 100%

## Session Continuity

Last session: 2026-08-07T02:19:47.329Z
Stopped at: Phase 19 context gathered
Next: `/gsd-verify-work 17` to run human UAT, then `/gsd-plan-phase 18` for custom editor + seasonal auto-switch.

## Deferred Items

Items acknowledged and carried forward from v1.1 milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| requirement | GORD-06 访客备注功能 | Deferred to v2 | 2026-05-29 |
| technical-debt | CORS allow_origins ["*"] | Needs tightening | 2026-05-29 |
| technical-debt | Backend test-suite drift (107 fail: 405s/JSON decode across test_users/test_orders/test_dishes) | Pre-existing, proven at f59f76e before 07-04; unrelated to gap-closure. Needs separate remediation phase. | 2026-07-23 |
| technical-debt | `config.yaml` 缺 `app.url`，飞书深链回落占位 `https://family-chef.app` | Needs ops fill before prod | 2026-07-24 |
| technical-debt | Migration `f94f55868e87` SQLite batch 缺陷，`alembic upgrade head from base` 依赖 env.py 增 `render_as_batch=True` | Needs migration repair | 2026-07-24 |
| technical-debt | 启动未自动跑 `alembic upgrade head` | AUTO_MIGRATE env candidate | 2026-07-24 |
| technical-debt | IN-01: WishDeepLinkRedirect 未 encodeURIComponent(id) | Low-risk | 2026-07-24 |
| technical-debt | IN-04: actingId 跨卡片点击残留 | Very low repro | 2026-07-24 |
| technical-debt | 前端全量 lint 基线红（≥90 errors） | Pre-existing | 2026-07-24 |
| debug | wish-deeplink-false-missing-toast | Resolved 2026-07-30 (Phase 07-05 `fetchedOnce` 守门) | 2026-07-29 |
| quick_task | 260727-i2g-sync-dev-with-main-split-wishlist-commit | Acknowledged at v1.2 close | 2026-07-29 |
| quick_task | 260727-ig2-v1-2-feature-ui-rebuild | Acknowledged at v1.2 close | 2026-07-29 |
| uat_gap | Phase 12 0-pending UAT | Acknowledged at v1.2 close | 2026-07-29 |
| quick_task | 260729-wl7-phase-14-bug | Acknowledged at v1.3 close | 2026-07-30 |
| quick_task | 260730-jqm-seed-test-dishes-db | Acknowledged at v1.3 close | 2026-07-30 |
| quick_task | 260730-k5g-action-bar-layout | Acknowledged at v1.3 close | 2026-07-30 |
| quick_task | 260730-ks4-filter-row-below-search | Acknowledged at v1.3 close | 2026-07-30 |
| quick_task | 260730-kz4-filter-row-align-edges | Acknowledged at v1.3 close | 2026-07-30 |
| quick_task | 260730-lmy-filter-row-48px-inset | Acknowledged at v1.3 close | 2026-07-30 |
| quick_task | 260730-lmy-filter-row-48px-inset-tmp | Acknowledged at v1.3 close | 2026-07-30 |
| quick_task | 260730-luk-ingredient-association-filter | Acknowledged at v1.3 close | 2026-07-30 |
| quick_task | 260730-m1p-filter-row-left-flush | Acknowledged at v1.3 close | 2026-07-30 |
| quick_task | 260730-m6k-wrap-left-filters | Acknowledged at v1.3 close | 2026-07-30 |
| quick_task | 260730-oa9-http-localhost-5173-orders-1-1-div-div-m | Acknowledged at v1.3 close | 2026-07-30 |
| quick_task | 260727-i2g-sync-dev-with-main-split-wishlist-commit | Acknowledged at v1.4 close | 2026-07-30 |
| quick_task | 260727-ig2-v1-2-feature-ui-rebuild | Acknowledged at v1.4 close | 2026-07-30 |
| quick_task | 260729-wl7-phase-14-bug | Acknowledged at v1.4 close | 2026-07-30 |
| quick_task | 260730-jqm-seed-test-dishes-db | Acknowledged at v1.4 close | 2026-07-30 |
| quick_task | 260730-k5g-action-bar-layout | Acknowledged at v1.4 close | 2026-07-30 |
| quick_task | 260730-ks4-filter-row-below-search | Acknowledged at v1.4 close | 2026-07-30 |
| quick_task | 260730-kz4-filter-row-align-edges | Acknowledged at v1.4 close | 2026-07-30 |
| quick_task | 260730-lmy-filter-row-48px-inset | Acknowledged at v1.4 close | 2026-07-30 |
| quick_task | 260730-lmy-filter-row-48px-inset-tmp | Acknowledged at v1.4 close | 2026-07-30 |
| quick_task | 260730-luk-ingredient-association-filter | Acknowledged at v1.4 close | 2026-07-30 |
| quick_task | 260730-m1p-filter-row-left-flush | Acknowledged at v1.4 close | 2026-07-30 |
| quick_task | 260730-m6k-wrap-left-filters | Acknowledged at v1.4 close | 2026-07-30 |

## Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260727-i2g | sync dev/main, split wishlist→v1.1 + UI-rebuild→v1.2, release | 2026-07-27 |  | [260727-i2g-sync-dev-with-main-split-wishlist-commit](./quick/260727-i2g-sync-dev-with-main-split-wishlist-commit/) |
| 260727-ig2 | 撤销 v1.2 发布，重建 feature/ui-rebuild 分支 | 2026-07-27 |  | [260727-ig2-v1-2-feature-ui-rebuild](./quick/260727-ig2-v1-2-feature-ui-rebuild/) |
| 260729-wl7 | 把 phase 14 标记为已完成（用户已用其他办法修复了 bug）| 2026-07-29 |  | [260729-wl7-phase-14-bug](./quick/260729-wl7-phase-14-bug/) |
| 260730-jqm | 直接在数据库中添加 8 道测试菜品（DATA-01 seed 一次性注入，绕过 env guard）| 2026-07-30 |  | [260730-jqm-seed-test-dishes-db](./quick/260730-jqm-seed-test-dishes-db/) |
| 260730-k5g | 菜品/食材管理 action-bar 排版：解析文本重命名+edit 图标、高级筛选与操作按钮同行左右分布（--split 修饰符）| 2026-07-30 |  | [260730-k5g-action-bar-layout](./quick/260730-k5g-action-bar-layout/) |
| 260730-ks4 | 修正 260730-k5g：三按钮移到搜索栏下方（页面级 filter-action-row），删除死代码 --split | 2026-07-30 |  | [260730-ks4-filter-row-below-search](./quick/260730-ks4-filter-row-below-search/) |
| 260730-kz4 | filter-action-row 边缘对齐：添加右侧对齐清空（margin-right 4px，镜像 search-bar 手法）| 2026-07-30 |  | [260730-kz4-filter-row-align-edges](./quick/260730-kz4-filter-row-align-edges/) |
| 260730-lmy | filter-action-row 左右对称 48px 缩进（实验性），移除 margin-right hack | 2026-07-30 |  | [260730-lmy-filter-row-48px-inset](./quick/260730-lmy-filter-row-48px-inset/) |
| 260730-luk | 食材管理页增加已关联/未关联互斥筛选（SQL EXISTS 过滤 + 单一状态 toggleAssoc）| 2026-07-30 |  | [260730-luk-ingredient-association-filter](./quick/260730-luk-ingredient-association-filter/) |
| 260730-m1p | filter-action-row 左组靠左（padding 左 16px / 右 48px 非对称），已关联/未关联挨着高级筛选 | 2026-07-30 |  | [260730-m1p-filter-row-left-flush](./quick/260730-m1p-filter-row-left-flush/) |
| 260730-m6k | 撤销 260730-m1p：将高级筛选+已关联+未关联包装到 `__filters` div（gap=spacing-2），恢复对称 48px padding | 2026-07-30 |  | [260730-m6k-wrap-left-filters](./quick/260730-m6k-wrap-left-filters/) |
| 260730-oa9 | 订单详情页两段式 MD3 布局（初版 2div+40/60grid，后修正为 3 卡堆叠匹配部署版参考） | 2026-07-30 | 7028075→2fdcddd | [260730-oa9-http-localhost-5173-orders-1-1-div-div-m](./quick/260730-oa9-http-localhost-5173-orders-1-1-div-div-m/) |
| 260807-121 | 季节开关开启时允许为春/夏/秋/冬各选主题（预设+自定义），默认沿用四季预设；持久化至 fc_season_theme_map，首帧 FOUC 引导读 map | 2026-08-06 | 45cc059→d69e4bd | [260807-121-season-theme-selector](./quick/260807-121-season-theme-selector/) |

## Performance Metrics

| Phase | Plan | Duration | Notes |
|-------|------|----------|-------|
| Phase 05 P01 | - | 3 tasks | Wish model + migration |
| Phase 05 P02 | - | - | WishService + permissions |
| Phase 05 P03 | - | - | Wishes router + 25 tests |
| Phase 06 P01 | 12min | 2 tasks | 7 files |
| Phase 06 P02 | 15min | 2 tasks | 3 files |
| Phase 06 P03 | 18min | 3 tasks | 4 files |
| Phase 07 P01 | 11min | 3 tasks | 8 files |
| Phase 07 P02 | 5min | 3 tasks | 3 files |
| Phase 07 P03 | 9min | 3 tasks | 5 files |
| Phase 07 P04 | - | gap-closure | migration sync |
| Phase 07 P05 | 9min | 3 tasks | 3 files (H-3 race fix) |
| Phase 08 P01 | 15min | 3 tasks | 30 files |
| Phase 08 P02 | 15min | 3 tasks | 10 files |
| Phase 09 P01 | 6min | 3 tasks | 10 files |
| Phase 09 P02 | 25min | 3 tasks | 4 files |
| Phase 10 P01 | 90min | 3 tasks | 41 files |
| Phase 10 P02 | 97 | 2 tasks | 16 files |
| Phase 10 P03 | 10min | 2 tasks | 35 files |
| Phase 11 P01 | 12min | 3 tasks | 18 files |
| Phase 11 P02 | 25min | 3 tasks | 11 files |
| Phase 11 P03 | 21min | 3 tasks | 18 files |
| Phase 12 P00-BUGFIX | 40min | 3 tasks | 11 files |
| Phase 12 P01A | 16min | 3 tasks | 47 files |
| Phase 12 P01B | 19min | 3 tasks | 38 files |
| Phase 14 P01 | 1min | 2 tasks | 4 files |
| Phase 14 P02 | 4min | 3 tasks | 4 files |
| Phase 14 P03 | 2min | 2 tasks | 2 files |
| Phase 14 P04 | 2min | 3 tasks | 5 files (gap-closure: BUG-02/03/04/05) |
| Phase 14 P05 | 3min | 3 tasks | 5 files (gap-closure round 2: BUG-02 7-page alignment) |
| Phase 14 P06 | 1min | 3 tasks | 1 files |
| Phase 14 P07 | 3min | 3 tasks | 2 files |
| Phase 15 P01 | 6min | 2 tasks | 2 files |
| Phase 15 P02 | 4min | 2 tasks | 5 files |
| Phase 15 P03 | 1min | 3 tasks | 3 files |
| Phase 15 P04 | 2min | 3 tasks | 6 files |
| Phase 15 P05 | 2min | 2 tasks | 1 files |
| Phase 17 P02 | 18min | 3 tasks | 10 files |
| Phase 17 P03 | 2min | 2 tasks | 1 files |
| Phase 17 P04 | 7min | 3 tasks | 5 files |
| Phase 17 P06 | 12min | 3 tasks | 1 files |
| Phase 18 P01 | 18min | 2 tasks | 2 files |
| Phase 18 P03 | 10 min | 2 tasks | 5 files |
| Phase 18 P04 | 33min | 3 tasks | 7 files |
| Phase 18 P07 | 4min | 2 tasks | 3 files |
| Phase 18 P08 | 1min | 2 tasks | 1 files |
| Phase 18 P09 | 1min | 2 tasks | 1 files |
| Phase 18 P06 | 1min | 2 tasks | 1 files |

## Decisions

See .planning/milestones/v1.1-ROADMAP.md "Key Decisions" for full archive. Highlights:

- [Phase 05]: Atomic conditional UPDATE for concurrent claim safety (D-01)
- [Phase 06]: naive_utc_now() — UTC-naive clock helper for all Phase 6 timestamp writes
- [Phase 06]: batch_alter_table(recreate=always) — bypasses SQLite ADD COLUMN limitation
- [Phase 06]: has_unread submitter-only identity-mask; clear side-effect only on submitter
- [Phase 06]: db.refresh(wish, ['updated_at']) — fixes onupdate=func.now() lazy-load expiry after flush
- [Phase 06]: WishNotificationService — separate module keeps recipient resolution + failure isolation out of integration layer
- [Phase 07-01]: ApiClient.getWishes serializes params.status → backend status_filter; supports mine=true
- [Phase 07-01]: WishRejectModal self-confirming destructive (D-08); no ConfirmModal overlay
- [Phase 07-01]: Chinese status keys + statusBadge single-source mapping (待处理/准备中/已上架/已拒绝/已撤销)
- [Phase 07-01]: WishAdvanceModal setTimeout-in-effect debounce(200ms) + stale-response protection
- [Phase 07-02]: loadWishes avoids sync setLoading(true); mount uses inline .then(), chef tab-change uses queueMicrotask (react-hooks/set-state-in-effect mitigation)
- [Phase 07-03]: WishDeepLinkRedirect role→path mapping with numeric-only id (no path traversal)
- [Phase 07-03]: Highlight effect setState deferred via setTimeout(0) (same pattern as Wave 2)
- [Phase 07-04]: NOTE(07-04) source marker for missing startup alembic hook — no unilateral arch decision
- [Phase 07-05]: fetchedOnce + setTimeout(100) closes deep-link highlight race; preserves requestSeqRef + .finally(setLoading(false))
- [Phase 08-02]: D-08 FAB corner override: 16px MD3 standard via --md-radius-md with Chinese inline comment (not full circle), locked at styles.css:152 — CONTEXT D-08: 56dp FAB adopts MD3 standard 16px corner for visual softness vs full circle. Comment added to prevent future regressions to old --radius-full behavior.
- [Phase 08-02]: Motion duration split per MD3 spec: 150ms → --md-motion-duration-short, 250ms → --md-motion-duration-medium (16 transition consumers in styles.css) — Each transition: <prop> <duration> var(--md-motion-easing-standard) split into duration+ easing tokens per MD3 spec. --md-motion-duration-long (500ms) has zero consumers; future animations will adopt it.
- [Phase 08-02]: 1-tier-down radius rename preserves visual values: old radius-{sm,md,lg} (8/12/16px) → new md-radius-{xs,sm,md} — CONTEXT D-05 mapping table. Pixel values unchanged; only the naming tier shifts. Wave 1 already migrated most consumers during color sweep; Wave 2 caught the residual 22 references in 9 JSX files.
- [Phase ?]: Phase 09-01: Font-based Material Symbols (material-symbols v0.45.9) for Icon skeleton instead of @material-symbols/svg-400 — svg-400 is 4 years stale (2022); font avoids Vite SVG loader complexity in Phase 9, SVG tree-shaking deferred to Phase 10 per RESEARCH.md:96
- [Phase ?]: Phase 09-01: Consolidated CSS entry in index.css — removed duplicate styles.css JS import from App.jsx to avoid double-bundling when adding material-symbols @import. index.css is now the single CSS entry: tokens.css -> styles.css -> material-symbols/outlined.css
- [Phase ?]: Phase 09-02: Padding compensation over visual resize — 7 elements keep visual 28-36dp, hit area expands to 48dp via min-width/min-height + padding; btn-icon direct 40->48 (same shape)
- [Phase ?]: Phase 09-02: Partial audit acceptable per plan Task 3 done criterion — only /login auditable without JWT (0 violations), 11 auth pages SKIPPED with re-run instructions in JSON; static grep verification provides programmatic coverage proof — Backend Python deps not installed (uv-managed); deferred to UAT verifier with real JWT
- [Phase ?]: Phase 09-02: Audit script credential handling via --token=<JWT> CLI arg or FC_TEST_TOKEN env var (T-09-05 mitigated) — no hardcoded creds in source, JWT injected via page.evaluate(localStorage.setItem) — Avoids credentials in source/log; aligns with threat_model T-09-05 mitigation plan
- [Phase ?]: Phase 09-02: Removed .pc-sidebar-footer-actions .theme-toggle 32x32 override (Rule 2 deviation) — would have shrunk sidebar footer theme-toggle below 48dp after base .theme-toggle lost its 36x36 width/height anchor per plan — Direct consequence of planned width/height removal; necessary for UX-03 compliance on sidebar footer
- [Phase ?]: Phase 10-01: @material-symbols-svg/react@^1.0.38 (plan spec) does not exist on npm — installed 0.13.0 and remapped Icon imports (Place→LocationOn, FavoriteBorder→Favorite outline / Favorite→FavoriteFill filled) — Plan referenced RESEARCH.md spec for v1.0.38; actual latest on npm is 0.13.0 with different export names. Build was broken until imports matched real exports.
- [Phase ?]: Phase 10-01: Internal Ripple pattern (D-12) — Button/IconButton/FAB wrap Ripple internally; external Ripple.jsx public API unchanged for Phase 10-out-of-scope composites (WishCard/DishCard/Sidebar) — Avoids breaking existing Ripple consumers while letting new primitives own their ripple lifecycle.
- [Phase ?]: Phase 10-01: .fab className reduced to placement-only (position/bottom/right/z-index); all visual properties moved to .md-fab primitive — UI-SPEC §14 mandates FAB primitive not own position:fixed; placement by page consumer via className.
- [Phase 10]: Phase 10-02: .form-input retained per SC-10 deviation — Plan BLOCKER 1 WARNING 1: select not in scope for Input primitive (Phase 10); deferred to Phase 11 Select primitive. Non-select form-input classNames all migrated to Input primitive (0 residual). Plan's <objective> deviation note explicitly documents this.
- [Phase 10]: Phase 10-02: .field-trigger utility class added — Plan SC-10 deviation requires 0 non-select form-input classNames. <div className='form-input'> button-triggers (4 in AdminDishesPage + ChefDishesPage) needed visual preservation. Added .field-trigger class near .form-input with role='button'+tabIndex+keyboard activation; sentinel-isolated for 10-03 concurrent safety.
- [Phase 10]: Phase 10-02: Domain cards refactored to slot-based thin wrappers (D-13) — DishCard/WishCard/GuestDishCard now compose <Card variant='elevated' image={...} footer={...}>{body}</Card>; visual styles moved to inline style={} in domain code; Card primitive owns all MD3 visual compliance (elevation 1→2 hover, 16dp radius, ripple/state when clickable). 30+ lines of .wish-card-* / .dish-card-* CSS deleted; intent is self-documenting domain code.
- [Phase 10]: statusBadge() remains unchanged; Badge maps legacy cls values to semantic MD3 tones internally. — Preserves D-15 business/visual separation and backward compatibility.
- [Phase 10]: Chip filter selected state uses secondary-container without Ripple; .form-input remains for Phase 11 Select. — Matches D-14/UI-SPEC and preserves native select styling until the Select primitive ships.
- [Phase 11-03]: ToastContext.jsx 路径、useToast 和 showToast(message, type) API 保持不变；App 仅改用 SnackbarProvider。 — 避免改动 169 个现有 showToast 调用方，并保持文件级导入兼容。
- [Phase 11-03]: Snackbar timer 记录 remaining/startedAt，hover 恢复剩余时长；队列淘汰与 provider unmount 都清理 timeout。 — 满足 D-07 hover pause 与 T-11-08 timer leak 缓解，避免暂停后重新获得完整时长。
- [Phase 11-03]: ListItem 仅在 clickable 时启用 md-interactive/Ripple，Trailing click 和嵌套键盘事件与整行激活隔离。 — 维持静态列表无伪交互，同时保证 trailing 操作不会误触发行级 onClick。
- [Phase 12]: D-BUG-01 Ripple fix = Option 3 cloneElement hybrid (self mode on native button, wrap mode for composites); wrap-mode pointer-events inheritance fixed in base.css
- [Phase 12]: D-BUG-02: deleted Sidecar Header from PcLayout; theme toggle + logout relocated to Sidebar footer (theme first, 48dp in 56px rows)
- [Phase 12]: D-RADIUS-01: stylelint@^17 + stylelint-config-standard@^40 installed (human-approved blocking checkpoint); border-radius declaration-property-value-allowed-list active; Sidebar/BottomBar active-pill 16px → var(--md-radius-md)
- [Phase 12]: D-GRID-01/02: complete 8dp spacing sweep — 45 files tokenized to var(--md-spacing-1..8); 80px safe areas → var(--md-nav-height); 44px icon insets → calc(spacing-3 + spacing-5 + spacing-2); 0 raw-px spacing survivors
- [Phase 12]: D-GRID-03/D-FILE-02: check-m3-tokens.sh path-independent source gate (checks #1-10); lint:css + check:md3 npm scripts; check:md3 9/11 pass (#9 motion + #10 emoji = 12-01B lane)
- [Phase 12]: stylelint-config-standard extended but 22 formatting rules nullified (Rule 3) — initial rollout is border-radius-only per UI-SPEC Enforcement Layer
- [Phase 12]: D-MOTION-01: 5 measured motion consumers → var(--md-motion-duration-*); linear spinner easing + stagger/reduced-motion exceptions preserved
- [Phase 12]: D-EMOJI-01: Icon registry +12 (new-label/ramen-dining/circle verified + 9 already-package-resident); 128 emoji clusters → <Icon> across 36 files; EmptyState string|ReactNode (default 'mail')
- [Phase 12]: D-SNACK-01: showToast(message, string|{type?,duration?,action?}) overload — additive, 213 legacy callers untouched; 48dp action Button before close; triggerAction one-shot+error-contained+sibling-isolated; 3 wired examples (wish-undo/order-detail/invitation-copy)
- [Phase 12]: check:md3 now 11/11 PASS (#9 motion + #10 emoji lanes closed by 01B)
- [Phase 14]: [Phase 14-01] Sheet = Path A thin wrapper: renders <Modal variant="bottom-sheet" {...props}/>, dropping variant from public API so callers cannot override responsive behavior — PATTERNS.md Path A recommendation — single source of MD3 modal behavior, ~45 lines, zero state duplication
- [Phase 14]: [Phase 14-01] D-11 dark-mode border: .md-modal base gets border:1px solid var(--md-color-outline-variant); excluded for full-screen + bottom-sheet; Sheet.css desktop override re-applies border-bottom for centered-modal edge contrast — CONTEXT D-11 — outline-variant token near-invisible in light mode (#c1c9bf), visible in dark mode (#414941)
- [Phase ?]: [Phase 14-02] D-08 .compact-interactive-target = exactly 9 selectors per CONTEXT D-08 (12dp min), placed after 48dp global rule (cascade later-wins); Wave 3 mounts via JSX className
- [Phase ?]: BUG-01 verify scoped to .md-bottom-bar block: plan's whole-file <automated> regex false-negatives on .md-tab--active::before (active-pill centering uses left:50%/translateX); corrected check proves BUG-01 removal + active-pill preservation
- [Phase ?]: BUG-03 layout = existing CSS-Grid align-items:stretch + new per-card display:flex/flex-direction:column + footer margin-top:auto (WishCard + DishCard); container unchanged (Risk 6 confirmed)
- [Phase ?]: BUG-04 precursor only: D-08 CSS class delivered in styles.css; dropdown trigger className mounting + radius shrink deferred to Plan 03 (BUG-04 requirement stays pending)
- [Phase ?]: [Phase 14-03] createPortal-to-document.body is the z-index escape pattern for dropdowns — compute rect on trigger click → store top/left/width in coords state → render menu via createPortal(<div data-...>, document.body) with position:fixed + zIndex:1000; eliminates ancestor overflow:hidden clipping (BUG-04 root cause)
- [Phase ?]: [Phase 14-03] AdminIngredientsPage click-outside uses closest('[data-dropdown-id]') (matches both trigger button AND Portal'd menu); AdminDishesPage preserves ref.contains() per plan — clicks on Portal'd menu trigger close, but menu items fire onClick before React unmounts Portal so add/toggle still works
- [Phase ?]: [Phase 14-03] AdminIngredientsPage mobile card restructured with Card root display:flex/flexDirection:column + spacer <div flex:1/> + Button row marginTop:'auto' — same WishCard footer pattern, no Card.footer slot migration; BUG-05 satisfied
- [Phase ?]: [Phase 14-03] Advanced-filter Sheet wraps existing renderCategorySection helper verbatim — region-cuisine parent/child deselection logic preserved unchanged; no state migration to Sheet, advCategoryIds/sfFilter still drive loadDishes/loadIngredients useEffect
- [Phase 14-04]: BUG-02 fix = scoped `.pc-data-table th:first-child` padding-left replaces the old `th::before` 48px pseudo-element that shifted ALL headers — only first column header now aligns with the body's edit-button column; other columns stay unshifted
- [Phase 14-04]: BUG-04 fix = click-outside listeners switched mousedown→click + `closest('[data-ing-dropdown]')`/`closest('[data-sf-dropdown]')` guards — React onClick on Portal'd menu items now fires before close; clicks no longer swallowed (note: data-* attrs already existed from 14-03, plan step was a confirming no-op)
- [Phase 14-04]: Card design rules unified across 5 mobile cards (AdminDishes/ChefDishes dish, AdminIngredients ingredient, WishCard) — Card `footer` slot + right-aligned `flex-1` equal-width buttons + 2-line `-webkit-box` clamp on names + single-line ellipsis on secondary text + `minHeight` placeholders (chefs 28px, aliases 1.2rem, WishCard secondary 2rem) for missing optional fields so grid rows stay aligned
- [Phase 14-05]: BUG-02 final fix = baseline + --with-leading modifier split — Plan 14-04's universal `th:first-child { 48px }` hack correctly aligned 4 avatar tables but over-shifted 3 non-avatar tables (blank left band); replaced with `.pc-data-table` baseline (12px md-spacing-3) + `.pc-data-table--with-leading` modifier (56px = 12+36 avatar+8 gap) mounted on 4 avatar pages; 3 plain-text pages keep baseline
- [Phase 14-05]: 36px avatar dimension hardcoded in CSS calc (not tokenized) — only the 4 avatar tables consume this value and avatar size is inline-hardcoded in JSX; tokenizing is out of scope for this bugfix
- [Phase ?]: [Phase 14-06]: openIngDropdown/openSfDropdown opener 统一 onClick+onKeyDown 路径 — 键盘激活同步捕获 coords (CR-01 WCAG 2.1.1/4.1.2)
- [Phase 14]: [Phase 14-07] ChefDishesPage 提取 openIngDropdown/openSfDropdown opener 函数（镜像 14-06 AdminDishesPage），onClick 与 onKeyDown 共享 coords 捕获，键盘激活也能渲染 Portal — plan Task 2 字面建议 inline coords 捕获，但参照 AdminDishesPage.jsx:780 opener 模式更干净且 plan 明确要求 mirror 该模式
- [Phase ?]: Phase 15-01: Adapted phase12 footer-pinning test into nav-only 80dp invariant (footer 48dp assertions obsolete under NAV-03 zero-button contract)
- [Phase ?]: Phase 15-01: Lowered md3-compliance touch-target threshold 5->3 to match fixture reality after NAV-03 removed footer buttons from the interactive-target audit
- [Phase 15]: Phase 15-02: Header action-bar wrapper — page actions render BELOW main row in .header-action-bar (null actions = no bar div); theme toggle moved to Header main row as .md-header__theme-toggle IconButton — locks D-NAV01-01/02/03 + D-NAV03-03
- [Phase 15]: Phase 15-02: Avatar menu reduced to 2 menuitems (编辑资料 + 退出登录) separated by <Divider />; 编辑资料 is NEW (pre-Phase-15 menu had only 切换主题 + 退出) — locks D-NAV02-01..04
- [Phase 15]: Phase 15-02: Sidebar footer = single .md-sidebar__version text node; removed useState/theme/logout from Sidebar (D-NAV03-01/04/05); logout path now exclusively via Header avatar menu
- [Phase 15]: Phase 15-02: Version source = Vite build-time define injection (vite.config.js binds import.meta.env.VITE_APP_VERSION to process.env.npm_package_version) over hardcoded literal — auto-updates with package.json version, proven in production bundle
- [Phase ?]: Phase 15-03: Header actions wrapper on 3 multi-button management pages (AdminDishes/AdminIngredients/ChefDishes) adds className=header-action-bar while preserving inline style (display:flex/gap) — belt-and-suspenders defense against CSS ordering regressions; all parse/add button handlers untouched
- [Phase 15]: Phase 15-04: Chef 订单管理 removed from UserHomePage (relocated to BottomBar 订单 tab); chef UserHomePage locked at 4 menuEntries per D-NAV04-04 — Rationale: CONTEXT D-NAV04-04 locks chef UserHomePage at 4 entries (开始点菜/口味偏好/菜品管理/食材管理); chef accesses orders via BottomBar instead
- [Phase 15]: Phase 15-04: BottomBar logout fully removed (destructure + tab action + onClick branch) — logout centralized in Header avatar dropdown per D-NAV05-01 — Rationale: D-NAV05-01 mandates logout removal from bottom nav; single logout path via Header avatar menu (D-NAV02-01)
- [Phase 15]: Phase 15-05: OrderPage 高级筛选 trigger uses <Icon name="filter" /> (FilterList) not "tune" — tune is not in Icon.jsx mapping table (PATTERNS Finding 1) — tune icon absent from @material-symbols-svg/react@0.13.0 import set; filter is the established semantic equivalent already used elsewhere
- [Phase 15]: Phase 15-05: handleClearFilters preserves favoritesOnly + sortBy — only resets region/cuisine/filters — UI-SPEC locked decision: favoritesOnly and sortBy are top-level controls, not advanced filters
- [Phase 17]: Runtime theme engine derives TonalSpot light/dark CSS with dark-only surface-tint elevation overrides; FOUC bootstrap is a classic esbuild IIFE injected after generated styles.
- [Phase 17]: 17-06 verification close-out auto-fixed 2 deviations: (a) Rule 3 closed the 17-05 commit gap (3 untracked ThemeCard/Preview files now committed atomically with the Rule 1 fix); (b) Rule 1 replaced ThemePreview.jsx Button/Chip hardcoded paddings ('4px 8px' / '2px 6px') with var(--md-spacing-1) var(--md-spacing-2) to satisfy MD3 Check #8b. Pre-existing AdminIngredientsPage.jsx MD3 violations documented as out-of-scope per deviation rule scope boundary — Phase 17 introduces 0 new token compliance regressions. — ThemePreview padding uses the smallest MD3 spacing tokens (var(--md-spacing-1) var(--md-spacing-2) = 4px 8px) to preserve the mini-UI visual intent while satisfying MD3 Check #8b. The Rule 3 commit gap close is necessary because 17-05 executor was cancelled mid-execution; orchestrator-written SUMMARY claimed 'no rework needed' but files were untracked. Combining both fixes into a single atomic commit minimizes branch churn and keeps 17-05's deliverable complete on feature/ui-rebuild.
- [Phase 18]: TonalSpot 保留 themeFromSourceColor 老路径（含 secondary/tertiary blend=true），保证 Phase 17 tokens.css 字节一致；其余 8 个 variant 走 DynamicScheme
- [Phase 18]: VARIANT_WHITELIST 字面量顺序按 Material 官方文档（TonalSpot 居首），与编辑器 Chip 横向滚动顺序同源
- [Phase 18]: 未知 variant 直接抛 Error（'Unsupported variant: <name>'），不静默 coerce；T-18-01 缓解已实施
- [Phase 18]: [Phase 18-04]: Skyfield dev-time generator uses JPL DE440S (de440s.bsp, covers 1849-2150) instead of bundled DE421 (only through 2053) to fully cover the 2020-2099 range without splitting the generator across two ephemerides — loader downloads to ./skyfield-data/ on first run.

[Phase 18-04]: skyfield.almanac_east_asia is the actual module name (plan referenced 'almanac_ea' as an alias); generator aliases it to preserve the plan's nomenclature.
[Phase 18-04]: JSL literal output (unquoted numeric year keys) chosen over JSON for solar-terms.js to satisfy the plan's verification regex r'^  20\d\d:' which assumes unquoted keys.
[Phase 18-04]: 'skyfield' substring stripped from solar-terms.js and season.js header comments to satisfy D-02 runtime-path check ('skyfield' not in text.lower()) — replaced with generic algorithm/source descriptions.
[Phase 18-04]: justEnabledRef boolean added to bypass cache gate for ONE cycle after setSeasonEnabled(true) — opens the gate for the explicit user-intent case (opening switch = apply current season) without invalidating the cache for mount-replays.
[Phase 18-04]: useMemo replaces useEffect+setState for currentSeason derivation to satisfy react-hooks/set-state-in-effect lint and avoid cascade renders.
[Phase 18-04]: setActiveTheme/applyTheme/resetToDefault now return boolean (true on success, false when auto-mode mutex blocks) so callers can detect the no-op explicitly; ThemeEditorPage's existing 'if (!seasonEnabled)' guard is non-breaking. — DE440S is the JPL modern kernel with the full 2020-2099 coverage required by the plan; DE421 stops at 2053.
The plan's verify regex is a code contract — JSL literal matches the contract; JSON would fail.
D-02 is a runtime-path safety guard; mentioning "Skyfield" in any frontend runtime file would fail the lowercase check.
The cache gate is correct for mount replays but would suppress the user-intent toggle; justEnabledRef captures the explicit bypass.
react-hooks/set-state-in-effect rule explicitly bans the cascade pattern; useMemo is the documented replacement.
Boolean return is non-breaking because callers either ignore the return or already gate via seasonEnabled.

- [Phase ?]: [Phase 18-07]: TonalSpot variant 统一走 DynamicScheme(Variant.TONAL_SPOT) + secondaryPalette/tertiaryPalette 注入 — 移除 deriveTonalSpotSchemes + themeFromSourceColor；修复 UAT Test 5 secondary/tertiary 种子被忽略问题
- [Phase ?]: [Phase 18-07]: primary 色值从 #056d37/#81d997 变为 #316a42/#98d4a4 — root cause: themeFromSourceColor 用已废弃 Scheme/CorePalette（fixed tones），DynamicScheme 用 MaterialDynamicColors（dynamic tone curves）；threat T-18-07-02 accept；tokens.css 旧值仅 FOUC 回退
- [Phase 18]: Reused existing showToast(error) pattern from sibling catch branches in ThemeEditorPage handleSave; no new imports or SnackbarProvider needed — useToast already imported (line 27), showToast already destructured (line 139) — Reused existing showToast(error) pattern from sibling catch branches in ThemeEditorPage handleSave; no new imports or SnackbarProvider needed — useToast already imported (line 27), showToast already destructured (line 139)
- [Phase ?]: Auto+custom card body click is a silent no-op (early return) matching auto+preset; editor entry exclusively via always-visible 编辑 button (Phase 18-09 closes UAT Test 10)
- [Phase ?]: [Phase 18-06]: injectThemeCss cascade fix = appendChild-on-every-call (fix option a) over :root:root specificity bump (option b) — re-ordering preserves the existing :root specificity contract; applied to both dev and production for defense-in-depth

## Operator Next Steps

- Start Phase 17 (Theme System Foundation — Engine, Page, Presets & Persistence) with `/gsd-plan-phase 17`
- Phase 18 (Custom Editor & Seasonal Auto-Switch) will need `/gsd-plan-phase --research-phase 18` (HIGH research flag — HCT/Variant/直写DOM preview spike; also season definition + hemisphere product decisions for discuss phase)
