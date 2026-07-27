---
phase: 10
slug: primitive-components
status: draft
shadcn_initialized: false
preset: none
created: 2026-07-27
---

# Phase 10 — UI Design Contract: Primitive Components

> Phase 10 原始组件的视觉与交互契约。继承 Phase 8 token foundation 与 Phase 9 motion/state-layer 契约；本文件只规定 primitive 组件消费方式，不重定义基础令牌。

---

## 1. 范围与继承关系

### 1.1 本阶段交付

| 组件 | 变体 / 尺寸 | Requirement | Wave |
|------|-------------|-------------|------|
| `Button` | `filled|tonal|outlined|text` × `sm|md|lg`，含 loading | COMPO-01 | 10-01 |
| `IconButton` | `default` 40dp visual / `fab` 48dp visual | COMPO-02 | 10-01 |
| `FAB` | default / extended / small | COMPO-05 | 10-01 |
| `Card` | elevated / filled / outlined，slot composition | COMPO-03 | 10-02 |
| `Input` | outlined / filled，floating label / error / no-label | COMPO-04 | 10-02 |
| `Badge` | assist / filter / state，8 tones | COMPO-06 | 10-03 |
| `Chip` | assist / filter / input / suggestion | COMPO-07 | 10-03 |
| Shared base | state-layer、focus、ripple anchor、touch target、stacking | TOKEN-11 / UX-03 | all |
| `Icon` | 固定 30-name SVG mapping | D-05..D-07 | 10-01 |

### 1.2 明确不在本阶段

- 不修改任何后端文件、API、数据库或业务规则。
- 不重构 Modal/Dialog、Navigation、Snackbar、List Item、Divider；留给 Phase 11。
- 不做页面级 spacing 重排、全量 emoji 清理或 HUMAN-UAT；留给 Phase 12。
- 不引入 Material Web、shadcn、Radix、Framer Motion 或表单验证库。
- 不更改既有 `onClick`、`onChange`、受控值、请求、生命周期与导出 API 语义。

### 1.3 Foundation 继承（禁止局部覆盖）

| 契约 | 继承值 | Source |
|------|--------|--------|
| Color | `--md-color-*` 浅/深模式语义令牌 | Phase 8 |
| Spacing | `4/8/12/16/24/32/40/56px`，`--md-spacing-1..8` | Phase 8 |
| Shape | `8/12/16/24/28/full`，`--md-radius-xs..full` | Phase 8 |
| Typography | `--md-font-body` / `--md-font-display` 与既有 type tokens | Phase 8 / Phase 9 anchor |
| Elevation | `--md-elevation-0..5` | Phase 8 |
| Motion | short 150ms / medium 250ms / long 500ms | Phase 8 / Phase 9 |
| State layer | hover 8% / pressed 10% / focused 12% | Phase 9 |
| Disabled | element opacity 38%；state-layer 0%，无双重变暗 | Phase 9 D-10 |
| Ripple | primary 12%，500ms emphasized + 150ms fade | Phase 9 |
| Focus | 2px outer + 2px inner，`:focus-visible` only | Phase 8 / Phase 9 |
| Touch | 所有交互命中区域至少 48×48dp | Phase 9 D-09 |

---

## 2. Design System

| Property | Value |
|----------|-------|
| Tool | none；custom React + global CSS + MD3 tokens |
| Preset | not applicable |
| Component library | none |
| Icon library | `@material-symbols-svg/react`，静态单图标 imports |
| Font | `PingFang SC`, `Noto Sans SC`, `Noto Serif SC`；消费现有 font tokens |
| Styling | co-located global CSS；每个 primitive CSS `@import './base.css'` |
| Theme | 现有 light / dark token blocks；组件不得写主题分支硬编码色 |

---

## 3. 文件与公共结构契约

```text
frontend/src/components/primitives/
  base.css
  Button.jsx        Button.css
  IconButton.jsx    IconButton.css
  Card.jsx          Card.css
  Input.jsx         Input.css
  FAB.jsx           FAB.css
  Badge.jsx         Badge.css
  Chip.jsx          Chip.css
  Icon.jsx
  Ripple.jsx        ripple.css
```

- JSX 使用 2-space indentation、single quotes、default function exports，技术 identifier 使用 English。
- `className`, `style`, native attributes 与 refs 必须透传；不吞掉 consumer event handlers。
- Primitive 根 class 使用 `md-` 前缀：`.md-button`, `.md-card`, `.md-input`，避免与待删除旧类冲突。
- `base.css` 只放共享 interaction mechanics；variant 色、尺寸、shape 留在组件 CSS。
- `main.jsx` 不直接 import `base.css`；由各 primitive CSS import。
- 迁移后删除 D-02 指定旧选择器；`.btn-search` 是唯一保留的项目专用紧凑按钮工具类。

---

## 4. Spacing、Typography 与 Shape 摘要

### 4.1 Spacing Scale

| Token | Value | Primitive usage |
|-------|-------|-----------------|
| `--md-spacing-1` | 4px | supporting text gap、Badge inline gap |
| `--md-spacing-2` | 8px | icon-label gap、Card compact gap |
| `--md-spacing-3` | 12px | Button sm x-padding、Card footer top gap |
| `--md-spacing-4` | 16px | default x-padding、Card body padding |
| `--md-spacing-5` | 24px | Button lg x-padding、Card section padding |
| `--md-spacing-6` | 32px | large internal separation only |
| `--md-spacing-7` | 40px | IconButton visual size / small FAB |
| `--md-spacing-8` | 56px | default / extended FAB height |

**Exceptions:** 1px border、2px focus rings、14/16/20/24px icon glyphs、32/40/48/56dp control heights，以及 0.8s spinner period是 MD3 component geometry，不是 layout spacing。

### 4.2 本阶段允许的文字角色

| Role | Size | Weight | Line height | Usage |
|------|------|--------|-------------|-------|
| Label small | 12sp | 400 | 16px | floating label、Badge、supporting text |
| Label medium | 14sp | 500 | 20px | Button sm/md、Chip |
| Body medium | 16sp | 400 | 24px | Input value、Card body |
| Title medium | 16sp | 500 | 24px | Button lg、Card header、Extended FAB |

- 本阶段只消费以上 4 个尺寸与 2 个 weights（400/500）；不新增 font family 或 display role。
- Icon-only controls 不产生可见 typography，但必须有 accessible name。

### 4.3 Shape mapping

| Component | Shape |
|-----------|-------|
| Button | `--md-radius-sm` = 12px |
| IconButton | `--md-radius-full`；视觉容器为圆形 |
| Card | `--md-radius-md` = 16px；Phase 10 CONTEXT / token foundation 优先于示例中的 12dp |
| Input | `--md-radius-sm` = 12px；filled 顶部两角同值，底部保持 12px |
| FAB all forms | `--md-radius-md` = 16px，small 亦不得使用 full |
| Badge | `--md-radius-full` |
| Chip | `--md-radius-full` |

---

## 5. Shared `base.css` Interaction Contract

### 5.1 Layer model

```css
.md-interactive {
  position: relative;
  isolation: isolate;
  overflow: hidden;
}
.md-interactive::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--md-component-state-color, var(--md-state-layer-primary));
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--md-motion-duration-short) var(--md-motion-easing-standard);
}
.md-interactive > :not(.md-ripple-layer) { position: relative; z-index: 2; }
.md-ripple-layer { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
```

- Phase 9 的负 `z-index` 示例在 custom overlay 中易落到背景之后；本阶段由 agent's Discretion 锁定为 isolation + 明确 0/1/2 层。
- 根元素 background/border 在 stacking context base；state layer z0；ripple z1；content z2。
- `::before` 不可接收 pointer events，不可遮挡 input caret 或 card links。

### 5.2 State application

| State | Selector | Opacity | Motion |
|-------|----------|---------|--------|
| Rest | `::before` | 0 | — |
| Hover | `:hover::before` | 0.08 | short standard |
| Pressed | `:active::before`, `[data-pressed='true']` | 0.10 | short standard |
| Focused | `:focus-visible::before`, `:focus-within::before` for Input | 0.12 | short standard |
| Disabled | `:disabled::before`, `[aria-disabled='true']::before` | 0 | none |

State color mapping:

| Surface / variant | `--md-component-state-color` |
|-------------------|------------------------------|
| Filled Button / FAB primary fill | `--md-color-on-primary` |
| Tonal Button / selected Chip | `--md-color-on-secondary-container` |
| Outlined / Text / IconButton / Input / Card | `--md-color-primary` |
| Error affordance | `--md-color-error` |
| Filled Card / neutral Badge | `--md-color-on-surface` |

### 5.3 Focus ring

- Button / IconButton / FAB / Chip：根 interactive node 上使用 `:focus-visible`。
- Input：native input focus 触发 wrapper `:focus-within`，但 keyboard-visible ring 应通过 `:has(input:focus-visible)`；不支持时 input 自身 fallback。
- Primary-filled controls：`outline: var(--md-focus-ring-inner)`；surface controls：`outline: var(--md-focus-ring-outer)`。
- 所有 ring `outline-offset: 2px`；不使用 box-shadow 模拟，也不改变 layout/border width。
- 鼠标点击不显示 focus ring；不得用 `outline: none` 移除 keyboard indicator。

### 5.4 Touch target

- 每个 interactive primitive 外部命中盒必须 `min-inline-size:48px; min-block-size:48px`。
- Button `sm` visual 高 32dp、`md` 40dp 时，根 hit box 仍为 48dp；用内部 `.md-button__visual` 保持视觉高度，不把 label 上下拉伸。
- IconButton default visual 40dp 置于 48dp 根 hit box 中；`fab` density visual 与 hit box均 48dp。
- Small FAB visual 40dp 置于 48dp hit box；default/extended FAB 为 56dp。
- Badge 和不可点击 assist/suggestion Chip 不强制 48dp；一旦带 click/remove action，根或独立 action 必须达到 48dp。

### 5.5 Motion and reduced motion

| Effect | Duration / easing |
|--------|-------------------|
| Hover color/elevation | medium 250ms standard；Card 按 Phase 9 特例 short 150ms |
| Ripple expansion | long 500ms emphasized |
| Ripple fade | short 150ms standard |
| Floating label | short 150ms standard |
| Chip icon/check | short 150ms standard |
| Spinner | 800ms linear infinite |

`prefers-reduced-motion: reduce` 时：state/elevation/label/check 立即切换；ripple 不渲染；spinner 保留静态 progress glyph 或将周期降为无旋转，不得造成内容跳动。

### 5.6 Disabled

- 根元素 `opacity: 0.38; cursor:not-allowed; box-shadow:none`。
- state-layer 与 ripple 均为 0 / 不渲染；禁止再叠加 38% overlay。
- 禁止仅靠颜色表达；native `disabled` 优先，非 native 使用 `aria-disabled="true"` 并阻止 activation。
- Loading Button 复用 disabled mechanics，但保留 spinner 与原 label，避免按钮宽度变化。

---

## 6. Button Contract

### 6.1 API

```jsx
<Button variant="filled" size="md" loading={false} disabled={false}>
  保存
</Button>
```

- Defaults：`variant="filled"`, `size="md"`, `type="button"`。
- 透传 `onClick`, `type`, `name`, `value`, `aria-*`, `data-*`, `className`, ref。
- `loading` 自动设置 disabled semantics；label 不替换为“保存中…”。

### 6.2 Variant color matrix

| Variant | Fill | Label / icon | Border | State color | Focus ring |
|---------|------|--------------|--------|-------------|------------|
| filled | `primary` | `on-primary` | none | `on-primary` | inner |
| tonal | `secondary-container` | `on-secondary-container` | none | `on-secondary-container` | outer |
| outlined | transparent | `primary` | 1px `outline` | `primary` | outer |
| text | transparent | `primary` | none | `primary` | outer |

### 6.3 Size geometry

| Size | Visual height | Hit height | Padding X | Label | Icon | Gap |
|------|---------------|------------|-----------|-------|------|-----|
| sm | 32dp | 48dp | 12dp | 14sp/500/20 | 16dp | 8dp |
| md | 40dp | 48dp | 16dp | 14sp/500/20 | 18dp | 8dp |
| lg | 48dp | 48dp | 24dp | 16sp/500/24 | 20dp | 8dp |

- Minimum content width 48dp；不设固定宽度；长中文 label 可增长，不截断主 CTA。
- `.btn-search` 保持项目特例：visual 32dp、hit 48dp、12sp label、10px x-padding；不是 Button `xs` API。

### 6.4 Loading spinner

- 16×16dp inline SVG，`stroke:currentColor`，2px stroke，label 左侧 8dp gap。
- 动画 `spin 0.8s linear infinite`；旋转中心固定，不改变 Button width。
- `aria-busy="true"`；可见 label 保留；如果 icon prop 已存在，loading 时 spinner 替换 leading icon。

---

## 7. IconButton 与 Icon Contract

### 7.1 IconButton

```jsx
<IconButton icon="edit" aria-label="编辑" density="default" />
```

| Density | Visual | Hit target | Glyph | Shape |
|---------|--------|------------|-------|-------|
| default | 40×40dp | 48×48dp | 24dp | full |
| fab | 48×48dp | 48×48dp | 24dp | full |

- API 命名锁定为 `density="default|fab"`（Phase 10 D-15 agent's Discretion）。
- Default transparent fill、`on-surface-variant` icon；hover/focus state tint `primary`。
- Selected optional state：`secondary-container` fill + `on-secondary-container` icon。
- `aria-label` 或等价 accessible name 必填；Icon 本身 `aria-hidden="true"`。

### 7.2 Fixed Icon mapping

固定 names（不得静默接受任意字符串）：

| Group | Names |
|-------|-------|
| Navigation | `home`, `menu`, `arrow-back`, `arrow-forward`, `more-vert`, `more-horiz`, `place` |
| Actions | `search`, `add`, `edit`, `delete`, `check`, `close`, `share`, `refresh`, `filter`, `sort` |
| People/food | `restaurant`, `person`, `chef` |
| Status | `favorite`, `star`, `schedule`, `notifications`, `info`, `warning`, `error` |
| Settings/privacy | `settings`, `logout`, `visibility`, `visibility-off` |

- Defaults：`size={24}`, `fill={0}`, `weight={400}`, `grade={0}`。
- 组件 API 保持 `<Icon name size fill weight grade className />`。
- SVG 使用 `currentColor`；不在 SVG 内 hardcode fill color。
- Unknown name：development console warning + render nothing；不得显示破损文字或 fallback emoji。

---

## 8. FAB Contract

### 8.1 API and geometry

| Form | API | Box | Padding | Label |
|------|-----|-----|---------|-------|
| Default | `<FAB icon="add" />` | 56×56dp | centered | none |
| Extended | `<FAB variant="extended" icon="add" label="新建菜品" />` | height 56dp, min-width 80dp | 16dp start/end, 12dp icon gap | 16sp/500 |
| Small | `<FAB size="small" icon="add" />` | visual 40×40dp in 48dp hit box | centered | none |

### 8.2 Visual and states

- Shape always `--md-radius-md` = 16px；禁止 `radius-full`，包括 small FAB。
- Fill `--md-color-primary-container`；content `--md-color-on-primary-container`。
- Resting `box-shadow:var(--md-elevation-3)`；hover remains elevation-3 + state layer；pressed `--md-elevation-1`。
- Transition elevation medium 250ms standard；不使用 translateY。Phase 9 旧 `scale(1.05)` 在 primitive FAB 中移除，以 elevation + ripple 为唯一反馈。
- Ripple tint primary 12%；focus ring outer；disabled shadow level 0。
- FAB 与 fixed navigation/overlay 相遇时遵守 §14 z-index，不自行声明 page-level fixed position。

---

## 9. Card Contract

### 9.1 API and slots

```jsx
<Card
  variant="elevated"
  image={<img src={dish.image_url} alt={dish.name} />}
  header={<CardHeading />}
  footer={<CardActions />}
>
  {body}
</Card>
```

- Locked slot names：`image`, `header`, `children` as body, `footer`；额外多按钮区域作为 footer，不新增 `actions` API。
- Body 必需；image/header/footer 可选。
- Clickable Card 仅在提供 `onClick` / link semantics 时启用 ripple、hover state、keyboard activation 与 48dp target。
- Static guest card 无 cursor、ripple、state layer、hover elevation；内部按钮仍独立 interactive。

### 9.2 Variant matrix

| Variant | Fill | Border | Rest elevation | Hover elevation |
|---------|------|--------|----------------|-----------------|
| elevated | `surface-container-low` | none | level 1 | level 2 |
| filled | `surface-container-highest` | none | level 0 | level 0；仅 state layer if clickable |
| outlined | `surface` | 1px `outline-variant` | level 0 | level 0；border 不变 |

- Elevated hover strictly level 1→2 over 150ms standard；无 translate、scale、border-color change。
- Card radius 16dp；image clipping inherits top corners。

### 9.3 Slot geometry

| Slot | Contract |
|------|----------|
| image | default `aspect-ratio:4/3`; `width:100%`; `object-fit:cover`; no internal padding |
| header | 16dp x-padding；16dp top；8dp bottom；title 16sp/500/24 |
| body | 16dp x-padding；缺少 header 时 16dp top；16sp/400/24 |
| footer | 16dp padding；12dp top separation；actions gap 8dp；right aligned by default |

- Adjacent slot padding must collapse logically：header + body 间不产生 32dp double padding。
- Image alt text由 domain wrapper提供；decorative image uses empty alt。
- Nested buttons/links stop propagation as required by existing business behavior；Card 不擅自改变事件顺序。

---

## 10. Input Contract

### 10.1 API modes

```jsx
<Input label="名称" value={name} onChange={handleChange} />
<Input label="名称" placeholder="请输入菜名" error="名称不能为空" />
<Input value={query} onChange={handleQuery} aria-label="搜索菜品" />
```

- Defaults：`variant="outlined"`；native controlled/uncontrolled behavior不变。
- Props：`label`, `error`, `supportingText`, `leadingIcon`, `trailingIcon` 与全部 native input props。
- 无 label 时不保留空 notch；调用方必须提供 `aria-label` 或外部 `<label htmlFor>`。

### 10.2 Geometry and typography

| Part | Value |
|------|-------|
| Field visual height | 56dp minimum |
| Hit target | 56dp，天然满足 48dp |
| Horizontal padding | 16dp；有 icon 时 icon 24dp + 12dp gap |
| Input text | 16sp/400/24 |
| Floating label | 12sp/400/16；由 resting 16sp 缩至 12sp并上移 16dp |
| Supporting/error text | 12sp/400/16；field 下 4dp，上下文左 inset 16dp |
| Outline | rest 1px；focused 2px，不改变 outer dimensions |

### 10.3 Variant and state colors

| State | Outlined | Filled | Label / supporting |
|-------|----------|--------|--------------------|
| Rest | transparent + 1px outline | surface-container-highest + 1px bottom outline | on-surface-variant |
| Hover | outline on-surface + 8% state | same fill + bottom on-surface | on-surface |
| Focus | 2px primary outline | 2px primary bottom line | primary |
| Error | 2px error outline | error bottom line | error |
| Disabled | 38% whole component | 38% whole component | state layer 0 |

- Error icon occupies trailing 24dp slot；若 consumer supplies trailing icon，error icon has priority while error exists。
- Error text uses `--md-color-error` and is linked with `aria-describedby`; input gets `aria-invalid="true"`。
- Floating condition：focus 或 non-empty；CSS-only `:placeholder-shown` pattern。实现必须给 floating-label input 一个内部 sentinel placeholder（可为空格），但不覆盖 consumer visible placeholder。
- Label transition short 150ms standard；reduced motion immediate。
- Ripple 不应用于 Input；state layer只在 wrapper background，不覆盖 caret/text。

---

## 11. Badge Contract

### 11.1 API

```jsx
<Badge variant="state" tone="warn">待处理</Badge>
```

- Visual-only by default；不添加 role/button/tabIndex。
- Variants：`assist`（轻量说明）、`filter`（筛选结果语义）、`state`（业务状态）。
- Tones locked：`primary|secondary|tertiary|error|success|warn|info|muted`。
- `statusBadge()` 保留；旧 cls 到 tone 映射发生在 adapter，不把业务 status 写入 primitive。

### 11.2 Geometry and tone

| Property | Value |
|----------|-------|
| Height | 24dp minimum |
| Padding | 4dp y / 8dp x |
| Label | 12sp/500/16 |
| Icon | 14dp，gap 4dp |
| Shape | full pill |

| Tone family | Fill | Content |
|-------------|------|---------|
| primary | primary-container | on-primary-container |
| secondary | secondary-container | on-secondary-container |
| tertiary / warn | tertiary-container | on-tertiary-container |
| error | error-container | on-error-container |
| success | primary-container | on-primary-container |
| info | secondary-container | on-secondary-container |
| muted | surface-container-high | on-surface-variant |

- `filter` Badge 若变为 interactive consumer，必须显式渲染 button并获得 48dp hit target；静态 Badge 不伪装成交互。
- Count badge保持 pill；单字符仍 minimum inline 24dp，不使用裸硬编码红色。

---

## 12. Chip Contract

### 12.1 Variant semantics

| Variant | Interaction | Leading | Trailing | Selected behavior |
|---------|-------------|---------|----------|-------------------|
| assist | default non-clickable per D-14 | optional icon | none | none |
| filter | toggle button | checkmark when selected | optional dropdown icon | `aria-pressed` |
| input | token with remove action | optional icon/avatar | close action | removal only |
| suggestion | default non-clickable per D-14 | optional icon | none | none |

- 若 assist/suggestion consumer传入 `onClick`，根必须成为 button并满足 48dp；否则语义为静态 `<span>`。
- Input Chip trailing close 是独立 accessible action，label“移除{名称}”。

### 12.2 Geometry and colors

| Property | Value |
|----------|-------|
| Visual height | 32dp |
| Interactive hit height | 48dp wrapper |
| Padding X | 12dp；有 leading 8dp start；trailing 8dp end |
| Label | 14sp/500/20 |
| Icons | 18dp；gap 8dp |
| Shape | full pill |
| Rest | transparent / surface + 1px outline |
| Selected filter | secondary-container + on-secondary-container，border transparent |
| State layer | primary rest；on-secondary-container selected |

### 12.3 Checkmark and trailing micro-motion

- Filter check enters：`opacity 0→1`, `scale(0.8)→1` over 150ms standard；label shifts through flex gap, no absolute overlap。
- Deselect reverses over 150ms；DOM may remain until transition end or reserve an 18dp slot to prevent width jitter。契约锁定 reserve slot，Chip width不得跳变。
- Input trailing close hover/pressed uses its own circular state layer 8%/10%；visual icon 18dp，action hit target 48dp可通过 negative inline margin扩展，不扩大 chip visual height。
- No ripple for Chips，继承 Phase 9 exclusion；使用 state-layer + micro-motion。

---

## 13. Color Allocation Contract

MD3 semantic token system取代模板式 60/30/10 hex 分配；比例只描述页面视觉占比，不新建色板。

| Role | Token family | Primitive use |
|------|--------------|---------------|
| Dominant ~60% | surface / surface-container-lowest | page background、outlined Card/Input |
| Secondary ~30% | surface-container-low/high/highest、secondary-container | Cards、tonal controls、selected Chips |
| Accent ~10% | primary / primary-container | Filled Button、FAB、focus、selected affordance |
| Destructive | error / error-container | Input error、error Badge、既有 destructive actions only |

Accent reserved for：Filled primary CTA、FAB、active/selected indicator、focus ring、state/ripple tint；不得把每张 Card、每个 Badge 或大面积背景涂 primary。

---

## 14. Z-index 与 Overlay Stacking

| Layer | z-index contract | Owner |
|-------|------------------|-------|
| Primitive background/border | local base | primitive root |
| State layer | local 0 | `::before` |
| Ripple | local 1 | `.md-ripple-layer` |
| Primitive content | local 2 | text/icon/slots |
| Sticky page chrome | 100 | existing page/layout |
| FAB fixed placement | 200 | page consumer, not FAB primitive |
| Dropdown/popover | 600 | future composite/consumer |
| Modal scrim/dialog | 900/1000 | Phase 11 |
| Toast/snackbar | 1100 | Phase 11 |

- Primitive内部不得声明超过 2 的 global z-index。
- Card slots不创建无必要 stacking context；只有 interactive root使用 `isolation:isolate`。
- FAB primitive不内置 `position:fixed` 或 z-index 200；页面 placement class负责。
- Custom overlay中的 primitive保持 overlay祖先层级，不可凭高 z-index穿透 scrim。

---

## 15. Accessibility Contract

| Component | Required semantics |
|-----------|--------------------|
| Button/FAB | native button；loading `aria-busy`; disabled不可激活 |
| IconButton | mandatory accessible name；decorative SVG hidden |
| Card | static article/div by default；clickable时 button/link keyboard semantics |
| Input | label association、error `aria-invalid/describedby`、unique id |
| Badge | text semantics；不靠 tone单独表达状态 |
| Filter Chip | native button + `aria-pressed` |
| Input Chip | remove control有上下文中文 label |

- 色彩之外必须保留文字/图标状态；error同时有 supporting text 或 error icon。
- Focus order跟 DOM order一致；Card slot抽象不得重排 keyboard order。
- 图标与中文 label间 8dp；纯图标操作不得以 tooltip作为唯一 accessible name。

---

## 16. Copywriting Contract

本阶段不新增业务流程 copy；迁移时保留既有中文 strings（LOGIC-01）。Primitive 提供的默认/示例 copy如下：

| Element | Contract |
|---------|----------|
| Primary CTA | 由 consumer提供具体“动词 + 名词”，如“保存菜品”；组件不设默认 label |
| Loading | 保留原 CTA label，不自动替换“处理中…” |
| Input error | consumer提供“问题 + 修复方式”，如“名称不能为空，请输入菜品名称” |
| Empty state | 不属于 primitive；保持现有页面 copy |
| Destructive confirmation | 不属于 primitive；由 Phase 11 Dialog / 既有 modal处理 |
| Icon-only action | 中文 `aria-label`，如“删除菜品”“关闭” |

---

## 17. API Compatibility 与迁移约束

- 所有现有事件和 native props保持；内部可以改 DOM，但不得改变提交类型、冒泡或 controlled behavior。
- `Button` 默认 `type="button"`；表单 submit调用点必须显式迁移为 `type="submit"`，避免隐式行为回归。
- `Ripple` public API继续可用，供 Phase 10范围外 composite继续手动消费。
- `Badge` 可保留 compatibility adapter处理旧 `status/text/type` props，但核心 primitive只消费 visual props。
- DishCard/WishCard/GuestDishCard成为 thin wrappers；domain data与业务操作仍留在 wrapper。
- `.btn-search` 按 D-03存在，但调用应优先 `<Button className="btn-search">`，不得恢复 `.btn-primary` 旧类。
- 删除旧 CSS 前必须确保实际 consumer零残留；视觉裸奔不是可接受的迁移中间态。

---

## 18. Visual Acceptance Matrix

| Component/state | Required observation |
|-----------------|----------------------|
| Filled Button | primary/on-primary；hover 8%；pressed 10%；48dp hit target |
| Tonal Button | secondary-container；label对比清晰；无 outline |
| Outlined Button | 1px outline；hover不改 border；state overlay only |
| Text Button | transparent rest；无伪造 container |
| Loading Button | 16dp spinner；label不变；disabled无 ripple |
| IconButton default | 40dp visual centered in 48dp hit box |
| FAB | 16px corners；rest elevation-3；pressed elevation-1 |
| Elevated Card | elevation-1→2 only；150ms；无位移 |
| Filled Card | level-0；highest container fill |
| Outlined Card | 1px outline-variant；level-0 |
| Input focus | floating 12sp label；primary 2px；ring可见 |
| Input error | error outline + text + icon + aria-invalid |
| Badge | 24dp pill；tone uses semantic container tokens |
| Filter Chip | 32dp visual / 48dp hit；check animation无width jump |
| Disabled all | 38% whole element；overlay 0；shadow none |
| Reduced motion | no ripple；state变化即时；无位置动画 |

---

## 19. Verification Contract

### Automated gate for Phase 10

- `npm run build`：0 errors。
- `npm run lint`：不得增加 baseline errors；Phase 10 touched files 0 new errors。
- Static scan：D-02旧 selector/call-site消费零残留，`.btn-search`例外不得依赖旧 `.btn-primary`。
- Static scan：primitive CSS零 hardcoded hex/rgb颜色、零 4px/6px radius、零 `transition: all`。
- API inspection：所有 primitive透传 `className`, refs, native attrs与 handlers。
- Icon mapping：固定 30 names逐个可静态解析；bundle不加载 icon font CSS。

### Deferred verification

- Playwright touch target复审与 HUMAN-UAT按 D-04留给 Phase 12。
- Phase 10仍必须按 CSS contract实现≥48dp，不得以“UAT deferred”为由推迟实现。

---

## 20. Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable |
| Third-party registry | none | not applicable |
| NPM icon package | `@material-symbols-svg/react` individual imports | locked by CONTEXT D-05；非 shadcn registry |

---

## 21. Decision Traceability

| Contract area | Source |
|---------------|--------|
| Full migration / delete old CSS / verification | Phase 10 D-01..D-04 |
| SVG icon package and 30 names | D-05..D-07 |
| File organization / shared base | D-08..D-10 |
| Input modes | D-11 |
| Internal Ripple | D-12 |
| Card slots | D-13 + agent's Discretion |
| Chip variants | D-14 |
| Badge tones/status adapter | D-15 + agent's Discretion |
| FAB API | D-16 |
| Loading spinner | D-17 |
| State opacity/focus/touch/disabled | Phase 9 UI-SPEC + D-10 |
| FAB 16px shape | Phase 8 D-08 and updated REQUIREMENTS |
| Component scope | COMPO-01..07 / ROADMAP Phase 10 |
| Logic compatibility | LOGIC-01..03 |

**Input note:** requested `.planning/AGENTS.md` was absent；project-level `/home/temila/family_chef/AGENTS.md` conventions supplied by the orchestrator were applied。Out-of-scope v1.1 wishlist内容未进入本契约。

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
