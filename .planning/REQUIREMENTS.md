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

## v1.4 Requirements — Tech Debt Cleanup

| ID | Description | Phase | Status |
|----|-------------|-------|--------|
| TD-01 | `::before` 字面值 override 确认关闭 | Phase 16 | ✓ Complete |
| TD-02 | 版本号读 config.yaml 而非 package.json | Phase 16 | ✓ Complete |
| TD-03 | CORS `allow_origins` 确认已收窄（验证 config.yaml） | Phase 16 | ✓ Complete |
| TD-04 | `config.yaml` 添加 `app.url` 显式配置 | Phase 16 | ✓ Complete |
| TD-05 | `alembic env.py` 添加 `render_as_batch=True` 修复 SQLite batch 缺陷 | Phase 16 | ✓ Complete |
| TD-06 | 启动时自动 `alembic upgrade head` | Phase 16 | ✓ Complete |
| TD-07 | `WishDeepLinkRedirect` 补 `encodeURIComponent(id)` | Phase 16 | ✓ Complete |
| TD-08 | `actingId` 跨卡片点击残留修复 | Phase 16 | ✓ Complete |
| TD-09 | 后端测试套件引用漂移修复（107 fail → 0 fail） | Phase 16 | ✓ Complete |
| TD-10 | 前端 lint 基线修复（101 errors → 0 errors, 22 warnings） | Phase 16 | ✓ Complete |

## v1.5 Requirements — 自定义网站皮肤 / Theme Customization

### Foundation & Engine

- [x] **FND-01**: theme-engine 模块从种子色（primary/secondary/tertiary + MD3 variant）派生完整 MD3 light+dark 配色并生成 CSS 覆盖层
- [x] **FND-02**: 活动 theme 通过生成的 `<style id="fc-dynamic-theme">` 元素应用（`:root`/`[data-theme="dark"]` 分块），tokens.css 不被修改
- [x] **FND-03**: 自定义 theme 与现有 header 明暗切换协同，零 JS 重应用（CSS 级联处理模式切换）
- [x] **FND-04**: FOUC 防护 — index.html 内联阻塞脚本在首帧前读取活动 theme 并注入 CSS
- [x] **FND-05**: ThemeContext 管理活动 theme + 季节开关，mount/change 时应用，value memoized
- [x] **FND-06**: 深色模式下 elevation 阴影 + surface-tint 跟随自定义色（覆盖 --md-elevation-* 令牌）
- [x] **FND-07**: hex-lint CI gate 保证组件不硬编码颜色（维持 0 匹配不变量）

### Theme Page & Presets

- [x] **TPAGE-01**: Header 入口按钮（主题切换与头像之间）跳转 /theme 页面
- [x] **TPAGE-02**: /theme 页面以卡片网格展示所有 theme（移动端优先响应式）
- [x] **TPAGE-03**: 每张卡片即实时预览（mini-UI 通过 CSS 变量继承作用域到该 theme）
- [x] **TPAGE-04**: 5 个预设 theme：当前配色 + 春/夏/秋/冬季色板
- [x] **TPAGE-05**: 点击卡片应用 theme，选择持久化到 localStorage
- [x] **TPAGE-06**: 当前活动 theme 卡片显示选中指示
- [x] **TPAGE-07**: 预设可编辑（用户可改色）但不可删除，5 个预设条目始终存在

### Custom Editor

- [ ] **EDIT-01**: 自定义编辑器（react-colorful）含 primary/secondary/tertiary 种子色选择器 + hex 输入
- [x] **EDIT-02**: MD3 变体选择器（9 种：TonalSpot/Vibrant/Expressive/Content/Mono/Neutral/Fidelity/Rainbow/FruitSalad）
- [ ] **EDIT-03**: 实时预览随拖拽即时反馈（直写 DOM，不全应用重渲染）
- [ ] **EDIT-04**: 用户可命名保存自定义 theme（数量无上限）
- [ ] **EDIT-05**: 用户可编辑已有自定义 theme
- [ ] **EDIT-06**: 用户可删除自定义 theme（预设除外）
- [x] **EDIT-07**: 种子色驱动派生保证 WCAG AA 对比度，用户不直接编辑派生角色（primary-container 等）

### Backend Persistence

- [x] **SYNC-01**: CustomTheme 模型（source_colors JSON 列，per-user）+ Alembic create_table 迁移
- [x] **SYNC-02**: REST API CRUD `/api/themes`（JWT 鉴权，per-user 归属）
- [x] **SYNC-03**: 跨设备同步 — DB 为真相源，localStorage 缓存活动选择，mount 时按 updatedAt 对账
- [x] **SYNC-04**: 自定义 theme 按用户隔离，仅可见自己的

### Seasonal Auto-Switch

- [ ] **SEAS-01**: 季节解析器从用户本地时区检测当前季节
- [ ] **SEAS-02**: 季节自动切换开关 — 开启时自动选择对应季节预设
- [ ] **SEAS-03**: 半球处理（默认北半球 + 可选南半球切换）
- [ ] **SEAS-04**: 手动选择挂起自动切换（带 TTL 的 override），避免重载时回退

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Future

- **GORD-06**: 访客备注功能 — 延期自 v1.0
- **MOTION-05**: MD3 motion duration/easing tokens — 延期自 v1.2
- **COMPO-09**: Navigation Rail + Navigation Bar 缺陷修复 — v1.2 deferred
- **HCT-PICKER**: HCT 色相/色度/色调滑块（高级用户升级）
- **JSON-EXPORT**: 自定义 theme JSON 导出/导入（剪贴板 + 文件下载）
- **URL-SHARE**: URL 可分享 theme（base64 query param）
- **IMG-THEME**: 从图片提取配色（MCU themeFromImage）
- **CONTRAST-PANEL**: 无障碍对比度面板（受保护的 WCAG 校验）

## Out of Scope

| Feature | Reason |
|---------|--------|
| 访客注册/登录 | 访客流程完全无账号 |
| 访客修改或取消订单 | 提交后只读 |
| 同一链接多次点菜 | 严格一次性 |
| 支付集成 | 家庭应用非商业场景 |
| 逐令牌直接编辑（primary-container/on-primary 等） | 破坏 MD3 角色对比度契约，WCAG AA 无法保证；仅种子色驱动 |
| 明暗切换整合进 /theme | 明暗为正交维度，保留 header 独立按钮（PROJECT.md 明确约束） |
| 圆角/形状自定义 | 本里程碑仅色彩令牌 |
| 字体/排版自定义 | 独立关注点，涉及中文字体栈 |
| 彩虹/动画循环模式 | 无障碍风险（前庭/动效敏感） |
| 每组件颜色覆盖 | 反模式，令牌面从 ~5 输入爆炸到 ~33 |

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

### v1.5 Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 17 | Complete |
| FND-02 | Phase 17 | Complete |
| FND-03 | Phase 17 | Complete |
| FND-04 | Phase 17 | Complete |
| FND-05 | Phase 17 | Complete |
| FND-06 | Phase 17 | Complete |
| FND-07 | Phase 17 | Complete |
| TPAGE-01 | Phase 17 | Complete |
| TPAGE-02 | Phase 17 | Complete |
| TPAGE-03 | Phase 17 | Complete |
| TPAGE-04 | Phase 17 | Complete |
| TPAGE-05 | Phase 17 | Complete |
| TPAGE-06 | Phase 17 | Complete |
| TPAGE-07 | Phase 17 | Complete |
| SYNC-01 | Phase 17 | Complete (17-01) |
| SYNC-02 | Phase 17 | Complete (17-01) |
| SYNC-03 | Phase 17 | Complete |
| SYNC-04 | Phase 17 | Complete (17-01) |
| EDIT-01 | Phase 18 | Pending |
| EDIT-02 | Phase 18 | Complete |
| EDIT-03 | Phase 18 | Pending |
| EDIT-04 | Phase 18 | Pending |
| EDIT-05 | Phase 18 | Pending |
| EDIT-06 | Phase 18 | Pending |
| EDIT-07 | Phase 18 | Complete |
| SEAS-01 | Phase 18 | Pending |
| SEAS-02 | Phase 18 | Pending |
| SEAS-03 | Phase 18 | Pending |
| SEAS-04 | Phase 18 | Pending |

**Coverage:**
- v1.5 requirements: 29 total
- Mapped to phases: 29 (100%) ✓
- Unmapped: 0

**Phase summary:**
- Phase 17 (Theme System Foundation — Engine, Page, Presets & Persistence): FND-01~07, TPAGE-01~07, SYNC-01~04 (18)
- Phase 18 (Custom Editor & Seasonal Auto-Switch): EDIT-01~07, SEAS-01~04 (11)

---
*Requirements defined: 2026-07-29*
*Last updated: 2026-07-31 after v1.5 requirements definition*
