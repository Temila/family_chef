---
status: partial
phase: 19-account-bound-theme-preferences
source: [19-01-SUMMARY.md, 19-02-SUMMARY.md]
started: 2026-08-07T06:04:10Z
updated: 2026-08-07T06:12:00Z
---

## Current Test

[testing paused — 测试 2 发现 blocker，已停止 UAT 先修复]

## Tests

### 1. 冷启动冒烟测试
expected: 停止服务器，运行 `alembic upgrade head`，然后启动应用。服务器无报错启动，`user_theme_preferences` 迁移干净应用，应用可正常加载（健康检查返回 ok，前端可访问）。
result: pass

### 2. 登录时从服务器加载主题（D-A4）
expected: 已有服务器主题偏好的用户，在一个全新的浏览器/配置（localStorage 为空）中登录。登录后，其主题（当前主题、季节开关、半球、季节主题映射）从服务器应用到本设备——例如之前选过绿色 TonalSpot 主题并开启季节模式且半球=south，这些设置在本设备上重新出现。
result: issue
reported: "点击切换后后台进入循环了，前端页面无法实现主题切换"
severity: blocker

### 3. 首次登录上传本地主题（D-A5）
expected: 服务器尚无偏好的用户（新账号，或 Phase 19 后首次）登录。其本地主题设置（fc_active_theme、fc_season_enabled、fc_hemisphere、fc_season_theme_map）作为初始载荷上传到服务器。验证方式：之后在第二台设备登录看到相同主题（或检查数据库 / GET /api/users/me/theme-preferences 返回 200 且包含本地值）。
result: [pending]

### 4. 主题变更保存到服务器（D-A1）
expected: 登录状态下，修改当前主题（如选择不同预设）。变更立即写入 localStorage，且约 200ms 后一次防抖 PUT 更新服务器。刷新页面——新主题保留。重要边界情况：首次登录迁移（测试 3）之后立即做的第一次主题变更也必须保留——如果第一次变更被静默丢弃，请报告（疑似缺陷 CR-02）。
result: [pending]

### 5. 登出清除账号绑定偏好（D-A6）
expected: 登出。localStorage 中 4 个账号绑定键被移除：`fc_active_theme`、`fc_season_enabled`、`fc_hemisphere`、`fc_season_theme_map`。主题状态重置为默认（DEFAULT_PRESET、季节关、north）。遗留键 `fc_theme`（亮/暗）和 `fc_last_season`（渲染缓存）保留。已知疑似缺陷 WR-01：登出后 `fc_active_theme` 可能被主题效应重新创建——如果看到它重新出现，请报告。
result: [pending]

### 6. 未登录时隐藏 Header 主题控件（D-A2/D-A3）
expected: 在登录页（未登录/未认证），Header 不显示亮/暗主题切换按钮，也不显示调色板（主题选择器）按钮。只有用户登录后才出现。
result: [pending]

### 7. 跨用户主题隔离
expected: 以用户 A 登录，设置一个醒目的主题（如红/橙预设）。登出，以用户 B 登录。用户 B 看不到用户 A 的主题——B 看到 B 自己之前保存的主题（无则默认）。通过 GET /api/users/me/theme-preferences（作为 B）返回 B 的行（或 404）确认，绝不返回 A 的数据。
result: [pending]

### 8. 用户删除级联清除偏好（D-A7 / FK CASCADE）
expected: 对一个有主题偏好行的用户，删除该用户（如直接数据库 `DELETE FROM users WHERE id=<uid>`，或通过管理员删除用户接口）。对应的 `user_theme_preferences` 行由 FK ON DELETE CASCADE 自动移除。验证：`SELECT COUNT(*) FROM user_theme_preferences WHERE user_id=<uid>` 返回 0。已知疑似缺陷 CR-01：本应用 SQLite 默认 `PRAGMA foreign_keys=0`，因此级联可能不触发、行可能成为孤儿——如果计数保持为 1，请报告。（需要数据库或管理员权限。）
result: [pending]

## Summary

total: 8
passed: 1
issues: 1
pending: 6
skipped: 0
blocked: 0

## Gaps

- truth: "登录/切换主题时前端正常工作，不触发后台请求循环"
  status: failed
  reason: "用户报告：点击切换后后台进入循环了，前端页面无法实现主题切换"
  severity: blocker
  test: 2
  root_cause: "theme-context.jsx 用户键 effect 把 refreshCustomThemes/refreshThemePreferences 放进依赖数组；refreshCustomThemes 身份依赖 activeTheme，每次主题变更触发回调新身份→effect 重跑→refreshThemePreferences GET 200 无条件 setActiveThemeState(新对象)→activeTheme 变→回调新身份→... 死循环，后端被 GET 请求刷屏"
  artifacts:
    - path: "frontend/src/theme/theme-context.jsx"
      issue: "用户键 effect 依赖含身份随 activeTheme 变化的回调，引发登录态下任一主题变更触发 GET→setState→重跑的无限循环"
  missing:
    - "已修复：用 latest-ref 模式（refreshCustomThemesRef/refreshThemePreferencesRef）持有回调，用户键 effect 依赖仅 [user?.id]，只在登录/登出时触发"
  debug_session: ""
