---
phase: 12-page-level-refactor-8dp-grid-human-uat
plan: 01B
type: execute
wave: 2
depends_on:
  - 12-00-BUGFIX
files_modified:
  - frontend/src/css/styles.css
  - frontend/src/components/primitives/Button.css
  - frontend/src/components/primitives/Ripple.jsx
  - frontend/src/components/primitives/Icon.jsx
  - frontend/src/components/EmptyState.jsx
  - frontend/src/utils/index.js
  - frontend/src/contexts/ToastContext.jsx
  - frontend/tests/snackbar.spec.js
  - frontend/src/components/PasswordInput.jsx
  - frontend/src/components/CreateLinkModal.jsx
  - frontend/src/components/DishCard.jsx
  - frontend/src/components/InvitationsModal.jsx
  - frontend/src/components/WishAdvanceModal.jsx
  - frontend/src/components/ChefSelectModal.jsx
  - frontend/src/components/GuestDishCard.jsx
  - frontend/src/components/InvitationsSection.jsx
  - frontend/src/pages/UserHomePage.jsx
  - frontend/src/pages/GuestOrderPage.jsx
  - frontend/src/pages/AdminStatsPage.jsx
  - frontend/src/pages/AdminChefsPage.jsx
  - frontend/src/pages/DishDetailPage.jsx
  - frontend/src/pages/AdminHomePage.jsx
  - frontend/src/pages/AdminLogsPage.jsx
  - frontend/src/pages/ForceChangePasswordPage.jsx
  - frontend/src/pages/UserProfilePage.jsx
  - frontend/src/pages/ChefOrdersPage.jsx
  - frontend/src/pages/UserOrdersPage.jsx
  - frontend/src/pages/LoginPage.jsx
  - frontend/src/pages/AdminDishesPage.jsx
  - frontend/src/pages/ChefDishesPage.jsx
  - frontend/src/pages/ChefWishesPage.jsx
  - frontend/src/pages/UserFavoritesPage.jsx
  - frontend/src/pages/OrderPage.jsx
  - frontend/src/pages/AdminCategoriesPage.jsx
  - frontend/src/pages/UserWishesPage.jsx
  - frontend/src/pages/AdminIngredientsPage.jsx
  - frontend/src/pages/PreferencesPage.jsx
  - frontend/src/pages/AdminUsersPage.jsx
autonomous: true
requirements:
  - UX-01
  - UX-02
  - TOKEN-13
  - LOGIC-01
  - LOGIC-02
  - LOGIC-03
must_haves:
  truths:
    - "D-MOTION-01: The five measured motion consumers use --md-motion duration/easing tokens, with linear spinner easing and documented stagger/reduced-motion exceptions preserved."
    - "D-EMOJI-01: All 106 measured pictographic emoji clusters are represented through the Icon registry; only approved structural glyphs remain text."
    - "D-EMOJI-01: EmptyState accepts an Icon-name string or ReactNode, defaults to mail, and all callers remain render-compatible."
    - "D-SNACK-01: showToast accepts both the legacy string tone and the object action/duration form; a 48dp action Button renders before close without breaking queue or timer behavior."
    - "LOGIC-01..03: Motion/Icon/Snackbar edits preserve requests, state machines, callbacks, routes, exports, auth, and all backend code."
  artifacts:
    - path: "frontend/src/components/primitives/Icon.jsx"
      provides: "Material Symbols registry extended with new-label, ramen-dining, and circle"
      contains: "new-label"
    - path: "frontend/src/components/EmptyState.jsx"
      provides: "String-or-ReactNode Icon contract"
      contains: "typeof icon === 'string'"
    - path: "frontend/src/contexts/ToastContext.jsx"
      provides: "Backward-compatible actionable Snackbar API"
      contains: "action"
    - path: "frontend/tests/snackbar.spec.js"
      provides: "Browser behavior coverage for action, queue, and timers"
  key_links:
    - from: "frontend/src/components/EmptyState.jsx"
      to: "frontend/src/components/primitives/Icon.jsx"
      via: "string Icon-name rendering"
      pattern: "Icon name=\\{icon\\}"
    - from: "frontend/src/pages/**/*.jsx"
      to: "frontend/src/components/primitives/Icon.jsx"
      via: "Icon imports and registered names replacing emoji"
      pattern: "<Icon"
    - from: "frontend/src/contexts/ToastContext.jsx"
      to: "legacy showToast callers"
      via: "string-or-options overload"
      pattern: "typeof options === 'string'"
    - from: "frontend/src/contexts/ToastContext.jsx"
      to: "action callbacks"
      via: "Snackbar action Button before close"
      pattern: "md-snackbar__action"
---

<objective>
Complete the motion, Icon/emoji, EmptyState, and actionable-Snackbar lane of Phase 12 without carrying the 8dp/radius enforcement sweep in the same execution prompt.

Purpose: Deliver D-MOTION-01, D-EMOJI-01, and D-SNACK-01 while preserving UX-01/UX-02/TOKEN-13 and LOGIC-01..03 across every migrated caller.
Output: Five tokenized motion consumers, three new Icon registry keys, an emoji-free page/component layer, the `string | ReactNode` EmptyState API, and a tested backward-compatible `showToast` action overload.

Split log (2026-07-28): This plan is the second half of the checker-directed D-PLAN-01 execution split. Product scope remains unchanged; only the former overloaded 12-01 prompt became 12-01A and 12-01B. Both depend only on 12-00-BUGFIX and form Wave 2 parallel lanes; 12-02 waits for both summaries. In files also listed by 12-01A, this plan owns motion declarations, Icon imports/rendering, emoji literals, and Snackbar logic only. Do not edit spacing/radius declarations or reformat neighboring source so line-disjoint commits combine cleanly.
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
@.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-00-BUGFIX-SUMMARY.md
@.planning/phases/08-md3-design-token-foundation/08-CONTEXT.md
@.planning/phases/09-motion-state-layers/09-CONTEXT.md
@.planning/phases/10-primitive-components/10-CONTEXT.md
@.planning/phases/11-composite-navigation-components/11-CONTEXT.md
@.planning/phases/11-composite-navigation-components/11-03-SUMMARY.md
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Tokenize five motion consumers and extend Snackbar with actions</name>
  <files>frontend/src/components/primitives/Ripple.jsx, frontend/src/contexts/ToastContext.jsx, frontend/src/css/styles.css, frontend/src/components/primitives/Button.css, frontend/tests/snackbar.spec.js, frontend/src/components/InvitationsSection.jsx, frontend/src/pages/OrderPage.jsx, frontend/src/pages/UserWishesPage.jsx</files>
  <read_first>
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-CONTEXT.md` — D-MOTION-01, D-SNACK-01, D-PLAN-01, and LOGIC-01..03
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-RESEARCH.md` — §5 five-consumer table and §10 exact overload/action design
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-UI-SPEC.md` — Motion Contract and Snackbar action contract
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-PATTERNS.md` — Patterns 8–10, S1, and S4
    - `frontend/src/css/tokens.css` — exact short/medium/long and standard/emphasized token names
    - `frontend/src/components/primitives/Ripple.jsx` — Wave 1 self-mode result and transform/fade transition
    - `frontend/src/contexts/ToastContext.jsx` — queue, tone normalization, remaining-time records, rendering, and cleanup
    - `frontend/src/css/styles.css` — fadeInUp and global loading spinner consumers; spacing lines are owned by 12-01A
    - `frontend/src/components/primitives/Button.css` — button spinner and reduced-motion fallback
    - `frontend/tests/snackbar.spec.js` — existing browser fixture and timer/queue assertions
    - `frontend/src/components/InvitationsSection.jsx` — existing invitation URL and copy helper
    - `frontend/src/pages/OrderPage.jsx` — created-order result and existing detail navigation path
    - `frontend/src/pages/UserWishesPage.jsx` — createWish response and existing cancelWish semantics
  </read_first>
  <behavior>
    - Legacy `showToast(message, 'success|warn|error|info')` calls produce the same normalized tones and default durations.
    - Object-form `showToast(message, { type, duration, action })` stores the custom duration and renders one action before close.
    - Clicking the action invokes its callback exactly once, dismisses only that Snackbar, and leaves other queue timers intact.
    - Hover pause/resume still uses remaining time, eviction clears removed timers, and provider unmount clears all timers.
    - Ripple expansion/fade, Snackbar entrance, fadeInUp, global spinner, and Button spinner consume the declared motion-duration tokens; continuous spinners retain linear easing.
  </behavior>
  <action>Implement D-MOTION-01 at all five measured consumers. Keep the Ripple transform/fade on `--md-motion-duration-long`/`short` with emphasized/standard easing after the Wave 1 self-mode change; change Snackbar entrance to `--md-motion-duration-medium` plus standard easing; change styles.css fadeInUp to `--md-motion-duration-long` plus emphasized easing; and change both global and Button spinner periods to `--md-motion-duration-long` while retaining `linear infinite`. Preserve the explicit stagger delays, reduced-motion `0.01ms` sentinels, and Button's 6s reduced-motion fallback with comments that make the exceptions recognizable to check:md3. In `styles.css` and `Button.css`, edit only motion declarations—12-01A owns spacing/radius lines.

Implement D-SNACK-01 in `ToastContext.jsx` with exact public signature `showToast(message, options = 'success')`. Treat a string as the legacy tone and an object as `{ type = 'success', duration, action: { label, onClick } }`; normalize unknown tones through the existing tone table and select custom duration with nullish semantics so an explicit value is not discarded. Store validated action data on the item, preserve MAX_VISIBLE/newest-first queue behavior and all pause/resume/eviction/unmount cleanup, and render a 48dp `<Button variant="text" className="md-snackbar__action">` between message and close. Use inverse-primary text/state styling appropriate to the inverse-surface Snackbar. Invoke the callback once and dismiss only that item without resetting sibling timers; prevent an action failure from becoming an unhandled browser rejection.

Wire real D-SNACK-01 examples using existing capabilities rather than inventing a business reversal: after wish creation, use the returned wish id with the existing cancelWish API for a `撤销` action and refresh the list on completion; after order creation, expose `查看详情` only when the response supplies the existing detail-route id; after invitation creation, expose `复制` using the existing generated URL/copy helper. Preserve all existing string-form callers. Extend `snackbar.spec.js` first to cover legacy compatibility, custom duration, action ordering/callback/dismissal, sibling timer isolation, and callback failure handling, then make the implementation pass.</action>
  <acceptance_criteria>
    - The five measured consumers contain MD3 duration tokens; only documented stagger/reduced-motion values remain raw, and spinner easing remains `linear`.
    - `ToastContext.jsx` contains `showToast(message, options = 'success')`, a `typeof options === 'string'` branch, normalized type/duration/action data, and `.md-snackbar__action` before close.
    - The action is a text Button with at least a 48dp target and inverse-primary styling.
    - Wish undo, order detail, and invitation copy examples use existing ids/routes/helpers and do not change API contracts.
    - Existing string-form callers remain untouched and source-compatible.
    - Snackbar Playwright tests cover action behavior plus pre-existing queue/timer behavior and pass.
    - Production build exits 0 with no backend change.
  </acceptance_criteria>
  <verify>
    <automated>npm exec playwright test -- snackbar.spec.js --reporter=line &amp;&amp; npm run build</automated>
  </verify>
  <done>All five motion residues consume MD3 tokens and actionable Snackbars work through an additive, timer-safe overload while legacy callers remain behaviorally identical.</done>
</task>

<task type="auto">
  <name>Task 2: Extend the Icon/EmptyState contracts and migrate component emoji</name>
  <files>frontend/src/components/primitives/Icon.jsx, frontend/src/components/EmptyState.jsx, frontend/src/utils/index.js, frontend/src/components/PasswordInput.jsx, frontend/src/components/CreateLinkModal.jsx, frontend/src/components/DishCard.jsx, frontend/src/components/InvitationsModal.jsx, frontend/src/components/WishAdvanceModal.jsx, frontend/src/components/ChefSelectModal.jsx, frontend/src/components/GuestDishCard.jsx, frontend/src/components/InvitationsSection.jsx</files>
  <read_first>
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-CONTEXT.md` — D-EMOJI-01, D-PLAN-01, and LOGIC-01..03
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-RESEARCH.md` — §6 measured mappings, three verified additions, EmptyState contract, and 106-cluster baseline
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-UI-SPEC.md` — Iconography Contract and allowed structural glyphs
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-PATTERNS.md` — Patterns 5–7, 15–16, and S5
    - `frontend/src/components/primitives/Icon.jsx` — current 0.13.0 import aliases and ICONS registry
    - `frontend/src/components/EmptyState.jsx` — current emoji default and rendered prop
    - `frontend/src/utils/index.js` — `emptyState()` default/return shape; status and theme business utilities must remain stable
    - `frontend/src/components/DishCard.jsx` — fallback-image emoji pattern
    - `frontend/src/components/GuestDishCard.jsx` — guest fallback-image emoji pattern
    - `frontend/src/components/WishAdvanceModal.jsx` — multiple EmptyState/icon call patterns
    - `frontend/src/components/PasswordInput.jsx` — visibility emoji toggle targeted for Icon use
  </read_first>
  <action>Implement D-EMOJI-01's shared contract first. Extend the existing `@material-symbols-svg/react@0.13.0` registry with exactly the three verified additions `new-label`, `ramen-dining`, and `circle`, preserving all established version-specific aliases and dev-only unknown-name warning behavior. Verify the package exports before importing; do not add another icon package. Reuse existing registered names such as set-meal, inventory-2, mail, shopping-cart, mood-bad, visibility, visibility-off, eco, chef, folder, search, favorite, and content-copy.

Change EmptyState to default `icon = 'mail'`, render a string as `<Icon name={icon} size={48} />`, and render a non-string ReactNode unchanged. Change `emptyState()`'s default from emoji to the `mail` Icon name while keeping its `{ icon, text }` return shape. Migrate every component-level emoji hit in the listed files through `<Icon>` or an Icon-name string, including image fallbacks, password visibility, modal/empty states, and invitation actions. Apply the RESEARCH §6 semantic map, not visual guesswork. Keep `✕`, `▼`, `▲`, `›`, `·`, `•`, and `…` as structural characters; do not convert user-authored content or Chinese copy. In files shared with Task 1 or 12-01A, alter only Icon imports/rendering and the EmptyState API—do not change spacing, motion, callbacks, requests, or state.</action>
  <acceptance_criteria>
    - `Icon.jsx` registers `new-label`, `ramen-dining`, and `circle` from verified existing package exports, with no new dependency and no broken alias.
    - `EmptyState.jsx` defaults to `mail`, branches on `typeof icon === 'string'`, renders string names through Icon at 48px, and passes ReactNode values through unchanged.
    - `emptyState()` defaults to `mail` and retains the same return object shape.
    - The listed component files contain no Extended_Pictographic source characters after migration; approved structural glyphs and user content remain intact.
    - Every migrated Icon name is present in the registry, so dev mode emits no unknown-name warning.
    - Production build exits 0.
  </acceptance_criteria>
  <verify>
    <automated>npm run build &amp;&amp; test -z "$(rg -lP --glob '*.jsx' '\p{Extended_Pictographic}' src/components src/utils || true)"</automated>
  </verify>
  <done>The reusable Icon and EmptyState contracts are emoji-free and component callers render registered Material Symbols without changing domain behavior.</done>
</task>

<task type="auto">
  <name>Task 3: Replace all page-level pictographic emoji with registered Icons</name>
  <files>frontend/src/pages/UserHomePage.jsx, frontend/src/pages/GuestOrderPage.jsx, frontend/src/pages/AdminStatsPage.jsx, frontend/src/pages/AdminChefsPage.jsx, frontend/src/pages/DishDetailPage.jsx, frontend/src/pages/AdminHomePage.jsx, frontend/src/pages/AdminLogsPage.jsx, frontend/src/pages/ForceChangePasswordPage.jsx, frontend/src/pages/UserProfilePage.jsx, frontend/src/pages/ChefOrdersPage.jsx, frontend/src/pages/UserOrdersPage.jsx, frontend/src/pages/LoginPage.jsx, frontend/src/pages/AdminDishesPage.jsx, frontend/src/pages/ChefDishesPage.jsx, frontend/src/pages/ChefWishesPage.jsx, frontend/src/pages/UserFavoritesPage.jsx, frontend/src/pages/OrderPage.jsx, frontend/src/pages/AdminCategoriesPage.jsx, frontend/src/pages/UserWishesPage.jsx, frontend/src/pages/AdminIngredientsPage.jsx, frontend/src/pages/PreferencesPage.jsx, frontend/src/pages/AdminUsersPage.jsx</files>
  <read_first>
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-CONTEXT.md` — D-EMOJI-01, D-PLAN-01, D-UAT-01, and LOGIC-01..03
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-RESEARCH.md` — §6 106-cluster/31-file inventory and exact semantic mapping table
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-UI-SPEC.md` — Iconography Contract and six-flow visual touchpoints
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-PATTERNS.md` — Pattern 16 high-volume files and S5 Icon convention
    - `frontend/src/components/primitives/Icon.jsx` — registry after Task 2; this is the only allowed name source
    - `frontend/src/pages/DishDetailPage.jsx` — 11-cluster high-volume ingredient/category pattern
    - `frontend/src/pages/AdminHomePage.jsx` — 9-cluster dashboard pattern
    - `frontend/src/pages/AdminStatsPage.jsx` — 9-cluster statistics pattern
    - `frontend/src/pages/AdminDishesPage.jsx` — 8-cluster CRUD/form pattern
    - `frontend/src/pages/ChefDishesPage.jsx` — 8-cluster mirrored chef pattern
    - `frontend/src/pages/GuestOrderPage.jsx` — 7-cluster mobile guest pattern
    - `frontend/src/pages/UserHomePage.jsx` — data-driven menu Icon-name rendering pattern
  </read_first>
  <action>Complete D-EMOJI-01 with a grep-driven page sweep. Run the Extended_Pictographic inventory before editing and record its current cluster/file count; the research baseline is 106 clusters across 31 total page/component files, but every current hit must be migrated even if the count changed. Replace page-owned pictographic literals with registered Icon names and `<Icon>` rendering using the exact semantic map: food/dish→set-meal or ramen-dining; clipboard/package→inventory-2; chef→chef; empty inbox→mail; vegetable/fruit→eco; cart→shopping-cart; warnings/errors/status/action symbols→their named registry entries. Convert data arrays from emoji values to Icon-name strings and update their renderer rather than embedding SVG paths. Preserve structural `✕`, `▼`, `▲`, `›`, `·`, `•`, and `…` characters and all user-authored data.

Keep this parallel lane line-disjoint from 12-01A: do not edit padding/margin/gap/radius values in these files, even when the same JSX line contains one; make the Icon substitution narrowly and leave spacing to A. Preserve every callback, request, response handling branch, state update, route, form field, role/auth condition, accessibility label, and export per LOGIC-01/03. No backend file may change per LOGIC-02.</action>
  <acceptance_criteria>
    - Extended_Pictographic scanning across `frontend/src/pages` and `frontend/src/components` returns zero source files after Tasks 2–3.
    - All 106 research-baseline clusters, plus any current delta, are accounted for in the summary; no page is silently omitted.
    - Every `<Icon name>` or data-driven Icon name resolves in the central registry with no dev unknown-name warning.
    - Structural characters remain text, and Chinese copy/user data is unchanged.
    - No page callback, request, state transition, route, auth condition, field, or export changes.
    - Production build and Snackbar browser tests still pass; backend diff remains empty.
  </acceptance_criteria>
  <verify>
    <automated>npm run build &amp;&amp; npm exec playwright test -- snackbar.spec.js --reporter=line &amp;&amp; test -z "$(rg -lP --glob '*.jsx' '\p{Extended_Pictographic}' src/pages src/components || true)"</automated>
  </verify>
  <done>The complete current page/component source is free of pictographic emoji, all replacements resolve through the central Icon registry, and business/auth/data behavior is unchanged.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| High-volume JSX edits → production bundle | Icon substitutions can accidentally disturb callbacks, props, conditionals, or imports in business pages. |
| Snackbar action callback → existing application capability | A UI feedback control invokes caller-supplied navigation, clipboard, or API behavior. |
| Timer/queue state → browser lifecycle | Action dismissal and custom durations interact with hover pause, queue eviction, and provider unmount. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-12-01B-01 | Tampering | 106-cluster emoji migration | mitigate | Exact before/after inventory, central registered-name map, narrow Icon-only edits, build, and dev unknown-name checks. |
| T-12-01B-02 | Denial of Service | Snackbar action/timers | mitigate | Browser tests assert one-shot callback, selected-item dismissal, sibling timer isolation, pause/resume, eviction, and unmount cleanup. |
| T-12-01B-03 | Elevation of Privilege | Caller-provided Snackbar action | accept | Actions invoke only capabilities already exposed to that authenticated caller; no new route, API, role, or permission path is created. |
| T-12-01B-04 | Information Disclosure | Snackbar message/action data | mitigate | Store only display label and callback in in-memory queue; do not serialize tokens, invitation secrets, or response payloads. |
| T-12-01B-SC | Tampering | npm/pip/cargo installs | accept | This plan installs no package and reuses the committed Material Symbols and Playwright dependencies. |
</threat_model>

<verification>
- From `frontend/`, `npm exec playwright test -- snackbar.spec.js --reporter=line` exits 0.
- From `frontend/`, `npm run build` exits 0.
- The five measured motion consumers reference `--md-motion-duration-*`; raw values remain only in documented exceptions.
- Extended_Pictographic scanning over pages/components returns zero files, while structural glyphs remain.
- EmptyState string and ReactNode forms both render; all Icon names resolve without warnings.
- Legacy and object-form showToast paths both pass browser tests.
- After 12-01A is combined, `npm run check:md3` exits 0; 12-02 re-runs the combined gate.
- `git diff --name-only -- backend` returns no paths.
</verification>

<success_criteria>
- All five design motion consumers use MD3 duration/easing tokens with mechanical/accessibility exceptions intact.
- All current pictographic emoji source is replaced by registered Material Symbols; EmptyState supports string or ReactNode.
- Snackbar action, custom duration, legacy calls, queue ordering, and timer cleanup are browser-tested and compatible.
- No business logic, API/auth behavior, route, export, or backend file changes.
- The lane is ready to combine with 12-01A for the full check:md3 gate and Wave 3 audit.
</success_criteria>

<output>
Create `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-01B-SUMMARY.md` when done.
</output>
