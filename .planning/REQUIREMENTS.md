# Requirements: 家味 · Family Chef

**Defined:** 2026-07-29
**Core Value:** 让家庭成员和访客都能简单、愉快地参与到家庭用餐的菜品选择与准备

## v1 Requirements

### Bugfixes

- [ ] **BUG-01**: 修复 md-bottom-bar 宽度间隙问题（部分分辨率左右空隙）
- [ ] **BUG-02**: 修复表格表头与内容错位（th 缺少 ::before 占位）
- [ ] **BUG-03**: 移动端愿望单卡片单列全宽统一高度
- [ ] **BUG-04**: 食材管理下拉菜单按钮圆角半径缩小到当前 1/4
- [ ] **BUG-05**: 移动端食材管理的编辑和删除按钮固定到卡片最下方，各行卡片按钮在同一水平线上
- [ ] **BUG-06**: 创建覆盖有/无食谱、有/无介绍、有/无图片等情况的测试菜谱，保证移动端卡片同大、按钮齐平
- [ ] **BUG-07**: 深色模式下弹出页面与背景对比度不够，给弹出页面周围增加主题色边框

### Navigation

- [ ] **NAV-01**: md-header 重组——仅保留用户头像（含下拉菜单）和主题切换按钮，其他功能按钮移到 header 下方 div 中（不能是 BottomBar）
- [ ] **NAV-02**: 用户头像下拉菜单仅保留"编辑资料"和"退出登录"两个功能
- [ ] **NAV-03**: md-sidebar 取消主题切换和退出登录按钮
- [ ] **NAV-04**: 厨师移动端首页添加菜品管理和食谱管理入口
- [ ] **NAV-05**: md-bottom-bar 图标确保"首页"在最左边

### UI Components

- [ ] **UI-01**: 所有高级筛选功能改为弹出子页面（类似菜品管理中"添加"按钮的行为）
- [ ] **UI-02**: md-bottom-bar 宽度修复（与 BUG-01 关联，确保弹出筛选页不破坏布局）
- [ ] **UI-03**: Dark mode 弹出页面主题色边框（与 BUG-07 关联）

### Data

- [ ] **DATA-01**: 创建测试菜谱 seed 数据，覆盖有/无食谱、有/无介绍、有/无图片的组合场景

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
| BUG-01 | Phase 14 | Pending |
| BUG-02 | Phase 14 | Pending |
| BUG-03 | Phase 14 | Pending |
| BUG-04 | Phase 14 | Pending |
| BUG-05 | Phase 14 | Pending |
| BUG-06 | Phase 15 | Pending |
| BUG-07 | Phase 14 | Pending |
| NAV-01 | Phase 15 | Pending |
| NAV-02 | Phase 15 | Pending |
| NAV-03 | Phase 15 | Pending |
| NAV-04 | Phase 15 | Pending |
| NAV-05 | Phase 15 | Pending |
| UI-01 | Phase 15 | Pending |
| UI-02 | Phase 14 | Pending |
| UI-03 | Phase 14 | Pending |
| DATA-01 | Phase 15 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-29*
*Last updated: 2026-07-29 after initial definition*
