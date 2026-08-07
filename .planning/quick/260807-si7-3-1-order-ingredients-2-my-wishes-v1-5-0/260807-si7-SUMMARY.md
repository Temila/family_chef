---
quick_id: "260807-si7"
slug: "3-1-order-ingredients-2-my-wishes-v1-5-0"
status: complete
date: "2026-08-07"
branch: feature/ui-rebuild
tags: [fix, ui-layout, css-specificity, backend, password-reset]
---

# Quick Task 260807-si7 — 修复 3 个 UI/功能问题

修复 Order 页面筛选行排版、my-wishes FAB 按钮位置（+版本号 1.5.0）、管理员重置密码功能。

## Tasks Completed

### Task 1: Order 页面高级筛选行排版修复
- **文件:** `frontend/src/pages/OrderPage.jsx`
- **改动:** 将内联 `display:flex; flexWrap:wrap` 样式的 `<div>` 替换为共享 `.filter-action-row` 容器，"高级筛选"+ "收藏" 分入 `__filters` 组，排序 `<select>` + "共X道" `<span>` 分入 `__actions` 组。
- **效果:** 与 `AdminIngredientsPage.jsx` 布局一致（`justify-content: space-between` 左右对齐）。
- **校验:** ESLint exit 0。
- **Commit:** `33fe7f3`

### Task 2: my-wishes FAB 按钮位置修复 + 版本号更新
- **文件:** `frontend/src/css/styles.css` (line 168)
- **改动:** `.fab` 选择器改为 `.md-fab.fab`，specificity 从 (0,1,0) 提升到 (0,2,0)，确保始终胜过 `FAB.css` 中 `.md-fab { position: relative }`（同 specificity 0,1,0），不受 CSS 加载顺序影响。
- **效果:** FAB 按钮固定在右下角，不再被 `position: relative` 覆盖跑到左上方。
- **版本号:** `config.yaml` 本地文件已从 `1.3.0` 更新为 `1.5.0`（应用磁盘上生效）。
- **Commit:** `4957c0a`

### Task 3: 管理员重置密码功能修复
- **文件:** `backend/app/routers/users.py`, `backend/app/services/user_service.py`
- **改动:**
  - `UserUpdateRequest` 添加 `password: Optional[str] = None` 字段 + `field_validator`（最小长度 6）
  - `update_user` 路由将 `request.password` 传递给 service
  - `update_user` service 方法添加 `password` 参数，非空时设置 `user.password_hash = hash_password(password)`
- **根因:** 前端 `AdminUsersPage.handleSave` 已将 `password` 放入 PUT 请求体，但后端 schema 缺该字段，Pydantic 静默丢弃。
- **校验:** `python3 -m py_compile` 通过。
- **Commit:** `173b602`

## Deviations from Plan

**[Rule 3 - Blocking] `config.yaml` 版本号无法提交**
- **问题:** `config.yaml` 被 `.gitignore` 忽略（项目约定：该文件含 `secret_key` 等敏感配置，本地持有，模板为 `config.example.yaml`）。
- **处理:** 版本号 `1.3.0 → 1.5.0` 已写入本地工作文件（`git diff` 已确认磁盘生效，运行中的应用会读取 1.5.0），但无法纳入版本控制提交。仅 `styles.css` 的 FAB 修复被提交为 Task 2 commit。
- **影响:** 部署环境需在各自的 `config.yaml` 中手动确认版本号为 `1.5.0`（或由部署流程从 `config.example.yaml` 重新生成）。

## Verification

| 检查项 | 结果 |
|--------|------|
| OrderPage 使用 `.filter-action-row` 类 | ✅ 已替换，ESLint exit 0 |
| `.md-fab.fab` 选择器（line 168） | ✅ 已应用 |
| `config.yaml` version = "1.5.0" | ✅ 本地文件已更新（gitignored，未提交） |
| `UserUpdateRequest` 含 password 字段 + validator | ✅ py_compile 通过 |
| `update_user` service 处理 password_hash | ✅ py_compile 通过 |
| 3 个提交无意外文件删除 | ✅ deletion check 为空 |

## Commits

| Hash | Message |
|------|---------|
| `33fe7f3` | fix: 修复订单页面高级筛选行排版 |
| `4957c0a` | fix: 修复 my-wishes FAB 按钮位置 |
| `173b602` | fix: 修复管理员重置密码功能 |

**Duration:** ~2 min

## Self-Check: PASSED

- All 4 modified source files exist on disk
- All 3 commits (33fe7f3, 4957c0a, 173b602) found in git log
- Content assertions: OrderPage `.filter-action-row`, styles.css `.md-fab.fab`, router `password` field, service `hash_password` — all present
