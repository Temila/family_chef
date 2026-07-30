---
phase: quick
quick_id: 260730-lmy
slug: filter-row-48px-inset
date: 2026-07-30
status: complete
description: filter-action-row 左右各缩进 48px（对称），移除 margin-right hack
---

# Quick Task 260730-lmy: filter-action-row 对称 48px 缩进

<objective>
用户反馈：左侧目标 = 48px（搜索内容起始 = icon 32px + padding 16px）；右侧在屏幕上也没对齐，要求「也左移 48px 试一下」。采用对称 48px 实验性方案。
</objective>

<tasks>
## Task 1: styles.css — 对称 48px padding + 移除 margin-right hack
- `.filter-action-row` padding: `0 var(--md-spacing-4) var(--md-spacing-2)` → `0 48px var(--md-spacing-2)`
- `.filter-action-row__actions`: 移除 `margin-right: var(--md-spacing-1)`（260730-kz4 引入的 hack）
</tasks>

<success_criteria>
- [x] 左右对称 48px
- [x] margin-right hack 移除
- [x] npm run build 通过
</success_criteria>
