---
phase: quick
quick_id: 260730-m6k
slug: wrap-left-filters
date: 2026-07-30
status: complete
description: 撤销260730-m1p的非对称padding，将高级筛选+已关联+未关联包装到同一div（gap=spacing-2）
supersedes: 260730-m1p（撤销其左flush padding）
key-files:
  - frontend/src/css/styles.css
  - frontend/src/pages/AdminIngredientsPage.jsx
metrics:
  css_lines_changed: 1
  jsx_lines_changed: 9
---

# Quick Task 260730-m6k: 包装左侧筛选按钮到同一 div

## 用户反馈
1. 撤销 260730-m1p 的非对称 padding（左 16px / 右 48px）
2. 高级筛选位置保持不变（即回到 260730-lmy 的对称 48px padding）
3. 把新增的「已关联」「未关联」与「高级筛选」包装到**同一个 div** 里，按钮之间 gap 用 `var(--md-spacing-2)` (8px)

## 修改

### 1. 撤销 padding（左 flush）
```css
/* 改前（260730-m1p）*/
.filter-action-row { ... padding: 0 48px var(--md-spacing-2) var(--md-spacing-4); }  /* 左 16 */

/* 改后 */
.filter-action-row { ... padding: 0 48px var(--md-spacing-2); }                       /* 对称 48px */
```

### 2. 新增 `__filters` 类（与 `__actions` 对称）
```css
.filter-action-row__filters { display: flex; gap: var(--md-spacing-2); }
```

### 3. JSX：包装三个左侧按钮
```jsx
<div className="filter-action-row">
  <div className="filter-action-row__filters">                     {/* 新增 wrapper */}
    <Button variant="tonal" size="sm" onClick={...}>高级筛选</Button>
    <Button variant={...} size="sm" onClick={...}>已关联</Button>
    <Button variant={...} size="sm" onClick={...}>未关联</Button>
  </div>
  <div className="filter-action-row__actions">                    {/* 已有 */}
    <Button ...>解析文本</Button>
    <Button ...>+ 添加</Button>
  </div>
</div>
```

## 最终布局
```
filter-action-row（padding 0 48px 8px）
├── __filters（display:flex, gap:8px）— 靠左，三个按钮间距 8px
│   ├── 高级筛选（tonal，触发 Sheet）
│   ├── 已关联（filled/outlined，互斥切换）
│   └── 未关联（filled/outlined，互斥切换）
└── __actions（display:flex, gap:8px）— 靠右
    ├── 解析文本
    └── + 添加
```

`justify-content: space-between` 把两个 wrapper 分别推到两端；内部 `gap:8px` 控制三个左按钮的间距。

## Self-Check: PASSED
- [x] 撤销 260730-m1p 的左 16px padding（恢复对称 48px）
- [x] 高级筛选位置未变（48px from left）
- [x] 三个左按钮包装到 `__filters` div，gap=8px
- [x] 右组 `__actions` 不受影响
- [x] `npm run build` 0 errors
- [x] 改动：CSS +1 行（`__filters` 类），JSX +9/-5 行

## Commits
- `457d4e6` fix(quick-260730-m6k): wrap 高级筛选+已关联+未关联 in __filters div, revert padding