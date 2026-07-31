# Phase 17: Theme System Foundation — Engine, Page, Presets & Persistence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-31
**Phase:** 17 — Theme System Foundation — Engine, Page, Presets & Persistence
**Areas discussed:** Preset semantics, Card-as-preview rendering, Apply layer / FOUC, Cross-device sync, Header entry button

---

## 1. Preset Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Fork-only edits | Presets stay pure originals; any edit forks into a new custom theme. The 5 preset slots never mutate. | ✓ |
| In-place edits | User edits "spring" mutate the spring slot in place; same slot across devices shows user's version | |
| Hybrid | Edit button on preset pops a confirmation: "save as new theme / overwrite preset?" | |

**User's choice:** Fork-编辑（预设永远纯净）
**Notes:** Mental model cleaner. "可编辑" interpreted as "可派生为可编辑副本" — any user edit becomes a save dialog pre-filled with "我的春"-style naming. Avoids cross-device "spring" pollution.

### 1a. Preset storage (DB-backed or Frontend constants?)

| Option | Description | Selected |
|--------|-------------|----------|
| Frontend constants (5 presets not DB) | 5 presets hardcoded JS/TS constants; only custom themes live in DB | ✓ |
| All DB-backed (5 presets as is_preset=true rows) | Same data plane for presets and customs; "who owns preset" question | |
| Frontend primary, DB mirror optional | Frontend constants authoritative; DB optionally mirrors for future brand packs | |

**User's choice:** Frontend constants（5 个预设不走 DB）

### 1b. Seed colors source

| Option | Description | Selected |
|--------|-------------|----------|
| TypeScript constants | Hardcoded hex values inline with each preset | ✓ |
| User-selected (Phase 18 editor) | Future deviation | |
| Palette reference library | Future palette | |

**User's choice:** TypeScript constants（手买颜色）

---

## 2. Card-as-Preview Rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Scoped CSS vars + real primitives | `<div data-fc-theme-scope>` sets `--md-color-*` vars; reuse real Card/Button/Chip primitives | ✓ |
| Manual mock UI | Hand-built miniature markup; lighter; possible visual drift | |
| iframe loading real page | True fidelity; heavy DOM, mobile-impractical | |

**User's choice:** Scoped CSS vars + 复用 primitives (推荐)
**Notes:** This satisfies TPAGE-03 literally — "mini-UI rendering the theme through CSS variable inheritance". Highest fidelity at lowest cost.

### 2a. Preview mini-UI content

| Option | Description | Selected |
|--------|-------------|----------|
| Full pack (Button + Card + Chip + surface ramp) | Miniature filled+Tonal Button, 1 Card, 1 Chip filter, 4-step surface ramp | ✓ |
| Min (ColorChip + surface ramp) | Lighter | |
| Rich (FAB + list item too) | Heavier | |

**User's choice:** 完整包：Button + Card + Chip + surface ramp (REQUIREMENTS)

### 2b. Card preview timing (static vs drag-time live)

| Option | Description | Selected |
|--------|-------------|----------|
| Static preview (Phase 17) | Preview rendered once at /theme mount from card's source colors | |
| Real-time drag update | Live re-derivation as user edits source colors | (Phase 18 EDIT-03) |
| Both (depending on context) | Default static; editor mode drag | ✓ |

**User's choice:** 预览可拖动 + 可静态 (Phase 17 ships static; Phase 18 adds drag-time per EDIT-03)

---

## 3. Apply Layer / FOUC Bootstrap

| Option | Description | Selected |
|--------|-------------|----------|
| Synthesize CSS + insert `<style id="fc-dynamic-theme">` | Inline bootstrap reads `fc_active_theme` JSON; MCU derives light+dark MD3 schemes; single `<style>` element with `:root` + `[data-theme="dark"]` blocks | ✓ |
| `style.setProperty` per token | 40+ setProperty calls; no scoped blocks for dark mode | |
| Pre-bundled CSS file + fetch | Cacheable; extra HTTP request; depends on bundle layout | |

**User's choice:** Synthesize CSS + insert <style> (推荐)
**Notes:** Token count manageable. Theme toggle flips `data-theme` and re-paints the same `<style>` element via CSS cascade — zero JS re-application per FND-03.

### 3a. Default fallback on bootstrap parse failure

| Option | Description | Selected |
|--------|-------------|----------|
| Hard fallback to default tokens.css | On `fc_active_theme` missing/parse fail → use current `#34834E` default | ✓ |
| Toast + fallback | Visible error feedback; extra noise for transient issues | |

**User's choice:** 硬退默认（fc-dynamic-theme 越区 = 初始主题）

---

## 4. Cross-device Sync

| Option | Description | Selected |
|--------|-------------|----------|
| Pull full list on ThemeContext mount | One fetch, full payload | ✓ |
| Pull metadata only + on-demand full fetch | Optimized; two-request dance | |
| Background prefetch + cached paint | Paint cached immediately; replace on fetch | |

**User's choice:** Mount 拉列表 + 全文 (推荐)
**Notes:** Payload is small (~200B each theme); full pull simplest.

### 4a. Conflict resolution (device A picks vs device B's local choice)

| Option | Description | Selected |
|--------|-------------|----------|
| Last-write-wins by updatedAt | DB wins; mount-pull shows A's choice on B | ✓ |
| Local sticky | Each device's choice persists until manually overridden | |

**User's choice:** Last-write-wins（updatedAt）
**Notes:** On B's mount, if fetched `updatedAt` > `localStorage.fetchedAt`, re-apply updated theme; show small toast "已同步最新主题".

### 4b. Sync failure UX

(Note: surfaced as agent-discretion but user opinion represented via D-17)

| Option | Description | Selected |
|--------|-------------|----------|
| Toast "无法同步主题" + cached fallback | Visible error; offline mode allowed | ✓ (agent rec) |
| Silent cache-only | Swallow failure; user can't act | |

**User's choice:** (Agent discretion — chose toast + fallback per D-17)

---

## 5. Header Entry Point

| Option | Description | Selected |
|--------|-------------|----------|
| Palette | Material's "palette" icon, "select colors" semantics | ✓ |
| Brush | "paint/create" semantics, less direct | |
| Style | "fashion/style" semantic, weaker | |
| FormatPaint | Paint bucket, "fill" heavier | |

**User's choice:** Palette 调色板色环 (推荐)

### 5a. Header button form (icon-only vs icon+label)

| Option | Description | Selected |
|--------|-------------|----------|
| Icon-only (matches ThemeToggle) | `<IconButton>` + `ariaLabel='选择主题'` | ✓ |
| Icon + "主题" text | Heavier layout; visible identity | |

**User's choice:** 纯图标 (推荐)

### 5b. Mobile entry path (BottomBar tab?)

| Option | Description | Selected |
|--------|-------------|----------|
| BottomBar gains "主题" tab | 5 tabs; cross-device parity | |
| Defer mobile, BottomBar unchanged for v1.5 | Preserve Phase 15 BottomBar; revisit later | |
| Both Header and BottomBar entries | Universal dual entry | |
| (Followup) Header visible on PC + mobile | Relax Header display:none <1024px; BottomBar untouched | ✓ |

**User's choice:** header在pc端和移动端都会正常显示
**Notes:** User wants Header available on mobile (relax existing CSS `display: none @ <1024px`). BottomBar unchanged for v1.5. Sidebar/Header coexistence on mobile may need CSS review.

---

## the agent's Discretion

Captured in CONTEXT.md under "the agent's Discretion":

- Bundling decision (MCU + theme-engine in main chunk vs split)
- "Reset to default" button on /theme
- Pydantic field-validator strictness for `sourceColors` shape
- Hard vs soft delete of custom themes
- Snackbar text for sync failure + updatedAt re-apply

---

## Deferred Ideas

(No new deferred ideas from this discussion that aren't already in REQUIREMENTS.md "Future" sections.)

- Phase 18: editor UI, 9-variant selector, season parser, hemisphere toggle, manual override TTL
- Future (post-v1.5): HCT-picker for advanced users, JSON theme export/import, URL-shareable themes, image-derived themes, WCAG contrast panel
- BottomBar "主题" tab — could be added later if mobile UX feels unbalanced; deferred.
