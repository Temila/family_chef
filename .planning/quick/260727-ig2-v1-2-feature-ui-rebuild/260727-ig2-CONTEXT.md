# Quick Task 260727-ig2: 撤销v1.2的发布，重建feature/ui-rebuild分支 - Context

**Gathered:** 2026-07-27
**Status:** Ready for execution

<domain>
## Task Boundary

撤销 v1.2 的发布（Material Design 3 UI 重构），重建 feature/ui-rebuild 分支。
本任务是对上一个 quick task (260727-i2g) 中 v1.2 发布部分的逆向操作。

</domain>

<decisions>
## Implementation Decisions

### 撤销方式：Reset + 强制推送
- `git reset --hard v1.1` + force-push，让 main/dev 回到 v1.2 之前的状态（v1.1 = `14ed5fd`）
- 历史干净，不留 revert 提交。因为 v1.2 是刚发布要回退的，这是最干净的做法。

### 重建分支内容：指向 squash 提交 7419be0
- feature/ui-rebuild 直接指向当前 v1.2 的 squash 提交 `7419be0`
- 保留全部 UI 重构成果，后续可重新发 PR
- 不尝试重建原始 39 个 Phase 08/09 提交（已被 rebase 改写，难以完整复原）

### 发布撤销范围：Release + Tag + PR 标记
- 删除 GitHub Release v1.2
- 删除 v1.2 tag（本地 + 远程）
- PR #23 已 merged 无法取消合并，状态保留（GitHub 不支持 unmerge）

</decisions>

<specifics>
## Specific Ideas

### 关键 ref 对照
- v1.1 tag = `14ed5fd`（撤销后 main/dev 的目标状态）
- v1.2 tag = `7419be0`（撤销对象，feature/ui-rebuild 重建后指向此处）
- 当前 main = dev = origin/main = origin/dev = `7419be0`

### 当前状态（来自上一个 quick task 260727-i2g）
- origin/main = `7419be0`（v1.2 — wishlist + UI rebuild）
- origin/dev = `7419be0`（与 main 同步）
- Tags: v1.0, v1.1, v1.2
- GitHub releases: v1.1, v1.2
- PRs: #22 (wishlist, merged), #23 (UI rebuild, merged)
- .planning/ 目录刻意从 main 移除（commit fe391a2），quick task artifacts 不被 git 跟踪

</specifics>

<canonical_refs>
## Canonical References

- 上一个 quick task summary: `.planning/quick/260727-i2g-sync-dev-with-main-split-wishlist-commit/260727-i2g-SUMMARY.md`
- PR #23: feat: Material Design 3 UI 重构 (v1.2) — 已 merged
- GitHub Release v1.2: https://github.com/Temila/family_chef/releases/tag/v1.2

</canonical_refs>
