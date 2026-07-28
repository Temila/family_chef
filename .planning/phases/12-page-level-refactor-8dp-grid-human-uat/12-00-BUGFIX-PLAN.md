---
phase: 12-page-level-refactor-8dp-grid-human-uat
plan: 00-BUGFIX
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/primitives/Ripple.jsx
  - frontend/src/components/primitives/Button.jsx
  - frontend/src/components/primitives/IconButton.jsx
  - frontend/src/components/primitives/FAB.jsx
  - frontend/src/App.jsx
  - frontend/src/components/composites/Sidebar.jsx
autonomous: true
requirements:
  - UX-02
  - LOGIC-01
  - LOGIC-02
  - LOGIC-03
must_haves:
  truths:
    - "D-BUG-01: Mouse and touch activation of Button, IconButton, and FAB reaches their original onClick handlers while keyboard Enter remains functional."
    - "D-BUG-02: Authenticated pages render one page-level header, not the removed PcLayout Sidecar Header."
    - "D-BUG-02: Theme switching and logout remain reachable from the Sidebar footer, with theme before logout."
    - "LOGIC-02: No backend file changes in this plan."
  artifacts:
    - path: "frontend/src/components/primitives/Ripple.jsx"
      provides: "Hybrid self/wrap ripple API with native button hit-testing"
      contains: "mode"
    - path: "frontend/src/App.jsx"
      provides: "PcLayout without Sidecar Header"
    - path: "frontend/src/components/composites/Sidebar.jsx"
      provides: "Theme and logout footer controls"
  key_links:
    - from: "frontend/src/components/primitives/Button.jsx"
      to: "frontend/src/components/primitives/Ripple.jsx"
      via: "mode=\"self\""
      pattern: "Ripple mode=\"self\""
    - from: "frontend/src/components/primitives/IconButton.jsx"
      to: "frontend/src/components/primitives/Ripple.jsx"
      via: "mode=\"self\""
      pattern: "Ripple mode=\"self\""
    - from: "frontend/src/components/primitives/FAB.jsx"
      to: "frontend/src/components/primitives/Ripple.jsx"
      via: "mode=\"self\""
      pattern: "Ripple mode=\"self\""
    - from: "frontend/src/components/composites/Sidebar.jsx"
      to: "frontend/src/utils/index.js"
      via: "theme.getTheme/toggleTheme"
      pattern: "theme\\.(getTheme|toggleTheme)"
---

<objective>
Remove the two v1.2 interaction regressions before the broad page sweep: restore native mouse/touch clicks for MD3 button primitives and remove the duplicate PcLayout Header while preserving theme/logout access.

Purpose: Establish a stable, testable interaction shell before token migration and UAT, per D-BUG-01, D-BUG-02, and the locked three-plan sequence D-PLAN-01.
Output: Hybrid Ripple self mode, primitive wiring, a single-header PcLayout, and Sidebar footer theme/logout controls.
</objective>

<execution_context>
@/home/temila/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/temila/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-CONTEXT.md
@.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-RESEARCH.md
@.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-UI-SPEC.md
@.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-PATTERNS.md
@.planning/phases/09-motion-state-layers/09-CONTEXT.md
@.planning/phases/10-primitive-components/10-CONTEXT.md
@.planning/phases/11-composite-navigation-components/11-CONTEXT.md
@.planning/phases/11-composite-navigation-components/11-02-SUMMARY.md
@.planning/phases/11-composite-navigation-components/11-03-SUMMARY.md
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add Ripple self mode without breaking wrapper consumers</name>
  <files>frontend/src/components/primitives/Ripple.jsx, frontend/src/components/primitives/Button.jsx, frontend/src/components/primitives/IconButton.jsx, frontend/src/components/primitives/FAB.jsx</files>
  <read_first>
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-CONTEXT.md` — D-BUG-01 and D-PLAN-01
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-RESEARCH.md` — §1 exact Option 3 hybrid cloneElement pattern
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-PATTERNS.md` — Pattern 1 and S3 self/wrap contract
    - `frontend/src/components/primitives/Ripple.jsx` — current wrapper and ripple lifecycle
    - `frontend/src/components/primitives/base.css` — md-interactive/ripple z-index contract; read-only unless verification proves a CSS defect
    - `frontend/src/components/primitives/ripple.css` — animation span contract
    - `frontend/src/components/primitives/Button.jsx` — production consumer and forwarded ref
    - `frontend/src/components/primitives/IconButton.jsx` — production consumer and forwarded ref
    - `frontend/src/components/primitives/FAB.jsx` — production consumer and forwarded ref
    - `frontend/src/components/composites/ListItem.jsx` — default wrap consumer that must remain unchanged
  </read_first>
  <behavior>
    - Mouse/pointer activation on Button, IconButton, and FAB fires each original onClick exactly once.
    - Tab plus Enter continues to fire each button's onClick exactly once.
    - A pointer-created `.ripple-span` is appended to the native button in self mode and is removed after release/fade.
    - Default Ripple mode still renders the span wrapper for Card, Sidebar, BottomBar, and ListItem-style consumers.
    - Consumer refs and existing child `onPointerDown`, className, and style props are preserved rather than overwritten.
  </behavior>
  <action>Implement D-BUG-01 using RESEARCH §1 Option 3: import React `cloneElement`, `isValidElement`, and the ref helpers needed to compose the primitive's forwarded ref with Ripple's internal container ref. Extend the public signature to `Ripple({ children, disabled = false, className = '', style, mode = 'wrap' })`. For `mode === 'self'` and a valid child, return `cloneElement(children, ...)` so the child button itself receives the composed ref, a composed `onPointerDown` that first invokes the child's existing handler and then runs the unchanged coordinate/radius/ripple lifecycle unless disabled or prevented, merged className, and merged style with `position: 'relative'` plus `overflow: 'hidden'` while retaining child style. The ripple geometry must use the self-mode native button's `getBoundingClientRect()`; do not add the `.md-ripple-layer` wrapper in this path. Keep the existing span wrapper as the default `mode='wrap'` path for Sidebar/BottomBar/Card/ListItem and do not remove `pointer-events: none` from base.css. Replace the hard-coded ripple transition values while touching this logic with `var(--md-motion-duration-long) var(--md-motion-easing-emphasized)` for transform and `var(--md-motion-duration-short) var(--md-motion-easing-standard)` for opacity. Pass `mode="self"` from Button, IconButton, and FAB only, preserving all existing props, disabled/loading semantics, onClick handlers, and forwardRef behavior. This directly implements D-BUG-01 and does not alter business logic per LOGIC-01/03.</action>
  <acceptance_criteria>
    - `Ripple.jsx` exports a component whose props include `mode = 'wrap'` and whose self branch uses `isValidElement` plus `cloneElement`.
    - `Ripple.jsx` self mode appends the ripple to the child/native-button ref and does not render `.md-ripple-layer` around that child.
    - `Button.jsx`, `IconButton.jsx`, and `FAB.jsx` each contain exactly one `Ripple mode="self"` call.
    - Default-wrap callers in `Card.jsx`, `Sidebar.jsx`, `BottomBar.jsx`, and `ListItem.jsx` do not gain `mode="self"`.
    - Ripple transition strings contain `--md-motion-duration-long`, `--md-motion-duration-short`, `--md-motion-easing-emphasized`, and `--md-motion-easing-standard`; the 500ms/150ms CSS transition literals are absent from Ripple.jsx.
    - Production build completes with zero errors.
  </acceptance_criteria>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <done>Button, IconButton, and FAB use a native-button ripple container and retain pointer, keyboard, ref, disabled/loading, and external wrapper behavior.</done>
</task>

<task type="auto">
  <name>Task 2: Remove the Sidecar Header and relocate shell controls</name>
  <files>frontend/src/App.jsx, frontend/src/components/composites/Sidebar.jsx</files>
  <read_first>
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-CONTEXT.md` — D-BUG-02 and D-PLAN-01
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-RESEARCH.md` — §2 exact App deletion and Sidebar theme-toggle relocation pattern
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-PATTERNS.md` — Patterns 3-4
    - `frontend/src/App.jsx` — current PcLayout and Header import
    - `frontend/src/components/composites/Sidebar.jsx` — current footer and auth/navigation behavior
    - `frontend/src/components/composites/Sidebar.css` — footer/item sizing and 80dp rail constraints
    - `frontend/src/components/composites/Header.jsx` — source theme behavior and page-level Header that remains in use
    - `frontend/src/utils/index.js` — exact `theme.getTheme()`, `theme.toggleTheme()` API
    - `frontend/src/components/ThemeToggle.jsx` — existing theme control behavior
  </read_first>
  <action>Implement D-BUG-02 exactly: delete `<Header />` from `PcLayout` and remove only the now-unused App.jsx Header import; retain `<Sidebar />`, `<main className="pc-main" key={location.pathname}>`, `<Outlet />`, the Header re-export, and all page-level `<Header title=...>` consumers. In `composites/Sidebar.jsx`, import `theme` from `../../utils`, add a Ripple-wrapped theme button as the first child of `.md-sidebar__footer`, immediately before the existing logout button. Use `type="button"`, `className="md-sidebar__item md-interactive"`, `onClick={() => theme.toggleTheme()}`, a dynamic label/title of `切换浅色` when current theme is dark and `切换深色` otherwise, and `<Icon name={theme.getTheme() === 'dark' ? 'light-mode' : 'dark-mode'} size={24} />`. Keep the existing logout callback `logout(); navigate('/login');` unchanged and second in the footer. Do not create ProfileMenu, SettingsPage, a persisted theme preference feature, or any deferred theme-selector UI. Keep each footer action at the existing MD3 80dp navigation-item hit target; theme first is the chosen discretion because it is the more frequent action. This implements D-BUG-02 while preserving LOGIC-01/03.</action>
  <acceptance_criteria>
    - `frontend/src/App.jsx` contains no `import Header` and no `<Header />` inside `PcLayout`.
    - `PcLayout` still renders `<Sidebar />`, `<main className="pc-main" key={location.pathname}>`, and `<Outlet />`.
    - `frontend/src/components/composites/Sidebar.jsx` imports `theme` from `../../utils` and contains both `theme.toggleTheme()` and the unchanged `logout(); navigate('/login');` sequence.
    - In Sidebar footer source order, the light/dark theme Icon appears before the logout Icon.
    - Theme control accessible names switch between exact strings `切换浅色` and `切换深色`.
    - Existing page-level Header component files and page Header calls are not deleted.
    - Production build completes with zero errors.
  </acceptance_criteria>
  <verify>
    <automated>npm run build &amp;&amp; test "$(rg -c '&lt;Header /&gt;' src/App.jsx || true)" = "0" &amp;&amp; test "$(rg -c "import Header" src/App.jsx || true)" = "0" &amp;&amp; test "$(rg -c 'theme\.toggleTheme\(\)' src/components/composites/Sidebar.jsx)" = "1"</automated>
  </verify>
  <done>PcLayout no longer creates the duplicate Sidecar Header; page headers remain, and desktop users can switch theme then log out from the Sidebar footer.</done>
</task>

<task type="auto">
  <name>Task 3: Lock bugfix regressions into browser tests</name>
  <files>frontend/tests/phase12-bugfix.spec.js</files>
  <read_first>
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-CONTEXT.md` — D-BUG-01, D-BUG-02, D-UAT-02
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-UI-SPEC.md` — Bug-Fix Visual Contracts
    - `frontend/tests/snackbar.spec.js` — existing Playwright fixture/import conventions
    - `frontend/tests/list-item.spec.js` — existing click and DOM assertion conventions
    - `frontend/playwright.config.js` — test runner configuration
    - `frontend/src/components/primitives/Button.jsx` — element contract under test
    - `frontend/src/components/primitives/IconButton.jsx` — element contract under test
    - `frontend/src/components/primitives/FAB.jsx` — element contract under test
    - `frontend/src/App.jsx` — single-header shell contract
    - `frontend/src/components/composites/Sidebar.jsx` — theme/logout contract
  </read_first>
  <action>Create a focused Playwright regression spec for D-BUG-01/D-BUG-02 using the existing fixture-page pattern, without requiring backend credentials. Mount/import the real Button, IconButton, FAB, Ripple, and Sidebar/PcLayout-relevant output rather than duplicating their implementation. For each primitive, use Playwright's real mouse click and keyboard Tab+Enter and assert the handler counter increments once per activation; assert a `.ripple-span` is created under the button on pointer down. Add a wrapper-mode case proving an external Ripple child remains clickable. Add shell assertions proving a representative authenticated layout has exactly one `<header>` and that clicking the Sidebar theme control toggles `document.documentElement.dataset.theme`; keep logout verification isolated from actual authentication by stubbing the existing context/navigation seam in the fixture. Do not replace this with `HTMLElement.click()` because the regression is browser hit-testing.</action>
  <acceptance_criteria>
    - `frontend/tests/phase12-bugfix.spec.js` exists and imports/tests real production primitives.
    - The spec contains mouse-click assertions for Button, IconButton, and FAB, keyboard Enter assertions, and a `.ripple-span` assertion.
    - The spec contains an external/default Ripple wrapper click assertion.
    - The spec asserts `document.querySelectorAll('header').length` equals 1.
    - The spec asserts the Sidebar theme action changes `data-theme` and that logout remains callable.
    - `npm exec playwright test -- phase12-bugfix.spec.js --reporter=line` exits 0.
  </acceptance_criteria>
  <verify>
    <automated>npm exec playwright test -- phase12-bugfix.spec.js --reporter=line</automated>
  </verify>
  <done>Automated browser coverage reproduces and prevents the mouse-hit-testing and duplicate-header regressions before Wave 2 begins.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser pointer/keyboard → primitive event handlers | Untrusted browser input crosses Ripple and native button event paths. |
| Authenticated shell → theme/logout controls | Shell actions can alter local UI state or terminate the current session. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-12-00-01 | Denial of Service | `Ripple.jsx` / Button primitives | mitigate | Remove self-mode wrapper hit-testing trap, preserve native button click/keyboard paths, and run Playwright mouse tests. |
| T-12-00-02 | Tampering | `App.jsx` Header composition | mitigate | Assert exactly one Header in browser DOM while preserving page-level Header consumers. |
| T-12-00-03 | Elevation of Privilege | Sidebar logout/theme actions | accept | Actions reuse existing authenticated context and local theme utility; no role/auth boundary changes. |
| T-12-00-SC | Tampering | npm/pip/cargo installs | accept | This plan installs no packages. |
</threat_model>

<verification>
- From `frontend/`: `npm exec playwright test -- phase12-bugfix.spec.js --reporter=line` passes.
- From `frontend/`: `npm run build` exits 0.
- `rg -n '&lt;Header /&gt;|import Header' frontend/src/App.jsx` returns no lines.
- `rg -n 'Ripple mode="self"' frontend/src/components/primitives/{Button,IconButton,FAB}.jsx` returns one line per file.
- `git diff --name-only -- backend` returns no paths.
</verification>

<success_criteria>
- Mouse/touch and keyboard activation work for Button, IconButton, and FAB without duplicate callbacks.
- Default Ripple wrappers remain compatible with composite consumers.
- Exactly one page-level Header is rendered per authenticated page.
- Theme toggle and logout are both accessible from the Sidebar footer, theme first.
- Browser regression tests and production build pass; backend remains untouched.
</success_criteria>

<output>
Create `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-00-BUGFIX-SUMMARY.md` when done.
</output>
