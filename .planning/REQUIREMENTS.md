# Requirements: 家味 · Family Chef

**Defined:** 2026-07-21
**Core Value:** 让家庭成员和访客都能简单、愉快地参与到家庭用餐的菜品选择与准备。

## v1.1 Requirements — 菜品愿望单 (Dish Wish List)

让注册用户在菜单里找不到想吃的菜时，向厨师提交"愿望单"，厨师认领并推进（准备中 → 已上架 / 已拒绝），形成完整闭环。

### WISH — 用户愿望提交与管理

- [ ] **WISH-01**: 注册用户可提交愿望，包含菜名（必填）、参考链接（可选）、备注（可选）
- [ ] **WISH-02**: 用户可查看自己提交的所有愿望列表及当前状态
- [ ] **WISH-03**: 用户可在愿望"已上架"前编辑愿望内容（菜名/参考链接/备注）
- [ ] **WISH-04**: 用户可在愿望"已上架"前撤销（软删除, status='已撤销'）愿望

### FLOW — 厨师认领与推进工作流

- [ ] **FLOW-01**: 管理员可查看所有愿望列表; 厨师看到 待处理队列 + 我的认领
- [ ] **FLOW-02**: 厨师可"认领"待处理愿望 — 独占认领，状态变为"准备中"，该厨师成为负责人
- [ ] **FLOW-03**: 认领厨师可将愿望关联到一个已上架菜品，状态变为"已上架"，愿望锁定不可修改
- [ ] **FLOW-04**: 认领厨师可"拒绝"愿望，必须填写拒绝原因
- [ ] **FLOW-05**: 厨师可查看"我的认领"（自己认领的愿望）

### PERM — 可见性与权限

- [ ] **PERM-01**: 愿望仅对提交者本人、认领该愿望的厨师 + 待处理状态下的所有厨师、管理员可见
- [ ] **PERM-02**: 用户只能编辑/撤销自己的愿望
- [ ] **PERM-03**: 厨师只能推进自己认领的愿望
- [ ] **PERM-04**: 管理员可查看与推进所有愿望

### NOTIF — 通知（续 v1.0 NOTIF-02）

- [x] **NOTIF-03**: 愿望状态变化时（认领/准备中/已上架/已拒绝），提交者在应用内看到红点未读提示
- [x] **NOTIF-04**: 用户查看愿望详情后，红点消除
- [x] **NOTIF-05**: 新愿望提交时，飞书推送愿望信息给厨师端（复用 feishu_client）
- [x] **NOTIF-06**: 愿望被用户编辑/撤销时，认领厨师收到飞书通知

### UX — 移动端体验

- [x] **UX-01**: 用户端愿望列表与提交入口移动端友好
- [x] **UX-02**: 厨师端愿望管理界面（认领/推进/拒绝）移动端友好
- [x] **UX-03**: 状态在愿望卡片上有清晰视觉标识（徽章/颜色）

### DATA — 数据模型（续 v1.0 DATA-05）

- [ ] **DATA-06**: 新增 wish 表（id, user_id, dish_name, reference_url, note, status, claimed_by_chef_id, related_dish_id, reject_reason, timestamps）
- [ ] **DATA-07**: Alembic 迁移脚本，保留 v1.0 数据
- [ ] **DATA-08**: 认领/状态流转操作具备并发安全（避免多人同时认领同一愿望）

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### 访客体验

- **GORD-06**: 访客备注功能（延期自 v1.0）

### 愿望单增强（v1.1 之后）

- **WISH-F01**: 愿望标签分类（辣/素食/菜系等）便于厨师筛选
- **WISH-F02**: 多参考链接（一条愿望可附多个 URL）
- **WISH-F03**: 愿望评论/对话（厨师与提交者双向沟通）
- **WISH-F04**: 愿望历史记录（状态变更轨迹可追溯）

## Out of Scope

Explicitly excluded from v1.1. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| 愿望标签分类（辣/素食等） | 保持 v1.1 简单，参考链接已能表达上下文 |
| 多参考链接 | 单 URL 字段足够覆盖主要用例（B站/抖音/微信/小红书） |
| 愿望评论/对话 | 状态流转 + 拒绝原因已能闭环；双向沟通延后 |
| 社区投票/点赞池 | 可见性限定为提交者+厨师，非社区许愿墙 |
| 访客提交愿望 | v1.1 限定注册用户；访客流程与注册用户差异大 |
| 愿望自动转菜品（草稿） | 厨师手动关联已上架菜品已足够，避免自动创建的清理负担 |
| 愿望过期/回收机制 | v1.1 不设时效；后续可按需添加 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WISH-01 | Phase 5 | Pending |
| WISH-02 | Phase 5 | Pending |
| WISH-03 | Phase 7 | Pending |
| WISH-04 | Phase 7 | Pending |
| FLOW-01 | Phase 5 | Pending |
| FLOW-02 | Phase 5 | Pending |
| FLOW-03 | Phase 5 | Pending |
| FLOW-04 | Phase 5 | Pending |
| FLOW-05 | Phase 5 | Pending |
| PERM-01 | Phase 5 | Pending |
| PERM-02 | Phase 5 | Pending |
| PERM-03 | Phase 5 | Pending |
| PERM-04 | Phase 5 | Pending |
| NOTIF-03 | Phase 6 | Complete |
| NOTIF-04 | Phase 6 | Complete |
| NOTIF-05 | Phase 6 | Complete |
| NOTIF-06 | Phase 6 | Complete |
| UX-01 | Phase 7 | Complete |
| UX-02 | Phase 7 | Complete |
| UX-03 | Phase 7 | Complete |
| DATA-06 | Phase 5 | Pending |
| DATA-07 | Phase 5 | Pending |
| DATA-08 | Phase 5 | Pending |

**Coverage:**
- v1.1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✓
- Phase 5 (Backend): 14 — DATA-06, DATA-07, DATA-08, WISH-01, WISH-02, FLOW-01..05, PERM-01..04
- Phase 6 (Notifications): 4 — NOTIF-03..06
- Phase 7 (Wish List Frontend, merged): 5 — WISH-03, WISH-04, UX-01, UX-02, UX-03

---
*Requirements defined: 2026-07-21*
*Last updated: 2026-07-21 after v1.1 roadmap revision (frontend phases merged → 23/23 requirements mapped to Phases 5-7)*
