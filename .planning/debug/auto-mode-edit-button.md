---
status: diagnosed
trigger: "UAT Test 10 — 自动模式下自定义主题卡片应显示编辑按钮（与手动模式一致），卡片本身点击不应跳转"
created: 2026-08-06T14:30:00Z
updated: 2026-08-06T14:30:00Z
---

## Current Focus

hypothesis: ThemePage.handleThemeClick 在 auto+custom 分支调用 navigate() — 用户期望该分支为 no-op
test: 已通过静态阅读确认代码路径
expecting: 根因定位在 handleThemeClick 第 73-75 行
next_action: 写出 ROOT CAUSE FOUND 结论

## Symptoms

expected: 自动模式下自定义主题卡片显示编辑按钮（与手动模式一致），卡片本身点击不应跳转
actual: 当前实现 — 卡片点击仍调用 navigate(/theme/editor?themeId=...) 跳转到编辑器
errors: 无运行时错误；为行为偏差
reproduction: UAT Test 10 — 开启季节自动切换后点击自定义主题卡片
started: 2026-08-06 UAT 阶段

## Eliminated

- hypothesis: 编辑按钮在 auto 模式下被隐藏
  evidence: ThemePage.jsx:168 `onEdit={theme.kind === 'custom' || !seasonEnabled ? ...}` — custom theme 始终传 onEdit；ThemeCard.jsx:78 `const showEdit = typeof onEdit === 'function'` — 因此自定义卡片在两种模式下均渲染编辑按钮
  timestamp: 2026-08-06T14:30:00Z

- hypothesis: 编辑按钮 stopPropagation 漏掉导致双触发
  evidence: ThemeCard.jsx:37-44 stopEvent() 同时 stopPropagation + preventDefault；:81-84 handleEditClick 先 stopEvent 再调 onEdit
  timestamp: 2026-08-06T14:30:00Z

## Evidence

- timestamp: 2026-08-06T14:30:00Z
  checked: ThemePage.jsx 全文件
  found: |
    - L70-79 handleThemeClick：seasonEnabled=true 且 theme.kind==='custom' 时调用 navigate(`/theme/editor?themeId=${id}`)。
    - L168 onEdit 接线：`theme.kind === 'custom' || !seasonEnabled` — 自定义卡片两种模式下均传入 onEdit。
    - L82-94 handleEdit：custom 一律 navigate(/theme/editor?themeId=...)，与 handleThemeClick 同一目标 URL。
  implication: 唯一多余行为是 L73-75 的卡片单击跳转；编辑按钮接线已正确。

- timestamp: 2026-08-06T14:30:00Z
  checked: ThemeCard.jsx
  found: |
    - L78 showEdit 仅依赖 onEdit 是否为函数（页面层负责传 / 不传）。
    - L110-122 渲染编辑按钮（当 showEdit=true）。
    - L81-89 stopEvent 守卫完整。
  implication: 卡片层无 bug；问题在页面层 handleThemeClick。

- timestamp: 2026-08-06T14:30:00Z
  checked: theme-context.jsx D-09 互斥闸门
  found: |
    - L205-209 setActiveTheme 在 seasonEnabled 时返回 false 不变主题。
    - L214-218 resetToDefault 同样受闸门保护。
    - L294-296 applySeasonalPresetDirect 是唯一的旁路，仅供 useEffect 调用。
  implication: 上下文层与"卡片单击不应应用"语义一致；handleThemeClick 不应在 auto 模式下调用 setActiveTheme，但调用 navigate 是额外的副作用。

- timestamp: 2026-08-06T14:30:00Z
  checked: 18-05-SUMMARY.md 设计记录
  found: |
    - L50 key-decisions: "Auto mode preset card click is a silent no-op (D-10) — no apply, no toast; custom card click navigates to editor with themeId query"
  implication: 18-05 设计时把 auto+custom 设为 navigate；UAT 阶段用户要求改为 no-op + 显式编辑按钮（与手动模式一致）。

## Resolution

root_cause: |
  ThemePage.handleThemeClick（ThemePage.jsx:70-79）在 seasonEnabled=true 且 theme.kind==='custom' 时调用 navigate('/theme/editor?themeId=...')。
  该行为与 auto+preset 的 no-op 语义不一致；用户期望自动模式下自定义卡片同样为 no-op，并通过卡片上始终可见的 编辑 按钮（ThemePage.jsx:168 已正确接入）跳转到编辑器。
fix: 删除 handleThemeClick 中 L73-75 的 if (theme.kind === 'custom') navigate(...) 分支；使 auto+custom 与 auto+preset 行为统一为 silent no-op。
  可选：保留或追加一段 toast 提示 "季节自动切换已开启，请点卡片上的 编辑 按钮"；按用户原话 "不跳转" 来看，silent no-op 最贴近需求。
verification: |
  1. 开启季节自动切换；点击自定义主题卡片 → 不跳转、不应用、不提示（no-op）。
  2. 点击同一卡片的 编辑 按钮 → stopPropagation 拦截 → handleEdit(custom) → 跳转 /theme/editor?themeId=<id>。
  3. 预设卡片（auto）行为不变 → 仍为 no-op 且不显示编辑按钮。
  4. 关闭自动切换 → 手动模式点击自定义卡片应正常 setActiveTheme；编辑按钮仍可见。
files_changed: [frontend/src/pages/ThemePage.jsx]