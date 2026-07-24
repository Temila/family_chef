# Phase 8: MD3 Design Token Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-24
**Phase:** 8-MD3 Design Token Foundation
**Areas discussed:** 主色与品牌色策略 / FAB 圆角与 Elevation 阴影实现 / Tonal palette 派生与 Token 实现路径 / Dark mode 触发方式 + 模板清理范围 / UX-05 字体 + 图标策略

---

## 区域 1：主色与品牌色策略

| Option | Description | Selected |
|--------|-------------|----------|
| 保留 Google Blue (#1A73E8) | 延续现有 key color，保持品牌一致 | |
| 切到温暖家庭色调（如 terracotta #B85C38） | 选更'家庭厨房'的暖调 | ✓（细化） |
| You decide | agent 自主选择 | |

**细化第二轮：**
| Option | Description | Selected |
|--------|-------------|----------|
| Terracotta (#B85C38) | 接近陶土/红烧色 | |
| Warm Amber (#D89030) | 接近蜂蜜/酱油 | |
| Soft Olive (#7A8B3D) | 接近植物/养生 | |
| Custom RGB | 用户提供 | ✓ |

**User's choice (实际选定值):**
- Primary: `#34834E`（深绿）
- Primary Container: `#C8E6C9`
- Secondary: `#506446`（橄榄绿）
- Tertiary: `#F5B43C`（暖琥珀）

**User's choice (色板收拢):**
- 收拢到 MD3 - Tertiary 取代 gold；语义色使用 container 派生

**User's choice (Tonal palette 生成):**
- 用 @material/material-color-utilities 自动派生全部 13 tones

**Notes:**
- 用户明确表达"家味"品牌定位——绿色对应食材/新鲜，琥珀对应烹饪/温暖
- "主题选择器 UI"作为独立 future phase 延后；Phase 8 仅预留 `[data-theme="custom"]` token 结构

---

## 区域 2：Tonal palette 派生与 Token 实现路径

| Option | Description | Selected |
|--------|-------------|----------|
| 完全重命名为 --md-* 前缀（一次性扫） | 全部 token 加 `--md-` 前缀 | ✓ |
| 双轨 --md-* 与 --radius-* 共存 | 旧名作为 deprecated alias | |
| 不强制 --md-* 前缀 | 按类别语义命名 | |

**User's choice (Token 文件结构):**
- 独立 `tokens.css`（静态 hardcoded + 手动脚本生成）

**User's choice (Wish tokens 迁移):**
- 完全迁移到 MD3 - 用 `--md-color-error` 派生红点

**Notes:**
- 用户偏好 token 表纯净，不保留 deprecated alias（一次性 grep+替换完成）
- wish-specific tokens (`--unread-dot` / `--size-unread-dot` / `--space-wish-card-stack`) 完全迁入 MD3

---

## 区域 3：FAB 圆角与 Elevation 阴影实现

| Option | Description | Selected |
|--------|-------------|----------|
| 维持 28px（与现有 60-30-10 一致） | 保留 ROADMAP 锁定值 | |
| 改为 16px（MD3 标准 FAB） | 严格 MD3 规范 | ✓ |
| Small FAB 全圆 + 大 FAB 16px | 多变体差异化 | |

**User's choice (Elevation 实现):**
- MD3 标准 - surface tint + shadow 组合

**User's choice (Surface tint 双模式):**
- You decide（agent discretion 按 MD3 规范推导）

**Notes:**
- ⚠️ FAB 圆角选 16px 跟 ROADMAP.md 锁定的 28px 有偏离——已记录到 CONTEXT.md D-08 标记为需更新 source-of-truth
- 用户偏好严格 MD3 规范（即使是已锁定数值也允许修正）

---

## 区域 4：Dark mode 触发方式 + 模板清理范围

| Option | Description | Selected |
|--------|-------------|----------|
| 仅手动 toggle（现状） | 仅 localStorage 记忆 | ✓ |
| 默认跟随系统 + 手动覆盖 | 现代化 | |
| 三状态循环（light / dark / system） | 最完整 | |

**User's choice (Vite 模板清理):**
- 完全清除 - Phase 8 一并处理

**Notes:**
- 用户偏好 Dark mode 简单手动 toggle，不增加 first-load 检测复杂度
- `App.css` (Vite demo) 与 `index.css` 残留硬编码 4px/6px 在 Phase 8 一并清除

---

## 区域 5：UX-05 字体 + 图标策略

| Option | Description | Selected |
|--------|-------------|----------|
| 保留 Noto Serif/Sans SC（不动） | 现有字体不变 | |
| Display 用苹方 + Body 用 Noto Sans SC | 苹方 + Noto Sans SC | ✓ |
| 统一 Noto Sans SC（中英文同体） | 仅 Noto Sans SC | |

**User's choice (图标策略):**
- 引入 Material Symbols（按需子集加载）

**User's choice (图标加载方式):**
- NPM 包 + Vite 优化（生产友好）

**Notes:**
- 字体: `--font-display: '苹方', 'Noto Serif SC', serif` + `--font-body: 'Noto Sans SC', sans-serif`
- 图标: `@material-symbols/*-400` NPM 包，按需子集加载（agent discretion 确定具体子集）

---

## the agent's Discretion

- **E-01**: Elevation 具体数值与 dark mode 差异（surface tint 透明度、shadow blur/offset）
- **E-02**: Material Symbols 子集（按现有 emoji 出现位置枚举）
- **E-03**: `tokens.css` 与 `styles.css` 职责划分细节

## Deferred Ideas

### 主题选择器 UI（用户可自选主题）— 独立 future phase

- 用户提到希望前端支持多主题切换（用户自选）
- Phase 8 通过 `tokens.css` 的 `[data-theme="xxx"]` 结构铺路
- 未来 phase 需实现 ThemeProvider、用户偏好持久化、主题选择 UI（可能 3 状态 light/dark/system）

---

*Discussion log archived 2026-07-24*