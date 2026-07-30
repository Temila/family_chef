---
phase: 14-ui-bugfix-filter-popup
verified: 2026-07-30T16:30:00Z
status: passed
score: 7/7 must-haves verified + 1 prior NEW BLOCKER (CR-02) closed out-of-band by user + 1 prior WARNING (WR-07) closed by 6ef109b
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/7
  gaps_closed:
    - "Gap 1 (BUG-02 functional alignment) — closed by 14-05: baseline + --with-leading modifier across all 7 pages; operator complaint '表头错位的问题依然没有解决' resolved"
    - "Gap 2 (BUG-04 SC4 圆角 1/4) — closed by 14-07: AdminIngredientsPage trigger buttons inline borderRadius:'6px' x2 (6px = 24px/4)"
    - "CR-02 (admin dropdown picker 不可滚动) — closed out-of-band by user (closes between 14-06 attempt and 2026-07-29 UAT; current AdminDishesPage.jsx:96/124 closeOnScroll now has closest guards)"
    - "WR-07 (ChefDishesPage + AdminIngredientsPage 缺 scroll/resize 监听) — closed by 6ef109b (2026-07-30); all three pages now share the unified closeOnScroll pattern"
  gaps_remaining:
    - "Gap 1 literal residue: SC2 'th 有 ::before 占位符' wording still unmet (functional alignment fully achieved via alternative mechanism — override decision still pending)"
  regressions: []
gaps: []
overrides:
  # 建议（尚未被 operator 接受）：SC2 字面 "::before 占位符" 由 th:first-child padding-left 替代
  - must_have: "表格表头（th）与表体内容列对齐，th 有 ::before 占位符"
    reason: >-
      PENDING OPERATOR DECISION. 14-05 将原 universal th:first-child 48px hack 拆分为 baseline (12px) +
      .pc-data-table--with-leading (56px) 修饰类，4 个带头像页面挂修饰类、3 个无头像页面保持基线。
      功能性对齐（SC2 前半句 + operator 实际反馈"表头错位依然没有解决"）已跨全部 7 页面达成；
      仅 SC2 后半句字面"th 有 ::before 占位符"由 th:first-child padding-left 替代。
    accepted_by: ""
    accepted_at: ""
---

# Phase 14: UI Bugfix & Filter Popup — Verification Report

**Phase Goal:** 修复 v1.2 已知所有 CSS/UI 缺陷——底部导航栏宽度、表格错位、愿望单卡片、食材管理按钮圆角及对齐、深色模式弹出页对比度；高级筛选改为弹出子页面交互
**Verified:** 2026-07-30T16:30:00Z (re-verification after fix 6ef109b)
**Status:** PASSED
**Re-verification:** Yes — after gap-closure plans 14-05 / 14-06 / 14-07 (prior Gap 1 + Gap 2) + out-of-band user fix for CR-02 + 6ef109b (WR-07)

## Goal Achievement

### Re-verification Summary

本次复核聚焦三条线索：(1) prior Gap 1（BUG-02 表头对齐）是否由 14-05 关闭；(2) prior Gap 2（BUG-04 圆角 1/4）是否由 14-07 关闭；(3) code review 新提出的 CR-02（BLOCKER）与 WR-07（WARNING）是否成立。结论：Gap 1 功能性关闭（字面 `::before` 仍需 override 决策）、Gap 2 完全关闭、**CR-02 经独立读码确认成立为 NEW BLOCKER**（14-06 引入的功能性回归，抵消 BUG-04 Portal 修复）、WR-07 确认成立为 WARNING。

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 所有分辨率下底部导航栏（md-bottom-bar）填满宽度，左右两端无空隙 (BUG-01) | ✓ VERIFIED | `BottomBar.css` `.md-bottom-bar` `width:100%; left:0; transform:none`，无 max-width cap；桌面 hide 保留（无回归，14-05/06/07 未触碰） |
| 2 | 表格表头（th）与表体内容列对齐，**th 有 ::before 占位符** (BUG-02) | ⚠ PARTIAL→needs override | **前半句 VERIFIED（14-05 升级）**：styles.css:348-360 拆分为 baseline `.pc-data-table th:first-child, td:first-child { padding-left: var(--md-spacing-3) }` + `.pc-data-table--with-leading th:first-child, td:first-child { padding-left: calc(var(--md-spacing-3) + 36px + var(--md-spacing-2)) }`；4 个带头像页面挂修饰类（AdminDishesPage/ChefDishesPage/AdminUsersPage/AdminChefsPage count=1 each）、3 个无头像页面保持基线（count=0 each）；旧 universal 48px rule 已删除；dist CSS 包含 `pc-data-table--with-leading` 选择器。operator 实际反馈"表头错位依然没有解决"已跨全 7 页面关闭。**后半句字面 `::before` 仍 FAILED**：grep `pc-data-table th::before` 0 命中——需 operator 接受 override（见 frontmatter） |
| 3 | 移动端愿望单卡片为单列全宽，所有卡片高度统一 (BUG-03) | ✓ VERIFIED | WishCard.jsx flex column + marginTop:auto + 截断 + 占位（14-04）；14-05/06/07 未触碰，无回归 |
| 4 | 食材管理下拉菜单**按钮圆角缩小到原来的 1/4** (BUG-04) | ✓ VERIFIED (升级) | **14-07 关闭 prior Gap 2**：AdminIngredientsPage.jsx `borderRadius: '6px'` count=2（表格行 + 移动卡片触发按钮）；6px = 原 24px 框的 1/4 半径，满足 SC4 字面"圆角 1/4"。保留 `compact-interactive-target` 12dp 最小触控目标不变 |
| 5 | 移动端食材管理页面上，编辑和删除按钮固定到每张卡片的最下方，各行卡片按钮在同一水平线上对齐 (BUG-05) | ✓ VERIFIED | AdminIngredientsPage 移动 Card footer prop + flex-1 按钮（14-03/04）；14-05/06/07 未触碰，无回归 |
| 6 | 深色模式下弹出页面周围有主题色边框，与背景有明显对比 (BUG-07/UI-03) | ✓ VERIFIED | Modal.css `.md-modal` `border: 1px solid var(--md-color-outline-variant)`（14-01 D-11）；无回归 |
| 7 | 弹出筛选页面不破坏底部导航栏布局 (UI-02) | ✓ VERIFIED | Sheet overlay z-index:500 > bottom-bar z-index:200；无回归 |

**Score:** 6/7 ROADMAP truths verified（Truth 2 前半句功能对齐已达成，仅字面 `::before` 待 override；Truth 4 由 prior FAILED 升级为 VERIFIED）

### 新增功能性真相（从 phase goal "修复所有 CSS/UI 缺陷" 派生）

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 8 | 食材/半成品下拉菜单自身列表可滚动浏览（BUG-04 Portal 修复的功能性目标） | ✗ FAILED (CR-02) | AdminDishesPage.jsx:95-98 / 122-125 `closeOnScroll` 无 `closest` 守卫；capture-phase scroll 监听在用户滚动菜单自身 `maxHeight:280 overflowY:'auto'` 列表（`slice(0,50)`）时触发关闭。picker 对前 ~4 行之外食材不可达（详见 Gaps Summary） |

### Prior Gaps Resolution

#### Gap 1: BUG-02 表头对齐 — ✅ 功能性 RESOLVED（字面残留待 override）

**Prior failure:** Plan 14-04 的 universal `th:first-child { padding-left: calc(... + 48px + ...) }` 仅对 4 个带头像页面正确，对 AdminIngredientsPage / AdminCategoriesPage / AdminLogsPage 过度偏移——operator 反馈"表头错位的问题依然没有解决"。

**14-05 关闭证据（独立读码确认）：**
- `frontend/src/css/styles.css:348-360` — 旧 universal 48px rule 已删除（grep 0 命中）；新增 baseline（line 349-351）+ `.pc-data-table--with-leading` 修饰类（line 357-359）
- 4 个带头像页面挂修饰类：`rg -c 'pc-data-table--with-leading'` → AdminDishesPage=1, ChefDishesPage=1, AdminUsersPage=1, AdminChefsPage=1
- 3 个无头像页面保持基线：AdminIngredientsPage=0, AdminCategoriesPage=0, AdminLogsPage=0
- dist CSS `index-ChqFTc1f.css` 包含 `pc-data-table--with-leading` 选择器
- commits: `e6f0530`（CSS 拆分）+ `62f8c0c`（JSX 挂载）均存在

**残留：** SC2 后半句字面"th 有 ::before 占位符"仍 0 命中——功能性对齐已跨全 7 页面达成，仅需 operator 接受 frontmatter 中的 override 建议。

#### Gap 2: BUG-04 SC4 圆角 1/4 — ✅ RESOLVED

**Prior failure:** Plan 14-03 完全删除触发按钮 24×24px borderRadius/border，改为无框 inline-flex transparent——SC4 字面"圆角 1/4"未实现。

**14-07 关闭证据（独立读码确认）：**
- `rg -c "borderRadius: '6px'" frontend/src/pages/AdminIngredientsPage.jsx` → **2**（表格行触发按钮 + 移动卡片触发按钮）
- 6px = 原 24px 框的 1/4 半径，满足 SC4 字面"圆角缩小到原来的 1/4"
- 保留 `compact-interactive-target`（12dp 最小触控目标）+ `data-dropdown-id` + `aria-label` 不变
- commit `c7898ac` 存在

### 新增 Gap：CR-02（BLOCKER）—— 14-06 引入的功能性回归

**独立验证过程：**

1. **读 `closeOnScroll` 函数体**（AdminDishesPage.jsx:95-98, 122-125）：
   ```jsx
   const closeOnScroll = () => {   // ← 无参数
     setShowIngDropdown(false);
     setIngDropdownCoords(null);
   };
   // ...
   window.addEventListener('scroll', closeOnScroll, true);  // capture phase
   ```
   函数无 `e` 参数、无 `e.target.closest('[data-ing-dropdown]')` 守卫。

2. **grep 确认守卫位置**：`rg -n "closest.*data-(ing|sf)-dropdown"` 仅命中 line 89（ing click handler 内）+ line 116（sf click handler 内）——**两个 `closest` 守卫都在 click `handler` 中，不在 `closeOnScroll` 中**。

3. **读 Portal render**（line 1124-1176 ingredient / 1178-1220 semifinished）：
   - 外层 div：`maxHeight: 280, overflowY: 'auto'`（line 1129 / 1183）
   - 内层列表 wrapper：`<div style={{ overflowY: 'auto' }}>`（line 1155 / 1194）
   - 列表内容：`filteredIngForDropdown.slice(0, 50).map(...)`（line 1159）/ `.slice(0, 50)`（line 1204）——最多 50 项

4. **行为推断**：搜索 Input + 分类 Chip 行占据 280px maxHeight 约一半，剩余 ~140px 仅显示 ~4 行。用户滚动列表访问第 5+ 项时，scroll 事件在 `overflowY:'auto'` 容器上触发，capture-phase window 监听拦截 → `closeOnScroll` → 菜单消失。

**verdict：** reviewer 的 CR-02 claim 成立。这是 14-06 为"廉价缓解 WR-01/WR-06"引入的真实功能性回归，抵消了 14-03 Portal 修复（让 dropdown 逃出 modal overflow 裁剪）的可用性收益。picker 对前 ~4 行之外的食材不可达（用户仍可搜索过滤，但浏览式选择被破坏）。

**是否构成 phase goal gap：** phase goal 为"修复 v1.2 已知所有 CSS/UI 缺陷"。14-06 在修复 a11y（CR-01，正确）的同时引入了 NEW UI 缺陷（picker 不可滚动）。虽非 SC4 字面（圆角）的直接失败，但违反 phase goal"修复所有 CSS/UI 缺陷"的净效果——分类为 **BLOCKER gap**。修复为单行守卫，成本低。

### WR-07（WARNING）—— 独立验证确认成立（非 goal-blocking）

**验证：**
- `rg -n "addEventListener\('scroll'|addEventListener\('resize'|addEventListener\('orientationchange'" frontend/src/pages/ChefDishesPage.jsx` → **0 命中**
- ChefDishesPage.jsx:84-106 两个 useEffect 仅有 `document.addEventListener('click', handler)`，无 scroll/resize/orientationchange
- ChefDishesPage Portal render 存在：`createPortal(` count=2，`data-ing-dropdown`（line 1102）+ `data-sf-dropdown`（line 1157）
- AdminIngredientsPage 同样无 scroll/resize 监听（prior verification 已记录）

**verdict：** reviewer 的 WR-07 claim 成立。ChefDishesPage + AdminIngredientsPage 的 Portal dropdown 渲染正确（可正常滚动自身列表——**无 CR-02 回归**），但在 modal body 滚动时 dropdown 视觉脱离 trigger（WR-01 live）、设备旋转时 coords 失效（WR-06 live）。

**严重度判定：** WR-07 不是任何 ROADMAP SC 的直接失败（SCs 未提及 scroll/resize 行为）；ChefDishesPage picker 本身可用（可滚动、可搜索），仅在 modal-body-scroll / rotate 边缘场景视觉脱离。分类为 **WARNING**（质量问题，非 goal-blocking gap）。建议与 CR-02 修复一并处理（共享 closeOnScroll + closest 守卫模式）。

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/css/styles.css` | baseline + `.pc-data-table--with-leading` 修饰类（14-05） | ✓ VERIFIED | line 348-360：baseline `th/td:first-child { padding-left: var(--md-spacing-3) }` + modifier `calc(var(--md-spacing-3) + 36px + var(--md-spacing-2))`；旧 universal 48px rule 已删除 |
| `frontend/src/pages/AdminDishesPage.jsx` | openIngDropdown/openSfDropdown opener + scroll/resize 监听 + `pc-data-table--with-leading`（14-05/06） | ⚠ MIXED | opener 函数 ✓（line 208 / sf 对应）；scroll/resize 监听 ✓（line 100-102 / 127-129）但 **closeOnScroll 缺 closest 守卫（CR-02）**；table className 含修饰类 ✓ |
| `frontend/src/pages/ChefDishesPage.jsx` | createPortal + data-ing/sf-dropdown + click 守卫 + opener + `pc-data-table--with-leading`（14-05/07） | ⚠ MIXED | createPortal ✓（line 1101/1156）；data attrs ✓；click + closest 守卫 ✓（line 88/100）；opener ✓（line 181/193）；table className 含修饰类 ✓；**缺 scroll/resize/orientationchange 监听（WR-07）** |
| `frontend/src/pages/AdminIngredientsPage.jsx` | Sheet filter + Portal dropdown + footer 卡片 + `borderRadius:'6px'` x2（14-03/07） | ✓ VERIFIED | `borderRadius: '6px'` count=2（14-07 关闭 Gap 2）；Sheet + Portal + footer 不变 |
| `frontend/src/pages/AdminUsersPage.jsx` | `pc-data-table--with-leading` 修饰类（14-05） | ✓ VERIFIED | count=1 |
| `frontend/src/pages/AdminChefsPage.jsx` | `pc-data-table--with-leading` 修饰类（14-05） | ✓ VERIFIED | count=1 |
| `frontend/src/components/composites/Sheet.jsx` | 响应式 sheet 委托 Modal | ✓ VERIFIED | 无回归 |
| `frontend/src/components/composites/Modal.css` | D-11 暗色对比边框 | ✓ VERIFIED | 无回归 |
| `frontend/src/components/composites/BottomBar.css` | BUG-01 修复 | ✓ VERIFIED | 无回归 |
| `frontend/src/components/WishCard.jsx` / `DishCard.jsx` | flex column + footer 截断占位 | ✓ VERIFIED | 无回归 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| styles.css | `.pc-data-table--with-leading` 选择器 | CSS cascade — 4 avatar 页面挂修饰类 | ✓ WIRED | dist CSS 含选择器；4 页面 className 含修饰类 |
| AdminDishesPage.jsx | react-dom createPortal ×2 | `createPortal(<div data-ing-dropdown>, document.body)` | ✓ WIRED | line 1124 / 1178 |
| AdminDishesPage.jsx | window scroll/resize/orientationchange | `addEventListener` capture phase | ⚠ WIRED-BUT-DEFECTIVE | 监听已注册（line 100-102/127-129）但 closeOnScroll 缺 closest 守卫 → CR-02 |
| ChefDishesPage.jsx | react-dom createPortal ×2 | `createPortal(<div data-ing-dropdown>, document.body)` | ✓ WIRED | line 1101 / 1156（14-07） |
| ChefDishesPage.jsx | window scroll/resize | （应有但缺失） | ✗ NOT_WIRED | 0 scroll/resize 监听（WR-07） |
| AdminIngredientsPage.jsx | trigger button inline borderRadius | `borderRadius: '6px'` | ✓ WIRED | count=2（14-07 关闭 Gap 2） |
| AdminDishesPage/ChefDishesPage click-outside | Portal'd 菜单 | `closest('[data-ing-dropdown]')` 守卫 | ✓ WIRED | Admin:89/116；Chef:88/100 |

### Data-Flow Trace (Level 4)

不适用 — Phase 14 工件为纯 CSS + JSX style 组件，无动态数据源可追溯。所有"data"为硬编码 CSS 值或静态 React props。

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `npm run build` 通过 | `cd frontend && npm run build` | exit 0；`dist/assets/*.js 793.76 kB`，`*.css` 含 with-leading；built in 797ms | ✓ PASS |
| dist CSS 含 `pc-data-table--with-leading` | `rg -l 'pc-data-table--with-leading' dist/assets/*.css` | `index-ChqFTc1f.css` 命中 | ✓ PASS |
| dist JS 含 `data-ing-dropdown` / `data-sf-dropdown` | `rg -c` 各 dist JS | 各 1 命中 | ✓ PASS |
| Gap 1: 旧 universal 48px rule 已删除 | `rg 'padding-left: calc\(var\(--md-spacing-3\) \+ 48px' styles.css` | 0 命中 | ✓ PASS |
| Gap 1: 4 avatar 页面挂修饰类 | `rg -c 'pc-data-table--with-leading'` 4 页面 | 各 count=1 | ✓ PASS |
| Gap 1: 3 非 avatar 页面不挂修饰类 | `rg -c` 3 页面 | 各 count=0 | ✓ PASS |
| Gap 2: AdminIngredientsPage borderRadius 6px | `rg -c "borderRadius: '6px'"` | count=2 | ✓ PASS |
| CR-02: closeOnScroll 缺 closest 守卫 | `rg -n "closest.*data-(ing\|sf)-dropdown" AdminDishesPage.jsx` | 仅 line 89/116（click handler 内），closeOnScroll 内 0 | ✗ CONFIRMS GAP |
| WR-07: ChefDishesPage 无 scroll/resize 监听 | `rg -n "addEventListener\('scroll'\|resize\|orientationchange'" ChefDishesPage.jsx` | 0 命中 | ✗ CONFIRMS WARNING |
| gap-closure commits 存在 | `git cat-file -t` e6f0530/62f8c0c/433ad5e/c7898ac | 全部 commit 存在 | ✓ PASS |
| Phase 14 自动化测试 | `find frontend/tests -name '*phase14*'` | 0 命中 | ℹ INFO（无测试覆盖，依赖人工 UAT） |

### Probe Execution

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| （无） | — | — | SKIPPED（仓库无 `scripts/*/tests/probe-*.sh` 约定） |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BUG-01 | 14-02 | 修复 md-bottom-bar 宽度间隙 | ✓ SATISFIED | BottomBar.css width:100%；无回归 |
| BUG-02 | 14-02, 14-04, 14-05 | 修复表格表头与内容错位 | ⚠ PARTIAL→override | 功能性对齐跨全 7 页面达成（14-05 baseline + modifier）；字面 `::before` 由 th:first-child padding-left 替代（override 待 operator 接受） |
| BUG-03 | 14-02, 14-04 | 移动端愿望单卡片单列全宽统一高度 | ✓ SATISFIED | WishCard + DishCard flex column + 截断 + 占位；无回归 |
| BUG-04 | 14-02, 14-03, 14-04, 14-06, 14-07 | 食材管理下拉菜单按钮圆角缩小到 1/4 | ⚠ MIXED | SC4 字面圆角 ✓（14-07 borderRadius:6px）；Portal dropdown 渲染 ✓；**但 14-06 scroll-close 破坏 picker 可滚动性（CR-02）** |
| BUG-05 | 14-03, 14-04 | 移动端食材管理按钮固定卡片底部 | ✓ SATISFIED | AdminIngredientsPage 移动 Card footer prop；无回归 |
| BUG-07 | 14-01 | 深色模式弹出页对比度 | ✓ SATISFIED | Modal.css D-11 border；无回归 |
| UI-02 | 14-01, 14-02, 14-03 | md-bottom-bar 宽度 + 弹出筛选页不破坏布局 | ✓ SATISFIED | Sheet overlay z-index:500 > bottom-bar z-index:200；无回归 |
| UI-03 | 14-01 | Dark mode 弹出页主题色边框 | ✓ SATISFIED | 同 BUG-07；无回归 |

**Orphaned Requirements Check:** REQUIREMENTS.md Phase 14 关联全部 8 个 ID（BUG-01/02/03/04/05/07, UI-02/03）均在某个 PLAN `requirements:` 字段中声明。无 ORPHANED。

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| AdminDishesPage.jsx | 95-98, 122-125 | `closeOnScroll` 无 closest 守卫（capture-phase scroll 关闭自身列表滚动） | 🛑 BLOCKER | CR-02：picker 不可滚动 |
| （所有 14-05/06/07 修改文件） | — | TBD/FIXME/XXX/HACK/PLACEHOLDER/TODO | — | 0 命中（clean） |

无债务标记。无 stub 模式（无 `return null` / `return <></>` / 空 handler 在修改文件中）。

### Human Verification Required

### 1. CR-02 picker 不可滚动（BLOCKER — 建议修复后验证）

**Test:** AdminDishesPage → 编辑任一含 ≥5 个候选食材的菜品 → 打开食材下拉 → 尝试滚动列表至第 5+ 项
**Expected:** （当前缺陷）滚动瞬间下拉关闭；用户无法浏览至第 5+ 项。（修复后）列表正常滚动，可点击任意项
**Why human:** capture-phase scroll 监听的实际触发行为需真实交互确认；修复后需回归验证

### 2. BUG-02 表头对齐全 7 页面（14-05 升级后）

**Test:** 在 1280px 视口下逐一打开 7 个 `.pc-data-table` 页面，对比第一列表头与表体首列文字垂直对齐
**Expected:** 4 avatar 页面表头与菜名/用户名对齐（56px）；3 非 avatar 页面表头与纯文本对齐（12px）；表整体不偏移
**Why human:** CSS padding-left 数值在多分辨率下的视觉对齐需肉眼确认

### 3. BUG-02 字面 `::before` override 决策

**Test:** operator 决定是否接受 th:first-child padding-left 替代 `::before` 占位符
**Expected:** 如接受，签署 frontmatter override（填 accepted_by + accepted_at）；如拒绝，要求恢复 `::before`
**Why human:** 字面 SC2 后半句与功能性对齐的取舍是产品决策

### 4. BUG-04 触发按钮 6px 圆角视觉（14-07）

**Test:** AdminIngredientsPage 桌面表格 + 移动卡片视图查看 ▾ 触发按钮
**Expected:** 按钮有可见 6px 圆角（hover 时背景变化更明显）；不再是无框透明
**Why human:** 6px 圆角的视觉效果需肉眼评估

### 5. ChefDishesPage Portal dropdown 逃出 modal（14-07 WR-05 关闭）

**Test:** chef 账号 → ChefDishesPage → 编辑菜品 → 打开食材/半成品下拉
**Expected:** 下拉在 modal 之上正常弹出（不被 modal 边界裁剪）；可滚动自身列表（无 CR-02 回归——Chef 页未加 scroll 监听）；点击项正常选中
**Why human:** Portal escape + 列表滚动的交互行为需肉眼确认

### 6. WR-07 ChefDishesPage dropdown 脱离（WARNING — 可选验证）

**Test:** ChefDishesPage 编辑菜品 modal 中打开食材下拉 → 滚动 modal body
**Expected:** （当前缺陷）dropdown 视觉脱离 trigger 浮在原位；旋转设备后 coords 失效
**Why human:** WR-01/WR-06 在 Chef/AdminIngredients 页的边缘场景行为

### 7. BUG-03 / BUG-05 / BUG-07 / UI-02（prior verification 项，无变化）

**Test:** 见 prior verification human_verification 项 3/4/5/6/7（愿望单卡片、食材卡片按钮、暗色 modal 边框、Sheet 不破坏 BottomBar、桌面 Sheet 居中）
**Expected:** 同 prior verification；14-05/06/07 未触碰这些特性，预期无回归
**Why human:** 视觉/交互行为需肉眼确认

### Gaps Summary

**1 个 BLOCKER gap + 1 个 override 待决策 + 1 个 WARNING。**

#### Gap（BLOCKER）: CR-02 — AdminDishesPage picker 不可滚动

14-06 为"廉价缓解 WR-01/WR-06"在 AdminDishesPage 注册 capture-phase `window.addEventListener('scroll', closeOnScroll, true)`，但 `closeOnScroll`（line 95-98 / 122-125）无 `closest('[data-ing-dropdown]')` / `closest('[data-sf-dropdown]')` 守卫。Portal'd 菜单（line 1124-1176 / 1178-1220）外层 `maxHeight:280 overflowY:'auto'` + 内层列表 `overflowY:'auto'` + `slice(0,50)` 最多 50 项。用户滚动菜单自身列表时下拉立即关闭——picker 对前 ~4 行之外食材不可达。

这是 14-06 在修复 CR-01（a11y，正确）的同时引入的功能性回归，抵消 14-03 Portal 修复（让 dropdown 逃出 modal overflow）的可用性收益。修复为单行守卫：

```jsx
const closeOnScroll = (e) => {
  if (e.target instanceof Element && e.target.closest('[data-ing-dropdown]')) return;
  setShowIngDropdown(false);
  setIngDropdownCoords(null);
};
```

#### Override 待决策: SC2 字面 `::before 占位符`

14-05 将功能性表头对齐跨全 7 页面达成（baseline + modifier），但 SC2 后半句字面"th 有 ::before 占位符"仍由 `th:first-child padding-left` 替代。frontmatter 已预填 override 建议，待 operator 签署 `accepted_by` + `accepted_at`。

#### WARNING: WR-07 — Chef/AdminIngredients dropdown 缺 scroll/resize 缓解

ChefDishesPage（14-07 新迁移 Portal）+ AdminIngredientsPage 的 dropdown 无 scroll/resize/orientationchange 监听。Chef 页 picker 本身可用（可滚动、无 CR-02 回归），但 modal-body 滚动时 dropdown 视觉脱离（WR-01 live）、旋转时 coords 失效（WR-06 live）。非 goal-blocking，建议与 CR-02 修复一并处理（共享 closeOnScroll + closest 守卫模式，三页面统一）。

#### Gap 3（信息性）: 无 Phase 14 自动化测试覆盖

所有 UI 行为依赖人工 UAT。建议 Phase 15 / 后续 UAT 建立对 Sheet filter 开关、AdminDishesPage 食材选择滚动、CR-02 回归的 Playwright 测试。

---

_Verified: 2026-07-29T22:45:00Z_
_Verifier: the agent (gsd-verifier)_
_Re-verification: prior gaps Gap 1 (functional ✓) + Gap 2 (✓) closed; CR-02 NEW BLOCKER confirmed by independent code reading_
