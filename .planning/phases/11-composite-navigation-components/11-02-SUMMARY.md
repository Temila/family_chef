---
phase: 11-composite-navigation-components
plan: 02
subsystem: ui
tags: [navigation-rail, navigation-bar, top-app-bar, md3, react, composite, sidecar-header]

# Dependency graph
requires:
  - phase: 11-01
    provides: <Modal> composite + Modal.css 模式 + 7 wrappers 迁移（提供 co-located CSS 架构参考）
  - phase: 10-primitive-components
    provides: Icon (30-icon set) + Ripple + Badge + IconButton primitives 被 Sidebar/BottomBar/Header 消费
  - phase: 09-motion-state-layers
    provides: md-interactive state-layer + 48dp hit box + Ripple 反馈
  - phase: 08-md3-design-token-foundation
    provides: --md-nav-height / --md-color-primary-container / --md-color-secondary-container / --md-color-surface-container-* 令牌
provides:
  - 80dp MD3 Navigation Rail (Sidebar) — icon-only + 56×32 active indicator pill (primary-container)
  - 80dp MD3 Navigation Bar (BottomBar) — label 始终可见 + 64×32 active indicator pill (secondary-container)
  - Sidecar Header (3-列 Top App Bar) — logo + 品牌 + 副标题 / 页面标题 (useLocation) / 用户头像 + 下拉菜单
  - App.jsx PcLayout 3-段式布局: <Sidebar /> + <Header /> + <main>
  - --md-nav-height token 由 64px 提升至 80px (MD3 spec)
  - Icon primitive 扩展 8 个新导航图标 (dashboard/eco/folder/group/bar-chart/description/lightbulb/spa)
  - 全部旧 .pc-sidebar* / .bottom-bar / .tab-item* / .header* CSS 选择器从 styles.css 清除
affects: [11-03-listitem-divider, 12-page-level-refactor]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Composite + co-located CSS: composites/{Sidebar,BottomBar,Header}.{jsx,css} 模式（沿用 11-01 Modal 模式）"
    - "MD3 active indicator pill: ::before 伪元素 + 中心定位 + primary-container (Sidebar) / secondary-container (BottomBar)"
    - "PC-only display 通过 ::before @media (min-width:1024px) 控制；mobile 默认 display:none"
    - "Re-export shim: 旧 Sidebar.jsx / BottomBar.jsx / Header.jsx 保留作为 import 路径稳定层"
    - "useLocation-based page title: PAGE_TITLES map + caller title override"

key-files:
  created:
    - frontend/src/components/composites/Sidebar.jsx
    - frontend/src/components/composites/Sidebar.css
    - frontend/src/components/composites/BottomBar.jsx
    - frontend/src/components/composites/BottomBar.css
    - frontend/src/components/composites/Header.jsx
    - frontend/src/components/composites/Header.css
  modified:
    - frontend/src/components/Sidebar.jsx (re-export shim)
    - frontend/src/components/BottomBar.jsx (re-export shim)
    - frontend/src/components/Header.jsx (re-export shim)
    - frontend/src/App.jsx (PcLayout 插入 <Header />)
    - frontend/src/components/primitives/Icon.jsx (+8 navigation icons)
    - frontend/src/css/tokens.css (--md-nav-height 64px → 80px)
    - frontend/src/css/styles.css (legacy nav CSS 删除)

key-decisions:
  - "Sidebar 80dp width + active pill 56×32 primary-container (MD3 spec, 严格 80dp 不取 240px 中文折中)"
  - "BottomBar 80dp height + active pill 64×32 secondary-container (MD3 spec; 与 Sidebar primary-container 区分)"
  - "Header user menu 吸收 ThemeToggle — 不再单独渲染 ThemeToggle button (单一来源)"
  - "Logo 全部迁移至 Sidecar Header，Sidebar 顶部仅保留 Icon (28dp) 作为品牌指示"
  - "logout 按钮在 Sidebar 底部仍保留 (icon-only)；Header dropdown 也有 (冗余入口防丢失)"
  - "--md-nav-height 64px → 80px (一改全局，FAB/cart-bar/order-bar 相对位置同步调整)"
  - "Icon primitive 扩展 8 个导航图标 (属于 Phase 11 必要扩展范围内，未跨越 Phase 11 边界)"

patterns-established:
  - "MD3 Navigation Rail 80dp 模式 (Sidebar): display:none + @media (min-width:1024px) { display:flex }"
  - "MD3 Navigation Bar 80dp 模式 (BottomBar): fixed bottom + max-width capped + safe-area-inset-bottom"
  - "MD3 Top App Bar 模式 (Header): 3-column flex (logo/title/right) + backdrop-filter blur + 64dp height"
  - "Active indicator pill via ::before: 中心定位 + 16px border-radius + 颜色 transition"
  - "Ripple 外部包裹 + md-interactive 基类组合 (state-layer + 反馈动画完备)"

requirements-completed: [COMPO-09, LOGIC-01, LOGIC-02, LOGIC-03]

# Metrics
duration: 25min
completed: 2026-07-28
---

# Phase 11 Plan 02: Composite Navigation Components Summary

**MD3 Navigation Rail (80dp) + Navigation Bar (80dp with active pill) + Sidecar Header — App.jsx 装配 + 全部旧导航 CSS 清除**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-28T07:43:00Z
- **Completed:** 2026-07-28T08:08:00Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Sidebar 240px → 80dp 窄边栏（MD3 Navigation Rail spec），icon-only + 56×32 active indicator pill (primary-container)
- BottomBar 80dp with 64×32 active indicator pill (secondary-container) + label 始终可见 + safe-area-inset-bottom
- Sidecar Header 3-列式 Top App Bar：logo + 品牌 + 副标题 / 页面标题 (useLocation 推断) / 用户头像 + 下拉菜单（含 display_name + role + 主题切换 + 退出）
- App.jsx `PcLayout` 升级为 `<Sidebar /> + <Header /> + <main>` 三段式布局
- --md-nav-height token 由 64px 提升至 80px（MD3 Navigation Bar spec）
- Icon primitive 扩展 8 个新导航图标（dashboard/eco/folder/group/bar-chart/description/lightbulb/spa）
- 全部旧 .pc-sidebar* / .bottom-bar / .tab-item* / .header* CSS 选择器从 styles.css 清除（30 行减少）

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Sidebar 80dp + BottomBar MD3 composite components** - `ffa8a82` (feat)
2. **Task 2: Create Sidecar Header + App.jsx integration** - `6d25943` (feat)
3. **Task 3: Delete legacy navigation CSS from styles.css** - `9383440` (chore)

## Files Created/Modified

- `frontend/src/components/composites/Sidebar.jsx` — 100-line 80dp Navigation Rail with role-based navItems, Ripple wrappers, Icon primitives, Badge for order count
- `frontend/src/components/composites/Sidebar.css` — 80dp wide rail, active pill ::before (56×32 primary-container), token-only CSS, PC-only display
- `frontend/src/components/composites/BottomBar.jsx` — 80dp navigation bar with role-based tabs, active pill, labels visible, Ripple wrappers
- `frontend/src/components/composites/BottomBar.css` — 80dp height via --md-nav-height, active pill ::before (64×32 secondary-container), safe-area bottom padding
- `frontend/src/components/composites/Header.jsx` — 120-line Sidecar header with logo + brand + subtitle left, page title center via useLocation, avatar + dropdown right
- `frontend/src/components/composites/Header.css` — 64dp sticky top, 3-column flex, backdrop-filter blur, user menu dropdown, hidden <1024px
- `frontend/src/components/Sidebar.jsx` — Re-export shim (preserves existing import path)
- `frontend/src/components/BottomBar.jsx` — Re-export shim
- `frontend/src/components/Header.jsx` — Re-export shim
- `frontend/src/App.jsx` — PcLayout inserts `<Header />` between Sidebar and Outlet
- `frontend/src/components/primitives/Icon.jsx` — Added 8 navigation icons (Dashboard/Eco/Folder/Group/BarChart/Description/Lightbulb/Spa)
- `frontend/src/css/tokens.css` — --md-nav-height: 64px → 80px
- `frontend/src/css/styles.css` — Deleted all legacy .pc-sidebar* / .bottom-bar / .tab-item* / .header* CSS

## Decisions Made

- **80dp strict (no 240px compromise)**: User explicitly chose MD3 spec over Chinese-friendly 240px. User info / logo / logout icons reduced; logout text in Sidebar transformed to icon-only (text accessible via aria-label).
- **Active pill colors**: Sidebar = primary-container, BottomBar = secondary-container (different MD3 roles for different navigation types). Per agent's Discretion in CONTEXT.md.
- **ThemeToggle absorption**: Move ThemeToggle into Header dropdown menu — single source of truth for theme control. ThemeToggle component still exists but no longer rendered in Header (legacy pages still using it from composites/Header re-export).
- **--md-nav-height bump**: 64px → 80px across all consumers (FAB/cart-bar/order-bar). All consumers use `var(--md-nav-height)` so they auto-adjust. Cleaner than hardcoding 80px in BottomBar.css only.
- **Page title hierarchy**: path → PAGE_TITLES map first → fallback '家味'. Caller title prop overrides map (e.g., DetailPage can pass dynamic title).
- **Icon primitive extension scope**: 8 new icons needed for Sidebar/BottomBar navigation. Plan D-07 mentioned 30-icon set; these additions are necessary within Phase 11 scope (LOGIC-01/02/03 requirements). No new npm dependencies.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extended Icon primitive with 8 new navigation icons**
- **Found during:** Task 1 (Sidebar/BottomBar implementation)
- **Issue:** Plan specified icon name mapping (dashboard/eco/folder/group/bar-chart/description/lightbulb/spa) but Icon primitive only had 30 icons from Phase 10 D-07 — none of these 8 navigation icons existed. Without them, Sidebar/BottomBar would render with empty icons (console.warn `[Icon] unknown name`).
- **Fix:** Added 8 new icon imports + ICONS map entries to `frontend/src/components/primitives/Icon.jsx`. All Phase 11 navigation icons now available; tree-shaking preserved (Vite only bundles imported icons).
- **Files modified:** Icon.jsx
- **Verification:** Vite build passes; icons render correctly in Sidebar/BottomBar
- **Committed in:** ffa8a82 (Task 1 commit)

**2. [Rule 1 - Bug] --md-nav-height token bump affects FAB/cart-bar positioning**
- **Found during:** Task 1 (BottomBar implementation)
- **Issue:** Plan specifies BottomBar 80dp height using `height: var(--md-nav-height)`, but the token was 64px. Bumping token to 80px affects all 8 consumers (.page-container padding, .fab position, .order-bar, .cart-bar, .cart-detail-panel). FAB position formula `bottom: calc(var(--md-nav-height) + 16px)` correctly auto-adjusts from 80px → 96px; cart-bar properly stays above BottomBar.
- **Fix:** Updated `--md-nav-height: 64px` to `--md-nav-height: 80px` in tokens.css with comment explaining MD3 spec compliance. All `var(--md-nav-height)` consumers self-adjust.
- **Files modified:** tokens.css
- **Verification:** Vite build passes; visual layout consistent (relative positioning preserved)
- **Committed in:** ffa8a82 (Task 1 commit)

**3. [Rule 2 - Missing Critical] Replaced .pc-main .bottom-bar display:none rule with composite CSS**
- **Found during:** Task 3 (styles.css cleanup)
- **Issue:** Original styles.css had `.pc-main .bottom-bar { display: none; }` inside `@media (min-width: 1024px)` to hide BottomBar on PC. After migration, `.bottom-bar` class no longer exists (replaced by `.md-bottom-bar`). Deleting the rule entirely; the new `.md-bottom-bar` CSS controls its own visibility via media queries.
- **Fix:** Removed `.pc-main .bottom-bar { display: none; }` from styles.css. The composites/BottomBar.css is mobile-only by design (no PC override needed).
- **Files modified:** styles.css
- **Verification:** Vite build passes
- **Committed in:** 9383440 (Task 3 commit)

**4. [Rule 2 - Missing Critical] Removed mobile .pc-layout { display: block } override**
- **Found during:** Task 3 (styles.css cleanup)
- **Issue:** Original styles.css had `.pc-layout { display: block; }` inside `@media (max-width: 1023px)` to switch layout from flex to block on mobile. After Sidebar becomes mobile-hidden (via .md-sidebar's media query), the flex layout on mobile no longer interferes — Sidebar is `display: none` on mobile so .pc-layout's flex doesn't have a fixed-position child to space against.
- **Fix:** Removed the mobile override block. Flex layout works correctly on mobile (Sidebar takes 0 visual space when hidden).
- **Files modified:** styles.css
- **Verification:** Vite build passes
- **Committed in:** 9383440 (Task 3 commit)

---

**Total deviations:** 4 auto-fixed (3 missing critical, 1 bug)
**Impact on plan:** All auto-fixes necessary for correctness and visual consistency. Icon primitive extension is in-scope for Phase 11 (LOGIC-01/02/03). Token bump + CSS cleanup are mechanical consequences of the migration.

## Issues Encountered

- Initial styles.css edit accidentally duplicated the `.btn-search` comment header (preserved the wrong line). Caught and fixed in subsequent edit. No impact on final output.
- Build size warning (chunks > 500 kB) — same pre-existing warning, not caused by 11-02 changes. Material Symbols + table libraries (marked.js) dominate bundle size.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 3 navigation composite components ready: Sidebar (80dp rail), BottomBar (80dp nav bar), Sidecar Header (PC top app bar)
- Old JSX imports continue to work via re-export shims — zero consumer-side changes needed
- App.jsx PcLayout now correctly wraps content in `<Sidebar /> + <Header /> + <main>` 3-段式
- styles.css cleaned: ready for Phase 11-03 (ListItem + Divider composite migration) which will delete final .list-item* CSS
- Icon primitive has 38 icons total (30 from Phase 10 + 8 navigation from Phase 11) — sufficient for current consumers

---

*Phase: 11-composite-navigation-components*
*Completed: 2026-07-28*

## Self-Check: PASSED

- All 6 new composite files exist on disk ✓
- All 3 task commits found in git log ✓
- Vite build passes with 0 errors ✓
- Zero className="pc-sidebar / bottom-bar / tab-item / header" in JSX (all replaced by md-* classes) ✓
- Zero .pc-sidebar* / .bottom-bar / .tab-item* / .header* CSS selectors in styles.css (only in MIGRATION comments) ✓
- App.jsx PcLayout renders <Sidebar /> + <Header /> + <main> ✓
- --md-nav-height token successfully bumped to 80px ✓
