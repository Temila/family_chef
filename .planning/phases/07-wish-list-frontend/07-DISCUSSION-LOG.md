# Phase 7: Wish List Frontend - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-22
**Phase:** 7-Wish List Frontend
**Areas discussed:** 页面架构与导航, Edit/Submit 交互模式, Chef 行动按钮位置, WishCard 信息密度, 状态徽章颜色

---

## 页面架构与导航

| Option | Description | Selected |
|--------|-------------|----------|
| 三个独立页面 | `/my-wishes` / `/chef/wishes` / `/admin/wishes` 三个独立路由, 角色门控 | ✓ |
| 单页 + 角色适配 | `/wishes` 根据 user.role 动态渲染 | |
| 两页面: 用户 + 共享 | `/my-wishes` + `/wishes` (chef/admin 共享) | |

| Option | Description | Selected |
|--------|-------------|----------|
| 独立顶级项 | user sidebar 加「💡 我的愿望」 | ✓ |
| 收入「我的」下拉 | 把「我的」拆成下拉菜单 | |
| 仅点菜页内 tab | 只在 OrderPage 加按钮 | |

| Option | Description | Selected |
|--------|-------------|----------|
| 两个 sidebar 项 | 「愿望队列」+「我的认领」分两个 nav 项 | |
| 一个 sidebar 项 + page tab | 「💡 愿望管理」+ 页面内 tab 切换 | ✓ |
| 一个 sidebar 项 + filter | 「💡 愿望队列」+ 顶部 status filter | |

| Option | Description | Selected |
|--------|-------------|----------|
| 同步给 admin | admin sidebar 加「💡 愿望总览」→ `/admin/wishes` | ✓ |
| admin 复用 chef 页面 | admin 不加额外项 | |
| 暂不管 admin | Phase 7 不为 admin 做独立入口 | |

**User's choice:** Three independent pages; user sidebar 独立顶级项; chef 一个 sidebar 项 + page tab [全部/待处理/我的认领]; admin 同步加。
**Notes:** 三个角色清晰隔离, 路由语义准确; chef 队列 vs 我的认领 用 tab 而非双 sidebar 项, 减少 nav 噪音。

---

## Edit/Submit 交互模式

| Option | Description | Selected |
|--------|-------------|----------|
| 三者全部 modal | 提交/编辑/拒绝都走 modal 弹层 | ✓ |
| 提交/编辑 modal + 拒绝路由 | 拒绝因文本多走路由 | |
| 全部走路由 | `/wishes/new` / `/wishes/:id/edit` / `/wishes/:id/reject` | |

| Option | Description | Selected |
|--------|-------------|----------|
| 页面右上角 + 按钮 | 浮动「+ 新建愿望」独立按钮 | ✓ |
| 列表底部 + 按钮 | 底部主按钮 | |
| 空状态引导提交 | 仅空状态时显示 | |

| Option | Description | Selected |
|--------|-------------|----------|
| 点 Card 开详情 modal | 点 Card 本身 → 详情 modal 含编辑/撤销 | |
| Card 右上角 ··· 菜单 | 三点菜单 [编辑] [撤销] [查看详情] | |
| Card 底部 inline 按钮 | [编辑] [撤销] 直接显示在底部 | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| 点击 → modal 填原因 | 简洁 modal, textarea + 确认 | ✓ |
| 理由弹窗 + 预设选项 | 提供「常见原因」下拉 | |
| 点拒绝 → 立即弹原因 | 顶设勾选项 | |

**User's choice:** All three forms use modal pattern; submit via 右上角 + 按钮; edit/cancel via Card 底部 inline 按钮; reject via modal textarea.
**Notes:** 一致的 modal-first 体验, 移动端一指完成, 不离开列表上下文。

---

## Chef 行动按钮位置

| Option | Description | Selected |
|--------|-------------|----------|
| Card 底部 inline | 固定一行按钮, 动作可见 | ✓ |
| 右上角 ··· 菜单 | 三点菜单弹出 | |
| 不同位置不同动作 | 高频认领 inline, 低频推进/拒绝 菜单 | |

| Option | Description | Selected |
|--------|-------------|----------|
| Modal 中选 dish | modal 弹起, 搜索 + 过滤 | ✓ |
| Modal + chef 预设 | 仅列 chef 自己发布的菜 | |
| 路由 /wishes/:id/advance | 跳转独立页 | |

| Option | Description | Selected |
|--------|-------------|----------|
| 全都要二次确认 | 所有动作都先弹 ConfirmModal | |
| 认领直接执行, 其他确认 | 推进/拒绝/撤销 要确认 | |
| 仅危险动作确认 | 仅 拒绝 + 撤销 要确认 | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Toast + 自动刷新 | Toast 错误 + 刷新列表 | ✓ |
| Toast 单独提示 | 仅 Toast, 不刷新 | |
| 列表项立即更新 | 静默 onError 更新 | |

**User's choice:** Card 底部 inline (与用户动作一致); 推进用 modal 选 dish (可搜索); 仅 拒绝 + 撤销 二次确认; 并发冲突 Toast + 自动刷新。
**Notes:** Action 位置统一降低认知成本; 二次确认仅用于不可逆/影响他人的操作。

---

## WishCard 信息密度

| Option | Description | Selected |
|--------|-------------|----------|
| 菜名 + 状态 + 时间 | 菜名(大字) + 状态徽章 + 时间 | ✓ |
| 菜名 + 状态 + 提交/认领 | 加 submitter/claimer 信息 | |
| 菜名 + 状态 + 链接预览 | 顶部显示参考链接域名 | |

| Option | Description | Selected |
|--------|-------------|----------|
| Card 内联展示 | 备注/链接/关联菜品/拒绝原因 inline | ✓ |
| 点 Card 看详情 modal | 全部二级信息在详情 modal | |
| 默认收起+展开 | 默认折叠, 底部「▼ 详情」展开 | |

| Option | Description | Selected |
|--------|-------------|----------|
| 显示 submitter_name | Chef 队列中显示「谁提的」 | ✓ |
| 仅「我的认领」展示 | 队列中不显示 | |
| 全部隐藏 | 匿名性 | |

| Option | Description | Selected |
|--------|-------------|----------|
| 菜名右上角小红点 | 8px 红色圆点 | ✓ |
| Card 左侧竖条 | 4px 红色竖条 | |
| 状态徽章加「●未读」 | 文字提示 | |

**User's choice:** 菜名+状态+时间 (顶部); 备注/链接/关联菜品/拒绝原因全部 inline; chef 队列显示 submitter_name; 未读红点用 8px 圆点。
**Notes:** 一屏 3-4 卡片密度合理; 二级信息按需展开避免视觉噪音。

---

## 状态徽章颜色 (UX-03)

| Option | Description | Selected |
|--------|-------------|----------|
| 默认 (warn/info/success/danger/muted) | 沿用现有订单/菜品颜色语义 | ✓ |
| 服务进程高亮 (accent) | 待处理=accent 让它最显眼 | |
| 二色为主 | 仅区分进行中 vs 终态 | |

**User's choice:** 默认颜色映射 — 待处理=warn, 准备中=info, 已上架=success, 已拒绝=danger, 已撤销=muted.
**Notes:** 沿用现有 badge 颜色系统, 无需新建 CSS class; 仅需在 statusBadge() map 加 5 个中文 key.

---

## the agent's Discretion

- API client method 命名与 URLSearchParams 参数格式 (遵循 getOrders / getDishes 现有 pattern)
- 列表刷新策略 (建议 30s 轮询 + visibility 触发)
- Chef sidebar 是否带「待处理 count」红点 (可选, 不锁定)
- Modal 关闭行为 (overlay 点击 / ESC 键)
- 空状态文案 (按页面差异)
- 加载骨架 / spinner (使用现有 Loading.jsx)
- 移动端断点 (沿用 styles.css 现有 420/768/1200px)
- 表单验证规则 (dish_name 必填, reference_url / reject_reason 长度限制)
- Edit modal 预填策略 (full prefill + 部分更新)
- `/admin/wishes` vs `/chef/wishes` 实现: 共享组件 + viewAsAdmin prop, 还是独立页面

## Deferred Ideas

- WISH-F01 愿望标签分类 (辣/素食/菜系等)
- WISH-F02 多参考链接
- WISH-F03 愿望评论/对话
- WISH-F04 愿望状态历史记录
- Chef sidebar 待处理 count 红点 (不在本次锁定范围, 可作为后续小幅增强)
- 愿望超时/回收机制 (项目 Out of Scope)
- 愿望自动转菜品草稿 (D-09 要求手动关联, 不自动创建)
