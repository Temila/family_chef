---
plan_id: 260730-oa9
type: execute
mode: quick
completed: 2026-07-30
---

# Quick Task 260730-oa9 Summary: 订单详情页两段式 MD3 布局重构

## Objective

将 `frontend/src/pages/OrderDetailPage.jsx` 的 `<section className="section">` 内容区重组为两个上下排布的全屏 div：

- **div 1（订单概览）**：左侧 40% 卡片（订单号 / 状态 / 下单时间 / 用餐时间 / 备注）+ 右侧 60% 卡片（下单人 + 口味偏好），使用 `gridTemplateColumns: '40% 60%'` 硬编码 4:6 比例。
- **div 2（菜品列表）**：单卡片全宽，每行一个菜品，点击行展开/收起菜谱。

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/pages/OrderDetailPage.jsx` | 重构 section 内容区（166 → 175 行） |

## Implementation Details

- **保留不变**：所有 import、`page-container` / `Header` / `BottomBar` 壳层、`loadOrder` / `handleUpdateStatus` / `expandedDish` 状态机、`isChef` 派生值、`mealTypeMap` 常量、loading/empty 分支、chef 状态按钮区（拒绝 / 开始烹饪 / 完成订单）。
- **div 1 包裹层**：`<div style={{ width: '100%', marginBottom: 'var(--md-spacing-4)' }}>` 配合父级 `<section className="section">` 已有 padding（mobile `--md-spacing-4` / PC `--md-spacing-6` via `.pc-layout .section`）自动获得左右 margin。
- **40/60 网格**：内层 `<div style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: 'var(--md-spacing-3)' }}>` —— 比例固定不响应式（满足用户"卡片尺寸固定"要求）。
- **菜品行左对齐**：显式 `textAlign: 'left'` 覆盖 Card primitive 内可能居中的默认样式。
- **菜谱切换**：保留原有 `setExpandedDish(expandedDish === item.dish_id ? null : item.dish_id)` 点击切换逻辑；菜谱展开容器继续复用现有 `.markdown-body` className 与 `marked(item.recipe)` 渲染。
- **chef 按钮区**：保留在 section 末尾、`</Card>` 菜品卡之后的位置，`marginTop: var(--md-spacing-4)` 上下间距 16dp。

## Verification

```bash
cd frontend && npm run build
```

构建输出：
```
✓ 4012 modules transformed.
dist/index.html                   0.80 kB │ gzip:   0.49 kB
dist/assets/index-jRLZlGZ7.css   63.07 kB │ gzip:   9.41 kB
dist/assets/index-CnYG7JWP.js   797.17 kB │ gzip: 227.14 kB │ map: 2,427.20 kB
✓ built in 1.71s
```

无 eslint 阻断、无 vite 编译错误。

## Success Criteria

- [x] `<section className="section">` 内出现两个外层 `<div style={{ width: '100%' }}>` 兄弟节点（第一个含 40/60 网格，第二个为菜品 `<Card>`）
- [x] 第一个 div 内出现 `gridTemplateColumns: '40% 60%'`
- [x] 左卡内容包含 `订单 #{order.id}` / `下单时间` / `用餐时间`；右卡包含 `下单人` 与 `口味偏好`
- [x] 菜品卡保留 `查看菜谱 ▼` → `收起 ▲` 切换逻辑
- [x] 菜品行左侧有 `textAlign: 'left'`
- [x] chef 状态按钮区（拒绝 / 开始烹饪 / 完成订单）位于 section 末尾未被删除
- [x] `npm run build` 通过
- [x] 行数较改前略有增加（结构嵌套），但函数主体逻辑不变

## Deviations from Plan

None —— plan executed exactly as specified. All 5 要点 (cards fixed 4:6 / MD3 margins / spacing tokens / textAlign left / marked rendering) applied verbatim.

## Commits

- `7028075` — refactor(260730-oa9): 订单详情页两段式 MD3 布局重构

## Post-Completion Correction

**触发**：用户提供部署版 `https://familychef.temila-ms06f.top/orders/1` 作为排版参考，确认该页面采用 3 卡直接堆叠布局（非 2 div + 40/60 grid）。

**操作**：还原 `OrderDetailPage.jsx` 到 `9516e48` 版本的 3 张 `<Card variant="elevated">` 上下排列：
- **Card 1**：订单信息（订单号 / 状态 badge / 下单时间 / 用餐时间）
- **Card 2**：下单人（头像 + 名字 / 口味偏好 via `<Chip>`）
- **Card 3**：菜品列表（每行菜品 + `查看菜谱 ▼` / `收起 ▲` 切换）

**仅调整 layout 结构**，不改变任何视觉 token（`--md-spacing-*` / `--md-color-*` / `--md-radius-*`）、icon 主题、或 Chef 操作按钮逻辑。

**Commit**: `2fdcddd` — refactor(260730-oa9-revert): 还原为 3 卡堆叠排版，匹配部署版参考