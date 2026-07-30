---
phase: quick
quick_id: 260730-lmy
slug: filter-row-48px-inset
date: 2026-07-30
status: complete
description: filter-action-row 左右各缩进 48px（对称），移除 margin-right hack
key-files:
  - frontend/src/css/styles.css
metrics:
  css_lines_changed: 2
---

# Quick Task 260730-lmy: filter-action-row 对称 48px 缩进

## 背景
260730-kz4 用 margin-right:4px 让「添加」右侧对齐「清空」（均 W-20）。用户反馈：
1. 左侧目标 = 48px（「去掉 margin(32px) 和 padding(16px) 后的位置」= 32+16=48px，对齐搜索内容起始）
2. 右侧在屏幕上「也没对齐」，要求「也左移 48px 试一下」

用户明确要「试一下」（实验性），故采用对称 48px 方案。

## 修改
```css
/* 改前（260730-kz4）*/
.filter-action-row { ... padding: 0 var(--md-spacing-4) var(--md-spacing-2); }   /* 左右 16px */
.filter-action-row__actions { ... margin-right: var(--md-spacing-1); }            /* +4px hack */

/* 改后 */
.filter-action-row { ... padding: 0 48px var(--md-spacing-2); }                   /* 左右 48px 对称 */
.filter-action-row__actions { display: flex; gap: var(--md-spacing-2); }          /* 移除 margin-right hack */
```

- 高级筛选左边 = 48px（对齐搜索内容起始：icon left:32px + search-bar padding 16px）
- 添加右边 = W-48（对称）
- 移除 260730-kz4 的 margin-right hack（不再需要对齐清空）

## Self-Check: PASSED
- [x] 左右对称 48px
- [x] margin-right hack 已移除
- [x] `npm run build` 通过
- [x] 仅改 2 行 CSS，两页 JSX 无需改动

## Commits
- `2731df0` fix(quick-260730-lmy): filter-action-row symmetric 48px inset, drop margin-right hack

## 备注
此为实验性改动（用户「试一下」）。48px 不在 MD3 spacing token 线性序列内（s4=16, s5=24），故用字面量 48px。若需回调或改成对齐清空（W-20），可再调整。
