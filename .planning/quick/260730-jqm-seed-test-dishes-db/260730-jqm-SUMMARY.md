---
phase: quick
quick_id: 260730-jqm
slug: seed-test-dishes-db
date: 2026-07-30
status: complete
description: 直接在数据库中添加测试菜品（DATA-01 seed 一次性注入）
key-files:
  - backend/data/family_chef.db
metrics:
  dishes_added: 8
  combinations_covered: "2^3 = 8 (recipe × description × image)"
---

# Quick Task 260730-jqm: 直接在数据库中添加测试菜品

## 问题

用户反馈"测试用的菜品没有创建"。Phase 15-06 的 `create_seed_test_dishes()`（`backend/app/initial_data.py:428`）已正确接入 startup（`main.py:242`），但因 env guard（`initial_data.py:436-440`，要求 `ENVIRONMENT=development` 或 `AUTO_SEED_DEMO_DISHES=1`）在运行时被静默跳过 —— 无日志输出，看起来像没执行。

## 调查结果

- 活跃 DB：`backend/data/family_chef.db`（`backend/family_chef.db` 为 0 字节废弃文件）
- 注入前 DB 状态：users=10 (admin ✓), categories=52 (region=7 ✓), dishes=2, 测试菜品=0
- `create_seed_test_dishes()` 的全部前置条件（admin 用户、region 分类）均已满足
- 唯一阻断点 = env guard；函数本身逻辑正确、幂等

## 处理方式（不修改源码）

对活跃 DB 一次性直接执行 seed 函数，绕过 env guard：

```bash
cd backend
uv run python -c "
import asyncio, os
os.environ['AUTO_SEED_DEMO_DISHES'] = '1'
from app.initial_data import create_seed_test_dishes
asyncio.run(create_seed_test_dishes())
"
```

执行前已备份 `backend/data/family_chef.db` → `/tmp/opencode/family_chef.db.bak.*`。

## 结果

注入后 DB 状态：dishes=10（原 2 + 新增 8），8 道测试菜品明细：

| ID | 名称 | recipe | desc | img | status |
|----|------|--------|------|-----|--------|
| 3  | 测试菜品 1 · 有食谱有介绍有图 | ✓ | ✓ | ✓ | published |
| 4  | 测试菜品 2 · 有食谱有介绍无图 | ✓ | ✓ | ✗ | published |
| 5  | 测试菜品 3 · 有食谱无介绍有图 | ✓ | ✗ | ✓ | published |
| 6  | 测试菜品 4 · 有食谱无介绍无图 | ✓ | ✗ | ✗ | published |
| 7  | 测试菜品 5 · 无食谱有介绍有图 | ✗ | ✓ | ✓ | published |
| 8  | 测试菜品 6 · 无食谱有介绍无图 | ✗ | ✓ | ✗ | draft |
| 9  | 测试菜品 7 · 无食谱无介绍有图 | ✗ | ✗ | ✓ | published |
| 10 | 测试菜品 8 · 无食谱无介绍无图 | ✗ | ✗ | ✗ | published |

- 全部 8 种组合覆盖（recipe×description×image 的 2³ 矩阵）—— 满足 BUG-06 / DATA-01
- 8 条 `dish_categories` 关联（每道菜绑定一个 region 分类）
- 全部 `created_by=1`（admin）
- 幂等性验证：再次运行输出 `✅ 测试菜品已存在 (8 道)，跳过 seed`，数量保持 8

## Self-Check: PASSED

- [x] 8 道测试菜品存在于 `backend/data/family_chef.db`
- [x] 覆盖 recipe×description×image 全部 8 种组合
- [x] 幂等（重复运行不重复插入）
- [x] 无源码改动（纯 DB 变更）

## 备注 / 后续

- env guard 保持不变（production 安全）—— 若希望 dev 环境 startup 自动注入，可设置 `AUTO_SEED_DEMO_DISHES=1` 环境变量或在 `scripts/run-dev.sh` 中导出
- `backend/family_chef.db`（0 字节）为历史废弃文件，可后续清理
- DB 变更不进 git（`*.db` / `data/` 已 gitignore），本次仅提交 PLAN.md / SUMMARY.md / STATE.md 文档
