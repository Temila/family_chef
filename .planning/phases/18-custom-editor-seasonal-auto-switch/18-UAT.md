---
status: resolved
phase: 18-custom-editor-seasonal-auto-switch
source: 18-01-SUMMARY.md, 18-03-SUMMARY.md, 18-04-SUMMARY.md, 18-05-SUMMARY.md
started: 2026-08-06T13:42:27Z
updated: 2026-08-06T16:45:00Z
---

## Current Test

[testing complete — diagnosed]

## Tests

### 1. 主题设置入口与路由
expected: 登录后进入 /theme，能看到 新建 与 主题设置 两个操作入口；/theme/editor 与 /theme/settings 深链接可打开，带返回按钮与底部导航
result: pass

### 2. 主题编辑器基础渲染
expected: 打开 /theme/editor，显示主色/次色/强调色三个取色器 + 十六进制输入框、9 个变体选择 chip、右侧（或下方）预览区
result: pass

### 3. 9 变体视觉区分（VERIFICATION 人工项 5）
expected: 在编辑器中依次切换全部 9 个变体（TonalSpot 到 FruitSalad），预览颜色有明显变化且文字保持可读
result: pass

### 4. 局部作用域预览与拖拽延迟（VERIFICATION 人工项 1）
expected: 拖动任意取色器，编辑器内预览区即时变色、无感知延迟；编辑器以外的页面区域保持静态不变
result: pass

### 5. 新建主题保存
expected: 输入名称保存后回到 /theme，新主题卡片出现在主题网格中；空名/纯空格/超长名称被拦截并显示中文错误提示
result: issue
reported: "退出后重进，只有主色调整时预览会有变化，次色和第三色修改时无变化"
severity: major

### 6. 编辑已有自定义主题
expected: 在自定义主题卡片点 编辑，编辑器预填该主题的主色与变体；修改颜色保存后卡片更新
result: issue
reported: "卡片保存成功，但选中卡片后主题色没有切换"
severity: major

### 7. 预设主题派生（fork）
expected: 在预设主题（春夏秋冬）卡片点 编辑，编辑器预填该季节配色、名称自动为 我的春/我的夏/我的秋/我的冬；保存后生成新的自定义主题
result: pass

### 8. 重名与删除保护
expected: 新建/重命名为已存在的名称时保存被拦截并显示 已存在同名主题 中文错误；删除需先弹出确认对话框，确认后才删除
result: pass

### 9. 季节自动切换设置
expected: /theme/settings 显示 季节自动切换 开关与 北半球/南半球 选择，并显示 开启后仅使用四季主题，手动应用失效 的提示；开启后当前季节预设成为活动主题
result: issue
reported: "通过，但选中主题后页面颜色没有变化"
severity: major

### 10. 自动模式互斥（D-09 mutex）
expected: 自动切换开启时，点击预设主题卡片不生效（no-op），点击自定义主题卡片跳转到编辑器而非应用；切换半球后主题立即按南半球季节反转
result: pass

### 11. 刷新持久化与首屏主题（VERIFICATION 人工项 2）
expected: 自动切换开启时刷新页面，首屏即为当前季节预设主题（无先白后闪错主题）；重新登录后开关与半球选择保持；手动应用的主题在刷新后保持
result: pass

### 12. 卡片操作防误触（VERIFICATION 人工项 3）
expected: 点击卡片上的 编辑/删除 按钮时，卡片本身不会被同时点击（不触发应用/跳转）；删除确认框正常出现
result: issue
reported: "同样的问题，点击卡片页面主题无变化，显示已选中。其他都通过"
severity: major

### 13. 移动端布局（VERIFICATION 人工项 4）
expected: 在 ≤420px 窄屏下打开 /theme/editor 与 /theme/settings，取色器、变体 chip 横滑、48dp 触控目标均可用，无横向溢出不可达
result: pass

## Summary

total: 13
passed: 8
issues: 6
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "拖动次色/第三色取色器时编辑器内预览应即时变化"
  status: resolved
  reason: "User reported: 退出后重进，只有主色调整时预览会有变化，次色和第三色修改时无变化"
  severity: major
  test: 5
  root_cause: "TonalSpot 变体走 deriveTonalSpotSchemes（themeFromSourceColor），MCU 把 secondary/tertiary 存入 theme.customColors 但 buildSchemeCss 从不读该字段；scheme[role] 与 palettes[role] 完全由 primary 派生。非 TonalSpot 路径（8 变体）用 DynamicScheme + secondaryPalette/tertiaryPalette 是正确的。"
  artifacts:
    - path: "frontend/src/theme/theme-engine.js"
      issue: "deriveTonalSpotSchemes (L160-183) passes secondary/tertiary as customColors but MCU ignores them for scheme roles"
    - path: "frontend/src/theme/theme-engine.js"
      issue: "buildSchemeCss (L106-126) only reads scheme[role] and palettes[role], never theme.customColors"
    - path: "frontend/src/components/theme/ThemePreview.jsx"
      issue: "No element uses --md-color-tertiary* tokens, so tertiary changes are invisible even after engine fix"
  missing:
    - "Switch TonalSpot path to DynamicScheme.from(primary) with explicit secondaryPalette=TonalPalette.fromInt(secondary) + tertiaryPalette=TonalPalette.fromInt(tertiary), same as other 8 variants"
    - "Add a tertiary-visible token usage in ThemePreview.jsx (e.g., tertiaryContainer color block)"
  debug_session: .planning/debug/secondary-tertiary-preview.md

- truth: "保存自定义主题后该主题应自动应用为活动主题（点击卡片应切换主题色）"
  status: resolved
  reason: "User reported: 卡片保存成功，但选中卡片后主题色没有切换"
  severity: major
  test: 6
  root_cause: "CSS 级联顺序：Vite dev 模式下 tokens.css 的 <style> 标签注入到 <head> 中 fc-dynamic-theme 之后，两者都以 :root 为选择器且特异性相同 (0,1,0)，后者胜出。injectThemeCss 更新了 element.textContent 但未重新定位元素，导致动态主题被 tokens.css 覆盖。"
  artifacts:
    - path: "frontend/src/theme/theme-engine.js"
      issue: "injectThemeCss (L254-262) updates textContent but never re-appends element to end of <head>"
  missing:
    - "Add document.head.appendChild(element) after textContent assignment to ensure fc-dynamic-theme is always the last child of <head>"
  debug_session: .planning/debug/save-not-applying.md

- truth: "重名错误除当前错误提示外还需弹出式卡片提醒"
  status: resolved
  reason: "User reported: 通过，但同名的错误提示不够明显，除当前的错误提示外，需要再通过弹出式的卡片来提醒"
  severity: minor
  test: 8
  root_cause: "ThemeEditorPage.jsx:265 重名 catch 分支只调用 setNameError，缺少并行 showToast 调用。useToast 已导入、SnackbarProvider 已挂载、error 变体已支持，唯独缺这一行。"
  artifacts:
    - path: "frontend/src/pages/ThemeEditorPage.jsx"
      issue: "L265 catch block only calls setNameError for duplicate-name, missing parallel showToast call"
  missing:
    - "Add showToast(`已存在同名主题：${finalName}`, 'error') alongside setNameError in the duplicate-name catch branch"
  debug_session: .planning/debug/duplicate-toast-enhancement.md

- truth: "开启季节自动切换后页面颜色应反映当前季节预设主题"
  status: resolved
  reason: "User reported: 通过，但选中主题后页面颜色没有变化"
  severity: major
  test: 9
  root_cause: "同 Test 6 — CSS 级联顺序。setSeasonEnabled(true) → applyCurrentSeason → applySeasonalPresetDirect → setActiveThemeState → useEffect[activeTheme] → injectThemeCss 逻辑链正确，但 tokens.css 覆盖了 fc-dynamic-theme。"
  artifacts:
    - path: "frontend/src/theme/theme-engine.js"
      issue: "injectThemeCss (L254-262) — same cascade ordering bug as Test 6"
  missing:
    - "Same fix as Test 6 — re-append fc-dynamic-theme to end of <head> on every injectThemeCss call"
  debug_session: .planning/debug/seasonal-no-color-change.md

- truth: "自动模式下自定义主题卡片应显示编辑按钮（与手动模式一致），卡片本身点击不应跳转"
  status: resolved
  reason: "User reported: 通过，第二点不符合要求，不是点击主题卡片跳转，而是需要提供编辑按钮（与季节开关关闭时一致）"
  severity: minor
  test: 10
  root_cause: "ThemePage.jsx handleThemeClick 在 auto+custom 时执行 navigate('/theme/editor?themeId=...')（L73-75），与 auto+preset 的 silent no-op 不一致。编辑按钮已在自定义卡片上始终渲染（onEdit prop 对 kind==='custom' 永远传入），无需修改。"
  artifacts:
    - path: "frontend/src/pages/ThemePage.jsx"
      issue: "handleThemeClick L73-75 navigate branch for auto+custom should be removed; card-body click should be no-op like preset"
  missing:
    - "Remove the auto+custom navigate branch in handleThemeClick, making it a no-op (return early like auto+preset)"
    - "Update ThemePage.jsx docstring (L15) to reflect new behavior"
  debug_session: .planning/debug/auto-mode-edit-button.md

- truth: "手动模式下点击主题卡片空白区域应正常应用主题（页面颜色变化）"
  status: resolved
  reason: "User reported: 同样的问题，点击卡片页面主题无变化，显示已选中。其他都通过"
  severity: major
  test: 12
  root_cause: "同 Test 6/9 — CSS 级联顺序。handleThemeClick → setActiveTheme → useEffect → injectThemeCss 写入 CSS 但被 tokens.css 覆盖。卡片 'selected' 指示器正常（由 React state 驱动，非 CSS 变量）。"
  artifacts:
    - path: "frontend/src/theme/theme-engine.js"
      issue: "injectThemeCss (L254-262) — same cascade ordering bug as Test 6"
  missing:
    - "Same fix as Test 6 — re-append fc-dynamic-theme to end of <head>"
  debug_session: .planning/debug/card-click-no-apply.md
