# Phase 4: Frontend Guest - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 4-Frontend Guest
**Areas discussed:** 访客页架构, 菜品浏览与购物车, 提交后确认, 错误状态展示

---

## 访客页架构

### SPA 集成方式

| Option | Description | Selected |
|--------|-------------|----------|
| App.jsx 内新路由 | 在 Routes 中添加 /guest/:token，PcLayout 外、AuthProvider 外。独立 ToastProvider。共享同一 HTML 入口。 | ✓ |
| 完全独立入口 | 新建 guest.html + guest-main.jsx，需修改 Vite 多页配置。 | |

**User's choice:** App.jsx 内新路由

### API 客户端

| Option | Description | Selected |
|--------|-------------|----------|
| 不用 ApiClient | 直接用 fetch 调用 /api/guest/*，避免 401 跳转。仅 3 个 API 调用。 | ✓ |
| ApiClient + skipAuth | 扩展 ApiClient 添加参数，复用但增加复杂度。 | |

**User's choice:** 不用 ApiClient

### 路由结构

| Option | Description | Selected |
|--------|-------------|----------|
| 单路由 + 内部状态切换 | /guest/:token 一个路由，内部根据 token 状态切换视图。 | ✓ |
| 多路由 | 浏览/确认/错误分多个路由，增加复杂度。 | |

**User's choice:** 单路由 + 内部状态切换

### CSS 隔离

| Option | Description | Selected |
|--------|-------------|----------|
| 共享 styles.css + 主题继承 | 导入现有样式，继承系统明暗偏好，复用类名，添加访客专用 CSS。 | ✓ |
| 完全独立样式 | 不导入 styles.css，视觉可能不一致。 | |

**User's choice:** 共享 styles.css + 主题继承

---

## 菜品浏览与购物车

### 菜品卡片

| Option | Description | Selected |
|--------|-------------|----------|
| 访客专用 GuestDishCard | 简化为图片+菜名+分类+加购按钮，无收藏/警告/厨师头像。 | ✓ |
| 复用 DishCard + guestMode prop | 通过 prop 控制行为，但 DishCard 承担过多职责。 | |

**User's choice:** 访客专用 GuestDishCard

### 加购交互

| Option | Description | Selected |
|--------|-------------|----------|
| 卡片内直接 +/- | "+"按钮 → "- 数量 +"步进器。单手操作友好，类似外卖 App。 | ✓ |
| 点击卡片弹窗加购 | 弹窗展示详情后加购。多一步操作。 | |

**User's choice:** 卡片内直接 +/-

### 筛选能力

| Option | Description | Selected |
|--------|-------------|----------|
| 搜索 + 分类筛选 | 搜索框 + 分类，不支持高级筛选。简洁。 | |
| 仅搜索 | 最简化，菜品多时体验差。 | |
| 完整筛选 | 复用 OrderPage 全部筛选。功能全但复杂。 | |

**User's choice:** 搜索 + 除收藏、排序外的其余筛选功能（地域、菜系、口味、季节、食材分类）
**Notes:** 需要单独获取分类数据（CategoriesProvider 在访客路由外）

### 购物车交互

| Option | Description | Selected |
|--------|-------------|----------|
| 底部固定购物车栏 | 类似美团/饿了么，显示数量+提交按钮，点击展开详情。 | ✓ |
| 浮动按钮 + 全屏弹窗 | 右下角 badge 按钮，精巧但不够直观。 | |

**User's choice:** 底部固定购物车栏

### 备注功能

| Option | Description | Selected |
|--------|-------------|----------|
| 购物车面板内 | textarea 在展开面板底部。 | |
| 确认弹窗中 | 点击提交后弹窗中填写。 | |

**User's choice:** 与现有点单系统保持一致，不提供备注功能
**Notes:** 原需求 GORD-06 规划了备注功能，此决定将其移除

---

## 提交后确认

### 确认页形式

| Option | Description | Selected |
|--------|-------------|----------|
| 全页确认 | 页面内容替换为确认页。清晰明确。 | ✓ |
| 弹窗确认 | Modal 确认，背景仍为菜品页。 | |

**User's choice:** 全页确认

### 确认页内容

| Option | Description | Selected |
|--------|-------------|----------|
| 核心信息 + 等待提示 | 订单号 + 菜品列表 + 厨师名 + 等待提示 + "关闭本页即可"。 | ✓ |
| 极简确认 | 仅"订单已提交" + 订单号。 | |

**User's choice:** 使用方案1，标题改为"点单成功"

---

## 错误状态展示

### 错误页形式

| Option | Description | Selected |
|--------|-------------|----------|
| 全页错误状态 | 大图标 + 中文标题 + 说明 + "请联系邀请人"。 | ✓ |
| 区分已使用（摘要）和其他错误 | 已使用展示摘要，其他展示错误。 | |

**User's choice:** 全页错误状态

### 已使用链接处理

| Option | Description | Selected |
|--------|-------------|----------|
| 显示订单摘要 | 只读摘要：订单号 + 菜品列表 + "这是您已提交的点单"。友好体验。 | ✓ |
| 统一错误页 | 也显示"已使用"错误页，访客无法回顾点单。 | |

**User's choice:** 显示订单摘要

### 微信兼容性

| Option | Description | Selected |
|--------|-------------|----------|
| Planner 注意兼容性 | 标准 CSS/JS，不用 Web Share，CSS 变量/flexbox 安全。 | ✓ |
| 引入微信 JS-SDK | 增加复杂度但功能更强。 | |

**User's choice:** Planner 注意兼容性即可

---

## the agent's Discretion

- GuestDishCard 具体布局细节
- 购物车展开面板样式
- 筛选区域折叠/展开方式
- 确认页和错误页排版、图标、颜色
- 访客页面分类数据获取方式

## Deferred Ideas

- 备注功能（GORD-06）— 与现有点单系统保持一致移除
- 邀请剩余时间倒计时（EUX-01）— v2 需求
- 二维码生成（EUX-02）— v2 需求
- 访客显示名（EUX-03）— v2 需求
