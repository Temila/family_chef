# Requirements: 家味 · Family Chef

**Defined:** 2026-07-29
**Core Value:** 让家庭成员和访客都能简单、愉快地参与到家庭用餐的菜品选择与准备

## v1 Requirements

### Bugfixes

- [x] **BUG-01**: 修复 md-bottom-bar 宽度间隙问题（部分分辨率左右空隙）
- [x] **BUG-02**: 修复表格表头与内容错位（th 缺少 ::before 占位）
- [x] **BUG-03**: 移动端愿望单卡片单列全宽统一高度
- [x] **BUG-04**: 食材管理下拉菜单按钮圆角半径缩小到当前 1/4
- [x] **BUG-05**: 移动端食材管理的编辑和删除按钮固定到卡片最下方，各行卡片按钮在同一水平线上
- [x] **BUG-06**: 创建覆盖有/无食谱、有/无介绍、有/无图片等情况的测试菜谱，保证移动端卡片同大、按钮齐平
- [x] **BUG-07**: 深色模式下弹出页面与背景对比度不够，给弹出页面周围增加主题色边框

### Navigation

- [x] **NAV-01**: md-header 重组——仅保留用户头像（含下拉菜单）和主题切换按钮，其他功能按钮移到 header 下方 div 中（不能是 BottomBar）
- [x] **NAV-02**: 用户头像下拉菜单仅保留"编辑资料"和"退出登录"两个功能
- [x] **NAV-03**: md-sidebar 取消主题切换和退出登录按钮
- [x] **NAV-04**: 厨师移动端首页添加菜品管理和食谱管理入口
- [x] **NAV-05**: md-bottom-bar 图标确保"首页"在最左边

### UI Components

- [x] **UI-01**: 所有高级筛选功能改为弹出子页面（类似菜品管理中"添加"按钮的行为）
- [x] **UI-02**: md-bottom-bar 宽度修复（与 BUG-01 关联，确保弹出筛选页不破坏布局）
- [x] **UI-03**: Dark mode 弹出页面主题色边框（与 BUG-07 关联）

### Data

- [x] **DATA-01**: 创建测试菜谱 seed 数据，覆盖有/无食谱、有/无介绍、有/无图片的组合场景

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Future

- **GORD-06**: 访客备注功能 — 延期自 v1.0
- **MOTION-05**: MD3 motion duration/easing tokens — 延期自 v1.2

## Out of Scope

| Feature | Reason |
|---------|--------|
| 访客注册/登录 | 访客流程完全无账号 |
| 访客修改或取消订单 | 提交后只读 |
| 同一链接多次点菜 | 严格一次性 |
| 支付集成 | 家庭应用非商业场景 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | Phase 14 | Complete |
| BUG-02 | Phase 14 | Complete |
| BUG-03 | Phase 14 | Complete |
| BUG-04 | Phase 14 | Complete |
| BUG-05 | Phase 14 | Complete |
| BUG-06 | Phase 15 | Complete |
| BUG-07 | Phase 14 | Complete |
| NAV-01 | Phase 15 | Complete |
| NAV-02 | Phase 15 | Complete |
| NAV-03 | Phase 15 | Complete |
| NAV-04 | Phase 15 | Complete |
| NAV-05 | Phase 15 | Complete |
| UI-01 | Phase 15 | Complete |
| UI-02 | Phase 14 | Complete |
| UI-03 | Phase 14 | Complete |
| DATA-01 | Phase 15 | Complete |


## v1.4 Requirements — Tech Debt Cleanup

| ID | Description | Phase | Status |
|----|-------------|-------|--------|
| TD-01 | `::before` 字面值 override 确认关闭 | Phase 16 | Pending |
| TD-02 | 版本号读 config.yaml 而非 package.json | Phase 16 | Pending |
| TD-03 | CORS `allow_origins` 确认已收窄（验证 config.yaml） | Phase 16 | Pending |
| TD-04 | `config.yaml` 添加 `app.url` 显式配置 | Phase 16 | Pending |
| TD-05 | `alembic env.py` 添加 `render_as_batch=True` 修复 SQLite batch 缺陷 | Phase 16 | Pending |
| TD-06 | 启动时自动 `alembic upgrade head` | Phase 16 | Pending |
| TD-07 | `WishDeepLinkRedirect` 补 `encodeURIComponent(id)` | Phase 16 | Pending |
| TD-08 | `actingId` 跨卡片点击残留修复 | Phase 16 | Pending |
| TD-09 | 后端测试套件引用漂移修复（107 fail → 0 fail） | Phase 16 | Pending |
| TD-10 | 前端 lint 基线修复（101 errors → 0 errors, 22 warnings） | Phase 16 | Pending |

**Coverage:**
- v1.4 requirements: 10 total
- Mapped to Phase 16: 10

---
*Requirements defined: 2026-07-29*
*Last updated: 2026-07-29 after initial definition*
