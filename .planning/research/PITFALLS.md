# Pitfalls Research: Adding Dynamic Theming to an Existing MD3 Token System

**Domain:** Dynamic runtime theming / custom skins layered on top of an existing Material Design 3 CSS-variable token system in a React 19 SPA
**Project:** 家味 · Family Chef — v1.5 自定义网站皮肤
**Researched:** 2026-07-31
**Confidence:** HIGH (grounded in this codebase's actual `tokens.css` / `index.html` / `utils/index.js` + official `@material/material-color-utilities` docs)

> **Scope note:** This research assumes the v1.2 MD3 token system is already shipped and working (light/dark toggle via `data-theme` attribute). It covers ONLY the failure modes introduced by adding *dynamic runtime overrides* of those tokens. Generic React pitfalls (effect cleanup, stale closures) are out of scope unless they interact with theming.

---

## Critical Pitfalls

### Pitfall 1: FOUC — Flash of Default-Theme Color Before Custom Theme Applies

**What goes wrong:**
On hard refresh, the page paints with the hardcoded `tokens.css` `:root` greens for 1–3 frames, then snaps to the user's custom "Autumn Orange" theme once React mounts and `ThemeContext` reads localStorage / fetches custom themes from the DB. Users see a visible color flash on every load. This is *worse* than the existing light/dark FOUC because custom themes can be radically different hues (spring pink → winter blue), making the flash jarring rather than subtle.

**Why it happens:**
The existing FOUC prevention in `frontend/index.html:8-16` only handles the **light/dark axis** — it reads `fc_theme` and sets `data-theme`. It knows nothing about custom themes. The natural temptation is to apply custom tokens inside a `useEffect` in `ThemeContext` (mirroring `AuthContext.jsx:16-25`), but `useEffect` runs **after** the browser's first paint. React 19's concurrent renderer makes this gap larger, not smaller. Any approach that waits for React to mount is too late.

**How to avoid:**
Extend the **inline blocking `<script>` in `index.html`**, not a React effect. The custom theme's token overrides must be written to `document.documentElement.style` (or an injected `<style>` tag in `<head>`) *before* the browser paints. Concrete pattern:

```html
<!-- index.html — runs synchronously before first paint -->
<script>
  (function () {
    // 1. Existing light/dark logic (keep verbatim)
    var saved = localStorage.getItem('fc_theme');
    var preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && preferDark)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    // 2. NEW: apply custom skin tokens if present
    var skin = localStorage.getItem('fc_active_skin'); // flat token map: {"--md-color-primary":"#..."}
    if (skin) {
      try {
        var tokens = JSON.parse(skin);
        var root = document.documentElement.style;
        // MUST branch on current mode — see Pitfall 5
        var mode = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        var map = tokens[mode] || tokens.light || {};
        for (var k in map) root.setProperty(k, map[k]);
      } catch (e) { /* corrupt localStorage — fall through to defaults */ }
    }
  })();
</script>
```

The active skin stored in localStorage must be the **pre-resolved flat token map** (both `light` and `dark` variants), not the seed color — resolving HCT at boot in the inline script is too heavy and requires loading the color library synchronously. Resolution happens at save time; localStorage holds the result.

**Warning signs:**
- Color flash visible when throttling CPU to "4× slowdown" in DevTools (simulates slow phones — the project's primary target is mobile browsers per PROJECT.md Constraints).
- Bug reports like "page flashes green when I open it" from users with non-green custom themes.
- Lighthouse "Layout Shift" complaints are not the same metric — FOUC is a *visual* flash, not CLS. Don't rely on Lighthouse to catch it; manually verify with DevTools "Disable cache" + hard reload + slow CPU.

**Phase to address:**
**Phase 1 (Foundation / Storage + Apply Layer).** The inline-script extension and the localStorage schema for `fc_active_skin` are foundational — every later phase depends on the apply mechanism being FOUC-safe. If Phase 1 ships the apply logic inside React, every subsequent phase inherits the flash and refactoring it late means re-testing every component.

---

### Pitfall 2: Token Override Specificity Wars — Editing `tokens.css` or Losing to `:root`

**What goes wrong:**
Two opposite failure modes, both common:
1. **Editing `tokens.css` directly** to add custom-theme variants — but the file header explicitly says `由 scripts/generate-tokens.cjs 自动生成（勿手动编辑）` ("auto-generated, do not edit manually"). The next `npm run gen:tokens` wipes custom changes silently.
2. **Overriding via `document.documentElement.style.setProperty('--md-color-primary', ...)`** — works, but if any component CSS later adds a more-specific rule like `.my-card { --md-color-primary: #legacy; }`, the inline style on `<html>` still wins (inline beats rules), but a `:root { --md-color-primary: ... }` in a *later-loaded* stylesheet with `!important` would not be beaten by a non-important inline custom property. CSS custom property `!important` precedence is notoriously counterintuitive.

**Why it happens:**
The token system has a strict authoring contract (code-generated file). Developers who don't read the header, or who join mid-milestone, treat it as a normal CSS file. On the override side, the cascade rules for custom properties with `!important` are subtle: an `!important` custom property declaration in a stylesheet *beats* an inline style without `!important`, which is the reverse of normal property intuition.

**How to avoid:**
1. **Never edit `tokens.css`.** Custom themes live in a *runtime override layer* applied via JS to `document.documentElement.style` (the inline-style approach) or to a dedicated `<style id="active-skin">` element injected into `<head>` *after* `tokens.css` loads. The `<style>` approach is preferable because:
   - It's inspectable in DevTools (inline `style` on `<html>` gets very long with 40+ tokens).
   - It can be cleared wholesale (`el.textContent = ''`) on theme switch without iterating properties.
   - It naturally sits later in the cascade than the linked `tokens.css`.

   ```js
   // ThemeContext apply function
   function applySkin(tokens, mode) {
     const style = document.getElementById('active-skin') ||
       Object.assign(document.createElement('style'), { id: 'active-skin' });
     document.head.appendChild(style);
     const map = tokens[mode];
     style.textContent = `:root, [data-theme="light"], [data-theme="dark"] {\n${
       Object.entries(map).map(([k, v]) => `  ${k}: ${v};`).join('\n')
     }\n}`;
   }
   ```

   Note the selector lists *all three* of `:root`, `[data-theme="light"]`, `[data-theme="dark"]` — this guarantees the override wins regardless of which mode attribute is set (see Pitfall 5 for why both modes need separate maps).

2. **Audit for stray token redefinitions.** Verified during research: `rg "var\(--md-palette" frontend/src/components` returns ZERO matches, and no component CSS hardcodes hex/rgba outside `tokens.css`. This means semantic `--md-color-*` overrides WILL cascade everywhere today. **Add a CI lint rule** (`rg "#[0-9a-fA-F]{3,8}" frontend/src/components --glob '*.css'`) to keep it that way — any new hardcoded color in a component silently breaks theming.

**Warning signs:**
- A component "doesn't respond" to custom theme (its color stays default while neighbors change) — it has a hardcoded color or a local token redefinition.
- `tokens.css` shows up in `git diff` for a custom-theme PR — the generation contract is being violated.
- DevTools "Computed" panel on `<html>` shows `--md-color-primary` overridden, but element still renders old color — a descendant redefined it.

**Phase to address:**
**Phase 1 (Foundation).** The override mechanism (`<style id="active-skin">` injection + selector strategy) is decided once and used by every preset/custom/seasonal flow afterward. Also add the hex-lint CI gate in Phase 1 so it catches regressions across all later phases.

---

### Pitfall 3: Accessibility Collapse — Users Pick Legally-Blind Color Combos

**What goes wrong:**
The custom editor lets users drag a hue slider for `--md-color-primary`. They pick a pale yellow primary on the white `surface-container-lowest` background. Result: primary-colored text/buttons become unreadable (contrast ratio ~1.8:1, WCAG AA requires 4.5:1). The app becomes unusable for anyone with low vision and legally non-compliant. Because MD3's `on-primary` (white) is *separate* from `primary`, naive editors that only expose `primary` produce `white text on pale-yellow` buttons.

**Why it happens:**
RGB/HSL sliders give users 16M colors but no contrast feedback. MD3's role-pair system (`primary`/`on-primary`, `primary-container`/`on-primary-container`) means every editable color is actually *two* colors that must maintain contrast against each other AND against their container. Exposing only "primary hue" forces the editor to either (a) hardcode `on-primary: #ffffff` (breaks for light primaries) or (b) let the user set both independently (guarantees mistakes).

**How to avoid:**
**Use the official `@material/material-color-utilities` library to derive all role-pairs from a single seed color**, instead of letting users edit individual tokens. This library is the canonical MD3 implementation (published by `material-foundation`, the same org that owns the spec). It exposes:

- `SchemeTonalSpot(Hct.fromInt(seedArgb), isDark, contrastLevel)` → generates a *complete, accessible* role set for one mode from one seed.
- `Contrast.ratioOfTones(toneA, toneB)` → returns the WCAG ratio between two HCT tones (≥4.5 = AA).
- `Contrast.lighter(bgTone, 4.5)` → returns the lightest tone meeting 4.5:1, or `-1` if impossible.

The custom editor's data model is therefore a **single seed color + optional contrast level**, NOT 40 individual token values. The editor UI exposes "seed color" + "feel" (vibrant/muted/expressive scheme variants: `SchemeVibrant`, `SchemeContent`, `SchemeExpressive`); the library computes the rest. This:

1. Makes bad combos impossible by construction (the library guarantees ≥4.5:1 for body text roles).
2. Solves the light/dark matrix (Pitfall 5) for free — one seed generates both modes.
3. Matches MD3 spec exactly (the existing `tokens.css` was itself generated from 4 key colors using this same algorithm — see file header).

```js
import { Hct, SchemeTonalSpot, hexFromArgb } from '@material/material-color-utilities';

function buildSkin(seedHex, isDark) {
  const hct = Hct.fromInt(parseInt(seedHex.slice(1), 16));
  const scheme = new SchemeTonalSpot(hct, isDark, 0.0);
  return {
    '--md-color-primary': hexFromArgb(scheme.primary),
    '--md-color-on-primary': hexFromArgb(scheme.onPrimary),
    '--md-color-primary-container': hexFromArgb(scheme.primaryContainer),
    '--md-color-on-primary-container': hexFromArgb(scheme.onPrimaryContainer),
    // ... all 30+ roles for BOTH primary/secondary/tertiary/error/neutrals
  };
}
```

If individual-token editing is still desired (power users), gate it behind a live `Contrast.ratioOfTones` check that disables "Save" when any role-pair drops below 4.5:1, with a visible "⚠️ 对比度不足" warning.

**Warning signs:**
- Designer/PM can't read button labels on a custom theme during review.
- Axe DevTools browser extension flags color-contrast violations on the `/theme` preview card.
- A custom theme with a light primary renders invisible primary buttons (white-on-white).

**Phase to address:**
**Phase 2 (Custom Theme Editor).** The editor's data model decision (seed-based vs. token-level) is made here. If Phase 2 ships token-level editing without contrast guards, retrofitting seed-based generation in a later phase means migrating every saved custom theme in the DB.

---

### Pitfall 4: Elevation Shadows & Surface-Tint Don't Track Custom Colors

**What goes wrong:**
Custom themes override `--md-color-primary` and the surface roles, but two token groups are silently missed:

1. **Elevation shadows are hardcoded `rgba(0,0,0,X)`** in `tokens.css:163-167`. In dark mode (or any custom dark skin), black shadows on a near-black surface are invisible — cards lose their depth cue and the UI looks flat/broken. The existing light/dark toggle doesn't fix this either; it's a pre-existing latent issue that custom *dark* themes make obvious.
2. **`--md-color-surface-tint`** (`tokens.css:51, 236`) is the color blended into elevated surfaces to communicate height. It's separately defined per mode and **defaults to the primary color**. If a custom theme overrides `primary` but forgets `surface-tint`, MD3's elevation-through-tint system breaks: elevated cards in dark mode stay neutral-gray instead of taking on the custom hue.

State-layer tokens, by contrast, are SAFE: `tokens.css:189-190` defines `--md-state-layer-primary: var(--md-color-primary)` and `--md-state-layer-on-surface: var(--md-color-on-surface)`. These auto-cascade when their base color is overridden. (Verified: no component overrides state-layer tokens.)

**Why it happens:**
Developers think "I overrode primary, I'm done." The MD3 spec's elevation system is two-channel (shadow + surface-tint), and only one channel (the color channels) is obvious. The shadow channel is structural and easy to miss because it doesn't use a color *token* — it uses literal `rgba()`.

**How to avoid:**
1. **`surface-tint` must be part of every generated scheme.** When building a skin via `SchemeTonalSpot`, include `surfaceTint` (which the library maps to the primary tone for the current mode). Add it to the override map explicitly:
   ```js
   '--md-color-surface-tint': hexFromArgb(scheme.primary), // MD3 spec: surfaceTint === primary
   ```
2. **Elevation needs a mode-aware override.** Two acceptable strategies:
   - **(Recommended, matches MD3 spec):** In dark mode, override the 5 `--md-elevation-*` tokens to use the custom surface-tint at low alpha instead of pure black. Provide a `darkElevations(tintColor)` helper that emits `0 1px 2px ${tintColor}22` etc.
   - **(Minimal fix):** Accept that dark custom themes have weaker shadow contrast, but explicitly override `--md-color-shadow` (currently unused-in-dark but defined) — no, this won't help since the elevation tokens bypass `--md-color-shadow` with literal `rgba(0,0,0,...)`.

   The clean minimal fix is to **regenerate the 5 elevation tokens as part of the skin apply**, conditioned on mode. Add this to the inline `<script>` and the `<style id="active-skin">` block for dark mode.

**Warning signs:**
- Cards in dark mode with a custom theme look "flat" — no visual hierarchy between `surface-container` and `surface-container-high`.
- A custom "midnight blue" dark theme shows no difference between elevation-1 and elevation-4 cards.
- MD3 elevation spec review fails: surfaces should gain ~2% tint per level in dark mode.

**Phase to address:**
**Phase 1 (Foundation — token apply layer).** The apply function must include elevation + surface-tint in its override set, even if Phase 1 only ships the default theme. Adding them later means every preset and saved custom theme needs regeneration. Phase 3 (Presets) then verifies the 4 seasonal presets render with correct elevation in both modes.

---

### Pitfall 5: The Light/Dark × Custom-Color Matrix — Two Independent Axes That Multiply

**What goes wrong:**
A user creates a beautiful "Spring Pink" custom theme while in light mode. They toggle dark mode (the independent header button, which PROJECT.md explicitly says STAYS separate). The custom theme either (a) reverts to the default green dark theme, losing the pink, or (b) keeps the light-mode pink values which now look terrible on a dark background (pale pink on near-black, or invisible pink on dark pink).

**Why it happens:**
The existing system has ONE axis: `data-theme="light|dark"` flips ~35 color tokens. Adding "custom skin" introduces a SECOND orthogonal axis. Naive implementations store the custom theme as a single flat token map and apply it unconditionally — but every MD3 role has a different value in light vs. dark (e.g. `primary` is tone 40 in light, tone 80 in dark). One flat map can't serve both modes.

**How to avoid:**
**Store and apply custom themes as a `{ light: {...}, dark: {...} }` pair, generated together from one seed.** The `SchemeTonalSpot(hct, isDark, contrast)` library call is invoked TWICE per save — once with `isDark=false`, once with `isDark=true`. Both maps are persisted. On apply (in the inline script AND the ThemeContext), the code branches on the *current* `data-theme`:

```js
// At save time (custom editor)
const seedHct = Hct.fromInt(parseInt(seedHex.slice(1), 16));
const skin = {
  light: buildRoleMap(new SchemeTonalSpot(seedHct, false, 0)),
  dark:  buildRoleMap(new SchemeTonalSpot(seedHct, true,  0)),
};
localStorage.setItem('fc_active_skin', JSON.stringify(skin));
// persist `skin` to backend DB too for cross-device
```

```js
// At apply time — RE-Applies when light/dark toggles
function applySkin(skin, mode) {
  if (!skin) return;
  writeOverrideStyle(skin[mode] || skin.light);
}
// ThemeToggle's onClick must trigger applySkin(currentSkin, newMode) AFTER setAttribute
```

**Critical integration point:** The existing `theme.toggleTheme()` in `frontend/src/utils/index.js:26-31` only flips the attribute. It must be augmented (or wrapped by ThemeContext) to re-apply the current skin for the new mode. The light/dark toggle and the custom skin are NOT independent in *application* — only in *selection*. Selecting is independent (user picks skin X and mode Y separately); applying is joint (mode Y's tokens come from skin X's Y-map).

**Warning signs:**
- Toggling dark mode with a custom theme active shows default greens instead of the custom dark palette.
- A custom theme "looks right" in one mode but broken in the other.
- `ThemeToggle` works but `ThemeContext` doesn't re-render after the toggle (the existing `ThemeToggle.jsx:10` uses local `useState`, not context).

**Phase to address:**
**Phase 1 (Foundation — data model + apply).** The `{light, dark}` schema is decided here. Phase 2 (Editor) uses `SchemeTonalSpot` to populate both. Phase 4 (Seasonal) inherits the same shape. If Phase 1 ships a flat map, Phase 2's editor must regenerate every saved theme when the matrix bug is discovered.

---

### Pitfall 6: localStorage ↔ DB Sync Conflicts Across Devices

**What goes wrong:**
Per PROJECT.md: presets + active selection in localStorage, custom themes in backend DB. A user creates a custom theme on their phone, then opens the app on a tablet. The tablet's localStorage has no custom themes; the DB does. Two failure modes:
1. **Stale localStorage wins:** Tablet reads `fc_active_skin` from localStorage (a different/old skin), never queries DB, shows wrong theme. Even after the DB fetch completes, localStorage overwrites it on next save.
2. **Last-write-wins data loss:** User edits custom theme "Spring" on phone (saving v2 to DB). Meanwhile, the phone's cached localStorage still has v1. A different flow writes v1 back to DB, destroying v2.

**Why it happens:**
Hybrid storage creates two sources of truth with no reconciliation. The existing app has no sync layer — `AuthContext` loads from localStorage once at mount and never refreshes. Adding a second async source (DB) without a merge strategy guarantees races.

**How to avoid:**
1. **Treat DB as source of truth for custom themes; localStorage as a cache + the active-skin snapshot.** Schema:
   - `fc_active_skin`: the *resolved token map* for FOUC (fast, synchronous, possibly stale — acceptable for first paint, corrected after DB fetch).
   - `fc_custom_themes_cache`: `{ [id]: { seed, name, updatedAt, version } }` — full custom theme list, with `updatedAt` timestamps.
2. **On mount, after the FOUC script has painted, fetch custom themes from DB and reconcile:** for each theme ID, if `db.updatedAt > cache.updatedAt`, replace the cache entry. This is last-write-wins on `updatedAt`, which is correct for a single-user-per-account system.
3. **On save (create/edit/delete custom theme):** write to DB first; on success, update localStorage cache. If DB write fails, do NOT update localStorage — show a toast (project pattern: `ToastContext`) and keep the editor open. This prevents the "saved locally, lost globally" failure.
4. **Active skin resolution:** on each mount, after DB sync, if `fc_active_skin_id` points to a theme that was edited remotely, re-resolve the token map (re-run `SchemeTonalSpot`) and overwrite `fc_active_skin`. The brief flash of stale colors (1 frame) is acceptable; the FOUC script's stale data is still *valid* (just an older version of the same theme), not broken.

**Warning signs:**
- "My theme reverted" bug reports from multi-device users.
- Network panel shows DB fetch finishing *after* localStorage already applied a stale skin, with no re-apply.
- Two browser tabs editing the same custom theme silently overwrite each other (out of scope for v1.5 but worth a known-limitation note).

**Phase to address:**
**Phase 1 (Foundation — storage schema + reconciliation).** The reconciliation logic runs at mount and must be in place before Phase 2 (Editor) can save. Phase 5 (Backend persistence — if separate phase) implements the actual `/api/themes` CRUD; Phase 1 stubs the client-side sync contract.

---

### Pitfall 7: Slider Drag Re-Renders the Whole App on Every `input` Event

**What goes wrong:**
The custom editor has a hue slider. Naive implementation: `onChange` → `setSeed(hex)` in ThemeContext → context value changes → every consumer re-renders. A drag fires ~60-120 `input` events/second. With 30+ components consuming theme-derived styles, the main thread saturates, the slider stutters, and on low-end mobile (the project's target) the page becomes unresponsive. Compounding: the existing `AuthContext.jsx:47-57` builds a fresh `value` object on every render with no `useMemo` — if ThemeContext copies this pattern, every context consumer re-renders even if nothing changed.

**Why it happens:**
CSS custom property updates via `document.documentElement.style.setProperty` are themselves cheap (the browser handles recascade natively). The expensive parts are: (a) React re-rendering consumers, and (b) the HCT → 40-token resolution running synchronously on every drag event. Developers often store the seed in context state, causing (a); and run `SchemeTonalSpot` in the render path, causing (b).

**How to avoid:**
Three layers of defense, all required:

1. **Don't put the dragging seed in React state at all for the live preview.** Write tokens directly to a *preview-only* `<style id="skin-preview">` element on `input` events, bypassing React entirely:
   ```jsx
   const onHueInput = (e) => {
     const seed = e.target.value;
     const hct = Hct.fromInt(parseInt(seed.slice(1), 16));
     // Write preview tokens directly — no setState, no re-render
     const lightMap = buildRoleMap(new SchemeTonalSpot(hct, false, 0));
     previewStyleRef.current.textContent = formatAsCss(lightMap);
   };
   ```
   The preview component reads colors from CSS (it's styled by the tokens), so it visually updates without React. Only the slider's own position is React state (a single cheap re-render of one input).

2. **Debounce the seed → context propagation.** Use the existing `debounce` helper (`frontend/src/utils/index.js:126-136`) to propagate the seed to ThemeContext / DB-save at ~150ms quiescence:
   ```jsx
   const propagateSeed = useMemo(() => debounce((seed) => {
     setThemeSeed(seed); // context update — triggers consumer re-render ONCE after drag ends
   }, 150), []);
   ```

3. **Memoize the context value.** Unlike `AuthContext`, ThemeContext should wrap its value in `useMemo` keyed on the stable theme identity (not the live-dragging seed). Consumers re-render only on actual theme *change*, not on every drag tick.

4. **Optional: `useDeferredValue`** (React 19) for the seed shown in any text readout, so the readout lags without blocking the slider.

**Warning signs:**
- Slider feels "sticky" / drops frames during drag — check React DevTools Profiler; if it shows 30+ components rendering per drag tick, this pitfall is live.
- CPU profiler shows `SchemeTonalSpot` constructor dominating flame chart during drag.
- Low-end Android test device becomes unresponsive during color editing.

**Phase to address:**
**Phase 2 (Custom Theme Editor).** The preview-direct-to-DOM pattern is an editor implementation detail, decided when the editor is built. If Phase 2 ships context-state-driven previews, the perf bug is baked in and fixing it later means re-architecting the editor.

---

### Pitfall 8: Seasonal Auto-Switch Fights Manual Selection (Ping-Pong / Surprise Switches)

**What goes wrong:**
User enables "seasonal auto-switch" in March (spring). In May they manually pick a custom "Summer Beach" theme for a party. Three failure modes:
1. **Surprise revert:** On next page load (still May), the seasonal logic sees "current season = summer" and overrides their manual pick back to the "Summer" preset. The user's manual choice is lost.
2. **Timezone drift:** "Summer" starts June 1 — but in what timezone? The server is UTC, the user is UTC+8 (project context). The switch happens 8 hours early/late, confusing users.
3. **Minute-granularity fighting:** If auto-switch runs on every mount, a user toggling dark mode (which re-applies skin) might trigger the seasonal check, which re-applies the seasonal preset, clobbering a manual custom theme set seconds earlier in the same session.

**Why it happens:**
Auto-switch and manual selection share the same apply channel with no priority/lockout discipline. There's no concept of "user intent" — last writer wins, and the seasonal check runs unconditionally.

**How to avoid:**
1. **Manual selection sets a "user override" flag with a TTL.** When the user manually picks a theme (preset or custom), set `fc_user_override = { themeId, expiresAt: now + 30 days }` in localStorage. The seasonal auto-switch checks this flag; if present and unexpired, it does NOT override. This gives manual selection clear priority while letting seasonal resume after the user forgets.

2. **Seasonal switch evaluates ONCE per season boundary, not on every mount.** Store `fc_last_season = 'spring'`. On mount, compute current season; if equal to last, do nothing. If different AND no user override is active, switch and update `fc_last_season`. This prevents intra-session fighting.

3. **Season computed in USER's timezone, not server's.** Use the browser's `Intl.DateTimeFormat` to determine the user's hemisphere/season:
   ```js
   const month = new Date().getMonth(); // user's local month
   // Simple N-hemisphere mapping (refine for S-hemisphere offset if needed):
   const season = ['winter','spring','summer','autumn'][Math.floor(((month + 1) % 12) / 3)];
   ```
   Don't ask the backend what season it is — the server's UTC "now" doesn't know the user's local May.

4. **Make auto-switch opt-in and reversible.** The toggle in `/theme` page is OFF by default. When ON, show a one-time toast "已开启按季节自动切换；手动选择将暂停自动切换 30 天" so the behavior is discoverable.

**Warning signs:**
- Bug report: "I set my theme but it keeps changing back."
- A user's `fc_active_skin_id` in localStorage doesn't match what's actually rendered after a reload.
- Season boundary test (set system clock to June 1 00:00) switches theme at the wrong wall-clock time for the user's timezone.

**Phase to address:**
**Phase 4 (Seasonal Auto-Switch).** This pitfall is entirely scoped to the seasonal feature. Phase 4 must ship the user-override flag and once-per-boundary evaluation together — shipping auto-switch without the override is the single fastest way to erode user trust in the feature.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Apply custom skin inside `useEffect` (not inline `<script>`) | Less code, reuses React context | Permanent FOUC on every load; worse on slow mobile | **Never** — FOUC is a regression vs. the existing light/dark toggle |
| Edit `tokens.css` to add seasonal presets | Quick, "just CSS" | Lost on next `npm run gen:tokens`; breaks the generation contract | **Never** — file header explicitly forbids |
| Store custom theme as flat token list (single mode) | Simpler schema, half the storage | Dark mode breaks for every custom theme; forced re-migration | **Never** for any theme that should work in both modes |
| Let users edit individual role tokens (not seed-based) | Power-user flexibility, "more control" | Accessibility violations, role-pair contrast breaks, unmanageable state space | Only behind explicit "Advanced" mode with live contrast gating |
| Skip `useMemo` on ThemeContext value (copy AuthContext pattern) | Consistency with existing code | Whole-app re-render on every theme-related state tick | **Never** — AuthContext's pattern is wrong for high-frequency state; ThemeContext must memoize |
| Re-resolve HCT scheme on every render | Simpler data flow | 60-120×/sec resolution during slider drag; main-thread lockup | **Never** in render path — resolve at save/apply time only |
| Persist active skin as seed color (not resolved tokens) | Smaller localStorage, "single source of truth" | Inline FOUC script must load the HCT library synchronously → slow boot | **Never** — localStorage holds resolved `{light, dark}` token maps; seed is metadata |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **Existing `theme` singleton** (`utils/index.js:7-37`) | Replacing it with ThemeContext and missing a call site | Keep `theme` as the low-level light/dark manipulator; ThemeContext wraps it and adds skin re-application on toggle. Audit all 3 call sites: `ThemeToggle.jsx`, `LoginPage.jsx:22`, `utils/index.js` |
| **`AuthContext` pattern** (`contexts/AuthContext.jsx`) | Copying its non-memoized `value` object (line 47-57) into ThemeContext | ThemeContext MUST `useMemo` its value — auth state changes rarely, theme preview state changes 100×/sec during drag |
| **`queueMicrotask` convention** (`AuthContext.jsx:18`) | Calling `setState` directly inside `useEffect` | Follow the project convention: wrap initial-state reads in `queueMicrotask` to satisfy `react-hooks` lint rules |
| **`ToastContext`** for save errors | Silently swallowing DB save failures (project pattern in `order_service.py:217-218`) | Theme save failures MUST surface a toast — silent failure means user thinks they saved but DB has nothing |
| **Feishu / backend notification** | Assuming theme changes need to notify the backend | They don't — themes are client-rendered. Only custom-theme CRUD hits the backend. Don't add Feishu noise. |
| **`ProtectedRoute`** | Gating `/theme` page behind auth | Presets + active selection work for logged-out users (localStorage); only custom-theme CRUD needs auth. Route the page public, gate the save-custom API. |
| **Vite HMR** | Custom skin lost on every hot reload during dev | Write the apply function to re-read `fc_active_skin` on mount; Vite preserves localStorage across HMR but not in-memory React state |
| **Backend `User` model** | Adding theme columns to `users` table directly | Use a separate `user_themes` table (one-to-many: a user has many custom themes) — matches the existing pattern of separate tables for separate concerns (cf. `guest_invitations`, `wishes`) |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| **Slider drag triggers full-app re-render** | UI freezes during color drag; Profiler shows 30+ components/tick | Write preview tokens directly to `<style id="skin-preview">` on `input`, bypass React; debounce context propagation 150ms | Mid-range Android at ~10 saved themes rendered as preview cards |
| **`SchemeTonalSpot` in render path** | Flame chart dominated by HCT math during drag | Resolve at save/apply time only; never in render. Cache resolved maps in a `useRef` during a drag session. | Any device, any number of themes — the math is ~5ms/call |
| **Inline `<style id="active-skin">` grows unbounded** | Slow stylesheet recascade; DevTools shows huge `<style>` block | Override only the ~35 mode-dependent tokens, not the 90+ tonal palette tokens (palette tokens aren't consumed by components — verified) | Only if a future component starts using `--md-palette-*` directly (currently zero consumers) |
| **localStorage JSON.parse on every apply** | Jank on page load (parse of large skin JSON) | Keep `fc_active_skin` compact (~35 tokens × 2 modes = ~70 entries). Parse once in inline script, cache in module variable. | >200 custom themes if you accidentally cache the full list in active-skin key |
| **DB fetch blocking first paint** | White screen → theme flash → corrected theme | FOUC script uses localStorage only (synchronous, fast); DB fetch is async and reconciles AFTER paint. Stale-but-valid is fine. | Slow 3G on first visit from a new device |
| **`<style>` recascade cost** | Visible hitch when switching themes | Browser recascade of 35 custom properties is ~1-2ms on modern hardware; acceptable. Avoid transitioning ALL properties (use targeted `transition: background-color, color` on specific elements, not `transition: all`). | Only if `transition: all` is added globally — DO NOT |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| **Trusting user-supplied token values verbatim into CSS** | CSS injection (`--md-color-primary: red; } body { background: url(attacker)`) — though CSP mitigates, malformed CSS can break the whole stylesheet | Validate every token value matches `/^#[0-9a-fA-F]{6}$/` before writing to `<style>`. Reject anything else. Seed-based generation sidesteps this entirely. |
| **Storing other users' theme seeds without ownership check** | User A reads/deletes user B's custom themes via ID enumeration | Backend `/api/themes/{id}` must verify `theme.user_id == current_user.id` on every GET/PUT/DELETE. Follow the project's existing `require_role` + ownership pattern. |
| **Custom theme name XSS** | `<script>` in theme name renders in the `/theme` card grid | React auto-escapes JSX text — but verify no `dangerouslySetInnerHTML` is used on theme names. Cap name length (e.g. 30 chars) server-side. |
| **localStorage poisoning from shared device** | Family member's custom theme contains offensive name persisted across logins | On logout (`AuthContext.logout()`), optionally clear `fc_active_skin` and `fc_custom_themes_cache` — but PRESERVE `fc_theme` (light/dark) since that's device-level. Make this a settings toggle. |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| **Preview card doesn't use the theme's own tokens** | User sees generic preview, can't tell themes apart | Each theme card is styled by a scoped `<div style={theme.tokens.light}>` — the card IS the preview, using the tokens inline so it's isolated from the page's active theme |
| **No "reset to default" escape hatch** | User picks broken theme, can't recover | Always-visible "恢复默认" button in `/theme` header, independent of any theme card. One click restores the v1.2 default. |
| **Seasonal toggle with no feedback** | User enables auto-switch, nothing visibly changes (until next season) | Show "下次自动切换：2026-09-01 立秋 → 秋季主题" with the next boundary date and target theme |
| **Custom editor's live preview only shows one mode** | User saves theme, discovers it's broken in the mode they didn't preview | Editor shows split or toggleable light/dark preview; "保存" disabled until both modes previewed at least once (or auto-preview both side-by-side) |
| **Color picker uses raw hex** | Non-designer users can't reason about `#34834E` | Use a hue wheel / saturation picker (native `<input type="color">` is acceptable on mobile); show the seed color as a swatch, not a hex string |
| **Theme switch with no transition** | Hard color cut feels jarring | Add `transition: background-color 200ms, color 200ms, border-color 200ms` on key containers (NOT `transition: all` — see Performance Traps) |
| **5 presets shown but 1 is "current default"** | User deletes the default and can't restore | Presets are immutable (PROJECT.md: "仅可编辑，不可删除"). Enforce in UI by hiding delete button on preset cards, not just in API. |

---

## "Looks Done But Isn't" Checklist

- [ ] **FOUC:** First paint on hard reload (DevTools → Disable cache → Ctrl+Shift+R) shows the custom theme immediately, not a green flash — verify on slow CPU throttling
- [ ] **Dark mode + custom theme:** Toggle dark mode with a custom theme active → custom dark palette applies (not default green dark). Verify `data-theme="dark"` + custom skin coexist.
- [ ] **`ThemeToggle` integration:** Clicking the existing header light/dark button (which uses the OLD `theme` singleton, not new context) still re-applies the custom skin for the new mode
- [ ] **Elevation in custom dark theme:** Cards in dark mode with a non-default skin show visible elevation hierarchy (surface-container-high visibly raised above surface-container)
- [ ] **Contrast on custom themes:** Run Axe DevTools on `/theme` page with a custom theme active → zero color-contrast violations
- [ ] **Cross-device sync:** Create custom theme on device A, open app on device B → theme appears in `/theme` list within one mount cycle (DB fetch + cache reconciliation)
- [ ] **Slider performance:** Drag hue slider for 5 seconds on a mid-range device → no dropped frames in React Profiler, slider stays under the cursor
- [ ] **Seasonal override:** With auto-switch ON, manually pick a custom theme, reload page → manual theme persists (auto-switch does NOT clobber it within the override TTL)
- [ ] **Season boundary:** Set system clock to season boundary → theme switches exactly once, not on every mount within the new season
- [ ] **Logout behavior:** Decide and verify — does logout clear the active skin? (Recommendation: keep light/dark, optionally clear custom skin per the security table above)
- [ ] **Backend ownership:** User A cannot GET/PUT/DELETE user B's theme by guessing the ID — write a negative test
- [ ] **`tokens.css` untouched:** `git diff frontend/src/css/tokens.css` is EMPTY in the custom-theme PR — the generation contract is intact
- [ ] **Hex-lint CI gate:** `rg "#[0-9a-fA-F]{3,8}" frontend/src/components --glob '*.css'` returns zero matches — no component hardcoded colors that would resist theming
- [ ] **`prefers-reduced-motion`:** Theme switch transition respects the media query (existing pattern in `styles.css` — verify the new transition does too)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Shipped with `useEffect`-based apply (FOUC) | MEDIUM | Move apply logic into inline `<script>` in `index.html`; keep ThemeContext for runtime changes only. No DB migration needed. |
| Shipped flat-map (single-mode) custom themes | HIGH | DB migration: for each stored custom theme, look up saved seed (if present) and regenerate `{light, dark}` via `SchemeTonalSpot`. If seed wasn't stored, themes are unrecoverable — must be recreated by users. **Store the seed always.** |
| Shipped token-level editor without contrast checks | HIGH | Retroactively compute contrast for all saved themes; flag and disable any failing themes in the UI with a "对比度不足，请重新编辑" warning. Can't auto-fix without the user's intent. |
| Shipped seasonal auto-switch without override flag | MEDIUM | Add `fc_user_override` logic in a patch; users who already abandoned the feature won't come back, but future manual selections will stick. |
| Shipped non-memoized ThemeContext | LOW | Wrap `value` in `useMemo([themeId, mode])`. One-line fix, no data migration. |
| Hardcoded color leaked into a component | LOW | Replace with `var(--md-color-X)`. Verify hex-lint CI catches it next time. |
| Elevation broken in custom dark themes | LOW | Add elevation tokens to the apply layer's override map for dark mode. No data migration — elevations are derived, not stored. |

---

## Pitfall-to-Phase Mapping

Assuming a typical milestone decomposition (adjust to actual ROADMAP.md):

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| **P1: FOUC** | Phase 1 — Foundation (storage + apply) | Hard reload with custom theme → no green flash under 4× CPU throttle |
| **P2: Specificity / don't edit tokens.css** | Phase 1 — Foundation | `git diff tokens.css` empty; hex-lint CI gate merged; `<style id="active-skin">` injection works |
| **P3: Accessibility / contrast** | Phase 2 — Custom Editor | Axe DevTools zero violations on `/theme`; seed-based `SchemeTonalSpot` is the data model |
| **P4: Elevation + surface-tint** | Phase 1 — Foundation (apply layer) + Phase 3 — Presets (verification) | Custom dark theme shows visible elevation hierarchy across 5 levels |
| **P5: Light/dark × custom matrix** | Phase 1 — Foundation (schema) | Toggling dark mode with custom theme keeps the custom hue in both modes |
| **P6: localStorage ↔ DB sync** | Phase 1 — Foundation (reconciliation) + Phase 5 — Backend CRUD | Create theme on device A, appears on device B after one reload; no stale-localStorage wins |
| **P7: Slider drag perf** | Phase 2 — Custom Editor | React Profiler shows zero consumer re-renders during drag; preview writes direct to DOM |
| **P8: Seasonal auto-switch fighting manual** | Phase 4 — Seasonal | Manual pick persists across reload when auto-switch ON; season boundary switches exactly once |

**Phase ordering rationale:**
- **Phase 1 must come first** because P1 (FOUC), P2 (override mechanism), P4 (elevation in apply set), P5 (matrix schema), and P6 (sync contract) are all *foundational apply/storage decisions*. Every later phase consumes them. Skipping Phase 1 to jump to the editor (Phase 2) guarantees rework.
- **Phase 2 (Editor) second** because P3 (accessibility) and P7 (perf) are editor-internal and depend on the Phase 1 data model being seed-based.
- **Phase 3 (Presets) third** — straightforward once the apply layer exists; mainly verifies P4 across the 4 seasonal presets.
- **Phase 4 (Seasonal) can run in parallel with Phase 5 (Backend CRUD)** — seasonal is client-side logic, backend is API work; they only meet at P6 reconciliation.

**Research flags for phases:**
- **Phase 2 (Editor):** Highest research need — HCT color space, scheme variants (TonalSpot vs Vibrant vs Content), and the direct-to-DOM preview pattern all need validation. Spike the `@material/material-color-utilities` integration before committing the data model.
- **Phase 4 (Seasonal):** Needs research on season-definition (meteorological vs astronomical vs solar terms 立春/立夏 — the project is Chinese-context, 节气 may be more culturally appropriate than June 1 boundaries). Flag for discuss-phase.
- **Phase 1, 3, 5:** Standard patterns once the apply mechanism is decided; low research risk.

---

## Sources

- **Codebase (HIGH confidence, directly inspected):**
  - `frontend/src/css/tokens.css` — token structure, generation contract, hardcoded elevation `rgba(0,0,0,X)` at lines 163-167, state-layer cascade at lines 189-190
  - `frontend/index.html:8-16` — existing inline FOUC-prevention script (the pattern to extend)
  - `frontend/src/utils/index.js:7-37` — existing `theme` singleton util (`fc_theme` localStorage key, `data-theme` attribute)
  - `frontend/src/contexts/AuthContext.jsx:16-57` — context pattern to follow (and the non-memoized `value` to NOT copy)
  - `frontend/src/components/ThemeToggle.jsx` — existing light/dark toggle that must coexist with custom skin re-application
  - `rg "var(--md-palette" frontend/src/components` → 0 matches (verified: no component uses palette tokens directly, so semantic overrides cascade cleanly)
  - `rg "#[0-9a-fA-F]{3,8}" frontend/src/components --glob '*.css'` → 0 matches (verified: no hardcoded colors in components)
- **Official `@material/material-color-utilities` docs (HIGH confidence, via Context7):**
  - `SchemeTonalSpot(hct, isDark, contrastLevel)` — generates complete accessible role set from one seed; the canonical MD3 algorithm — [material-foundation/material-color-utilities](https://github.com/material-foundation/material-color-utilities)
  - `Contrast.ratioOfTones(t1, t2)` / `Contrast.lighter(bgTone, 4.5)` — WCAG contrast validation API
  - `TonalPalette.fromHct(hct)` — 13-tone palette generation per color family
  - "A difference of 40 in tone guarantees at least 3.0 contrast ratio (WCAG AA)" — official heuristic
- **MD3 spec (MEDIUM confidence, general knowledge cross-referenced with library behavior):**
  - Elevation = shadow channel + surface-tint channel (two-channel system)
  - `surfaceTint` role defaults to primary tone
  - Role-pair contrast requirements (primary/on-primary ≥ 4.5:1 for text roles)
- **Established patterns (HIGH confidence, web-platform fundamentals):**
  - Inline `<script>` in `<head>` runs before first paint; `useEffect` runs after — the basis for FOUC prevention
  - CSS custom property cascade: later stylesheets beat earlier; `!important` in stylesheet beats non-important inline custom property (counterintuitive)
  - React 19 context re-renders all consumers when provider `value` identity changes; `useMemo` required for high-frequency state
  - `prefers-color-scheme` media query and `data-theme` attribute are independent mechanisms (the latter is the project's choice)

---
*Pitfalls research for: Adding dynamic runtime theming to an existing MD3 CSS-variable token system*
*Researched: 2026-07-31*
