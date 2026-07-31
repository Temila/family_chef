# Feature Research

**Domain:** MD3 custom theme/skin customization page (existing web app, new feature)
**Researched:** 2026-07-31
**Confidence:** HIGH (verified against installed `@material/material-color-utilities` v0.4.0, Google's Material Theme Builder reference, MDN, and this repo's existing v1.2 MD3 token system)

---

## Executive Summary

This is **not** a build-from-scratch theming problem. The repo already contains the canonical Material You engine (`@material/material-color-utilities`, installed as a devDependency) and a working token generator (`scripts/generate-tokens.cjs`) that proves the pipeline: **one source color → full light+dark MD3 scheme (33 semantic roles) + 6 tonal palettes × 13 tones**. The v1.5 feature is largely the *runtime, user-facing* equivalent of that already-validated build-time pipeline, plus per-user persistence.

The dominant industry pattern (Google's Material Theme Builder, every MD3-derived app theme picker) is: **user picks 1–4 key colors → engine derives the entire accessible palette → CSS custom properties are swapped on `document.documentElement`**. Real-time preview is free because CSS variables cascade instantly. Theme "cards-as-previews" exploit the same cascading/scoping rule (MDN-confirmed: custom properties inherit and are scoped per-element) by wrapping a mini-UI in a `<div>` with the theme's variables set inline — each card becomes a self-contained theme island.

The single most consequential UX/requirements decision is **the seasonal auto-switch semantics** (does it override a manual pick? how is season detected? which hemisphere?). There is **no browser API for hemisphere**, so this needs an explicit product decision (default-northern + optional toggle is the only defensible path). The single biggest technical risk is **FOUC (flash of unstyled/wrong colors) on cold load** — solved by an inline `<script>` in `index.html` that applies the saved theme before React mounts, mirroring how the existing `theme.initTheme()` already handles light/dark.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing any of these makes the page feel broken or unfinished. Every comparable implementation (Material Theme Builder, Android Wallpaper colors, browser DevTools themes, Discord/Vercel theme pickers) has these.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Apply-on-click from card grid** | A theme page that doesn't let you *use* a theme is pointless; instant apply is the baseline contract | LOW | Set CSS vars on `document.documentElement`; persist selection. Reuses existing `theme` util pattern (`frontend/src/utils/index.js`). |
| **Live preview as you edit** | Color pickers that require a "save + reload" feel broken; users expect immediate feedback (every color picker since 2010) | MEDIUM | `onChange` → `themeFromSourceColor()` → `style.setProperty()` per token. Debounce ~16ms. Library is pure JS, runs in <5ms. |
| **Hex input + native color picker** | Users have brand/hex codes; forcing them to use only a hue wheel is hostile. Material Theme Builder explicitly supports "copy/paste hex code values" | LOW | `<input type="color">` (browser-native, mobile-friendly) + companion `<input type="text">` for hex. No library needed. |
| **Persistent selection across reloads** | A theme that resets on refresh is a bug, not a feature | LOW | `localStorage` (matches existing `fc_theme` pattern in `utils/index.js`). |
| **Restore to default** | Users trap themselves with bad colors; an escape hatch is mandatory. Material Theme Builder ships a baseline reset preset | LOW | The "current/default" preset is already one of the 5; clicking it restores baseline. |
| **Visible "currently active" indicator** | Users must know which theme is live, or the grid is ambiguous | LOW | MD3 `selected`/`state-layer` on active card. Reuses existing MD3 state-layer tokens (`--md-state-layer-*`). |
| **Cancel/discard edits** | Destructive-feeling edits without cancel make users afraid to experiment | LOW | Editor holds a draft copy; Cancel restores prior. Standard form pattern. |
| **Mobile-first layout** | Explicit constraint in PROJECT.md ("移动端优先"); target users open via phone browser | MEDIUM | Responsive grid (1-col phone, 2–3-col tablet/desktop). Cards must be tappable (≥48dp — already an MD3 constraint in v1.2). |

### Differentiators (Competitive Advantage)

Features that distinguish this implementation. The milestone brief explicitly asks for several of these (seasonal auto-switch, unlimited custom themes, backend-synced storage), so they are in-scope differentiators, not optional.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Seasonal auto-switch** | Unique to this app's "家庭/季节感" emotional angle — no competitor does calendar-driven theming. Delightful for a cooking/family context | MEDIUM | `getMonth()` → season map. **Hemisphere concern is real** (see "Seasonal logic" below). No background task needed — lazy check on app load is standard. |
| **Unlimited custom themes (backend-synced)** | Cross-device sync beats localStorage-only competitors; family members share an account | MEDIUM-HIGH | New `user_themes` table (SQLite + Alembic migration). REST CRUD under existing `/api/themes`. Follows existing service/router/model layered pattern. |
| **MD3 scheme variant selector** | Lets users pick "feel" beyond color: Vibrant / Expressive / Monochrome / Neutral etc. — 9 variants in the library. Most theme pickers expose only color, not the MD3 *algorithm* | MEDIUM | Library `Variant` enum (verified: MONOCHROME, NEUTRAL, TONAL_SPOT, VIBRANT, EXPRESSIVE, FIDELITY, CONTENT, RAINBOW, FRUIT_SALAD). Instantiate scheme class directly (e.g. `new SchemeVibrant(hct, isDark, contrastLevel)`). |
| **Cards-as-previews (the card IS the preview)** | Premium feel — users see a *mini app* rendered in each theme, not just color swatches. This is the headline UX from the brief | MEDIUM | CSS-var scoping on a wrapper `<div>` renders a mini-UI (button + card + chip + surface ramp) in the theme's palette. See "How cards-as-previews render" below. |
| **Per-theme name + edit** | Users build an emotional vocabulary ("妈妈生日配色", "夏日清爽") — naming personalizes | LOW | `name` field on theme model. Inline rename. Presets editable-not-deletable per brief. |
| **HCT-aware color picker (Hue/Chroma/Tone)** | The MD3-native way to pick color; matches how the engine thinks. Material Theme Builder added exactly this ("HCT color picker allows update using Hue, Chroma, and Tone") | MEDIUM | Library exposes `Hct.fromInt()` / `.toHct()` for HCT↔hex. Sliders for H/C/T. Nice-to-have; hex picker is the table-stakes floor. |
| **Export/import single theme (JSON)** | Lets users back up, share, or migrate a theme. Material Theme Builder's JSON import is the reference | LOW-MEDIUM | `JSON.stringify(themeDef)` → download / clipboard. Import validates schema. Sharing via URL (base64 in query param) is a cheap win. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create real problems — scope creep, fragility, or UX traps. Document these to prevent them from sneaking into phases.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Per-component color overrides** | "I want the FAB a different color from buttons" | Explodes the token surface from ~5 inputs to ~33; users cannot reason about 33 color roles; breaks MD3's role-based design contract; every future component must wire to new overrides | Stay with key-color → engine-derives-everything. The whole point of MD3 dynamic color is that users do NOT hand-pick `primary-container`. |
| **Custom fonts / typography editor** | "Material Theme Builder has a type tab" | Out of scope for a color-theme feature; Chinese font stack (`PingFang SC`/`Noto`) is a system-font concern, not a user-customization axis; adds i18n/fallback complexity | Defer typography to a separate future milestone. Keep `--md-font-*` tokens developer-controlled. |
| **Light/dark merged into /theme** | "Why two places to control appearance?" | Explicitly rejected by brief — and correctly. Light/dark is a *mode* (ambient/UX), color is a *palette* (identity). Merging them conflates orthogonal axes and makes seasonal auto-switch (which picks a palette, not a mode) ambiguous | Keep header light/dark toggle independent (as briefed). Theme = palette only. |
| **Dynamic color from device wallpaper** | "Material You does it on Android" | Browser has **no wallpaper API**. Closest is `<img>` upload → `sourceColorFromImage()` (library supports it). But this is a different feature (image extraction), not palette customization, and adds upload/processing complexity | Out of scope. Could be a v2 differentiator if image-upload flow is wanted. Library already has `themeFromImage()`. |
| **Live theme marketplace / online sharing server** | "Let users publish themes for others" | Requires backend search, moderation, auth-on-anonymous; massive scope creep for a family app; no competitor pressure | Per-theme JSON export/import + URL-share covers the realistic need. |
| **Animated rainbow / "color cycle" mode** | Fun, requested by kids/power users | Accessibility hazard (vestibular/motion sensitivity); conflicts with MD3's stable-color contract; performance cost of constant repaint | Do not build. If requested, gate behind reduced-motion + hard cap. |
| **Contrast level slider (accessibility)** | Library supports `contrastLevel` -1.0→1.0 | Powerful but advanced — most users will produce unreadable results; needs WCAG validation UI to be safe | Defer to v2 as an "Accessibility" sub-panel with guardrails, OR ship fixed presets (standard/high) not a free slider. |
| **Theme scheduling beyond season (time-of-day, custom dates)** | "Auto dark at night + auto summer in July" | Composable rules engine = exponential UX complexity; conflicts with seasonal switch; users will misconfigure | Seasonal auto-switch is the single scheduling axis. Stop there. |

---

## How Each Key Mechanism Typically Works

### How theme cards-as-previews render

**The technique (HIGH confidence — MDN-verified + used by every MD3 preview tool):**

CSS custom properties are **inherited** and **scoped to the element they are declared on** (MDN: "Custom properties … participate in the cascade … scoped to the element(s) they are declared on … Inherited: yes"). This means a wrapper `<div>` can override the global `:root` tokens for its entire subtree, creating a "theme island."

```jsx
// Each card wraps a mini-UI and injects the theme's tokens inline.
<div
  className="theme-preview"
  style={{
    '--md-color-primary': theme.tokens.lightPrimary,
    '--md-color-on-primary': theme.tokens.lightOnPrimary,
    '--md-color-primary-container': theme.tokens.lightPrimaryContainer,
    '--md-color-surface': theme.tokens.lightSurface,
    // ... the ~12 most visually salient tokens
  }}
>
  {/* Mini-UI rendered INSIDE this wrapper inherits the card's tokens, NOT :root */}
  <div className="preview-surface">
    <button className="preview-btn">主菜</button>
    <div className="preview-card">
      <span className="preview-chip">辣</span>
      <span className="preview-chip preview-chip--filled">推荐</span>
    </div>
  </div>
</div>
```

**Why it works:** The existing `tokens.css` declares all roles on `:root`/`[data-theme="dark"]`. The preview card's inline styles *override* those for its subtree only. The mini-UI uses the SAME CSS class names as the real app (or simplified `.preview-*` classes that consume the same `--md-color-*` vars), so the preview is visually faithful.

**Optimization:** You do NOT need to inject all 33 semantic tokens into every card. A convincing preview needs ~10–12 (primary, on-primary, primary-container, on-primary-container, secondary, secondary-container, surface, on-surface, surface-container-high, outline-variant, plus a surface-ramp stripe). Derive the full set only when the theme is *applied*.

**Dependency on existing components:** The preview should visually echo real MD3 primitives (`Button`, `Card`, `Chip` from `frontend/src/components/primitives/`). The cheapest path is dedicated `.preview-*` CSS classes (avoids mounting real React components N times per grid). Rendering real `<Button>`/`<Chip>` components inside each card is more faithful but heavier — decide in plan phase.

### How real-time color editing works

**The pipeline (HIGH confidence — this is exactly what `scripts/generate-tokens.cjs` does, just at runtime):**

1. User drags color picker (native `<input type="color">` or custom HCT slider) → `onChange` fires with a hex string.
2. Convert hex → ARGB via library's `argbFromHex()`.
3. Call `themeFromSourceColor(argb, customColors?)` → returns `{ schemes: {light, dark}, palettes: {...} }`.
4. For each of the ~33 semantic roles, read `scheme[role]` → `hexFromArgb()` → build a `{light: {...}, dark: {...}}` token map.
5. Apply to the live document: iterate tokens, `document.documentElement.style.setProperty('--md-color-' + role, hex)`.
6. Persist the *input* (the key color + variant), not the derived output — derivation is deterministic and cheap.

**Performance:** `themeFromSourceColor` is synchronous, pure JS, <5ms on a phone. No perceptible lag. Debounce is for *input event spam*, not computation cost.

**Editor scope (the "which parameters are user-adjustable" question):**

| Parameter | User-adjustable? | Why |
|-----------|------------------|-----|
| **Primary key color** | **YES — primary input** | The single most important control. Material Theme Builder: "set this one first … there is no need to add additional colors." Derives the whole scheme. |
| **Secondary key color** | YES (optional override) | Material Theme Builder exposes it. Changes the "less prominent components" family. |
| **Tertiary key color** | YES (optional override) | The contrasting accent. Material Theme Builder exposes it. Useful for the seasonal presets' distinct accents. |
| **Neutral key color** | Optional / advanced | Controls surface/background tones. Most users shouldn't touch it; expose in an "advanced" fold-out. |
| **MD3 variant** (TonalSpot/Vibrant/Expressive/Mono/...) | **YES — key differentiator** | Changes the *derivation algorithm*, not just the seed. Verified: 9 variants in `Variant` enum. Big creative lever. |
| **contrastLevel** (-1.0 to 1.0) | Advanced / guarded | Accessibility lever; unsafe without WCAG validation. Ship as fixed presets, not a free slider. |
| **Error palette** | NO — developer-only | MD3 uses a fixed error palette; no UX reason to let users recolor errors. Material Theme Builder doesn't expose it as user input. |
| **Individual derived roles** (primary-container, surface-container-high, etc.) | **NO — developer-only** | These are *outputs* of the engine. Letting users hand-edit `primary-container` breaks the role system's coherence and MD3's accessibility guarantees. This is the #1 anti-feature. |
| **on-primary / on-*-container** (text-on-color) | NO — engine-derived | Engine guarantees contrast. Manual override = potential unreadable text. |
| **Radius / spacing / elevation / motion tokens** | NO — out of scope | These are mode-invariant design constants in v1.2; not "color theme." A separate shape/density feature, not this one. |

**Recommended editor UI:** Primary color (always visible) + Secondary/Tertiary (visible) + Neutral (advanced fold-out) + Variant selector (segmented buttons or dropdown). Hex input alongside each native color picker.

### How seasonal auto-switching is implemented

**Detection (the hemisphere concern is real):**

There is **no browser API for hemisphere or latitude**. `Intl.DateTimeFormat().resolvedOptions().timeZone` returns an IANA timezone (e.g. `Asia/Shanghai`), which *can* be heuristically mapped to hemisphere, but this is fragile and privacy-adjacent. The defensible patterns:

| Approach | Verdict |
|----------|---------|
| **Default northern hemisphere, no setting** | SIMPLEST. Correct for this app's target (家庭中餐 — China is northern). Acceptable for v1.5. |
| **Default northern + "I'm in the southern hemisphere" toggle** | BEST. One boolean setting in localStorage. Cheap, explicit, no privacy heuristic. |
| **Auto-detect from timezone** | FRAGILE. Timezone→hemisphere mapping has edge cases (equatorial countries, expats with VPN-set timezones). Not worth the complexity for a family app. |
| **Ask for user's location/latitude** | PRIVACY OVERKILL. Geolocation permission prompt for a theme feature is hostile. |

**Recommendation:** Default northern-hemisphere season map + a single "南半球" toggle in /theme settings. Season computed from `new Date().getMonth()`.

**Northern-hemisphere season map (the conventional one):**
- Spring: Mar, Apr, May (months 2,3,4 zero-indexed)
- Summer: Jun, Jul, Aug (5,6,7)
- Autumn: Sep, Oct, Nov (8,9,10)
- Winter: Dec, Jan, Feb (11,0,1)

**Auto-switch UX (does it override manual pick?):** This needs an explicit product decision. The standard, least-surprising pattern:

- **When auto-switch is ON:** the active theme is determined by season; the user's last manual selection is *remembered but suspended*. Turning auto-switch OFF restores the manual pick. Turning it ON does NOT discard the manual choice (so toggling is reversible and non-destructive).
- **Active-state indication:** when auto-switch is on, the seasonal preset card shows as active (with a small "自动" badge), not the user's manually-favorited card. This prevents the confusion "I picked Winter but Summer is highlighted."
- **No background task required:** season changes at most once per session-day. Lazy check on app load (in the same inline script that applies the saved theme, or in `theme.initTheme()`) is sufficient. Re-checking on `visibilitychange` (tab refocus) is a cheap belt-and-suspenders for long-open tabs.

**Dependency:** Requires the 4 seasonal presets to be defined (spring/summer/autumn/winter key colors). The 5th preset is "current/default."

### Export / import / sharing patterns

**Industry-standard (Material Theme Builder reference):**
- **JSON export:** `themeDefinition = { name, keyColors: {primary, secondary?, tertiary?}, variant, contrastLevel? }`. This is a *small* object (~100 bytes) because it stores the *inputs*, not the derived 66 tokens. Deterministic regeneration on import.
- **JSON import:** validate schema → regenerate → add to custom themes list.
- **URL sharing (cheap win):** base64-encode the JSON → `/theme?import=<base64>`. Landing on the URL shows an "import this theme?" prompt. No backend needed for sharing.
- **CSS variable export** (Material Theme Builder's primary export): not needed here — the *live app* IS the export target.

**Recommendation for v1.5:** ship JSON export/import (clipboard + file download). URL-share is a P2 stretch — easy if JSON export exists.

---

## Feature Dependencies

```
[/theme page + card grid]
    ├──requires──> [Theme token model: keyColors + variant → derived tokens]
    │                   └──requires──> [themeFromSourceColor runtime adapter]
    │                                       └──requires──> @material/material-color-utilities (INSTALLED ✓)
    │
    ├──requires──> [Header entry button]
    │                   └──requires──> IconButton primitive (EXISTS ✓ in components/primitives)
    │
    ├──requires──> [Theme application layer: set CSS vars on <html>]
    │                   └──requires──> inline pre-mount script in index.html (NEW — avoid FOUC)
    │                                       └──mirrors──> existing theme.initTheme() light/dark (EXISTS ✓)
    │
    [Custom theme editor]
    └──requires──> [Theme token model] (shared with card grid)
    └──requires──> [Native color input + hex text input] (browser-native, no dep)
    └──requires──> [Variant selector UI] (segmented control / dropdown)

    [Backend persistence for custom themes]
    └──requires──> [user_themes table + Alembic migration] (NEW)
    └──requires──> [theme_service + /api/themes router] (NEW, follows existing pattern)
    └──requires──> [ApiClient methods] (extend frontend/src/api/client.js)

    [Seasonal auto-switch]
    └──requires──> [4 seasonal preset definitions] (part of the 5 presets)
    └──requires──> [Season resolver: getMonth() → season] (NEW util)
    └──requires──> [Hemisphere setting] (localStorage boolean)
    └──enhances──> [Theme application layer] (picks which theme to apply on load)

    [Export/import JSON]
    └──enhances──> [Theme token model] (serialize/deserialize the inputs)

    [Light/dark toggle] (EXISTS ✓, unchanged)
    ──independent of──> [/theme palette selection]
```

### Dependency Notes

- **Card grid requires the token model first:** the model (keyColors → derived tokens) is the shared foundation; both the card grid and the editor consume it. This forces a phase ordering: model/adapter before UI.
- **FOUC prevention requires an inline script in `index.html`:** React mounts *after* first paint, so a JS-only theme application causes a flash of the default theme. The existing `theme.initTheme()` is already called early — extend the same pattern (read `fc_theme_id` / `fc_theme_colors` from localStorage, set CSS vars before paint). **This is the highest-priority technical concern.**
- **Custom-theme backend sync depends on existing auth:** `/api/themes` routes sit behind the existing JWT + `get_current_user_from_token` dependency. Presets and the current selection stay localStorage-only (per brief) — no backend needed for those.
- **Seasonal auto-switch enhances but does not modify the apply layer:** it just changes *which* theme object gets handed to the same apply function. Keep the apply function pure: `applyTheme(themeObj)` regardless of source.
- **Editor and card grid should NOT duplicate token-derivation logic:** extract a single `deriveTokens(keyColors, variant)` helper used by both. (The repo already has this logic in `generate-tokens.cjs` — port/extract it to a shared frontend util.)

---

## MVP Definition

### Launch With (v1.5 core — must ship)

The minimum to deliver the briefed feature as a coherent, non-broken experience.

- [ ] **Header entry button → /theme route** — discoverability; without it the feature doesn't exist
- [ ] **Theme token model + `themeFromSourceColor` runtime adapter** — the engine foundation everything else uses
- [ ] **Inline pre-mount theme application (FOUC prevention)** — without this, every reload flashes wrong colors
- [ ] **/theme page: card grid with cards-as-previews** — the headline UX
- [ ] **5 presets (current + spring/summer/autumn/winter), editable-not-deletable** — the explicit deliverable
- [ ] **Apply-on-click + persistent selection (localStorage)** — the basic contract
- [ ] **Custom theme editor: primary/secondary/tertiary key colors + hex input + live preview** — the core creative tool
- [ ] **Save custom theme (localStorage first; backend sync as parallel track)** — per brief, custom themes go to DB
- [ ] **Edit + delete custom themes; edit (not delete) presets** — per brief
- [ ] **Backend: `user_themes` table + migration + CRUD `/api/themes`** — per brief (cross-device sync)
- [ ] **Light/dark toggle remains independent in header** — explicit constraint
- [ ] **"Currently active" indicator on cards** — basic clarity

### Add After Validation (v1.5 stretch / v1.6)

Features that strengthen the experience but aren't load-bearing for launch.

- [ ] **MD3 variant selector (Vibrant/Expressive/Mono/…)** — big creative lever; adds 1 segmented control. Trigger: once core editor is stable.
- [ ] **Seasonal auto-switch + hemisphere toggle** — briefed as v1.5, but technically separable; if timeline-pressured, ship as the immediate follow-up. Trigger: core editing validated.
- [ ] **HCT color picker (Hue/Chroma/Tone sliders)** — power-user upgrade over native hex picker. Trigger: user demand / once hex flow is proven.
- [ ] **JSON export/import** — backup + share. Trigger: once users have created themes worth backing up.
- [ ] **Advanced fold-out: neutral key color, contrast presets** — for the tiny minority who want deeper control.

### Future Consideration (v2+)

Defer until the feature has users and feedback.

- [ ] **URL-shareable themes (base64 query param)** — easy if JSON export exists, but needs a landing/confirm UX.
- [ ] **Theme-from-image (upload → extract source color)** — library supports `themeFromImage()`; different feature, different upload flow.
- [ ] **Accessibility contrast panel (guarded WCAG validation)** — the `contrastLevel` parameter, but only behind a validation UI.
- [ ] **Per-theme custom typography** — separate milestone; conflates with i18n font stacks.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Token model + runtime adapter (themeFromSourceColor) | HIGH (enabler) | MEDIUM (port existing gen script logic) | P1 |
| FOUC-safe apply layer (inline script) | HIGH (perceived quality) | LOW-MEDIUM | P1 |
| /theme card grid + cards-as-previews | HIGH (headline UX) | MEDIUM | P1 |
| 5 presets (current + 4 seasons) | HIGH (core deliverable) | LOW (5 key-color sets) | P1 |
| Apply-on-click + localStorage selection | HIGH (basic contract) | LOW | P1 |
| Custom editor: primary/secondary/tertiary + hex + live preview | HIGH (creative core) | MEDIUM | P1 |
| Header entry button + route | MEDIUM (discoverability) | LOW | P1 |
| Backend: user_themes + migration + CRUD | MEDIUM (sync, briefed) | MEDIUM | P1 |
| Light/dark independence (preserve existing) | HIGH (constraint) | LOW (do nothing / verify) | P1 |
| Edit/delete custom themes; edit presets | MEDIUM (management) | LOW-MEDIUM | P1 |
| Seasonal auto-switch + hemisphere toggle | MEDIUM-HIGH (delight) | MEDIUM | P1-P2 (briefed for v1.5) |
| "Currently active" card indicator | MEDIUM (clarity) | LOW | P1 |
| MD3 variant selector | MEDIUM (differentiator) | MEDIUM | P2 |
| HCT picker (Hue/Chroma/Tone) | LOW-MEDIUM (power) | MEDIUM | P2 |
| JSON export/import | LOW-MEDIUM | LOW-MEDIUM | P2 |
| Advanced fold-out (neutral/contrast) | LOW | LOW-MEDIUM | P3 |
| URL theme sharing (base64) | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch (briefed core + table stakes)
- P2: Should have, add when possible (briefed differentiators with lower risk)
- P3: Nice to have, future consideration

---

## Competitor / Reference Feature Analysis

| Feature | Material Theme Builder (Google, archived Jul 2026) | Android system "Wallpaper colors" | Browser DevTools themes | Discord/Vercel app themes | Our Approach (v1.5) |
|---------|------------------------------------------------------|-----------------------------------|-------------------------|---------------------------|---------------------|
| Color input method | HCT picker + hex + Core Colors (P/S/T/Neutral) | Auto from wallpaper; tap to pick seed | Predefined palettes only | Predefined palettes only | Native color picker + hex + Core Colors (P/S/T) |
| Live preview | Full app preview pane | System-wide instant | Instant | Instant | Mini-UI in each card + full-app live on apply |
| Multiple saved themes | Yes (theme menu, add/swap) | No (one active wallpaper set) | No (one active) | No (one active) | Yes — unlimited custom + 5 presets |
| Scheme variant selector | No (fixed TonalSpot) | No | N/A | N/A | **Yes (differentiator)** — 9 MD3 variants |
| Light/dark handling | Separate toggle (separate axis) | Separate axis | Separate axis | Separate axis | Separate toggle (per brief) — palette ≠ mode |
| Cross-device sync | N/A (design tool, export only) | Per-device | Per-browser | Per-account | Per-account DB sync (custom themes) |
| Seasonal/calendar switch | No | No | No | No | **Yes (differentiator)** — calendar-driven |
| Export format | CSS / JSON / multiple | N/A | N/A | N/A | JSON (inputs only — deterministic regen) |
| User-adjustable derived roles? | No (engine-derived only) | No | No | No | **No (anti-feature)** — keep role-based integrity |

**Takeaway:** This feature sits squarely in the mainstream of MD3 dynamic color *patterns* (don't fight the engine), while differentiating on **seasonal auto-switch** and **unlimited backend-synced custom themes** — neither of which any reference implementation offers. The cards-as-previews UX matches Material Theme Builder's preview philosophy but in a consumer (not designer) context.

---

## Key Risks Surfaced for Roadmap (forwarded to PITFALLS.md)

These are flagged here so the roadmap phases can plan around them; full detail goes in PITFALLS.md.

1. **FOUC on cold load** — React mounts after first paint. Inline pre-mount script in `index.html` is mandatory. (Highest technical risk.)
2. **Hemisphere assumption** — defaulting to northern is correct for the target audience but must be explicit + toggleable, or it's an invisible bug for southern-hemisphere users.
3. **Auto-switch vs manual-pick ambiguity** — must clearly communicate which theme is "active" when auto-switch overrides the user's favorite.
4. **`@material/material-color-utilities` v0.4.0 packaging bug** — the `generate-tokens.cjs` script already contains a runtime patcher (`ensurePackageImportable`) because the published package has missing `.js` extensions in its ESM imports. **Vite's bundler resolves these automatically**, so runtime use in the browser should be fine — but verify in a spike before committing to client-side import. Fallback: bundle a pre-built version or run derivation in a worker.
5. **Derived-role integrity** — resist any pressure to expose `primary-container`/`surface-container-high` as direct user inputs; it breaks MD3's accessibility contract.

---

## Sources

- **Installed library (HIGH confidence):** `frontend/node_modules/@material/material-color-utilities@0.4.0` — verified `themeFromSourceColor()`, `Variant` enum (9 variants), `Scheme*` class constructors (`SchemeVibrant(sourceColorHct, isDark, contrastLevel, ...)`), `Hct`, `hexFromArgb`, `argbFromHex`. Pure ESM JS, browser-bundleable.
- **Existing repo token pipeline (HIGH confidence):** `scripts/generate-tokens.cjs` — working proof that the library derives 33 semantic roles + 6 palettes × 13 tones from a single source color. Contains the `ensurePackageImportable()` patcher documenting the v0.4.0 packaging bug.
- **Existing MD3 token system (HIGH confidence):** `frontend/src/css/tokens.css` (auto-generated), `frontend/src/utils/index.js` (`theme` util with `initTheme`/`getTheme`/`setTheme`/`toggleTheme` + localStorage `fc_theme` key), `frontend/src/components/ThemeToggle.jsx`, `frontend/src/components/composites/Header.jsx` (light/dark IconButton in right cluster).
- **Material Theme Builder README (HIGH confidence, canonical reference):** https://github.com/material-foundation/material-theme-builder — documents Core Colors (P/S/T/Neutral) editing, HCT color picker, Color Match for containers, multi-theme + presets, JSON import/export. **Repository archived Jul 23, 2026** (read-only reference).
- **Material Color Utilities README (HIGH confidence):** https://github.com/material-foundation/material-color-utilities — library capabilities (blend/contrast/dynamiccolor/hct/palettes/scheme/score/temperature), TypeScript availability via npm.
- **MDN — CSS Custom Properties (HIGH confidence):** https://developer.mozilla.org/en-US/docs/Web/CSS/--* — "scoped to the element(s) they are declared on … Inherited: yes." Confirms the mechanism for cards-as-previews (per-element variable override cascades to subtree).
- **Domain knowledge for seasonal/hemisphere UX (MEDIUM confidence — no single canonical source; synthesized from standard astronomical season definitions + browser API capabilities):** Northern-hemisphere season map (Mar–May spring, Jun–Aug summer, Sep–Nov autumn, Dec–Feb winter). No browser hemisphere API; `Intl.DateTimeFormat().resolvedOptions().timeZone` is the only heuristic and is fragile.

---
*Feature research for: MD3 custom theme/skin customization page (家味·Family Chef v1.5)*
*Researched: 2026-07-31*
