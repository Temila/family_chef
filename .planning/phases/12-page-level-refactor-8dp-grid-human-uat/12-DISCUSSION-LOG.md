# Phase 12: Page-Level Refactor + 8dp Grid + HUMAN-UAT - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-28
**Phase:** 12-Page-Level Refactor + 8dp Grid + HUMAN-UAT
**Areas discussed:** 8dp 网格审计 / 旧类残留+直角终扫 / HUMAN-UAT 6 流 / emoji+Snackbar+MOTION-05 / 优先级与执行顺序 / 用户提出的 bug 修复

---

## Area 1: 8dp 网格间距舍入策略

| Option | Description | Selected |
|--------|-------------|----------|
| 舍入到最近 spacing | 10px→8px, 14px→16px, 18px→16px 等 | ✓ |
| 保留原值用 calc | calc(var(--md-spacing-2) + 2px) | |
| 按场景判断 | 大部分强行舍入，极少数视觉敏感处 calc | |

**User's choice:** 舍入到最近 spacing

---

## Area 1.5: 审计方式

| Option | Description | Selected |
|--------|-------------|----------|
| grep + 手动替换 | grep 列出候选 → 逐个判断替换 | ✓ |
| 脚本辅助半自动 | Node 脚本扫描+建议 | |

**User's choice:** grep + 手动替换（推荐）

---

## Area 1.6: CI 防护

| Option | Description | Selected |
|--------|-------------|----------|
| 加 grep CI 检查 | CI/lint-staged 拦截新裸 px 间距 | ✓ |
| 不加，靠 code review | 一次性清扫 | |

**User's choice:** 加 grep CI 检查

---

## Area 2: 旧类残留审计范围

| Option | Description | Selected |
|--------|-------------|----------|
| 只清样式表，不验证消费 | Phase 10/11 已迁移 | |
| 全量 grep 验证消费=0 | CSS + JSX 两端双保险 | ✓ |

**User's choice:** 全量 grep 验证消费=0

---

## Area 2.5: 直角终扫方式

| Option | Description | Selected |
|--------|-------------|----------|
| grep + 手动修复 | 简单直接 | |
| 引入 stylelint 规则 | 长期守门；修复登录页输入框直角 | ✓ |
| CI grep 规则 | 与间距检查合并 | |

**User's choice:** 引入 stylelint，另外现在还有直角残留（例如登陆页面的输入框），一并修复

---

## Area 2.6: CI grep 规则机制

| Option | Description | Selected |
|--------|-------------|----------|
| 本地 scripts + CI grep | `frontend/scripts/check-m3-tokens.sh` | ✓ |
| GitHub Actions workflow | 独立 workflow 文件 | |

**User's choice:** 本地 scripts + CI grep（推荐）

---

## Area 3: HUMAN-UAT 范围（哪些流）

| Option | Description | Selected |
|--------|-------------|----------|
| 注册登录 | LoginPage/ForceChangePasswordPage | ✓ |
| 菜品 CRUD | AdminDishesPage/ChefDishesPage | ✓ |
| 订单创建 | OrderPage/OrderDetailPage | ✓ |
| 愿望单生命周期 | UserWishesPage/ChefWishesPage | ✓ |
| 访客点菜 | InvitationsPage/GuestOrderPage | ✓ |
| 口味偏好 | PreferencesPage | ✓ |

**User's choice:** 6 个流全部纳入

---

## Area 3.5: UAT 验证方式

| Option | Description | Selected |
|--------|-------------|----------|
| 开发者手动 + 额外工具 | DevTools + spacing/radius/icon click/header duplicate/Ripple | ✓ |
| Playwright 脚本辅助 | 扩展 Phase 9 脚本 | ✓ |
| MD3 6 维度视觉走查 | 6 维度逐一兑现 | ✓ |

**User's choice:** 三种全用

---

## Area 3.6: UAT 通过标准

| Option | Description | Selected |
|--------|-------------|----------|
| 截图对比前后 | 视觉差异证据 | |
| DevTools DOM 检测 | 事件绑定 + token 正确性 | ✓ |
| Console 检查零警告 | 无 warning/error | |
| grep + lint + build 三重门 | 零 error + 零残留 | ✓ |
| 用户亲自人工浏览 | 用户原话："我会人工浏览每个界面，并告诉你问题" | ✓ |

**User's choice:** DevTools DOM 检测 + grep + lint + build + 用户人工浏览

---

## Area 4: emoji→Icon 清理

| Option | Description | Selected |
|--------|-------------|----------|
| 纳入 Phase 12（推荐） | v1.2 最后一 phase | ✓ |
| 推迟到 v1.3 | 后续 polish | |

**User's choice:** 纳入 Phase 12（推荐）

---

## Area 4.5: Snackbar action 按钮

| Option | Description | Selected |
|--------|-------------|----------|
| 仅扩展 API | showToast({message, action, duration}) | |
| 启用 + 调用示例 | 撤销愿望/订单场景调用 | ✓ |
| 不启用，继续延后 | 不动 SnackbarContext | |

**User's choice:** 启用 + 调用示例

---

## Area 4.6: MOTION-05 补全

| Option | Description | Selected |
|--------|-------------|----------|
| 纳入 Phase 12（推荐） | grep styles.css 全量消费 --md-motion-* | ✓ |
| 不动 Phase 12 | v1.3 动效优化 | |

**User's choice:** 纳入 Phase 12（推荐）

---

## Area 5: Plan 划分

| Option | Description | Selected |
|--------|-------------|----------|
| 加 12-00 修 bug | 12-00-BUGFIX → 12-01 → 12-02 串行 | ✓ |
| 合并到 12-01 | 12-01 第一个 task 修 bug | |
| 不合入 Phase 12 | hotfix 路径 | |

**User's choice:** 加 12-00 修 bug（推荐）

---

## Area 5.5: Wave 划分

| Option | Description | Selected |
|--------|-------------|----------|
| 串行 12-01 → 12-02 | 逻辑顺序清晰 | ✓ |
| 12-02 部分与 12-01 并行 | Playwright 脚本同步编写 | |

**User's choice:** 串行 12-01 → 12-02（推荐）

---

## Area 5.6: Scope 边界

| Option | Description | Selected |
|--------|-------------|----------|
| 不拆分，就一起做 | 3 plans 装得下 | ✓ |
| 部分拆出 Phase 13 | Stylelint + emoji 拆出 | |

**User's choice:** 不拆分，就一起做

---

## 用户提出的 bug 修复（不计入 gray areas 但需记录）

### Bug 1: Ripple 鼠标点击被阻断

**现象（用户原话）：** "所有图标按钮都无法用鼠标点击，但可以通过键盘tab选中后enter交互"
**结论：** v1.2 回归 bug，必须 Phase 12-00-BUGFIX 修复
**记录：** D-BUG-01 in CONTEXT.md

### Bug 2: Sidecar Header 重复渲染

**现象（用户原话）：** "header重复了，两个header的xpath分别是/html/body/div/div/header；/html/body/div/div/main/div，保留第二个即可"
**结论：** 删除 App.jsx PcLayout 中的 `<Header />`，保留页面级 Header
**记录：** D-BUG-02 in CONTEXT.md

---

## the agent's Discretion

- Ripple 修复具体方案选择（D-BUG-01 三选一）
- 删除 Sidecar Header 后退出/主题切换入口评估
- stylelint 规则集广度（除 border-radius 外是否禁止其他硬编码）
- Snackbar action 按钮的 UX 细节（位置/优先级/颜色）
- Playwright 脚本的深度（happy path vs 错误流）
- MOTION-05 的 0.5s emphasized 使用场景识别
- emoji 替换的图标选集边界（非图标语义保留为字符）

---

## Deferred Ideas

### Stylelint 规则的扩展范围
后续 polish phase 可扩展其他规则（width/padding/font-size 硬编码）

### 主题选择器 UI
独立 future phase，删除 Sidecar Header 后 theme toggle menu 需评估迁移

### Avatar 组件化
独立 future phase

### Snackbar swipe-to-dismiss 手势
独立 future phase

### BottomBar 折叠/展开手势
独立 future phase