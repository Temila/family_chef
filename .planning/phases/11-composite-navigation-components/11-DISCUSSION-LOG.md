# Phase 11: Composite & Navigation Components - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-28
**Phase:** 11-Composite & Navigation Components
**Areas discussed:** Modal 抽象层级, Snackbar 功能深度, Nav Rail 尺寸策略, List Item 抽象深度

---

## Modal 抽象层级

| Option | Description | Selected |
|--------|-------------|----------|
| Unified `<Modal>` primitive | `<Modal variant="basic|full-screen">` 单一 primitive，7 个独立 Modal + 15 inline 改写为 thin wrapper | ✓ |
| Two primitives: Modal + Dialog | `<Modal>` general + `<Dialog>` confirmations，MD3 区分 | |
| Keep 7 dedicated modals | 仅加 `<Modal>` shell，7 个独立组件结构不变 | |

| Question | Selected |
|----------|----------|
| Props/slots 设计 | header/footer slots + actions 必填为 ReactNode |
| full-screen 何时用 | Used by mobile form-heavy modals (WishForm / CreateLink) |
| Migration scope | Rewrite all 22 sites to `<Modal>` (立即全量) |

**User's choice:** Unified `<Modal>` primitive + header/footer slots + full-screen caller opt-in + 22 站点全量重写
**Notes:** 用户要求 Phase 11 立即完成 Modal 全量迁移，不推迟到 Phase 12

---

## Snackbar 功能深度

| Option | Description | Selected |
|--------|-------------|----------|
| 保留 showToast + 队列/自动消失 | 213 调用零修改，仅增加队列 + tone 视觉 + 自动消失 | |
| showSnackbar 带 action 按钮 | 新增 showSnackbar API（action/duration），旧 showToast 保留 | |
| Rich Snackbar + tone 变体 | inverse-surface + tone="info|success|warn|error" + 左侧色条 + icon | ✓ |

| Question | Selected |
|----------|----------|
| 位置与堆叠 | 顶部固定 + 下堆叠（保持现状 top: 80px） |
| 关闭行为 | 自动消失（success/info=4s, warn/error=6s）+ 手动 close ✕ |

**User's choice:** Rich Snackbar + tone 变体（左侧 4dp 色条 + icon + inverse-surface 卡片）+ 顶部固定下堆叠 + 自动消失 + 手动 close
**Notes:** 用户初次回答「我不太理解这个问题，详细介绍一下」，追加详细中文解释后选 Rich Snackbar；Phase 11 不引入 action 按钮（Phase 12 撤销场景再补）

---

## Nav Rail 尺寸策略

| Option | Description | Selected |
|--------|-------------|----------|
| 240px 宽边栏（中文友好） | 保留 240px，仅换 MD3 视觉 | |
| 严格 MD3 80dp 窄栏 | 仅 icon，hover tooltip，user info/logo 移到 Header | ✓ |
| 折中：240px + collapsible | 默认 240px，可折叠 80dp | |

| Question | Selected |
|----------|----------|
| 被挤出的 logo/user info/logout | Sidecar Header 顶部条 |
| BottomBar MD3 重点 | active indicator pill + label 始终可见 + Safe area 适配（全选） |
| FAB-in-rail 棆位 | 页面层 Floating FAB（保持现状） |

**User's choice:** 严格 MD3 80dp 窄栏 + Sidecar Header 顶部条 + FAB 保持页面层
**Notes:** 用户明确要求 Sidebar = 80dp（与 MD3 spec 一致），不用 240px 中文友好折中；Header 升级为 Sidecar top bar（logo + page title + user menu）

---

## List Item 抽象深度

| Option | Description | Selected |
|--------|-------------|----------|
| 3-line + slots | 1/2/3-line 全覆盖 + slot-based (Leading/Content/Headline/Supporting/Trailing) | ✓ |
| 仅 1-line 最小 | 仅覆盖当前 3 个使用点 | |
| 仅变体 + children | variant prop + children 正文 | |

| Question | Selected |
|----------|----------|
| 交互设计（onClick + Divider + Avatar） | onClick 整行点击 + clickable 标志 |
| Divider 范围 | 引入独立 `<Divider>`（不仅 ListItem 内部隐式） |

**User's choice:** 3-line + slots + 整行 onClick + 引入独立 `<Divider>`
**Notes:** 用户初次回答「详细解释一下这几个选项」，追加详细中文解释后选 onClick 整行点击 + clickable 标志；Divider 独立组件化供页面级分隔符场景复用

---

## the agent's Discretion

- Modal close icon 字符（✕ vs `<Icon name="close">`）
- ListItem.Headline ellipsis 行为（text-overflow / -webkit-line-clamp）
- Snackbar tone 色条颜色精确值（primary/tertiary/error/secondary token）
- Sidebar 80dp 后 logo icon 选择（🍲 emoji vs `restaurant` Icon）
- BottomBar active indicator pill 颜色（secondary-container vs primary-container）
- Divider 缩进数值（56dp MD3 spec vs 16dp 简单 padding）
- `<ListItem>` 根元素（onClick 时 button，无 onClick 时 div）

---

## Deferred Ideas

### Snackbar action 按钮 — Phase 12 候选
- 当前 213 showToast 全是简单反馈，无撤销/重试场景
- Phase 12 破坏性操作 Undo 需求时启用 showSnackbar({message, action, duration})
- SnackbarContext 架构已预留扩展点

### 用户可自选主题 UI — 独立 future phase（from Phase 8）
- Phase 11 Header 右侧 user menu 预留主题切换位置

### BottomBar 折叠/展开手势 — 独立 future phase
- 当前 80dp 固定，无折叠手势

### Snackbar swipe-to-dismiss 手势 — 独立 future phase
- MD3 spec 支持，但需 framer-motion 或自定义 pointer event

### ToastContext → SnackbarContext 文件改名 — 本 phase 保留文件名
- 内部重写但保留 `ToastContext.jsx`（减少 import 改动）

### Avatar 组件化 — 推迟到 Phase 12 或独立 future phase
- ListItem leading 容器标准化（40×40dp）但不抽独立 `<Avatar>`
- Sidebar 底部 user chip 是首字母 avatar（仅 1 处使用），不需要组件化