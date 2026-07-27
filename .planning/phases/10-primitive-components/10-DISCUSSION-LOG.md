# Phase 10: Primitive Components - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-27
**Phase:** 10-Primitive Components
**Areas discussed:** 迁移策略与范围, Icon: 字体 vs SVG, 组件与 CSS 文件组织, 关键技术决策, 附加决策（Badge / Extended FAB / Button loading）

---

## 迁移策略与范围

| Option | Description | Selected |
|--------|-------------|----------|
| 只建组件 + 共享层消费 | 只在 primitive/共享组件中消费，页面级留给 Phase 12 | |
| 全量换皮（30+ 文件） | 创建组件 + 替换所有调用点 | ✓ |
| 核心场景换皮 | 仅换高频/核心场景 | |

**User's choice:** 全量换皮（30+ 文件）
**Notes:** 用户决定 Phase 10 是一次彻底的换皮，Phase 12 仅做页面级重组 + UAT。这扩大了 Phase 10 的范围但让 Phase 12 简洁。

| Option | Description | Selected |
|--------|-------------|----------|
| 立即删除旧 CSS | 全量换皮后立即删 .btn-* 等选择器 | ✓ |
| 保留旧 CSS 到 Phase 12 | 留作 dead code | |
| 旧 CSS 重定向为新别名 | 渐进迁移 | |

**User's choice:** 立即删除旧 CSS

| Option | Description | Selected |
|--------|-------------|----------|
| 新增 size="xs" 变体 | Button 接受比 sm 更小的尺寸 | |
| 保留 inline style 透传 | Button 接 style prop | |
| 提取为 .btn-search 工具类 | 紧凑搜索按钮独立 class | ✓ |

**User's choice:** 提取为 .btn-search 工具类
**Notes:** grep 发现 6 处 `btn-sm` + inline style 覆盖（`padding: 4px 10px; fontSize: 0.75rem`）用于 AdminIngredientsPage / ChefDishesPage / AdminDishesPage 的搜索栏按钮。用户偏好项目专用工具类，不引入 MD3 spec 之外的 size="xs"。

| Option | Description | Selected |
|--------|-------------|----------|
| Playwright 自动回归脚本 | 扫描所有页面截图对比 | |
| lint+build+人工 UAT | 全量换皮后 lint+build，人工 UAT 兜底 | ✓ |
| 新增 Vitest 组件单测 | 7 个组件单测覆盖 | |

**User's choice:** Phase 10 跑 lint+build；UAT 留 Phase 12 HUMAN-UAT
**Notes:** Phase 12 标题本身就含 "HUMAN-UAT"，所以 UAT 在那里执行更合理。

---

## Icon: 字体 vs SVG

| Option | Description | Selected |
|--------|-------------|----------|
| 继续字体方案 | 现有 material-symbols v0.45.9 字体包 | |
| 迁移 SVG tree-shaking | @material-symbols-svg/react (2025) | ✓ |
| Phase 10 字体、Phase 12 转 SVG | 分阶段 | |

**User's choice:** 迁移 SVG tree-shaking
**Notes:** Phase 9 RESEARCH.md:96 明确推迟的 SVG tree-shaking 在 Phase 10 执行。

| Option | Description | Selected |
|--------|-------------|----------|
| Icon.jsx 维护 name→SVG 映射表 | 内部映射，调用方不变 | ✓ |
| 直接 import 具体图标组件 | 调用方 import 每个具体图标 | |
| Vite glob 自动注册 | 动态 import.meta.glob | |

**User's choice:** Icon.jsx 维护 name→SVG 映射表

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 10 定义固定 ~30 图标集 | 一次性覆盖所有需求 | ✓ |
| 最小子集（现有 emoji） | 只映射现有 ~20 个 emoji | |
| 动态导入所有图标 | tree-shaking 失效 | |

**User's choice:** Phase 10 定义固定 ~30 图标集
**Notes:** 完整子集：home/search/add/edit/delete/check/close/restaurant/menu/person/favorite/star/schedule/notifications/share/settings/logout/arrow-back/arrow-forward/more-vert/more-horiz/chef/visibility/visibility-off/info/warning/error/refresh/filter/sort/place

---

## 组件与 CSS 文件组织

| Option | Description | Selected |
|--------|-------------|----------|
| 新建 primitives/ 子目录 | 与 domain 组件分层 | ✓ |
| 平级放在 components/ | 与现有 Icon/Ripple 平级 | |
| 每组件一个子目录（Button/） | 每个组件独立目录 | |

**User's choice:** 新建 primitives/ 子目录

| Option | Description | Selected |
|--------|-------------|----------|
| 每组件 co-located .css | 与 Ripple.jsx/ripple.css 模式一致 | ✓ |
| 统一 primitives.css | 所有 primitive 共享一个 CSS | |
| 扩展 styles.css | 单 CSS 文件继续膨胀 | |

**User's choice:** 每组件 co-located .css

| Option | Description | Selected |
|--------|-------------|----------|
| 各组件完全独立 | 接受代码重复 | |
| 新增 primitives/base.css | 共享 state-layer/ripple/focus | ✓ |
| 复用 styles.css 现有状态层 | 依赖 Phase 9 遗留 | |

**User's choice:** 新增 primitives/base.css

---

## 关键技术决策

| Option | Description | Selected |
|--------|-------------|----------|
| Input 支持多种 label 模式 | 浮动 + 外部 + 无 label 三模式 | ✓ |
| 强制 MD3 浮动 label | 必须传 label | |
| 不做浮动 label，只换样式 | 保持外部 label | |

**User's choice:** Input 支持多种 label 模式
**Notes:** 三种用法：`<Input label="名称" />`、`<Input label="名称" placeholder="..." />`、`<Input />`。现有 12 个表单调用点用 label 在上面模式 → 不传 label 即回退无 label 模式。

| Option | Description | Selected |
|--------|-------------|----------|
| Button/Card 内部内置 Ripple | primitive 内部 render Ripple | ✓ |
| 保持外部包裹 | 调用方写 `<Ripple><Button/></Ripple>` | |

**User's choice:** Button/Card 内部内置 Ripple
**Notes:** 保留 Ripple.jsx 公开 API（WishCard/Sidebar/Header 继续用外部包裹），primitive 内部内置是 additional 便利。

| Option | Description | Selected |
|--------|-------------|----------|
| Domain Card 内部 render `<Card>` primitive | 组合 | |
| 只调齐样式 | 各自手写 className | |
| 完全重新抽象为 slot-based Card | Card 有 image/header/body/footer slots | ✓ |

**User's choice:** 完全重新抽象为 slot-based Card
**Notes:** 用户选了最激进的方案——DishCard/WishCard/GuestDishCard 全部重构为薄包装。Phase 10 范围因此扩大到 3 个 domain card 重组。

| Option | Description | Selected |
|--------|-------------|----------|
| 实现 MD3 完整 4 变体 | assist/filter/input/suggestion | ✓ |
| 只做 filter | 只换现有 .filter-chip | |
| 做 filter + assist | 中间路线 | |

**User's choice:** 实现 MD3 完整 4 变体

---

## 附加决策（Badge / Extended FAB / Button loading）

| Option | Description | Selected |
|--------|-------------|----------|
| Badge 仅视觉，保留 statusBadge 工具 | 职责分清 | ✓ |
| Badge 内化 status 映射 | 业务逻辑进 Badge | |
| 新增 `<StatusBadge>` 包装 | 多一个组件 | |

**User's choice:** Badge 仅视觉，保留 statusBadge 工具

| Option | Description | Selected |
|--------|-------------|----------|
| variant="extended" + label prop | 与 Button API 一致 | ✓ |
| 3 个独立 FAB 组件 | FAB / ExtendedFAB / SmallFAB | |
| 仅 FAB，靠 label 自动切换 | label optional | |

**User's choice:** variant="extended" + label prop

| Option | Description | Selected |
|--------|-------------|----------|
| loading prop + 内置 spinner | 16dp 圆形 SVG spinner | ✓ |
| 只做 disabled，文案手动 | 灵活但 UX 不一致 | |
| 复用 startIcon + spinner Icon | API 统一但复杂 | |

**User's choice:** loading prop + 内置 spinner

---

## the agent's Discretion

- Card slot 具体命名（推荐 image/header/body/footer，可按 domain card 微调）
- Card 各 variant 的 elevation 数值
- Input 浮动 label 字体大小/位移精确数值
- Button size sm/md/lg 精确 padding/fontSize 数值
- IconButton 40dp/48dp 切换 API 命名
- Badge tone 字段命名（primary/secondary/tertiary/error/warn/success/info/muted）

---

## Deferred Ideas

- **页面级 emoji → Icon 全面清理** — 68 处 inline emoji（page header / loading / emptyState util），Phase 10 只换 primitive 内部，页面级 emoji 留 Phase 12。
- **Sidebar / Header / BottomBar 布局尺寸 MD3 化** — Phase 9 D-12 已铺垫交互反馈，80dp Navigation Rail / active pill 等布局尺寸属于 Phase 11 COMPO-09。
- **主题选择器 UI** — Phase 8 D-04 预留 token 结构，UI 实现（ThemeProvider / 用户偏好 / 选择器）属于独立 future phase。
- **Input 错误态的具体校验规则（form validation 库）** — Phase 10 Input 仅暴露 `error` prop + 辅助文本 slot，校验规则由调用方控制，不引入 formik/react-hook-form。