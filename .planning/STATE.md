---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Bugfix + UI Refinements
status: planning
last_updated: "2026-07-29T07:41:36.360Z"
last_activity: 2026-07-29 — Milestone v1.3 roadmap created
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-24)

**Core value:** 让家庭成员和访客都能简单、愉快地参与到家庭用餐的菜品选择与准备
**Current focus:** Phase 14 — UI Bugfix & Filter Popup

## Branch State

| 分支 | 指向 | 说明 |
|------|------|------|
| `main` | `14ed5fd` (v1.1) | v1.2 已撤销，回退到 v1.1（含完整 wishlist） |
| `dev` | `14ed5fd` (v1.1) | 与 main 同步 |
| `feature/ui-rebuild` | `7419be0` | Phase 8-9 成果（MD3 令牌 + 动效/state-layer），v1.2 后续开发基分支 |
| Tags | v1.0, v1.1 | v1.2 tag/release 已删除 |

⚠️ **Phase 10-12 必须基于 `feature/ui-rebuild` 开发**——main/dev 上没有 MD3 令牌基础。

## Current Position

Phase: 14 — UI Bugfix & Filter Popup
Plan: —
Status: Roadmap defined, awaiting phase planning
Last activity: 2026-07-29 — Milestone v1.3 roadmap created

## Session Continuity

Last session: 2026-07-29T07:41:36.349Z
Stopped at: Phase 14 context gathered
Next: 12-02 (旧类残留审计 + Playwright compliance 脚本 + HUMAN-UAT 6 流)

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
| debug | wish-deeplink-false-missing-toast | Acknowledged at v1.2 close | 2026-07-29 |
| quick_task | 260727-i2g-sync-dev-with-main-split-wishlist-commit | Acknowledged at v1.2 close | 2026-07-29 |
| quick_task | 260727-ig2-v1-2-feature-ui-rebuild | Acknowledged at v1.2 close | 2026-07-29 |
| uat_gap | Phase 12 0-pending UAT | Acknowledged at v1.2 close | 2026-07-29 |
| defect | md-bottom-bar 宽度空袭（部分分辨率左右空隙） | Deferred to next milestone | 2026-07-29 |
| defect | 表格表头与内容错位（th 缺 ::before 占位） | Deferred to next milestone | 2026-07-29 |
| defect | 移动端愿望单卡片单列全宽统一高度 | Deferred to next milestone | 2026-07-29 |

## Quick Tasks Completed

| # | Description | Date | Directory |
|---|-------------|------|-----------|
| 260727-i2g | sync dev/main, split wishlist→v1.1 + UI-rebuild→v1.2, release | 2026-07-27 | [260727-i2g-sync-dev-with-main-split-wishlist-commit](./quick/260727-i2g-sync-dev-with-main-split-wishlist-commit/) |
| 260727-ig2 | 撤销 v1.2 发布，重建 feature/ui-rebuild 分支 | 2026-07-27 | [260727-ig2-v1-2-feature-ui-rebuild](./quick/260727-ig2-v1-2-feature-ui-rebuild/) |

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

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
