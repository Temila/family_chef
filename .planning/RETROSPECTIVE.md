# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.5 — 自定义网站皮肤 / Theme Customization

**Shipped:** 2026-08-07
**Phases:** 3 | **Plans:** 17 | **Tasks:** 41

### What Was Built
- MD3 运行时主题引擎：种子色驱动派生完整配色方案，9 种 Material Design 3 变体
- /theme 卡片式主题页面 + 5 个预设（默认绿 + 春夏秋冬）
- react-colorful 自定义编辑器：实时 scoped 预览 + 无限自定义主题 CRUD
- 季节自动切换：Skyfield 预生成 80 年二十四节气表 + 北/南半球反转 + 手动挂起互斥
- 账号绑定偏好：user_theme_preferences 表 + server LWW + localStorage FOUC 缓存层

### What Worked
- FOUC bootstrap IIFE 方案（index.html 内联阻塞脚本）成功实现首帧无闪烁主题加载
- Dual-write 模式（localStorage + debounced PUT）平滑迁移了 Phase 18 的纯 localStorage 方案到账号绑定
- Gap-closure wave（18-06~18-09）快速修复 UAT 发现的 6 个问题，每个修复都是精确的一行/几行改动
- CR-01 SQLite FK 修复：VERIFICATION 发现的根因（PRAGMA foreign_keys=OFF）一次性修复了全表所有 FK CASCADE

### What Was Inefficient
- Phase 18 UAT 发现的 CSS 级联问题（injectThemeCss appendChild）应在 Phase 17 就测试 Vite dev 模式下的 CSS 加载顺序
- Phase 19 VERIFICATION.md 在 CR-01 修复后未更新，导致 audit 阶段需要额外验证确认 gap 已解决
- currentSeason 导出未被使用——应在 code review 阶段捕获

### Patterns Established
- Theme Engine 的 CSS 级联覆盖模式：`<style id="fc-dynamic-theme">` 通过 appendChild 确保始终是 `<head>` 最后一个 style，胜过 Vite 注入的 CSS modules
- 季节检测的预生成数据表模式：80 年节气数据编译为 JSL 字面量，避免运行时天文计算
- Server LWW + localStorage FOUC 缓存：后端为真相源、localStorage 降级为首帧引导缓存，登录后异步校准

### Key Lessons
1. Ripple 的 self 模式 cloneElement 会注入 `position: relative` 内联样式——CSS class 无法覆盖 placement，必须用 inline style 传递 fixed 定位
2. SQLite 的 FK CASCADE 在默认配置下完全不生效——必须在每个连接建立时执行 `PRAGMA foreign_keys=ON`
3. Alembic + `Base.metadata.create_all` 双轨制表会导致 alembic_version 不同步——需要 stamp head 自动恢复

### Cost Observations
- Model mix: 100% sonnet（planner/executor/verifier/checker 全部 sonnet）
- Sessions: ~15
- Notable: Phase 18 的 9 plans + 4 gap-closure plans 是本里程碑最复杂的阶段，但 gap-closure wave 模式有效控制了返工成本

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Process Change |
|-----------|--------|-------|-------------------|
| v1.0 | 4 | 6 | 初始 GSD 流程建立 |
| v1.1 | 3 | 11 | 通知集成模式 |
| v1.2 | 6 | 18 | MD3 组件化 + stylelint 门禁 |
| v1.3 | 2 | 13 | UAT 驱动的 bugfix 流程 |
| v1.4 | 1 | 4 | 技术债集中清理 |
| v1.5 | 3 | 17 | 主题引擎 + gap-closure wave 模式 |
