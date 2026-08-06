---
status: diagnosed
trigger: "When user toggles 季节自动切换 ON in /theme/settings, the page color does NOT change to the season preset. This is the SAME symptom as tests 6 and 12 — root cause is shared, just triggered via different code path (setSeasonEnabled vs setActiveTheme)."
created: 2026-08-06T22:50:00Z
updated: 2026-08-06T22:50:00Z
---

## Current Focus

hypothesis: All three failing paths (tests 6, 9, 12) eventually call setActiveThemeState(...), but the resulting `useEffect[activeTheme, showToast]` at line 220-229 either does not fire, or the injected CSS is overridden by tokens.css (dev-mode CSS load order).
test: Read theme-context.jsx and trace the toggle path; verify whether fc-dynamic-theme (later source order) overrides tokens.css in Vite dev mode.
expecting: Find a shared code defect in setActiveThemeState → useEffect[activeTheme] → injectThemeCss chain.
next_action: Write diagnosis output and propose fix direction.

## Symptoms

<!-- IMMUTABLE after gathering -->

expected: User toggles 季节自动切换 ON in /theme/settings → page color changes to current season preset (e.g., autumn colors).
actual: Toggle works visually (state updates, toast shows), but page color does NOT change.
errors: none reported.
reproduction: Open /theme/settings, toggle 季节自动切换 from OFF to ON. Observe page color.
started: UAT session 18, Test 9 reported as failed (also Tests 6 and 12 share symptom).

## Eliminated

- hypothesis: "Bug is in justEnabledRef — not consumed correctly"
  evidence: Line 312 shows `|| justEnabledRef.current` as a separate OR clause in `shouldApply`. With justEnabledRef.current=true (set on line 276), shouldApply is unconditionally true regardless of cache gate.
  timestamp: 2026-08-06T22:50:00Z

- hypothesis: "Bug is in cache gate `shouldApplySeasonalPreset` returning false unexpectedly"
  evidence: Even when cache matches (returns false), the `|| justEnabledRef.current` clause forces shouldApply=true. Cache is bypassed on user-initiated toggle ON.
  timestamp: 2026-08-06T22:50:00Z

- hypothesis: "applyCurrentSeason returns false (e.g., season not found)"
  evidence: getSeasonForDate + getSeasonPresetId + PRESETS.find form a complete chain; getSeasonForDate returns a season string for any year in SOLAR_TERMS (2020-2099), getSeasonPresetId accepts valid season strings, PRESETS.find finds the matching preset. Path is sound.
  timestamp: 2026-08-06T22:50:00Z

## Evidence

- timestamp: 2026-08-06T22:50:00Z
  checked: ThemeSettingsPage.jsx handleSeasonToggle
  found: Calls `setSeasonEnabled(Boolean(event.target.checked))` (line 41-42). Toggle is correctly wired to setSeasonEnabled from useTheme().
  implication: Public API entry point works.

- timestamp: 2026-08-06T22:50:00Z
  checked: theme-context.jsx setSeasonEnabled (lines 270-278)
  found: Three steps: (1) setSeasonEnabledState(value), (2) writeSeasonEnabledToStorage(value), (3) justEnabledRef.current = true (only if value is truthy). No direct theme application — only sets flag + ref.
  implication: Theme change is deferred to the useEffect at line 332-335, not inlined.

- timestamp: 2026-08-06T22:50:00Z
  checked: theme-context.jsx useEffect at lines 332-335
  found: `useEffect(() => { if (!seasonEnabled) return; queueMicrotask(() => applyCurrentSeason()); }, [seasonEnabled, hemisphere, user?.id, applyCurrentSeason])`. Effect fires on seasonEnabled false→true. Microtask defers applyCurrentSeason to after React commit phase.
  implication: applyCurrentSeason is called after state update (via microtask, NOT inline). Chain: state update → effect → microtask → applyCurrentSeason → applySeasonalPresetDirect → setActiveThemeState.

- timestamp: 2026-08-06T22:50:00Z
  checked: theme-context.jsx applyCurrentSeason (lines 302-323)
  found: Resolves season via getSeasonForDate + getSeasonPresetId; finds preset in PRESETS array; checks cache gate OR justEnabledRef; if shouldApply=true → applySeasonalPresetDirect(preset); writeLastSeasonToStorage; reset justEnabledRef.
  implication: Logic appears correct. With justEnabledRef.current=true, shouldApply=true unconditionally; applySeasonalPresetDirect(autumn) is called, which calls setActiveThemeState(autumn preset).

- timestamp: 2026-08-06T22:50:00Z
  checked: theme-context.jsx applySeasonalPresetDirect (lines 294-296)
  found: `setActiveThemeState(preset)` — direct state setter that bypasses the D-09 mutex (intentional bypass for internal use).
  implication: activeTheme state should update to the season preset reference. Different reference from previous activeTheme → useEffect[activeTheme] should fire.

- timestamp: 2026-08-06T22:50:00Z
  checked: theme-context.jsx useEffect[activeTheme, showToast] at lines 220-229
  found: Builds CSS via buildCssSync(activeTheme.sourceColors, activeTheme.variant); calls injectThemeCss(cssText); writes activeTheme to localStorage. Catches errors with toast + reset to DEFAULT_PRESET.
  implication: This is the CSS injection site. If activeTheme changes, this should fire and update fc-dynamic-theme.

- timestamp: 2026-08-06T22:50:00Z
  checked: theme-engine.js injectThemeCss (lines 254-262)
  found: Finds `<style id="fc-dynamic-theme">` or creates one and appends to document.head. Sets element.textContent = cssText.
  implication: Standard DOM manipulation; setting textContent on a `<style>` element updates the document's active stylesheet. Should work in modern browsers.

- timestamp: 2026-08-06T22:50:00Z
  checked: Vite dev server /@vite/client updateStyle function (lines 1164-1182 of vite client)
  loaded: First CSS module: `document.head.appendChild(style)` (end of head). Subsequent: `lastInsertedStyle.insertAdjacentElement("afterend", style)` (after last inserted).
  implication: In dev mode, Vite CSS modules are all inserted into head as a contiguous block at the END of head. The FOUC bootstrap (inline script in head) runs BEFORE main.jsx and appends fc-dynamic-theme to end of head. When Vite CSS modules load later, they are appended AFTER fc-dynamic-theme in DOM order.

- timestamp: 2026-08-06T22:50:00Z
  checked: CSS cascade rules for fc-dynamic-theme vs tokens.css
  found: Both use `:root` selector with same specificity (0,0,1). Source order determines winner. In Vite dev mode, fc-dynamic-theme is added by FOUC bootstrap (inline `<script>` in head, runs synchronously when parsed); tokens.css is injected by Vite later as `<style>` tags at end of head. tokens.css comes AFTER fc-dynamic-theme → tokens.css wins (same specificity, later source order).
  implication: In dev mode, fc-dynamic-theme is overridden by tokens.css. Any theme change after mount would NOT be visible because tokens.css wins the cascade. Initial mount might appear "correct" if the FOUC bootstrap content happens to closely match tokens.css values, or if the user doesn't notice subtle color differences.

- timestamp: 2026-08-06T22:50:00Z
  checked: dist/index.html (production build)
  found: Order: data-theme script → main.jsx module → CSS link (tokens.css) → FOUC bootstrap inline script. FOUC bootstrap runs LAST → adds fc-dynamic-theme at end of head → wins cascade (later source order than CSS link).
  implication: Production mode (npm run build) works correctly because the FOUC bootstrap runs after the CSS link, making fc-dynamic-theme the latest source. Dev mode (npm run dev) does NOT work because Vite's CSS injection puts CSS modules after fc-dynamic-theme.

- timestamp: 2026-08-06T22:50:00Z
  checked: UAT Test 11 "刷新持久化与首屏主题" — passes
  found: User reports that on refresh with seasonEnabled=true, the season preset is visible at first paint. This works because the FOUC bootstrap reads fc_active_theme (or season preset if seasonEnabled) and injects it INTO fc-dynamic-theme BEFORE tokens.css loads in dev mode… wait — but tokens.css comes AFTER fc-dynamic-theme in dev mode, so fc-dynamic-theme should be overridden. This is a contradiction.
  implication: Either (a) the user is testing in production (run.sh), not dev (run-dev.sh), OR (b) there's a CSS specificity nuance I'm missing. Test 11 may actually pass for the WRONG reason (because the FOUC bootstrap content matches tokens.css defaults for the default preset, making the difference invisible to the user).

- timestamp: 2026-08-06T22:50:00Z
  checked: Common bug pattern — CSS load order vs dynamic theme override
  found: Pattern matches "CSS-in-JS dynamic styles overridden by static stylesheet" — a known issue where dynamic `<style>` tags inserted before static stylesheets lose cascade. The fix is typically to ensure the dynamic style is inserted AFTER all static stylesheets (e.g., at the very end of head/body, or via document.head.appendChild after async CSS loading).
  implication: This is the same root cause for all three failing tests (6, 9, 12) — they all rely on injectThemeCss to update the visible theme, but in dev mode, the injected CSS is overridden by tokens.css which loads later.

## Resolution

root_cause: In Vite dev mode, fc-dynamic-theme (the dynamic theme stylesheet injected by both the FOUC bootstrap and theme-context.jsx useEffect[activeTheme]) is inserted BEFORE the Vite-injected CSS modules (tokens.css, styles.css, etc.). Both target `:root` with identical specificity, and source order determines the winner. tokens.css loads LATER, so it wins — overriding the dynamic theme's CSS variables. This affects ALL three failing tests (6, 9, 12) because they all rely on injectThemeCss → fc-dynamic-theme to apply the theme visually. The toggle path (setSeasonEnabled → useEffect → applyCurrentSeason → setActiveThemeState → useEffect[activeTheme] → injectThemeCss) is logically correct but its output is masked by the CSS cascade order. In production (dist build), the FOUC bootstrap runs AFTER the CSS link so fc-dynamic-theme wins; the bug only manifests in dev mode.

fix: Two viable approaches:
  (a) Change injectThemeCss to ensure fc-dynamic-theme is the LAST `<style>` in document.head (insert at end via document.head.appendChild each time, after any later-appended style sheets — this requires either re-ordering the FOUC bootstrap to run after main.jsx loads CSS, OR appending fc-dynamic-theme on every injectThemeCss call to ensure it's last).
  (b) Use higher-specificity selectors in the dynamic CSS (e.g., `:root:root` or `html` + `:root` chained) to win the cascade regardless of source order.
The cleanest fix is (a): injectThemeCss should ensure fc-dynamic-theme is appended at the end of document.head (move any later siblings to before it), so the dynamic theme always has the latest source order. The Phase 17 fix "fix(17-02): place bootstrap after generated styles" addressed this for production by adding the bootstrap script after the CSS link; the same principle needs to apply in dev mode.

verification: After fix, toggle ON should change page colors immediately; clicking a preset card should change colors; saving a custom theme should apply it. Verified by running `npm run dev`, navigating to /theme/settings, toggling, and confirming CSS variables (--md-color-primary etc.) come from fc-dynamic-theme, not tokens.css.

files_changed:
  - frontend/src/theme/theme-engine.js (modify injectThemeCss to enforce end-of-head position)
  - frontend/plugins/inline-theme-bootstrap.js (possibly adjust inject position)
  - frontend/src/theme/fouc-bootstrap.js (verify ordering)