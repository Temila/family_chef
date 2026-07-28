---
phase: 12-page-level-refactor-8dp-grid-human-uat
plan: 01A
type: execute
wave: 2
depends_on:
  - 12-00-BUGFIX
files_modified:
  - frontend/package.json
  - frontend/package-lock.json
  - frontend/.stylelintrc.json
  - frontend/scripts/check-m3-tokens.sh
  - frontend/src/index.css
  - frontend/src/css/styles.css
  - frontend/src/components/primitives/Badge.css
  - frontend/src/components/primitives/Button.css
  - frontend/src/components/primitives/Card.css
  - frontend/src/components/primitives/Chip.css
  - frontend/src/components/primitives/FAB.css
  - frontend/src/components/primitives/IconButton.css
  - frontend/src/components/primitives/Input.css
  - frontend/src/components/composites/BottomBar.css
  - frontend/src/components/composites/Divider.css
  - frontend/src/components/composites/Header.css
  - frontend/src/components/composites/ListItem.css
  - frontend/src/components/composites/Modal.css
  - frontend/src/components/composites/Sidebar.css
  - frontend/src/contexts/ToastContext.jsx
  - frontend/src/pages/AdminCategoriesPage.jsx
  - frontend/src/pages/AdminChefsPage.jsx
  - frontend/src/pages/AdminDishesPage.jsx
  - frontend/src/pages/AdminHomePage.jsx
  - frontend/src/pages/AdminIngredientsPage.jsx
  - frontend/src/pages/AdminLogsPage.jsx
  - frontend/src/pages/AdminStatsPage.jsx
  - frontend/src/pages/AdminUsersPage.jsx
  - frontend/src/pages/ChefDishesPage.jsx
  - frontend/src/pages/ChefOrdersPage.jsx
  - frontend/src/pages/ChefWishesPage.jsx
  - frontend/src/pages/DishDetailPage.jsx
  - frontend/src/pages/ForceChangePasswordPage.jsx
  - frontend/src/pages/GuestOrderPage.jsx
  - frontend/src/pages/LoginPage.jsx
  - frontend/src/pages/OrderDetailPage.jsx
  - frontend/src/pages/OrderPage.jsx
  - frontend/src/pages/PreferencesPage.jsx
  - frontend/src/pages/UserFavoritesPage.jsx
  - frontend/src/pages/UserHomePage.jsx
  - frontend/src/pages/UserOrdersPage.jsx
  - frontend/src/pages/UserProfilePage.jsx
  - frontend/src/pages/UserWishesPage.jsx
  - frontend/src/components/ChefSelectModal.jsx
  - frontend/src/components/CreateLinkModal.jsx
  - frontend/src/components/DishCard.jsx
  - frontend/src/components/EmptyState.jsx
  - frontend/src/components/GuestDishCard.jsx
  - frontend/src/components/InvitationsSection.jsx
  - frontend/src/components/WishAdvanceModal.jsx
  - frontend/src/components/WishCard.jsx
  - frontend/src/components/WishFormModal.jsx
autonomous: false
requirements:
  - UX-01
  - UX-02
  - TOKEN-13
  - LOGIC-01
  - LOGIC-02
  - LOGIC-03
must_haves:
  truths:
    - "D-GRID-01/D-GRID-02: Every current padding, margin, and gap candidate is manually classified and actual spacing is expressed through --md-spacing-1..8 or the documented non-spacing/nav-height exception."
    - "D-GRID-03/D-FILE-02: A path-independent check:md3 script rejects new spacing, radius, motion, and pictographic-emoji regressions."
    - "D-RADIUS-01/D-FILE-01: Login inputs render through the Input radius contract, the two measured navigation-pill residues use --md-radius-md, and stylelint blocks numeric corner regressions."
    - "LOGIC-01..03: The spacing/radius sweep changes presentation values only; callbacks, requests, state, routes, exports, auth, and backend code remain unchanged."
  artifacts:
    - path: "frontend/.stylelintrc.json"
      provides: "Numeric border-radius policy for all production CSS"
      contains: "declaration-property-value-allowed-list"
    - path: "frontend/scripts/check-m3-tokens.sh"
      provides: "Path-independent MD3 source regression gate"
    - path: "frontend/src/css/styles.css"
      provides: "Tokenized shared spacing consumption"
    - path: "frontend/src/components/composites/Sidebar.css"
      provides: "Tokenized navigation indicator radius"
    - path: "frontend/src/components/composites/BottomBar.css"
      provides: "Tokenized navigation indicator radius"
  key_links:
    - from: "frontend/package.json"
      to: "frontend/.stylelintrc.json"
      via: "lint:css script"
      pattern: "lint:css"
    - from: "frontend/package.json"
      to: "frontend/scripts/check-m3-tokens.sh"
      via: "check:md3 script"
      pattern: "check:md3"
    - from: "frontend/src/**/*.css"
      to: "frontend/src/css/tokens.css"
      via: "var(--md-spacing-*) and var(--md-radius-*) consumers"
      pattern: "var\\(--md-(spacing|radius)-"
---

<objective>
Complete the spacing-and-shape lane of Phase 12: enforce the 8dp grid, close the final radius residues, and install durable stylelint plus source-regression gates.

Purpose: Deliver D-GRID-01..03, D-RADIUS-01, D-FILE-01, and D-FILE-02 without mixing the motion/Icon/Snackbar work into the same execution prompt, preserving UX-01/UX-02/TOKEN-13 and LOGIC-01..03.
Output: Tokenized spacing/radius consumers, `.stylelintrc.json`, updated package scripts/lockfile, and `frontend/scripts/check-m3-tokens.sh`.

Split log (2026-07-28): D-PLAN-01 originally locked three serial plans. The checker identified the former 12-01 Task 2 as a 46-file, 50–60% context-risk unit, so the same locked product scope is now represented by four plans: 12-00-BUGFIX → 12-01A + 12-01B → 12-02. This is an execution-quality decomposition only; no D-XX behavior is removed or re-decided. 12-01A and 12-01B are Wave 2 parallel lanes with narrow concern ownership: this plan changes spacing/radius declarations and enforcement, while 12-01B owns motion, emoji/Icon, EmptyState, and Snackbar behavior. Where a source file appears in both inventories, do not reformat it and edit only this plan's owned declarations so the line-disjoint commits merge cleanly.
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
</context>

<tasks>

<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Task 1: Verify the two assumed stylelint packages before installation</name>
  <files>None — blocking software-supply-chain gate before package.json or package-lock.json changes</files>
  <read_first>
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-RESEARCH.md` — §8 and §14 mark `stylelint` and `stylelint-config-standard` versions `[ASSUMED]`
    - `frontend/package.json` — current dependency and script baseline
    - `frontend/package-lock.json` — current lockfile baseline
  </read_first>
  <action>Before any npm install, run registry metadata checks for `stylelint` and `stylelint-config-standard`, then present the official `https://www.npmjs.com/package/stylelint` and `https://www.npmjs.com/package/stylelint-config-standard` pages for blocking human legitimacy confirmation. Confirm package names, official repository links, latest stable versions, and the config package's `peerDependencies.stylelint` range. The 2026-07-28 preflight returned stylelint 17.14.1 and stylelint-config-standard 40.0.0 with peer range `^17.0.0`; do not silently install RESEARCH's stale assumed 16/36 pair if current registry metadata still requires 17/40. This checkpoint is not auto-approvable. Stop on a package-name, repository, integrity, or peer-range mismatch.</action>
  <acceptance_criteria>
    - Registry output identifies exactly `stylelint` and `stylelint-config-standard`, with official GitHub repositories and integrity values.
    - The selected majors satisfy `stylelint-config-standard`'s declared stylelint peer range.
    - The human explicitly approves both npm package pages before Task 2 runs.
  </acceptance_criteria>
  <verify>
    <automated>npm view stylelint version name repository.url dist.integrity --json &amp;&amp; npm view stylelint-config-standard version name peerDependencies repository.url dist.integrity --json</automated>
    <human-check>Open both official npmjs.com package pages, confirm they correspond to the Stylelint organization/repositories and the displayed major versions are mutually compatible, then type `approved`.</human-check>
  </verify>
  <done>Both `[ASSUMED]` packages have explicit human legitimacy approval and a compatible version pair is recorded for the lockfile change.</done>
  <what-built>No package has been installed; this gate validates package identity before the supply-chain boundary is crossed.</what-built>
  <how-to-verify>
    1. Visit `https://www.npmjs.com/package/stylelint` and confirm the package links to `stylelint/stylelint`.
    2. Visit `https://www.npmjs.com/package/stylelint-config-standard` and confirm the package links to `stylelint/stylelint-config-standard`.
    3. Compare the displayed versions and peer dependency with the automated `npm view` output.
    4. Approve only when package identity and compatibility match.
  </how-to-verify>
  <resume-signal>Type `approved` to authorize installation, or provide the mismatched metadata.</resume-signal>
</task>

<task type="auto">
  <name>Task 2: Install radius enforcement, close measured corners, and create the MD3 source gate</name>
  <files>frontend/package.json, frontend/package-lock.json, frontend/.stylelintrc.json, frontend/scripts/check-m3-tokens.sh, frontend/src/components/composites/Sidebar.css, frontend/src/components/composites/BottomBar.css, frontend/src/pages/LoginPage.jsx</files>
  <read_first>
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-CONTEXT.md` — D-GRID-03, D-RADIUS-01, D-FILE-01, D-FILE-02, and D-PLAN-01
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-RESEARCH.md` — §4, §8, §9, §13, and package-version risk in §14
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-UI-SPEC.md` — Shape Contract and Enforcement Layer
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-PATTERNS.md` — Patterns 11–13 and S1
    - `frontend/package.json` — scripts/dependencies before the approved install
    - `frontend/package-lock.json` — lockfile format; never edit manually
    - `scripts/check-tokens.sh` — Phase 8 checks #1–7 and path-independent `fail/check/TOTAL/FAILURES` structure
    - `frontend/src/css/tokens.css` — allowed spacing, radius, and motion token names
    - `frontend/src/components/composites/Sidebar.css` — measured active-pill `border-radius: 16px`
    - `frontend/src/components/composites/BottomBar.css` — measured active-pill `border-radius: 16px`
    - `frontend/src/pages/LoginPage.jsx` — reported login-corner location; verify current Input consumer rather than assuming stale source
    - `frontend/src/components/primitives/Input.css` — Input radius contract used by LoginPage
  </read_first>
  <action>After Task 1 approval, implement D-RADIUS-01 and D-FILE-01 by installing the registry-confirmed compatible stable pair with `npm install --save-dev stylelint@^17 stylelint-config-standard@^40` when the preflight versions/peer range remain current; otherwise use the exact approved compatible majors recorded by Task 1. Let npm update both package files and never hand-edit the lockfile. Create `frontend/.stylelintrc.json` extending `stylelint-config-standard`, disable only project-incompatible naming rules such as `selector-class-pattern` and `custom-property-pattern`, and set `declaration-property-value-allowed-list` for `border-radius` plus directional corner-radius properties to permit only `var(--md-radius-...)`, `0`, `50%`, `9999px`, `inherit`, or `unset`. Ignore only node_modules/dist, not production CSS. Add `lint:css` as `stylelint "src/**/*.css"`.

Complete the D-RADIUS-01 source sweep in the same task: replace Sidebar.css and BottomBar.css active-indicator `16px` values with `var(--md-radius-md)`. Inspect LoginPage and its Input primitive; if LoginPage still uses the measured Input path and no numeric radius exists, record that verification and do not fabricate a visual change. If a current numeric login corner is present, replace it with the correct existing MD3 radius token without changing field behavior.

Implement D-GRID-03/D-FILE-02 by creating executable `frontend/scripts/check-m3-tokens.sh`. Resolve the frontend directory from the script's own location so it runs from repository root or `frontend/`. Preserve Phase 8 checks #1–7, extend radius checks across all CSS/JSX, add spacing checks for CSS declarations and JSX inline styles, add motion checks with only the documented stagger/reduced-motion/mechanical-spinner exceptions, and add an Extended_Pictographic check across pages/components with no EmptyState exclusion after Wave 2 is combined. Capture zero-match commands with `|| true`, scan production source rather than planning prose/comments, and do not use broad numeric exclusions that would let arbitrary 1–4px padding or gap pass. Add `check:md3` and `check:all` (`lint:css &amp;&amp; check:md3 &amp;&amp; build`) while retaining `check:tokens` compatibility. Because 12-01B runs as the parallel motion/emoji lane, syntax-check the full script now and reserve the default all-checks green assertion for the combined Wave 3 gate; this task must still make the radius and path-resolution portions independently testable.</action>
  <acceptance_criteria>
    - `package.json`/lockfile contain the human-approved compatible stylelint pair and no unapproved package.
    - `.stylelintrc.json` restricts all corner-radius properties to MD3 tokens plus the exact allowed exceptions and ignores no production file.
    - Sidebar.css and BottomBar.css contain no `border-radius: 16px`; both active pills use `var(--md-radius-md)`.
    - LoginPage is verified to render inputs through the Input primitive at `var(--md-radius-sm)`, or any current numeric residue is migrated without changing form behavior.
    - `frontend/scripts/check-m3-tokens.sh` is executable, path-independent, preserves checks #1–7, and includes labeled all-source radius, spacing, motion, and emoji checks.
    - `package.json` contains `lint:css`, `check:md3`, and `check:all` while retaining `check:tokens`.
    - `npm run lint:css`, shell syntax validation, and the production build exit 0.
  </acceptance_criteria>
  <verify>
    <automated>npm run lint:css &amp;&amp; bash -n scripts/check-m3-tokens.sh &amp;&amp; npm run build</automated>
  </verify>
  <done>Numeric corner regressions are blocked by stylelint and the source gate is ready to validate the combined spacing/radius/motion/emoji result after both Wave 2 lanes land.</done>
</task>

<task type="auto">
  <name>Task 3: Manually classify and migrate the complete 8dp spacing inventory</name>
  <files>frontend/src/css/styles.css, frontend/src/components/composites/Header.css, frontend/src/components/composites/ListItem.css, frontend/src/components/composites/Modal.css, frontend/src/components/primitives/Button.css, frontend/src/components/primitives/FAB.css, frontend/src/pages/AdminDishesPage.jsx, frontend/src/pages/AdminCategoriesPage.jsx, frontend/src/pages/AdminChefsPage.jsx, frontend/src/pages/AdminHomePage.jsx, frontend/src/pages/AdminIngredientsPage.jsx, frontend/src/pages/AdminStatsPage.jsx, frontend/src/pages/ChefDishesPage.jsx, frontend/src/pages/ChefOrdersPage.jsx, frontend/src/pages/DishDetailPage.jsx, frontend/src/pages/ForceChangePasswordPage.jsx, frontend/src/pages/GuestOrderPage.jsx, frontend/src/pages/LoginPage.jsx, frontend/src/pages/OrderDetailPage.jsx, frontend/src/pages/OrderPage.jsx, frontend/src/pages/PreferencesPage.jsx, frontend/src/pages/UserFavoritesPage.jsx, frontend/src/pages/UserHomePage.jsx, frontend/src/pages/UserOrdersPage.jsx, frontend/src/pages/UserProfilePage.jsx, frontend/src/pages/UserWishesPage.jsx, frontend/src/components/DishCard.jsx, frontend/src/components/WishCard.jsx</files>
  <read_first>
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-CONTEXT.md` — D-GRID-01, D-GRID-02, D-GRID-03, D-PLAN-01, and LOGIC-01..03
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-RESEARCH.md` — §3 measured 242-declaration/28-file baseline, top-file counts, rounding map, and documented exceptions
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-UI-SPEC.md` — Spacing Contract, responsive gutters, layout contract, and safe-area rules
    - `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-PATTERNS.md` — Pattern 9, Pattern 16, S1, and cross-cutting constraints
    - `frontend/src/css/tokens.css` — exact `--md-spacing-1..8` values and `--md-nav-height`
    - `frontend/src/css/styles.css` — 123-declaration concentration and shared layout rules
    - `frontend/src/components/composites/Header.css` — 11 measured declarations
    - `frontend/src/components/composites/ListItem.css` — 10 measured declarations
    - `frontend/src/components/composites/Modal.css` — 7 measured declarations
    - `frontend/src/pages/AdminDishesPage.jsx` — high-volume inline-style pattern
    - `frontend/src/pages/ChefDishesPage.jsx` — mirrored high-volume inline-style pattern
    - `frontend/src/pages/OrderPage.jsx` — order flow and safe-area-sensitive spacing
    - `frontend/src/pages/GuestOrderPage.jsx` — mobile guest flow spacing
  </read_first>
  <action>Implement D-GRID-01 and D-GRID-02 as a grep-driven manual classification, not a codemod. First run the exact CSS/JSX spacing scan from RESEARCH §3 and save its file/hit counts in the execution summary. Treat 242 declarations across 28 files as the research baseline, not a stopping count: if current source emits a different count, classify every current hit and record the delta. For actual spacing properties, apply the locked map exactly: 4→spacing-1; 6→spacing-1; 8/9/10→spacing-2; 12→spacing-3; 14/16/18→spacing-4; 20/24→spacing-5; 32/36→spacing-6; 40→spacing-7; 56/60→spacing-8. Convert each side of multi-value declarations and JSX strings independently.

Keep only property-specific non-spacing exceptions: 1px borders/dividers, 2px/4px focus offsets, 3px spinner borders, zero, documented stagger/reduced-motion values, and navigation safe areas expressed through `var(--md-nav-height)` or token arithmetic. Replace `.btn-search` padding with `var(--md-spacing-1) var(--md-spacing-2)`, convert `.pc-main`/page safe areas from raw 80px to `var(--md-nav-height)` where they represent the Navigation Bar, and express search-icon insets such as 44px through an explicit token/icon composition rather than truncating them blindly. Do not broaden stylelint beyond radius; D-GRID-03 owns spacing enforcement through the grep gate.

This is the A lane of the documented D-PLAN-01 split. In files also owned by 12-01B, touch only padding/margin/gap and radius declarations; do not reorder imports, replace emoji, alter motion declarations, edit Snackbar behavior, or reformat neighboring JSX. Preserve every callback, API request, state variable, conditional, route, form field, accessibility attribute, and component export per LOGIC-01/03; make no backend change per LOGIC-02.</action>
  <acceptance_criteria>
    - Every hit from the current D-GRID-02 scan is classified; the summary records baseline/current counts and each approved exception category.
    - Actual spacing values use only `var(--md-spacing-1..8)`, `0`, `var(--md-nav-height)`, or token arithmetic; raw px remains only in the exact non-spacing exceptions.
    - `.btn-search` uses `var(--md-spacing-1) var(--md-spacing-2)` and navigation safe areas consume `--md-nav-height`.
    - Multi-value CSS declarations and JSX inline styles contain no hidden numeric spacing survivor.
    - No import, callback, API call, state transition, route, form field, auth check, or backend file is changed by the sweep.
    - The targeted spacing/radius source scan, `npm run lint:css`, and `npm run build` exit 0 after this lane's changes.
  </acceptance_criteria>
  <verify>
    <automated>npm run lint:css &amp;&amp; npm run build &amp;&amp; test -z "$(rg -n --glob '*.css' --glob '*.jsx' '(padding|margin|gap|row-gap|column-gap)[^:]*:\s*[0-9]+px' src | rg -v 'border|outline|spinner|0\.01ms' || true)"</automated>
  </verify>
  <done>The complete current spacing inventory is tokenized or explicitly classified, with line-disjoint edits ready to combine with 12-01B and no business/backend regression.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Developer source edits → production CSS/JS bundle | High-volume visual replacements can accidentally alter layout or adjacent JSX behavior. |
| Contribution → lint/grep acceptance gate | An incomplete or over-broad regex can conceal a regression or reject a valid non-spacing effect. |
| npm registry → package-lock/node_modules | New stylelint packages cross a software-supply-chain boundary. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-12-01A-01 | Tampering | Spacing/radius source sweep | mitigate | Exact grep inventory, locked rounding map, narrow property-only edits, stylelint, build, and combined check:md3 gate. |
| T-12-01A-02 | Denial of Service | `check-m3-tokens.sh` | mitigate | Path-independent resolution, explicit per-property exceptions, `|| true` zero-match handling, syntax test, and deterministic nonzero exit only for real violations. |
| T-12-01A-03 | Repudiation | 242-declaration audit | mitigate | Record baseline/current hit counts, every exception class, commands, and exits in 12-01A-SUMMARY.md. |
| T-12-01A-SC | Tampering | npm install | mitigate | Blocking human package-legitimacy checkpoint, official npm registry/repository/integrity checks, peer-range validation, and npm-generated lockfile only. |
</threat_model>

<verification>
- From `frontend/`, `npm run lint:css` exits 0.
- From `frontend/`, `bash -n scripts/check-m3-tokens.sh` and `npm run build` exit 0.
- The D-GRID-02 scan has no unclassified actual-spacing hit.
- Sidebar/BottomBar numeric active-pill radii are absent and Login/ForceChangePassword input corners resolve through MD3 tokens.
- After 12-01A and 12-01B are both present, `npm run check:md3` exits 0; Wave 3 re-runs this combined assertion.
- `git diff --name-only -- backend` returns no paths.
</verification>

<success_criteria>
- All current page/component spacing candidates use the locked MD3 grid or an exact documented non-spacing/nav-height exception.
- Numeric corner residues are absent and stylelint prevents recurrence.
- The full check:md3 script contains deterministic radius, spacing, motion, and emoji protections without broad exclusions.
- Package identity is human-approved before installation; lockfile changes are npm-generated.
- Build and CSS lint pass, business/API/auth behavior is untouched, and backend remains unchanged.
</success_criteria>

<output>
Create `.planning/phases/12-page-level-refactor-8dp-grid-human-uat/12-01A-SUMMARY.md` when done.
</output>
