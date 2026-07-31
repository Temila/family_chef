---
status: complete
phase: 16-tech-debt-cleanup
source:
  - .planning/phases/16-tech-debt-cleanup/16-01-SUMMARY.md
  - .planning/phases/16-tech-debt-cleanup/16-02-SUMMARY.md
  - .planning/phases/16-tech-debt-cleanup/16-03-SUMMARY.md
  - .planning/phases/16-tech-debt-cleanup/16-04-SUMMARY.md
started: 2026-07-30T10:35:00Z
updated: 2026-07-30T11:20:00Z
---

## Current Test

number: 1
name: ChefDishesPage layout matches AdminDishesPage
expected: |
  打开 chef/dishes 页面 (登录 Temila/Vztzkcdw!1992)。
  Header 不再包含 "解析文本" / "+ 添加" 按钮 — 它们出现在搜索栏下方的 filter-action-row 中。
  高级筛选按钮、解析文本、+ 添加 三者位于同一行：左 高级筛选，右 解析文本/添加。
  高级筛选从弹出 Sheet 子页面触发（不是内联展开）。
awaiting: user response

## Tests

### 1. ChefDishesPage layout matches AdminDishesPage
expected: 打开 /chef/dishes，header 仅含标题，操作按钮（解析文本、+ 添加）位于搜索栏下方的 filter-action-row 中。点击"高级筛选"应弹出 Sheet 子页面，与 admin/dishes 一致。
result: pass

### 2. Sidebar version 显示来自后端 API
expected: 打开任意页面（如 /），底部 sidebar 显示版本号 (如 "v1.3.0")。版本号来源于后端 /api/version 端点（由 config.yaml 的 app.version 驱动），而非构建时的 package.json。
result: issue
reported: "显示正常，但需要把版本号更新为v1.3.0"
severity: minor

### 3. 启动时自动运行 alembic upgrade head
expected: 删除 data/family_chef.db 后重启后端服务 — 数据库自动重建，所有迁移自动应用，无需手动执行 alembic 命令。
result: pass

### 4. ChefWishesPage actingId 残留修复
expected: 在 chef/wishes 页面，点击 wish A 弹出"修改状态"模态，再点击 wish B — A 的模态应正确关闭，不会留下 wish A 的状态痕迹。
result: pass

### 5. WishDeepLinkRedirect URL 编码
expected: 构造一个深链接 `/wish/redirect?wish=12&extra=value`（含特殊字符 &）— 重定向后正确处理，不应该注入额外的查询参数。
result: pass

### 6. config.yaml app.url 生效
expected: 飞书深链点击后跳转 `https://family-chef.app/wishes/<id>`（除非 config.yaml 中配置了不同的 url）。检查 config.yaml 包含 `url: "https://family-chef.app"`。
result: pass

### 7. Migration batch fix（alembic upgrade head from base）
expected: 在 fresh SQLite DB 上 `alembic upgrade head` 从 base 无错误地应用所有迁移。
result: pass

### 8. CORS fallback 不再是 `["*"]`
expected: 当 config.yaml 缺少 cors 部分时，后端 settings.CORS_ORIGINS 默认为 localhost:5173/3000 而非 `["*"]`。
result: pass

### 9. 后端测试套件全部通过
expected: `cd backend && uv run pytest -q` → 350 passed, 0 failed。
result: pass

### 10. 前端 lint 全部通过
expected: `cd frontend && npx eslint .` → 0 errors, 0 warnings。`npm run build` → success。
result: pass

## Summary

total: 10
passed: 9
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Sidebar version 显示来自后端 API (/api/version)，由 config.yaml 的 app.version 驱动"
  status: failed
  reason: "User reported: 显示正常，但需要把版本号更新为v1.3.0"
  severity: minor
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
