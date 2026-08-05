# Phase 18: Custom Editor & Seasonal Auto-Switch - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-05
**Phase:** 18-Custom Editor & Seasonal Auto-Switch
**Areas discussed:** 季节定义, 半球处理, 自动切换交互, 编辑器 UX

---

## 季节定义

| Option | Description | Selected |
|--------|-------------|----------|
| 气象学（固定月份） | 3-5月春等固定月份，完全确定性 | |
| 节气（赤道历） | 立春/立夏/立秋/立冬，符合中文家庭文化 | ✓ |
| 两者可选 | 默认节气 + 用户可选 | |

**User's choice:** 节气（skyfield 相关参考代码）。用户明确要求用最新高精度天文历表（`almanac_ea.solar_terms` + `SOLAR_TERMS_ZHS`，示例代码可原生实现）。
**Notes:** 用户两次选型——最初给 skyfield 参考代码，随后要求"选1（预生成 JSON 表）但生成到 2099 年"，并补充"精确到天即可"。

| Option | Description | Selected |
|--------|-------------|----------|
| 预生成 JSON 表（推荐） | 本地 skyfield 脚本生成 2020-2099 节气时刻，嵌入前端，零运行时依赖 | ✓ |
| 后端 skyfield API | 后端运行时算节气，~100MB 星历 + 网络依赖 | |
| 纯 JS 计算 | 无依赖但需自己维护精度 | |

**User's choice:** 预生成 JSON 表（生成到 2099 年，精确到天）。
**Notes:** 前端 mount 时按本地时区与表比对得出季节。

---

## 半球处理

| Option | Description | Selected |
|--------|-------------|----------|
| 手动切换（推荐） | 默认北半球 + 设置切换，存 localStorage | ✓ |
| 时区启发式 + 手动修正 | Intl timeZone 偏移猜测，可能猜错 | |
| IP 定位 | 需网络 + 隐私考虑 | |

**User's choice:** 手动切换（推荐）。
**Notes:** 无浏览器半球 API；用户选择确定性最高、零猜测的方案。

---

## 自动切换交互

| Option | Description | Selected |
|--------|-------------|----------|
| /theme 页顶部开关 | 一处管理，发现成本低 | |
| Header/侧边栏 | 常驻但挤压导航 | |
| 主题设置子页面 | 开关与半球切换放在 /theme 的设置子页 | ✓ |

**User's choice:** 主题设置子页面。

| Option | Description | Selected |
|--------|-------------|----------|
| 挂起到下一季节（推荐） | 手动选择后直到下一节气才重新自动切换 | |
| 固定 TTL 24h | 次日恢复自动 | |
| 固定 TTL 7 天 | 7 天内不自动切换 | |
| **互斥模型（用户自定义）** | 开启自动切换后手动应用失效，仅使用四季主题；开关处醒目提醒 | ✓ |

**User's choice:** 互斥模型（"用户打开自动切换开关后手段选择失效，此时仅使用四季主题。开关处做醒目提醒"）。
**Notes:** 用户主动颠覆 SEAS-04 原文"手动选择挂起自动切换（带 TTL override）"——改为开关互斥模型，TTL 不再实现。进一步明确："自动切换ON时点仅允许编辑主题，但不允许应用主题，四季主题也不允许手动选择，完全按当前季节进行匹配"。再经确认，ON 时卡片点击行为为"仅自定义可编辑"（预设卡片无操作）。SEAS-04 需求标记为被此决策取代。

---

## 编辑器 UX

| Option | Description | Selected |
|--------|-------------|----------|
| Sheet 子页面 | 仿 Phase 14 高级筛选，移动端优先 | |
| 独立页面（推荐） | /theme/editor 路由页，Header + BottomBar，可深链 | ✓ |
| 全屏 Modal | 聚焦但隔离 | |

**User's choice:** 独立页面。

| Option | Description | Selected |
|--------|-------------|----------|
| 编辑器内作用域预览（推荐） | 拖拽直写作用域 CSS 变量 + 真实 primitive，保存后才全 app 应用 | ✓ |
| 整应用实时换色 | 拖拽时全 app 实时 re-theme | |
| 编辑器页整页换色 | 页面范围预览 | |

**User's choice:** 编辑器内作用域预览（推荐）。
**Notes:** 复用 Phase 17 的 `data-fc-theme-scope` 作用域模式。

| Option | Description | Selected |
|--------|-------------|----------|
| Chip 横向滚动（推荐） | 复用 Chip primitive，选中态 secondary-container | ✓ |
| 下拉菜单 | 紧凑但两步 | |
| 分段按钮 | 9 项需换行 | |

**User's choice:** Chip 横向滚动（推荐）。

| Option | Description | Selected |
|--------|-------------|----------|
| 显式保存 + 保存后应用（推荐） | 新建 POST / 编辑 PUT / fork 预填名 POST；保存后自动应用并返回 | ✓ |
| 保存后不自动应用 | 回卡片页自行点选 | |
| 自动保存 | 无保存按钮 | |

**User's choice:** 显式保存 + 保存后应用（推荐）。

| Option | Description | Selected |
|--------|-------------|----------|
| 重名拦截（推荐） | 与后端 uq 约束一致，弹提示阻止保存 | ✓ |
| 允许重名 | 需改迁移放弃唯一约束 | |
| 自动后缀 | 体验顺滑但名称不可控 | |

**User's choice:** 重名拦截（推荐）。

| Option | Description | Selected |
|--------|-------------|----------|
| 中文显示 + 英文存储 | 界面中文名 + 原名小字 | |
| 纯英文 | 显示 Material 官方英文原名 | ✓ |

**User's choice:** 纯英文（变体显示名不翻译）。

---

## the agent's Discretion

- 节气表数据结构（year-indexed vs 扁平事件数组）与脚本放置（scripts/generate-solar-terms.*）
- 编辑器页布局细节（picker/hex 输入/变体 Chip/命名/预览/保存按钮排布）
- 预设 fork 预填名（沿用 17 D-01 "我的春"）
- 删除自定义主题的确认方式（建议轻量确认）
- 编辑时活动主题保持不动、保存后变更
- FOUC bootstrap 与自动切换首屏主题来源的交互（agent 判断是否纳入 Phase 18）

## Deferred Ideas

- 后端 skyfield 运行时 API — 否决（选预生成表）
- 时区启发式/IP 定位半球侦测 — 否决（选手动）
- SEAS-04 TTL override 挂起模型 — 被互斥模型取代
- 整应用实时换色（拖拽时）— 否决（选作用域预览）
- HCT-PICKER / JSON-EXPORT / URL-SHARE / IMG-THEME / CONTRAST-PANEL — v2 Future，不实现