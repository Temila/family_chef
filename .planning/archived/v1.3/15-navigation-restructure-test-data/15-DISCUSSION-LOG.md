# Phase 15: Navigation Restructure & Test Data - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-29
**Phase:** 15-Navigation Restructure & Test Data
**Areas discussed:** Header 重组 (NAV-01), 头像下拉菜单 (NAV-02), Sidebar footer 清理 (NAV-03), 厨师移动端首页入口 (NAV-04), BottomBar tab 顺序 (NAV-05), 测试菜谱 seed 数据 (DATA-01 / BUG-06), 所有高级筛选弹窗化 (UI-01)

---

## Header 重组 (NAV-01)

| Option | Description | Selected |
|--------|-------------|----------|
| 保留 actions slot, Page 负责传入 div | Page 在 JSX 中以 `actions={<div className='header-action-bar'>...</div>}` 形式传入 | ✓ |
| 新增 <HeaderActionBar> 复合组件 | 在 `composites/HeaderActionBar.jsx` 创建独立组件 | |
| Page 自己控制布局结构 | Header 移除 actions prop、Page 自己写完整结构 | |

**User's choice:** 保留 actions slot, Page 负责传入 div
**Follow-up Q2:** 上边有 border-bottom 与 header 区分 — selected
**Follow-up Q3:** 只去 actions，logo + 标题 + 头像区域保持 — selected

---

## 头像下拉菜单 (NAV-02)

| Option | Description | Selected |
|--------|-------------|----------|
| 复用现有 /profile | 已有 UserProfilePage，提供名字/头像/口味偏好 | ✓ |
| 新建 /settings/profile 专用页 | 专用于账号资料编辑 | |
| 打开 Modal 弹出资料编辑 | 在下拉菜单中弹出 Modal | |

**User's choice:** 复用现有 /profile
**Follow-up Q2:** 两项之间加 Border separator — selected
**Follow-up Q3:** 保留信息区在菜单顶部 — selected

---

## Sidebar footer 清理 (NAV-03)

| Option | Description | Selected |
|--------|-------------|----------|
| 完全删除 footer div | Sidebar 从三块变为两块 | |
| 保留 footer div 置空状态占位 | CSS 预留 footer 高度 | |
| Footer 改为隐藏，设置 display: none | 保留结构但不可见 | |
| 保留footer div,显示版本号 | footer 区块保留 + 显示版本号 | ✓ |

**User's choice:** 保留footer div, 显示版本号
**Follow-up Q2:** 保留 logo — selected
**Follow-up Q3 (variant):** "sidebar不再包含主题切换按钮，sidebar的footer现在只用于显示版本号，主题切换按钮放到md-header里靠右挨着用户头像的位置"

---

## 厨师移动端首页入口 (NAV-04)

| Option | Description | Selected |
|--------|-------------|----------|
| 只给 chef | admin 通过 Sidebar 进入 | |
| Chef 和 Admin 都加 | admin 同时也是 Chef 角色 | |
| chef 加 admin 不加 | | |
| 对于chef和admin都需要在首页（admin是后台）的pc-main和md-buttom-bar中提供食材管理和菜品管理入口 | 详细版本 | ✓ |

**User's choice:** "对于chef和admin都需要在首页（admin是后台）的pc-main和md-buttom-bar中提供食材管理和菜品管理入口，确保在移动端模式下也可见"
**Follow-up Q2 (variant):** "食谱管理就是指菜品管理，之前的描述可能存在模糊的情况"
**Follow-up Q3:** 复用现有 quick-action grid — selected

---

## BottomBar tab 顺序 (NAV-05)

| Option | Description | Selected |
|--------|-------------|----------|
| 仅 chef | 仅 chef 调整 5 tab | |
| Chef + Admin 都要调整 | Chef + admin 角色调整 | |
| 对于所有角色，md-buttom-bar上的主页按钮都应该在最左边 | 全角色左侧放首页 | ✓ |

**User's choice (Q2):** "确保首页在最左侧，我的在最右侧，admin用户取消buttom-bar的退出按钮，中间的你自由排序，但需要保持不同角色的排序逻辑一致"
**Follow-up Q3 (variant):** "在上一个问题已经回答了"
**Follow-up Q4 (variant):** "选3，但不是所有角色都要有这7个入口，比如普通用户没有菜品和食材，根据角色的实际权限来，没有权限的就不显示"

**Final tab orders:**
- chef: 首页 / 订单 / 菜品 / 食材 / 愿望 / 点菜 / 我的 (7 tab)
- admin: 后台 / 菜品 / 食材 / 愿望 / 用户 / 点菜 / 我的 (7 tab, no logout)
- user: 首页 / 点菜 / 愿望 / 我的 (4 tab, no 菜品/食材)

---

## 测试菜谱 seed 数据 (DATA-01 / BUG-06)

| Option | Description | Selected |
|--------|-------------|----------|
| 加在 initial_data.py 默认进库 | Production 也会看到 | |
| 仅 dev 环境跳过 production | env flag 触发 | ✓ |
| 独立 fixture 脚本 | 脚本形式 | |
| 给admin,这个只是用来测试页面展示效果的 | 归属 admin | ✓ |
| 随机混合状态 | 字段状态随机混合 | ✓ |

**User's choice Q1:** 仅 dev 环境，跳过 production
**User's choice Q2:** 给admin
**User's choice Q3:** 随机混合状态

---

## 所有高级筛选弹窗化 (UI-01)

| Option | Description | Selected |
|--------|-------------|----------|
| 限定在 3 处 showAdvFilter 状态 | Phase 14 已 demo Sheet、补全其余 2 处 | |
| 包含所有 filter chip 控件 | 覆盖 AdminUsers/AdminCategories | |
| 不指定准确范围，agent 调整 | agent 识别 | |
| 点菜页面的展开筛选按钮、菜品管理的高级筛选按钮、食材管理的高级筛选按钮（这个已经修改过了） | 3 处：OrderPage + AdminDishes + AdminIngredients | ✓ |

**User's choice Q1:** 3 处弹窗化范围
**Follow-up Q2:** 顶部，与现有"搜索/清空"同行 — selected
**Follow-up Q3:** 复用现有 Sheet composite + footer 双按钮 — selected

---

## the agent's Discretion

- **版本号数据源**: agent 决定从 `config.yaml` 或 `package.json` 读取
- **D-NAV05-05 中间 tab 顺序**: agent 按"使用频率"或"工作流先后"决定
- **D-DATA01-03 随机数种子**: agent 决定是否使用固定种子，建议 `random.seed(42)` 保证一致性
- **8 个菜品的 status 反映**: agent 决定是否需要 `dish_chefs.status='published'` 保证 admin 能看到

## Deferred Ideas

- MOTION-05: MD3 motion duration/easing tokens 完善 — v2 deferred
- GORD-06: 访客备注功能 — v2 deferred
- 底部导航栏 Badge 整合 — 未来 phase
- Sidebar logo 替换为品牌缩写 — 视觉优化项
