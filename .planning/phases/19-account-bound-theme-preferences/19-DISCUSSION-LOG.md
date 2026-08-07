# Phase 19: Account-Bound Theme Preferences - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-07
**Phase:** 19-Account-Bound Theme Preferences
**Areas discussed:** 多设备写竞态, 未登录→登录合并, 访客/未登录场景, 登录后首帧一致性, 现有用户迁移

---

## 多设备写竞态

| Option | Description | Selected |
|--------|-------------|----------|
| 服务器最后写入胜 | 写入时服务器总是赢。设备 B 下次拉取服务器值时本地被覆盖。 | ✓ |
| 设备最后写入胜 | 本地有未同步修改时，本地赢；上传服务器后服务器赢。 | |
| 时间戳/版本胜 | 服务器与本地都带 last_updated_at，较新者赢；需手动解决极少见冲突。 | |
| 全字段合并（per-field LWW） | 每个字段独立 LWW；同设备同时改不同字段不互相覆盖。 | |

**User's choice:** 服务器最后写入胜
**Notes:** 用户明确偏好"服务器为本"，与项目整体"账号优先"取向一致。简单可预测。

---

## 未登录→登录合并

| Option | Description | Selected |
|--------|-------------|----------|
| 服务器覆盖本地 | 登录成功后立即拉服务器值覆写 localStorage。 | |
| 本地覆盖服务器 | 以本地为准覆盖服务器。 | |
| 提示用户选择 | 弹出对话框选择保留哪个。 | |
| 未登录隐藏主题设置 | 未登录不出现主题设置入口。 | ✓ |

**User's choice:** 未登录隐藏主题设置
**Notes:** 最严格安全模型；消除"未登录临时偏好"概念本身，与 Area 3 联动。

---

## 访客/未登录场景

| Option | Description | Selected |
|--------|-------------|----------|
| 隐藏主题设置入口 | /theme/settings 路由未登录不进入；header 切换按钮保留但仅作用于本地。 | |
| 完全隐藏主题设置 | /theme/settings 路由未登录不进入；header 切换按钮未登录时也隐藏。 | ✓ |
| 对访客保持全部现状 | 未登录体验与 Phase 18 完全一致。 | |

**User's choice:** 完全隐藏主题设置
**Notes:** 与 D-A2 联动；最严格"未登录 = 无主题"模型。Header 切换按钮对未登录用户隐藏。

---

## 登录后首帧一致性

| Option | Description | Selected |
|--------|-------------|----------|
| 接受短暂不一致 | 登录后 fetch 服务器值、静默更新；当前页面可能闪一次。 | ✓ |
| 登录后强制刷新 | 登录成功后 window.location.reload()。 | |
| 仅提示不一致 | 弹出 toast 提示用户刷新。 | |

**User's choice:** 接受短暂不一致
**Notes:** 与 D-A1 server LWW 一致——服务器是真相源，但不在登录瞬间强制 reload 打断交互。

---

## 现有用户迁移

| Option | Description | Selected |
|--------|-------------|----------|
| 本地优先上传 | 服务器返回 null 时，客户端自动将 localStorage 上传到服务器。 | ✓ |
| 服务器默认 | 服务器返回默认偏好覆写本地；现有用户被"重置"。 | |
| 提示用户决定 | 首次不一致时弹对话框让用户选择。 | |

**User's choice:** 本地优先上传
**Notes:** 现有用户体验不被打断，平滑升级路径。

---

## the agent's Discretion

- GET 不存在偏好时返回 404 vs 全 null
- 登录后 fetch 触发时机（login 回调 vs useEffect）
- PUT 频率优化（debounce 粒度）
- 登出清理范围（fc_theme / fc_last_season 是否清理）
- fetch 失败时是否弹 toast
- PUT 是否需要 ETag/版本号防并发覆盖

## Deferred Ideas

- 跨用户共享主题模板 / 导入导出 / URL 分享
- per-field 合并 / CRDT
- 未登录用户主题偏好持久化
- 主题偏好导入其他账号
- 登出时清理 fc_theme / fc_last_season
- 后端历史偏好变更日志

---

*Phase: 19-Account-Bound Theme Preferences*
*Discussion log generated: 2026-08-07*