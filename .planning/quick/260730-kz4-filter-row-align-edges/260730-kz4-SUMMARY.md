---
phase: quick
quick_id: 260730-kz4
slug: filter-row-align-edges
date: 2026-07-30
status: complete
description: filter-action-row 边缘对齐——添加按钮右侧对齐清空、高级筛选左侧对齐搜索栏
key-files:
  - frontend/src/css/styles.css
metrics:
  css_lines_changed: 1
---

# Quick Task 260730-kz4: filter-action-row 边缘对齐

## 问题
用户要求「高级筛选」行左右缩进对齐：高级筛选左侧 ↔ 搜索栏左侧；添加右侧 ↔ 清空右侧。

## 精确测量（spacing 非线性：s1=4 s2=8 s3=12 s4=16 s5=24）
| 元素 | 位置 |
|------|------|
| 搜索 input 左边缘 | 16px（search-bar padding-left var(--md-spacing-4)） |
| 清空按钮右边缘 | W-20（search-bar padding-right 16px + 按钮组 marginRight 4px） |
| 高级筛选左边缘（修改前） | 16px ✓ 已对齐 input |
| 添加右边缘（修改前） | W-16 ✗ 比清空突出 4px |

**左侧本已对齐**（高级筛选 16px = 搜索 input 16px）；**右侧差 4px**。

## 修复
`.filter-action-row__actions` 加 `margin-right: var(--md-spacing-1)`（4px），完全镜像 search-bar 内按钮 div 的 marginRight 手法：

```css
/* 改前 */
.filter-action-row__actions { display: flex; gap: var(--md-spacing-2); }
/* 改后 */
.filter-action-row__actions { display: flex; gap: var(--md-spacing-2); margin-right: var(--md-spacing-1); }
```

- 添加右边缘 → W-20 = 清空右边缘 ✓
- 高级筛选（直接子元素，不受 actions div 的 margin-right 影响）左边缘仍在 16px = input 左 ✓
- `.filter-action-row` 基类 padding 未变（左右仍 var(--md-spacing-4)，对称）

## 为何用 margin-right 而非改 padding
1. 镜像 search-bar 现有手法（search-bar 的按钮组也是靠 marginRight 4px 内缩），语义一致
2. 保持 row 的 padding 对称，不引入非对称 padding（left 16 / right 20）
3. 高级筛选是 row 的直接子元素，不受 actions div margin 影响

## Self-Check: PASSED
- [x] 添加右边缘 = 清空右边缘（W-20）
- [x] 高级筛选左边缘 = 搜索 input 左边缘（16px）
- [x] 镜像 search-bar marginRight 手法
- [x] `npm run build` 通过（0 error）
- [x] 仅改 1 行 CSS，两页 JSX 无需改动

## Commits
- `76c4994` fix(quick-260730-kz4): align 添加 button right edge with 清空 (margin-right 4px)

## 备注
若用户实际期望「高级筛选左侧对齐搜索**图标**」（icon 在 left:32px，即 16px→32px 进一步内缩），可再把 `.filter-action-row` 的 padding-left 调整为 `calc(var(--md-spacing-4) * 2)` 或 `32px`。本次按「对齐搜索 input 左边缘」实现（最自然的"搜索栏左侧边"解读）。
