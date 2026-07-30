---
phase: quick
quick_id: 260730-luk
slug: ingredient-association-filter
date: 2026-07-30
status: pending
description: 食材管理页增加已关联/未关联互斥筛选按钮（基于菜品关联数）
---

# Quick Task 260730-luk: 食材管理页「已关联/未关联」互斥筛选

<objective>
在食材管理页（AdminIngredientsPage）高级筛选按钮后面增加两个互斥的筛选按钮：
- **已关联**：食材被至少一个菜品关联（dish_count > 0）
- **未关联**：食材未被任何菜品关联（dish_count = 0）

互斥行为：
- 点击「已关联」→ 选中「已关联」，取消「未关联」，过滤结果为 dish_count > 0
- 点击「未关联」→ 选中「未关联」，取消「已关联」，过滤结果为 dish_count = 0
- 再点已选中的按钮 → 取消选中（回到「全部」）
- 不新增「全部」按钮（两个按钮已隐含"全部"状态：两者都未选中）
</objective>

<investigation>
- 当前 `GET /api/ingredients?category=X&search=Y` 返回 `dish_count`（基于 DishIngredient 表聚合）
- 「关联」即指 DishIngredient 表中的关联（菜品-食材多对多关联）
- 前端 `api.getIngredients(category, search)` 接收两个参数
- AdminIngredientsPage 有 `advCategory` state（控制 Sheet 里的分类筛选）和 `searchQuery`
- filter-action-row 内 高级筛选 是单独的直接子元素（`<div className="filter-action-row">` → 高级筛选 + `__actions` 子 div）

**UX 选择**：在 filter-action-row 的左侧组里，「高级筛选」之后加两个按钮。视觉上三者靠左。
</investigation>

<tasks>

## Task 1: backend/app/services/ingredient_service.py — 加 has_dishes 过滤参数

- **files**: `backend/app/services/ingredient_service.py`
- **action**: 在 `list_ingredients` 增加 `has_dishes: Optional[bool] = None` 参数。用 SQLAlchemy `exists()` 子查询过滤：
  - `True`：`query.where(select(DishIngredient.id).where(DishIngredient.ingredient_id == Ingredient.id).exists())`
  - `False`：`query.where(~select(DishIngredient.id).where(DishIngredient.ingredient_id == Ingredient.id).exists())`
  - `None`：不加过滤
- **verify**: 静态检查（py_compile）；后续 backend 测试覆盖
- **done**: 服务签名扩展 + 条件 SQL 过滤

## Task 2: backend/app/routers/ingredients.py — 暴露 has_dishes query 参数

- **files**: `backend/app/routers/ingredients.py`
- **action**: 在 `list_ingredients` 路由加 `has_dishes: Optional[bool] = Query(None, description="已关联菜品：True=仅已关联，False=仅未关联")`，传给 service
- **verify**: py_compile 通过
- **done**: API 接受 `?has_dishes=true|false`

## Task 3: backend/tests/test_ingredients.py — 新增 has_dishes 过滤测试

- **files**: `backend/tests/test_ingredients.py`
- **action**: 新增 `test_filter_ingredients_by_has_dishes`：
  1. 创建 2 个食材（ing_a, ing_b）
  2. 创建一个菜品并将 ing_a 关联（通过 `dish_ingredients` 直接 INSERT 或调用现有 dish 接口）
  3. 调用 `GET /ingredients?has_dishes=true` → 只返回 ing_a
  4. 调用 `GET /ingredients?has_dishes=false` → 只返回 ing_b
  5. 不传 has_dishes → 两者都返回
- **verify**: pytest 收集成功（环境无 pytest 时跳过运行，仅做语法验证 `py_compile`）
- **done**: 测试逻辑覆盖三个分支

## Task 4: frontend/src/api/client.js — getIngredients 增加 hasDishes 参数

- **files**: `frontend/src/api/client.js`（getIngredients 方法，约 221 行）
- **action**:
  ```js
  async getIngredients(category = null, search = null, hasDishes = null) {
    const params = {};
    if (category) params.category = category;
    if (search) params.search = search;
    if (hasDishes !== null) params.has_dishes = hasDishes;
    const qs = new URLSearchParams(params).toString();
    return this.get(`/ingredients${qs ? '?' + qs : ''}`);
  }
  ```
- **verify**: node --check 通过
- **done**: API 客户端签名扩展

## Task 5: frontend/src/pages/AdminIngredientsPage.jsx — UI + state

- **files**: `frontend/src/pages/AdminIngredientsPage.jsx`
- **action**:
  1. 新增 state：`const [assocFilter, setAssocFilter] = useState(null)`（null='all', true='associated', false='unassociated'）
  2. 互斥点击处理：
     ```js
     const toggleAssoc = (value) => {
       setAssocFilter((prev) => (prev === value ? null : value));
     };
     ```
  3. 修改 `loadIngredients`：把 `hasDishes: assocFilter` 传给 `api.getIngredients`
  4. 加 `useEffect`：依赖 `assocFilter` 调用 `loadIngredients`
  5. UI：在 `filter-action-row` 的 高级筛选之后加两个按钮：
     ```jsx
     <div className="filter-action-row">
       <Button variant="tonal" size="sm" onClick={() => setShowAdvFilter(true)}>高级筛选</Button>
       <Button
         variant={assocFilter === true ? 'filled' : 'outlined'}
         size="sm"
         onClick={() => toggleAssoc(true)}
       >已关联</Button>
       <Button
         variant={assocFilter === false ? 'filled' : 'outlined'}
         size="sm"
         onClick={() => toggleAssoc(false)}
       >未关联</Button>
       <div className="filter-action-row__actions">
         <Button variant="tonal" size="sm" onClick={openParseModal}><Icon name="edit" size={18} /> 解析文本</Button>
         <Button variant="filled" size="sm" onClick={openCreate}>+ 添加</Button>
       </div>
     </div>
     ```
- **verify**: `npm run build` 通过；按钮渲染正常
- **done**: 两个互斥按钮 + 筛选生效

</tasks>

<verification>
1. `npm run build` 通过（0 error）
2. `python3 -m py_compile` 所有改动的 backend 文件通过
3. `node --check` 改动的 frontend JS 文件通过
4. `grep -n "已关联\|未关联" AdminIngredientsPage.jsx` 命中
5. `grep "has_dishes" routers/ingredients.py services/ingredient_service.py` 命中
6. 新 filter 在 `loadIngredients` 链路中：`useEffect([assocFilter])` → `api.getIngredients(..., assocFilter)` → service `has_dishes` → SQL EXISTS/NOT EXISTS
</verification>

<success_criteria>
- [x] Backend 接受 `?has_dishes=true|false` 参数
- [x] Service 用 SQLAlchemy EXISTS/NOT EXISTS 过滤
- [x] API 客户端传递 hasDishes 参数
- [x] AdminIngredientsPage 有两个互斥按钮（已关联/未关联），位于高级筛选之后
- [x] 选中态视觉明显（filled 变体 vs outlined），互斥生效
- [x] 再点已选中按钮可取消（回到"全部"）
- [x] `npm run build` 通过
- [x] 新增测试 `test_filter_ingredients_by_has_dishes`
</success_criteria>