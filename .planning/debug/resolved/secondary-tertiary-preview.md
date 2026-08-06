---
status: diagnosed
trigger: "拖动次色/第三色取色器时编辑器内预览应即时变化 / 退出后重进，只有主色调整时预览会有变化，次色和第三色修改时无变化"
created: 2026-08-06T00:00:00Z
updated: 2026-08-06T00:00:00Z
---

## Current Focus

hypothesis: buildCssSync 的 TonalSpot 分支（deriveTonalSpotSchemes）虽然把 secondary/tertiary 作为 blend 参数传给 MCU themeFromSourceColor，但 MCU 该函数只把 customColors 存进 theme.customColors，scheme.light/dark 与 palettes.secondary/tertiary 完全由 source(primary) 派生，导致次色/第三色对输出 CSS 无任何影响。
test: 对相同 primary 不同 secondary/tertiary 调用 buildCssSync，对比输出字节是否变化。
expecting: secondary/tertiary 改动 → 输出 CSS 完全相同；primary 改动 → 31 个 token 变化。已实测验证。
next_action: 写诊断结果返回 root cause。

## Symptoms

expected: 拖动次色/第三色取色器时编辑器内预览应即时变化。
actual: 退出后重进，只有主色调整时预览会有变化，次色和第三色修改时无变化。
errors: （无运行时错误）
reproduction: UAT Test 5 in .planning/phases/18-custom-editor-seasonal-auto-switch/18-UAT.md
started: UAT 2026-08-06

## Eliminated

- hypothesis: HexColorPicker 在 re-entry 后未触发 onChange（picker 闭包/state 问题）
  evidence: react-colorful@5.8.0 P 钩子用 useObjectRef 包裹最新 onChange，effect 正确 sync 内部 hsva 到外部 color prop；且 engine 端实测证明 primary 改变时 picker/状态/CSS 全链路正常工作，secondary/tertiary 的 onChange 链路行为一致。
  timestamp: 2026-08-06
- hypothesis: useMemo/useEffect 依赖未覆盖 secondary/tertiary
  evidence: ThemeEditorPage.jsx:185-188 useMemo 依赖 `draft.sourceColors`（整个对象），setDraft 时 spread 创建新引用，依赖正确触发。
  timestamp: 2026-08-06
- hypothesis: ThemePreview 没有可被 secondary/tertiary 影响的视觉元素（仅 primary 可见）
  evidence: ThemePreview 含 Tonal Button 与 selected Chip，二者均使用 --md-color-secondary-container，secondary 变化应有视觉影响；这并不能解释"无变化"——是 engine 输出 CSS 根本没变。
  timestamp: 2026-08-06
- hypothesis: scoped selector 重写 regex 在 re-entry 后失效
  evidence: buildScopedCss 在 ThemeEditorPage.jsx:71-76 用 `:root\s*\{` 与 `\[data-theme="dark"\]\s*\{` 全局替换，re-entry 后字符串一致；初次 / 二次进入无差别。
  timestamp: 2026-08-06

## Evidence

- timestamp: 2026-08-06
  checked: buildCssSync 对 TonalSpot 变体在 secondary/tertiary 变化时的输出
  found: 实测二次/三次种子色全替换后 CSS 字节完全相同（primary 改变时 31 个 token 变化，secondary/tertiary 单独改变时 0 个 token 变化）。
  implication: engine 对 TonalSpot 完全只读 primary，secondary/tertiary 是死参数。

- timestamp: 2026-08-06
  checked: node_modules/@material/material-color-utilities/utils/theme_utils.js 中 themeFromSourceColor 源码
  found: 函数体只把 source(primary) 喂给 CorePalette.of(source) 与 Scheme.light/dark(source)；customColors 只被 map 进 theme.customColors（独立数组），不影响 theme.schemes 与 theme.palettes。
  implication: MCU API 的 secondary/tertiary blend 参数在 themeFromSourceColor 路径下不会注入主 scheme/palette，必须改用 DynamicScheme.from(primary) + secondaryPalette/TonalPalette.fromInt(secondary) 才能让次色/第三色真正进入输出。

- timestamp: 2026-08-06
  checked: 非 TonalSpot 变体（如 Vibrant）的 buildCssSync 输出
  found: deriveDynamicSchemes 用 DynamicScheme + 显式 secondaryPalette/tertiaryPalette（theme-engine.js:190-208），secondary 改变 → secondary/secondary-container/on-secondary-container 3 个 token 变化，tertiary 同理。
  implication: 非 TonalSpot 路径正确响应次色/第三色；只有 TonalSpot 路径坏了。

- timestamp: 2026-08-06
  checked: theme-engine.js:160-183 deriveTonalSpotSchemes 与引擎头注释
  found: 引擎头注释明确写"TonalSpot 走 themeFromSourceColor 老路径（含 secondary/tertiary blend=true）。Phase 17 的 tokens.css 与 17-03 hex-lint 哨兵都是由此路径产出的，必须保持字节一致，故不在此路径改用 DynamicScheme"；Phase 17 tokens 当时只喂 primary 给 themeFromSourceColor，blend 参数是 18-03 编辑器引入的"看起来对但实际 MCU 不生效"的接入方式。
  implication: Phase 18-03 错误地把 secondary/tertiary blend=true 当成"MCU 会用它们派生 secondary palette"的语义，而 MCU 实际行为是把它们存进 theme.customColors 的独立数组（detail 在 customColor() 里走 Blend.harmonize 但永远不会被 buildSchemeCss 读到）。

- timestamp: 2026-08-06
  checked: frontend/src/components/theme/ThemePreview.jsx 使用的 token
  found: elevated Card (--md-color-surface-container-low), Filled Button (--md-color-primary), Tonal Button (--md-color-secondary-container), selected Chip (--md-color-secondary-container), 4 段 surface ramp。无任何组件使用 --md-color-tertiary* token。
  implication: 即使 engine 修正后让 tertiary 影响输出 CSS，preview 仍无 visible tertiary 元素；secondary 修复后则 Tonal Button / selected Chip 会即时可见变化。

## Resolution

root_cause: theme-engine.js:165-183 deriveTonalSpotSchemes 通过 `themeFromSourceColor(primary, [...secondary blend=true, ...tertiary blend=true])` 接入 secondary/tertiary，但 MCU 的 themeFromSourceColor 实际只把 customColors 写入 theme.customColors 独立数组，theme.schemes.light/dark 与 theme.palettes.secondary/tertiary 完全由 primary 派生。因此 TonalSpot 变体的 buildCssSync 输出仅对 primary 响应——次色/第三色拾色器拖动后 useEffect 重写 scopedStyleRef.current.textContent 写入的是字节相同的 CSS，预览自然不变。
fix: 修复方向——TonalSpot 路径改用 DynamicScheme.from(primary) + secondaryPalette = TonalPalette.fromInt(secondary) + tertiaryPalette = TonalPalette.fromInt(tertiary)（与 deriveDynamicSchemes 相同的接线），并视 Phase 17 tokens.css 字节一致性需求决定是否同时调整 SURFACE_PALETTE_ROLES 的中性色阶；或在 themeFromSourceColor 后单独从 theme.customColors 提取 secondary/tertiary tones 覆写 scheme.secondary/tertiary。两者择一。
verification: 1) 在 #506446 → #FF0000 替换 secondary 后，buildCssSync 输出的 --md-color-secondary* 与 --md-color-secondary-container* 至少 3 个 token 改变；2) ThemeEditorPage 上拖动次色 → 预览中 tonal Button（"次操作"）与 selected Chip（"已选标签"）背景即时变色；3) ThemePreview 仍无 tertiary 视觉元素，需新增一块 tertiary 可见区域（如填色图标/标识）才能让 tertiary 拾色有可见反馈。
files_changed:
  - frontend/src/theme/theme-engine.js (deriveTonalSpotSchemes)
  - frontend/src/components/theme/ThemePreview.jsx (可选：补 tertiary 可见 token 用法)