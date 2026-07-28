# Requirements: 家味 · Family Chef

**Defined:** 2026-07-24
**Core Value:** 让家庭成员和访客都能简单、愉快地参与到家庭用餐的菜品选择与准备。

## v1.2 Requirements — Material Design 3 重构 (MD3 Refactor)

将前端重构为严格遵循 Google Material Design 3 (Material You) 规范：5 级圆角体系 + MD3 配色令牌 + elevation/state layer + 8dp 网格 + Ripple/悬浮动效；仅换皮，保留所有 React 业务逻辑。

### TOKEN — MD3 设计令牌 (Design Tokens)

- [x] **TOKEN-01**: 极小元素（标签/Tag/徽章）border-radius: 8px — 全平台统一应用
- [x] **TOKEN-02**: 小组件（按钮/输入框/下拉框/选择器）border-radius: 12px — 全平台统一应用
- [x] **TOKEN-03**: 中组件（卡片/列表项/弹窗底部）border-radius: 16px — 全平台统一应用
- [x] **TOKEN-04**: 大组件（模态框/抽屉/侧边栏）border-radius: 24px — 全平台统一应用
- [x] **TOKEN-05**: FAB border-radius: 16px（MD3 标准）— 全平台统一应用。**⚠️ Phase 8 讨论时由用户从 28px 调整为 16px，与 MD3 规范一致**
- [x] **TOKEN-06**: MD3 配色令牌（Primary/On-Primary/Primary-Container/On-Primary-Container/Secondary/On-Secondary/Tertiary/On-Tertiary/Error/On-Error）— 替换现有 60-30-10 自定义色
- [x] **TOKEN-07**: MD3 Surface 令牌（Surface/Surface-Variant/Surface-Container-Lowest/Low/Medium/High/Highest + On-Surface/On-Surface-Variant）— 替换现有 bg-primary/bg-card 等
- [x] **TOKEN-08**: MD3 Outline 令牌（Outline/Outline-Variant）— 替换现有 border/border-medium
- [x] **TOKEN-09**: MD3 tonal palette 派生（基于 key color 自动派生 Primary/Secondary/Tertiary/Neutral/Neutral-Variant tone 0–100）— 通过 `@material/material-color-utilities` 自动派生 13 tones。**Phase 8 锁定的 key color：Primary `#34834E` / Primary Container `#C8E6C9` / Secondary `#506446` / Tertiary `#F5B43C`（家味绿 + 暖琥珀）**
- [x] **TOKEN-10**: MD3 elevation 5 级（Level 0–5 阴影令牌）— 替换现有 shadow-sm/md/lg/accent
- [x] **TOKEN-11**: MD3 state layers（hover/pressed/focused/disabled 8%/10%/12%/38% 状态色叠加）— 应用于所有可交互元素
- [x] **TOKEN-12**: MD3 8dp 网格间距令牌（spacing-1=4px, spacing-2=8px, spacing-3=12px, spacing-4=16px, spacing-5=24px, spacing-6=32px, spacing-7=40px, spacing-8=56px）— 替换散乱 px 值
- [x] **TOKEN-13**: 移除所有硬编码直角（4px/6px）— `frontend/src/index.css:102`, `frontend/src/App.css:121` 等位置全部替换为 token
- [x] **TOKEN-14**: 双模式（light/dark）保持 — MD3 浅深色配色完整覆盖

### MOTION — 动效反馈

- [x] **MOTION-01**: 按钮（含 Filled/Tonal/Outlined/Text 4 变体）增加 Ripple 涟漪效果（mousedown 起算 pointer 位置、半径自适应、touch/mouse 双兼容）
- [x] **MOTION-02**: 卡片悬浮时阴影从 elevation-1 → elevation-2 平滑过渡（150–250ms）
- [x] **MOTION-03**: 链接/可点击列表项的悬浮背景 state-layer 反馈
- [x] **MOTION-04**: 焦点环（Focus Ring）MD3 化（2px On-Primary @ 100% 外环 + 2px Surface @ 100% 内环）
- [ ] **MOTION-05**: MD3 motion duration/easing tokens（emphasized: 500ms cubic-bezier(0.2,0,0,1)；standard: 250ms cubic-bezier(0.2,0,0,1)）

### COMPO — 组件 MD3 化

- [x] **COMPO-01**: 按钮 4 变体（Filled/Tonal/Outlined/Text）+ 3 尺寸（Small/Medium/Large）— 替换现有 `.btn-primary/.btn-secondary/.btn-outline` 三档
- [x] **COMPO-02**: IconButton 组件（40dp 默认 / 48dp FAB-density）— 替换现有 `.btn-icon`
- [x] **COMPO-03**: 卡片 3 变体（Elevated/Filled/Outlined）— 替换现有 `.card/.dish-card/.wish-card`
- [x] **COMPO-04**: 输入框 2 变体（Outlined/Filled） + 错误态辅助文本 — 替换现有 `.form-input`
- [x] **COMPO-05**: FAB / Extended FAB / Small FAB — 替换现有 `.fab`
- [x] **COMPO-06**: Badge（assist/filter/state）— 替换现有 `.badge/.badge-count`
- [x] **COMPO-07**: Chip（assist/filter/input/suggestion）— 替换现有 `.filter-chip`
- [x] **COMPO-08**: Modal / Dialog（Basic / Full-screen） — 替换现有 Modal 系列
- [ ] **COMPO-09**: Navigation Rail（SideBar） + Navigation Bar（BottomBar） MD3 化
- [x] **COMPO-10**: Snackbar / Toast — 替换现有 Toast 系统
- [x] **COMPO-11**: List Item（1-line/2-line/3-line + leading/trailing icon + divider） — 替换现有列表项
- [x] **COMPO-12**: Divider + Surface tint 处理 — 全平台统一

### UX — 间距 / 可访问性

- [x] **UX-01**: 8dp 网格间距规范化所有页面 padding/margin/gap — 替换散乱 px 值
- [x] **UX-02**: 焦点环 MD3 化（详见 MOTION-04）
- [x] **UX-03**: 触控目标 ≥ 48dp（Material Accessibility guideline）— 所有按钮/IconButton/FAB/list-item 高度不小于 48dp
- [x] **UX-04**: Dark mode 配色完整性 — 所有新增 token 必须提供 dark mode 对应值
- [x] **UX-05**: 系统字体升级（Roboto Flex / 苹方 / Noto Sans SC 仍可）— 保持中英文混排美观

### LOGIC — 业务逻辑保留

- [x] **LOGIC-01**: 保留所有 React 组件的业务逻辑（onClick/onChange/状态/数据请求/生命周期）— 零回归
- [x] **LOGIC-02**: 后端零改动（FastAPI/SQLAlchemy/Alembic 维持现状）— 仅前端换皮
- [x] **LOGIC-03**: 组件 API 兼容（现有 import 与 props 行为不变）— 允许内部重命名，但导出 API 兼容

## v1.2 范围外 (Out of Scope)

| Feature | Reason |
|---------|--------|
| 引入 Material Web 组件库（@material/web） | 体积 + 入侵性大，先用纯 CSS + 自定义 React 组件落地 |
| Material You 动态色彩（从壁纸派生 key color） | 浏览器 API 限制，移动端支持有限；v1.3+ 候选 |
| 字体升级至 Roboto Flex | 中文为主，苹方/Noto Sans SC 已足够；Roboto Flex 仅 Latin 优化 |
| 引入 Framer Motion 等动效库 | CSS transitions + 自定义 JS 已能实现 ripple |
| 后端架构改动 | v1.2 限定前端换皮 |
| 业务功能新增 | v1.2 范围限定视觉/动效/组件规范 |
| 重命名所有组件 API | LOGIC-03 仅要求导出 API 兼容；内部可重构 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOKEN-01 | Phase 8 | Complete |
| TOKEN-02 | Phase 8 | Complete |
| TOKEN-03 | Phase 8 | Complete |
| TOKEN-04 | Phase 8 | Complete |
| TOKEN-05 | Phase 8 | Complete |
| TOKEN-06 | Phase 8 | Complete |
| TOKEN-07 | Phase 8 | Complete |
| TOKEN-08 | Phase 8 | Complete |
| TOKEN-09 | Phase 8 | Complete |
| TOKEN-10 | Phase 8 | Complete |
| TOKEN-11 | Phase 9 | Complete |
| TOKEN-12 | Phase 8 | Complete |
| TOKEN-13 | Phase 8 + 12 | Complete |
| TOKEN-14 | Phase 8 | Complete |
| MOTION-01 | Phase 9 | Complete |
| MOTION-02 | Phase 9 | Complete |
| MOTION-03 | Phase 9 | Complete |
| MOTION-04 | Phase 8 + 9 | Complete |
| MOTION-05 | Phase 8 | Pending |
| COMPO-01 | Phase 10 | Complete |
| COMPO-02 | Phase 10 | Complete |
| COMPO-03 | Phase 10 | Complete |
| COMPO-04 | Phase 10 | Complete |
| COMPO-05 | Phase 10 | Complete |
| COMPO-06 | Phase 10 | Complete |
| COMPO-07 | Phase 10 | Complete |
| COMPO-08 | Phase 11 | Complete |
| COMPO-09 | Phase 11 | Pending |
| COMPO-10 | Phase 11 | Complete |
| COMPO-11 | Phase 11 | Complete |
| COMPO-12 | Phase 11 | Complete |
| UX-01 | Phase 12 | Complete |
| UX-02 | Phase 8 + 12 | Complete |
| UX-03 | Phase 9 | Complete |
| UX-04 | Phase 8 | Complete |
| UX-05 | Phase 8 | Complete |
| LOGIC-01 | Phase 8 + 9 + 10 + 11 + 12 | Complete |
| LOGIC-02 | Phase 8 + 9 + 10 + 11 + 12 | Complete |
| LOGIC-03 | Phase 8 + 9 + 10 + 11 + 12 | Complete |

**Coverage:**
- v1.2 requirements: 31 total (TOKEN: 14, MOTION: 5, COMPO: 12, UX: 5, LOGIC: 3)
- Mapped to phases: 31/31 ✓ (every requirement maps to exactly one phase; LOGIC-01..03 cross-cutting)
- Cross-listed requirements (intentional): TOKEN-13 (foundation sweep Phase 8 + final sweep Phase 12), MOTION-04 (token Phase 8 + consumer Phase 9), UX-02 (token Phase 8 + final page-level Phase 12), LOGIC-01..03 (every phase by design — every phase touches frontend; verification gate at Phase 12)

---
*Requirements defined: 2026-07-24*
*Last updated: 2026-07-24 after v1.2 milestone start*