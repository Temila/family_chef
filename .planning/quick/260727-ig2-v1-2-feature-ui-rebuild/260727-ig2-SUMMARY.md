---
quick_id: "260727-ig2"
slug: v1-2-feature-ui-rebuild
status: complete
date: 2026-07-27
---

# Quick Task 260727-ig2 — Summary

## Task
撤销 v1.2（Material Design 3 UI 重构）的发布，将 main/dev 回退到 v1.1，删除 v1.2 的 tag 与 GitHub Release，并重建 feature/ui-rebuild 分支保留 UI 重构成果。

本任务是对上一个 quick task (260727-i2g) 中 v1.2 发布部分的逆向操作。

## What Was Done

### 1. 回退 main/dev 到 v1.1（Task 1）
- `git switch main && git reset --hard v1.1` → main = `14ed5fd`
- `git push --force-with-lease origin main`（force-push 成功，branch protection 由 owner bypass）
- `git switch dev && git reset --hard v1.1` → dev = `14ed5fd`
- `git push --force-with-lease origin dev`
- 验证：main、dev、origin/main、origin/dev 均为 `14ed5fd`

### 2. 删除 v1.2 tag 与 GitHub Release（Task 2）
- `gh release delete v1.2 --yes` — GitHub Release 删除
- `git tag -d v1.2` — 本地 tag 删除
- `git push --delete origin v1.2` — 远程 tag 删除
- 验证：本地/远程均无 v1.2 tag，`gh release view v1.2` 返回 not-found
- v1.0、v1.1 tag 与 release 未受影响

### 3. 重建 feature/ui-rebuild 分支（Task 3）
- `git branch feature/ui-rebuild 7419be0` — 指向 v1.2 squash 提交
- `git push -u origin feature/ui-rebuild` — 推送到远程
- 验证：feature/ui-rebuild（本地+远程）= `7419be0`

### 4. 最终状态校验（Task 4）
- 全部 ref 与 GitHub 资源状态符合预期

## Final State
- `origin/main` = `14ed5fd`（v1.1 — 已撤销 v1.2）
- `origin/dev` = `14ed5fd`（与 main 同步）
- `origin/feature/ui-rebuild` = `7419be0`（UI 重构成果保留，可重新发 PR）
- Tags: v1.0, v1.1（v1.2 已删除）
- GitHub Releases: 仅 v1.1.0
- PR #23 状态仍为 MERGED（GitHub 不支持 unmerge；其内容影响已通过回退 main 撤销）

## Notes
- 本任务无代码改动，纯属 git/GitHub 操作
- 使用 `--force-with-lease` 而非 `--force`（更安全）
- `.planning/` 在本仓库刻意不被 git 跟踪（commit fe391a2），故无 commit 产物——操作本身即工作成果
- PR #23 无法 unmerge，如需重新以新 PR 形式合并 feature/ui-rebuild，可直接基于该分支发起新 PR
