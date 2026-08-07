---
status: partial
phase: 19-account-bound-theme-preferences
source: [19-01-SUMMARY.md, 19-02-SUMMARY.md]
started: 2026-08-07T06:04:10Z
updated: 2026-08-07T06:12:00Z
---

## Current Test

number: 8
name: 用户删除级联清除偏好（D-A7 / FK CASCADE）
expected: |
  删除用户后 user_theme_preferences 行被 FK CASCADE 自动移除。需要数据库或管理员权限。
awaiting: 用户响应

## Tests

### 1. 冷启动冒烟测试
expected: 停止服务器，运行 `alembic upgrade head`，然后启动应用。服务器无报错启动，`user_theme_preferences` 迁移干净应用，应用可正常加载（健康检查返回 ok，前端可访问）。
result: pass

### 2. 登录时从服务器加载主题（D-A4）
expected: 已有服务器主题偏好的用户，在一个全新的浏览器/配置（localStorage 为空）中登录。登录后，其主题（当前主题、季节开关、半球、季节主题映射）从服务器应用到本设备——例如之前选过绿色 TonalSpot 主题并开启季节模式且半球=south，这些设置在本设备上重新出现。
result: pass
note: 初测发现主题切换触发后台请求无限循环（blocker），已在 6dc9602 修复（latest-ref 模式隔离用户键 effect 依赖）。复测通过。

### 3. 首次登录上传本地主题（D-A5）
expected: 服务器尚无偏好的用户（新账号，或 Phase 19 后首次）登录。其本地主题设置（fc_active_theme、fc_season_enabled、fc_hemisphere、fc_season_theme_map）作为初始载荷上传到服务器。验证方式：之后在第二台设备登录看到相同主题（或检查数据库 / GET /api/users/me/theme-preferences 返回 200 且包含本地值）。
result: pass
note: 初测自定义主题 PUT 被 422 拒绝（id 整数 vs schema str），已在 f3da4bf 修复（id 改为 Union[str,int]）。复测通过。附带观察：切换主题时卡片选中高亮短暂消失（已记录为测试 4 之后的待查项）。

### 4. 主题变更保存到服务器（D-A1）
expected: 登录状态下，修改当前主题。变更立即写入 localStorage 且约 200ms 后 PUT 更新服务器。刷新页面，新主题保留。重要边界情况：首次登录迁移（测试 3）之后立即做的第一次主题变更也必须保留。
result: pass
note: 初测发现切换主题时卡片高亮闪烁（已用 useLayoutEffect 在 7bace1a 修复）。

### 5. 登出清除账号绑定偏好（D-A6）
expected: 登出。localStorage 中 4 个账号绑定键被移除：fc_active_theme、fc_season_enabled、fc_hemisphere、fc_season_theme_map。主题状态重置为默认（DEFAULT_PRESET、季节关、north）。遗留键 fc_theme（亮/暗）和 fc_last_season（渲染缓存）保留。
result: pass
note: 初测发现 fc_active_theme 被 logout 后 useLayoutEffect 重新创建（WR-01），已在 a93ed65 修复（writeActiveThemeToStorage 加 user?.id 守门）。复测通过。

### 6. 未登录时隐藏 Header 主题控件（D-A2/D-A3）
expected: 在登录页（未登录/未认证），Header 不显示亮/暗主题切换按钮，也不显示调色板（主题选择器）按钮。只有用户登录后才出现。
result: pass
note: 附带发现 GuestOrderPage 固定移动端尺寸无法适配 PC（已记录为单独修复项，不阻塞 Phase 19 UAT）。

### 7. 跨用户主题隔离
expected: 登录为用户 A，设置一个醒目的主题（如红/橙预设）。登出，登录为用户 B。用户 B 看不到用户 A 的主题——B 看到 B 自己之前保存的主题（无则默认）。通过 GET /api/users/me/theme-preferences（作为 B）返回 B 的行（或 404）确认，绝不返回 A 的数据。
result: pass

### 8. 用户删除级联清除偏好（D-A7 / FK CASCADE）
expected: 删除用户后 user_theme_preferences 行被 FK ON DELETE CASCADE 自动移除。
result: issue
reported: "测试流程：admin 创建用户(uid=12) → 创建自定义主题(theme_id=2) → 创建主题偏好行 → admin 硬删用户。结果：users 表 0 行（已删），user_theme_preferences 表仍 1 行（孤儿，未被级联清理）。PRAGMA foreign_keys = 0。"
severity: blocker
note: 已知缺陷 CR-01 复现成功。SQLite 默认 PRAGMA foreign_keys=OFF，本应用 backend/app/database.py 缺少 connect listener 强制开启，导致 ON DELETE CASCADE 永不触发。test_cascade_delete_on_user_delete 是假阳性（conftest 意外开启 pragma 仅在 :memory: 测试连接）。

## Summary

total: 8
passed: 7
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "删除用户时 user_theme_preferences 行被 FK CASCADE 自动清理（不残留孤儿）"
  status: failed
  reason: "测试流程复现：用户删除后 user_theme_preferences 行残留（PRAGMA foreign_keys=0）"
  severity: blocker
  test: 8
  root_cause: "SQLite 默认 PRAGMA foreign_keys=OFF；backend/app/database.py 缺少 connect listener 强制 PRAGMA foreign_keys=ON；测试 conftest.py 的 .clean_all_tables 仅在 :memory: 测试连接上意外开启 pragma，掩盖了生产引擎缺陷"
  artifacts:
    - path: "backend/app/database.py"
      issue: "create_async_engine 后未注册 @event.listens_for(engine, 'connect') 启动 PRAGMA foreign_keys=ON"
    - path: "backend/tests/conftest.py"
      issue: "clean_all_tables 在 :memory: 测试连接上 PRAGMA foreign_keys ON/OFF 切换，意外掩盖生产引擎缺陷，造成 false-positive"
  missing:
    - "修复方案：backend/app/database.py 加 connect event listener 设 PRAGMA foreign_keys=ON；conftest.py 移除 toggle，让测试在 production-equivalent 连接上验证（这同时会暴露所有其他 FK CASCADE 表 custom_themes/wishes 等的同类缺陷）"
  debug_session: ""

- truth: "GuestOrderPage（访客点菜）适配 PC 端显示"
  status: resolved
  reason: "用户报告：访客点菜页面被固定为移动端尺寸，无法适配 PC 显示"
  severity: major
  test: 6 (附带发现)
  root_cause: ".guest-page CSS 强制 max-width: 420px，GuestOrderPage 路由不包 PcLayout"
  artifacts:
    - path: "frontend/src/css/styles.css"
      issue: ".guest-page 缺少 640/960+ 断点媒体查询"
  missing:
    - "已修复：.guest-page 在 640px+ 放宽到 640px、960px+ 放宽到 960px；.guest-cart-bar/.cart-detail-panel 同步跟随（commit aba7500）"
  debug_session: ""

- truth: "登出后 4 个账号绑定键全部移除（含 fc_active_theme 不被重新创建）"
  status: resolved
  reason: "用户报告：登出后 fc_active_theme 被重新创建（WR-01）"
  severity: major
  test: 5
  root_cause: "logout queueMicrotask 重置 activeTheme 为 DEFAULT_PRESET，触发 useLayoutEffect 调用 writeActiveThemeToStorage 把 fc_active_theme 写回"
  artifacts:
    - path: "frontend/src/theme/theme-context.jsx"
      issue: "writeActiveThemeToStorage 未守门 user?.id，登出态仍写入"
  missing:
    - "已修复：writeActiveThemeToStorage 加 user?.id 守门（commit a93ed65）"
  debug_session: ""

## Gaps

- truth: "自定义主题可作为 active_theme 上传到服务端偏好（PUT 200）"
  status: failed
  reason: "用户报告：点击自建测试主题1，后端 422：active_theme.id Input should be a valid string, input 1。自定义主题 id 是 DB 自增整数，但后端 ActiveThemePayload.id 定义为 Optional[str]，类型不匹配"
  severity: blocker
  test: 3
  root_cause: "待排查"     # 待排查
  artifacts: []      # 待排查
  missing: []        # 待排查
  debug_session: ""  # 待排查

- truth: "登录/切换主题时前端正常工作，不触发后台请求循环"
  status: resolved
  reason: "用户报告：点击切换后后台进入循环了，前端页面无法实现主题切换"
  severity: blocker
  test: 2
  root_cause: "theme-context.jsx 用户键 effect 把 refreshCustomThemes/refreshThemePreferences 放进依赖数组；refreshCustomThemes 身份依赖 activeTheme，每次主题变更触发回调新身份→effect 重跑→refreshThemePreferences GET 200 无条件 setActiveThemeState(新对象)→activeTheme 变→回调新身份→... 死循环，后端被 GET 请求刷屏"
  artifacts:
    - path: "frontend/src/theme/theme-context.jsx"
      issue: "用户键 effect 依赖含身份随 activeTheme 变化的回调，引发登录态下任一主题变更触发 GET→setState→重跑的无限循环"
  missing:
    - "已修复：用 latest-ref 模式（refreshCustomThemesRef/refreshThemePreferencesRef）持有回调，用户键 effect 依赖仅 [user?.id]，只在登录/登出时触发（commit 6dc9602）"
  debug_session: ""
