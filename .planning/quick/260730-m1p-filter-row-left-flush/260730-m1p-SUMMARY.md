---
phase: quick
quick_id: 260730-m1p
slug: filter-row-left-flush
date: 2026-07-30
status: complete
description: 已关联/未关联按钮靠左挨着高级筛选（左侧 padding 改小至 16px）
key-files:
  - frontend/src/css/styles.css
metrics:
  css_lines_changed: 1
---

# Quick Task 260730-m1p: 高级筛选行左组靠左对齐

## 问题
260730-lmy 把 filter-action-row 设为对称 48px padding，导致「高级筛选 / 已关联 / 未关联」三个左侧按钮距离屏幕左边 48px。用户要求：左侧按钮需**靠左挨着**屏幕左边缘。

## 修改
```css
/* 改前（260730-lmy）*/
.filter-action-row { ... padding: 0 48px var(--md-spacing-2); }

/* 改后 */
.filter-action-row { ... padding: 0 48px var(--md-spacing-2) var(--md-spacing-4); }
```

非对称 padding（4 值缩写：上 0 / 右 48px / 下 8px / 左 16px）：
- **左 16px**（var(--md-spacing-4)）：高级筛选 + 已关联 + 未关联 靠左挨着屏幕边缘，与搜索栏 input 左边缘对齐
- **右 48px**：解析文本 + 添加 保持 260730-lmy 实验性 48px 缩进

## Self-Check: PASSED
- [x] 左侧三个按钮紧贴左边缘（16px，对齐 search input 左缘）
- [x] 右侧两个按钮保持 W-48 缩进
- [x] `npm run build` 通过
- [x] 仅改 1 行 CSS

## Commits
- `3e88639` fix(quick-260730-m1p): flush 高级筛选 + 已关联/未关联 to left edge (16px)

## 备注
padding 现在是**非对称**的：左 16px（按用户"靠左挨着"要求）、右 48px（沿用 260730-lmy 实验性 48px）。若想统一左/右，可同步调整右侧。