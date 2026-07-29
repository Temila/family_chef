# Milestones

## v1.2 MD3重构 (Shipped: 2026-07-29)

**Phases completed:** 5 phases, 15 plans, 40 tasks

**Key accomplishments:**

- MD3 focus ring tokens applied via :focus-visible across 11 selectors (8 outer-ring refs + 5 inner-ring refs); global baseline ensures keyboard accessibility by default; 6 hardcoded numeric borderRadius values swept from JSX inline styles; scripts/check-tokens.sh regression guard (7 invariant checks, 95 lines) wired as `npm run check:tokens`; build green, lint matches baseline (92/21), guard exits 0 on clean tree and 1 on injected regression.
- MD3 interaction feedback layer: CSS ::before state-layer system (hover 8%/pressed 10%/focused 12%/disabled 38%), React <Ripple> component with pointer-position-aware primary 12% ripples, card elevation-1→2 transition cleanup, 12 new focus-ring consumers, and Material Symbols <Icon> skeleton
- Playwright 触控目标审计脚本（12 页面 × iPhone X 移动视口）+ 全局 CSS min-width/min-height:48px 规则覆盖 22 个交互选择器 + 7 个已知极小组件 padding 补偿到 48dp hit area（视觉尺寸保持原状），/login 页面审计 0 违规
- MD3 Card primitive (3 variants + 4 slot API) + Input primitive (2 variants + CSS-only floating label + error) + 3 domain cards refactored to slot-based thin wrappers + ~12 generic .card consumers + 12 form families migrated; legacy .card/.dish-card/.wish-card/.form-label/.form-group/.form-error CSS deleted (.form-input retained for select).
- MD3 Badge（3 variants × 8 tones + 向后兼容状态映射）与 Chip（4 variants + 可访问 filter/input 交互）落地，并完成全前端旧 badge/filter-chip 调用和 CSS 选择器清理。
- MD3 Navigation Rail (80dp) + Navigation Bar (80dp with active pill) + Sidecar Header — App.jsx 装配 + 全部旧导航 CSS 清除
- MD3 Rich tone Snackbar queue with pause-aware 4s/6s timers, compound 1/2/3-line ListItem, semantic Divider, and all three legacy list consumers migrated without changing 169 showToast callsites
- Restored native mouse/touch click on MD3 button primitives via Ripple hybrid self/wrap mode and removed the duplicate Sidecar Header, relocating theme/logout to a compact Sidebar footer — both v1.2 regressions locked behind 10 Playwright browser tests.
- Enforced the 8dp grid across all 45 frontend source files (zero raw-px spacing survivors), closed the last 2 radius residues, and installed stylelint + path-independent check:md3 source regression gate — with the stylelint supply-chain boundary gated by a blocking human checkpoint.
- Tokenized all 5 motion consumers, migrated 128 pictographic emoji clusters to 12 newly-registered Material Symbols across 36 source files, upgraded EmptyState to string|ReactNode, and shipped a tested backward-compatible actionable Snackbar overload — closing check:md3 to 11/11 PASS with zero backend/logic/auth regression.

---

## v1.0 — 访客点菜邀请 (2026-05-29)

**Phases:** 4 | **Plans:** 6 | **Status:** ✅ Shipped

### Accomplishments

1. GuestInvitation 数据模型 + Alembic 迁移 + 虚拟 guest 用户
2. 邀请创建/访客菜品浏览/订单提交 API + 飞书通知集成（13 个集成测试）
3. 注册用户邀请管理 UI（创建/分享/列表/撤销）+ 访客订单 Badge
4. 访客移动端点菜全流程（浏览/购物车/提交/确认/错误状态）
5. UAT 10/10 通过，修复路由、筛选联动、剪贴板兼容性问题

### Key Decisions

- 链接 token 使用 UUID4 ✓ Good
- 访客订单复用 Order 模型 + 虚拟 __guest__ 用户 ✓ Good
- 一次性使用通过原子性事务实现 ✓ Good
- 访客页面独立于主 SPA ✓ Good
- 惰性过期检查 ✓ Good

### Known Gaps

- GORD-06 访客备注功能已延期至 v2
- CORS allow_origins ["*"] 待收紧

### Stats

- Timeline: 2026-05-24 → 2026-05-29 (5 days)
- Commits: 52 on feature/guest_order

---

## v1.1 — 菜品愿望单 (2026-07-24)

**Phases:** 3 | **Plans:** 11 | **Status:** ✅ Shipped

### Accomplishments

1. Wish 数据模型（13 列）+ 状态机 + 权限边界 + 8 REST 端点 + 25 测试（含 8 个 STRIDE 安全用例）
2. 应用内未读红点（submitter-only disclosure）+ 飞书通知 fan-out / 单收件人 + 5 钩子绑定
3. 三角色共用 WishCard + 5 状态徽章 + 移动端友好的 User/Chef/Admin 页面 + 深链高亮
4. /wishes/:id 飞书深链兼容路由 + ?wish=:id 4s 高亮 + 滚动到视图 + 缺失卡片 toast
5. 闭环修复：H-3 深链高亮 race（fetchedOnce + setTimeout(100)）+ 迁移同步缺口（NOTE 标记）
6. 16/16 E2E 流验证 + 71/71 wish 后端测试 + 5/5 HUMAN-UAT 浏览器复核全部 pass

### Key Decisions

- 原子条件 UPDATE 实现认领并发安全（D-01）✓ Good
- naive_utc_now() UTC-naive 时钟辅助 ✓ Good
- batch_alter_table(recreate=always) 绕过 SQLite ADD COLUMN ✓ Good
- compute_has_unread 身份屏蔽（非提交者得 false）✓ Good
- WishNotificationService 独立模块隔离失败 ✓ Good
- fetchedOnce + setTimeout(100) 闭合高亮 race ✓ Good
- NOTE(07-04) 源码标记代替擅自架构决策 ✓ Good

### Known Gaps (tech_debt)

- `config.yaml` 缺 `app.url`，飞书深链回落占位
- 迁移 `f94f55868e87` SQLite batch 缺陷
- 启动未自动跑 `alembic upgrade head`（AUTO_MIGRATE env 候选）
- CORS `allow_origins: ['*']` 未收窄（v1.0 延后）
- Backend pytest 套件漂移（107 失败，既有）
- IN-01: WishDeepLinkRedirect 未 encodeURIComponent（低危）
- IN-04: actingId 跨卡片点击残留（极低重现）
- 前端全量 lint 基线红（既有）

### Stats

- Timeline: 2026-05-29 → 2026-07-24 (56 days)
- Commits: 104 on feature/guest_order
- Requirements: 23/23 satisfied
- E2E flows: 16/16 verified
- Human UAT: 5/5 passed (H-1..H-5)
