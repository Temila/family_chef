---
phase: quick
quick_id: 260730-jqm
slug: seed-test-dishes-db
date: 2026-07-30
status: pending
description: 直接在数据库中添加测试菜品（DATA-01 seed 一次性注入）
---

# Quick Task 260730-jqm: 直接在数据库中添加测试菜品

<objective>
用户反馈"测试用的菜品没有创建"。Phase 15-06 的 `create_seed_test_dishes()`（`backend/app/initial_data.py:428`）已在 startup 调用（`main.py:242`），但因 env guard（`initial_data.py:436-440`，要求 `ENVIRONMENT=development` 或 `AUTO_SEED_DEMO_DISHES=1`）在运行时被静默跳过。

本任务**不修改源码**，而是对活跃 DB（`backend/data/family_chef.db`）一次性直接执行该 seed 函数，注入 8 道「测试菜品」（recipe×description×image 的 2³ 组合），覆盖 BUG-06/DATA-01 的移动端卡片测试场景。
</objective>

<investigation>
- 活跃 DB：`backend/data/family_chef.db`（479KB，modified 2026-07-24）
- `backend/family_chef.db` 为 0 字节空文件，已废弃
- DB 当前状态：users=10 (admin ✓), categories=52 (region=7 ✓), dishes=2, test_dishes=0
- `create_seed_test_dishes()` 的全部前置条件（admin、region 分类）均已满足
- 唯一阻断点是 env guard —— 用 `AUTO_SEED_DEMO_DISHES=1` 触发一次即可
- 函数幂等：按 `name LIKE '测试菜品 %'` 检测已存在行，重复执行安全
</investigation>

<tasks>
## Task 1: 一次性注入 8 道测试菜品到活跃 DB

- **files**: 无源码改动（纯 DB 变更，`*.db` 已 gitignore）
- **action**:
  1. 已备份 `backend/data/family_chef.db` → `/tmp/opencode/`
  2. 在 `backend/` 工作目录下执行一次性脚本：
     ```python
     import asyncio, os
     os.environ["AUTO_SEED_DEMO_DISHES"] = "1"
     from app.initial_data import create_seed_test_dishes
     asyncio.run(create_seed_test_dishes())
     ```
     通过 `uv run python` 运行（从 `backend/` 目录，确保 `./data/family_chef.db` 解析正确）
- **verify**:
  - 脚本输出 `✅ Seed 测试菜品注入完成（8 道）`
  - `SELECT COUNT(*) FROM dishes WHERE name LIKE '测试菜品 %'` 返回 8
- **done**: DB 中存在 8 道覆盖全部组合的测试菜品

<verification>
执行后用 sqlite3/Python 查询确认：
- `dishes WHERE name LIKE '测试菜品 %'` = 8 行
- 8 行覆盖：有/无食谱 × 有/无介绍 × 有/无图 全部 8 种组合
- 每道菜已关联一个 region 分类（`dish_categories` 表新增 8 行）
- 全部 `created_by` 指向 admin 用户
</verification>

<success_criteria>
- [x] 8 道测试菜品存在于 `backend/data/family_chef.db`
- [x] 覆盖 recipe×description×image 全部 2³=8 组合
- [x] 幂等（再次运行不重复插入）
- [x] 无源码改动
</success_criteria>
