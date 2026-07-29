---
phase: 12-page-level-refactor-8dp-grid-human-uat
plan: 01B
subsystem: ui
tags: [md3, motion-tokens, iconography, emoji, snackbar, action-api, material-symbols]

# Dependency graph
requires:
  - phase: 08-md3-design-token-foundation
    provides: "--md-motion-duration-{short,medium,long} + easing-{standard,emphasized} tokens"
  - phase: 10-primitive-components
    provides: "Icon.jsx registry + EmptyState component + Material Symbols @0.13.0"
  - phase: 11-composite-navigation-components
    provides: "SnackbarProvider + showToast + queue/pause-resume timer machinery"
  - phase: 12-00-BUGFIX
    provides: "Ripple self-mode (motion already tokenized) + stable interaction shell"
  - phase: 12-01A
    provides: "8dp spacing + radius tokenization base + stylelint + check-m3-tokens.sh (#9/#10 lanes reserved for 01B)"
provides:
  - "D-MOTION-01: all 5 measured motion consumers consume --md-motion-duration-* tokens (linear spinner easing + documented stagger/reduced-motion exceptions preserved)"
  - "D-EMOJI-01: Icon registry extended with new-label/ramen-dining/circle (+ 9 already-pack-resident icons); 128 pictographic emoji clusters → registered Material Symbols across 36 src files"
  - "D-EMOJI-01: EmptyState accepts string Icon-name | ReactNode (default 'mail')"
  - "D-SNACK-01: showToast(message, string|{type?,duration?,action?}) backward-compatible overload; 48dp action Button rendered before close; timer-safe"
  - "check:md3 now 11/11 PASS (12-01A's #9 motion + #10 emoji lanes closed)"
  - "frontend/tests/snackbar.spec.js — 9 browser behavior tests (action, duration, isolation, callback-failure + legacy/queue/timer)"
affects: [12-02, v1.2-UAT]

# Tech tracking
tech-stack:
  added: []  # no new dependencies — reuses committed @material-symbols-svg/react@0.13.0 + @playwright/test
  patterns:
    - "showToast overload: typeof arg === 'string' → legacy tone; object → {type,duration,action} (additive, 213 legacy callers untouched)"
    - "EmptyState icon prop: string → <Icon name size=48>, ReactNode → passthrough (string|ReactNode discriminated render)"
    - "Data-driven emoji arrays migrated to Icon-name strings + <Icon name={x.icon}> renderer (not inline SVG)"
    - "Snackbar action callback wrapped in try/catch + dismiss(id) — one-shot, error-contained, sibling-timer-isolated"
    - "triggerAction separates callback invocation from dismiss: onClick failure cannot become unhandled rejection"

key-files:
  created:
    - "frontend/tests/snackbar.spec.js — extended (RED tests first per TDD)"
  modified:
    - "frontend/src/components/primitives/Icon.jsx — +12 registry entries (new-label/ramen-dining/circle verified + set-meal/inventory-2/mail/shopping-cart/lock/mood-bad/bolt/trending-up/send)"
    - "frontend/src/components/EmptyState.jsx — string|ReactNode API, default 'mail'"
    - "frontend/src/contexts/ToastContext.jsx — showToast overload + triggerAction + .md-snackbar__action CSS + motion token"
    - "frontend/src/css/styles.css — fadeInUp + global spinner motion tokens"
    - "frontend/src/components/primitives/Button.css — md-spin spinner motion token"
    - "frontend/src/utils/index.js — emptyState default 'mail' + getThemeIcon → Icon names"
    - "frontend/src/pages/UserWishesPage.jsx — wish-undo action (cancelWish)"
    - "frontend/src/pages/OrderPage.jsx — order-detail action (navigate /orders/:id)"
    - "frontend/src/components/InvitationsSection.jsx — copy action (handleCopyLink)"
    - "31 more page/component files — emoji→Icon migration"

key-decisions:
  - "Spinner duration tokenized to var(--md-motion-duration-long) (500ms) for both global + Button spinners; linear easing preserved (mechanical rotation, not MD3 transition) — closes check:md3 #9 cleanly"
  - "Snackbar enter tokenized to var(--md-motion-duration-medium) (250ms ≈ MD3 enter spec); the 0.3s was inside ToastContext.jsx template-literal CSS so check #9 (glob *.css) never flagged it, but D-MOTION-01 mandates all 5 measured consumers tokenized regardless"
  - "12 icons added to registry, not 3: RESEARCH §6/PATTERNS §5 clarified that inventory-2/mail/mood-bad/shopping-cart/set-meal/lock/bolt/trending-up/send already exist in @0.13.0 but were never imported (RESEARCH's 'already mapped' claim was inaccurate). All 12 verified present in dist/icons/ + w400.js PascalCase exports."
  - "getThemeIcon() returned emoji (☀️/🌙) and is dead code (0 callers) — migrated to Icon-name strings to satisfy Task-2 verify (utils emoji scan); kept function shape"
  - "Sibling-isolation Snackbar test made robust via hover-pause assertion (proves timer record intact) rather than wall-clock auto-dismiss (which was flaky due to click-path incidental hover-pause)"
  - "D-SNACK-01 wiring reuses ONLY existing capabilities: createWish returns id→cancelWish; createOrder returns array→/orders/:id route; createInvitation returns token→handleCopyLink — no API/route/auth changes (LOGIC-01..03)"

patterns-established:
  - "Pattern: icon-inset arrays store Icon-name strings; renderer is <Icon name={entry.icon} size={N}> (data-driven, not inline SVG paths)"
  - "Pattern: Snackbar action lives between message and close (MD3 spec position); callback is one-shot + error-contained + dismisses only its own item"
  - "Pattern: EmptyState string|ReactNode discrimination via typeof icon === 'string'"

requirements-completed: [UX-01, UX-02, TOKEN-13, LOGIC-01, LOGIC-02, LOGIC-03]

# Metrics
duration: 19min
completed: 2026-07-29
---

# Phase 12 Plan 01B: Motion / Iconography / Snackbar Lane Summary

**Tokenized all 5 motion consumers, migrated 128 pictographic emoji clusters to 12 newly-registered Material Symbols across 36 source files, upgraded EmptyState to string|ReactNode, and shipped a tested backward-compatible actionable Snackbar overload — closing check:md3 to 11/11 PASS with zero backend/logic/auth regression.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-07-29T01:25:00Z
- **Completed:** 2026-07-29T01:44:19Z
- **Tasks:** 3 (Task 1 = TDD RED/GREEN; Tasks 2–3 = auto)
- **Files modified:** 38 (36 src + 2 test); backend diff empty (LOGIC-02)

## Accomplishments

- **D-MOTION-01 (motion contract):** All 5 measured consumers now consume `--md-motion-duration-*` + easing tokens — Ripple transform/fade (already tokenized in Wave-1 self-mode, preserved), Snackbar enter (0.3s→medium), fadeInUp (0.5s ease-out→long+emphasized), global spinner (0.8s→long, linear kept), Button spinner (0.8s→long, linear kept). Documented exceptions intact: stagger 0.1–0.4s sequence, 0.01ms reduced-motion sentinel, 6s reduced-motion fallback.
- **D-EMOJI-01 (iconography):** Icon registry extended by 12 entries — 3 verified-new (`new-label`, `ramen-dining`, `circle`) + 9 already package-resident but unregistered. 128 emoji clusters migrated per RESEARCH §6 semantic map across 36 files (22 pages + 8 components + Icon.jsx + EmptyState + utils + styles.css + Button.css). Extended_Pictographic scan returns 0 files. Structural glyphs (`✕ › ▼ ▲ · • …`) + Chinese copy + user data preserved.
- **D-EMOJI-01 (EmptyState API):** `icon` prop accepts `string` (→ `<Icon name size=48>`) or `ReactNode` (passthrough); default `mail`. `emptyState()` util default `📭`→`mail`, return shape unchanged. All callers render-compatible.
- **D-SNACK-01 (actionable Snackbar):** `showToast(message, options='success')` overload — string=legacy tone, object=`{type?,duration?,action?}`. 48dp `.md-snackbar__action` text Button (inverse-primary) rendered between message and close. `triggerAction`: callback one-shot + try/catch-contained (no unhandled rejection) + dismisses only that item (sibling timers untouched via precise Map delete). 213 legacy string-form callers behaviorally identical. 3 real wired examples: wish-undo (cancelWish), order-detail (navigate), invitation-copy (handleCopyLink) — all reuse existing ids/routes/helpers.
- **check:md3 full green:** Now 11/11 PASS — 12-01A's #9 motion + #10 emoji lanes closed.

## Task Commits

Each task committed atomically (Task 1 is TDD: RED→GREEN):

1. **Task 1 RED: failing Snackbar action/duration/isolation tests** — `13e11b7` (test)
2. **Task 1 GREEN: tokenize 5 motion consumers + actionable Snackbar API** — `5be1a64` (feat)
3. **Task 2: extend Icon registry + EmptyState API + migrate component emoji** — `1cab1dd` (feat)
4. **Task 3: replace all page-level pictographic emoji with registered Icons** — `7a3a7c8` (feat)

## Files Created/Modified

### Created/Extended — Test (2)
- `frontend/tests/snackbar.spec.js` — +4 tests (object-duration, action ordering/callback/dismissal, sibling timer isolation, callback-failure containment); 5 existing tests preserved
- `frontend/tests/fixtures/snackbar.jsx` — +4 trigger buttons for new API paths

### Modified — Task 1 (6)
- `frontend/src/css/styles.css` — fadeInUp + global spinner motion tokens
- `frontend/src/components/primitives/Button.css` — md-spin spinner motion token
- `frontend/src/contexts/ToastContext.jsx` — showToast overload + triggerAction + action CSS + snackbar motion
- `frontend/src/pages/UserWishesPage.jsx` — wish-undo action
- `frontend/src/pages/OrderPage.jsx` — order-detail action + Icon import
- `frontend/src/components/InvitationsSection.jsx` — copy action + EmptyState emoji

### Modified — Task 2 (11)
- `frontend/src/components/primitives/Icon.jsx` — +12 imports + registry entries
- `frontend/src/components/EmptyState.jsx` — string|ReactNode API
- `frontend/src/utils/index.js` — emptyState default + getThemeIcon
- `frontend/src/components/{PasswordInput,CreateLinkModal,DishCard,InvitationsModal,WishAdvanceModal,ChefSelectModal,GuestDishCard,InvitationsSection}.jsx` — component emoji migration

### Modified — Task 3 (22)
- All 22 page files — page-level emoji→Icon sweep (data arrays + renderers + inline)

## Decisions Made

See `key-decisions` frontmatter. Highlights:
- Spinner duration tokenized to `--md-motion-duration-long` (linear kept) — cleaner than retaining 0.8s, and check #9 explicitly allows `spin.*var(--md-motion`.
- 12 icons added to registry (not 3) — RESEARCH/PATTERNS confirmed 9 already-package-resident icons were never imported despite the mapping table referencing them.
- `getThemeIcon()` (dead code) migrated from emoji to Icon names to clear the utils emoji scan.
- Snackbar sibling-isolation test uses hover-pause assertion (robust) instead of wall-clock (flaky).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] GuestOrderPage & OrderPage referenced undefined `Icon`**
- **Found during:** Task 3 (first `npm run lint` after page sweep)
- **Issue:** Both files import `IconButton` but not `Icon`; my page-sweep edits added `<Icon name=...>` usage. A pre-sweep `grep -nc "primitives/Icon"` returned 1, which I misread as "already imports Icon" — it actually matched the `IconButton` import substring. Lint reported 11 `'Icon' is not defined` errors (97→108).
- **Fix:** Added `import Icon from '../components/primitives/Icon';` to both files.
- **Files modified:** `frontend/src/pages/GuestOrderPage.jsx`, `frontend/src/pages/OrderPage.jsx`
- **Verification:** `npm run lint` → 97 errors (baseline restored, 0 `Icon is not defined`)
- **Committed in:** `7a3a7c8` (part of Task 3 commit)

**2. [Rule 1 - Bug] Sibling-isolation Snackbar test was timing-flaky**
- **Found during:** Task 1 GREEN (first full test run: 1 of 9 failed)
- **Issue:** Original assertion waited 4.6s for the sibling's wall-clock auto-dismiss; the Playwright click-path could incidentally hover-pause the sibling, delaying its timer enough to fail.
- **Fix:** Restructured the test to prove "timer intact" via the sibling's hover-pause/resume/auto-dismiss behavior (mirrors the known-stable existing hover test), plus `page.mouse.move(0,0)` to clear incidental hover.
- **Files modified:** `frontend/tests/snackbar.spec.js`
- **Verification:** `npx playwright test snackbar.spec.js` → 9/9 pass (3 consecutive runs)
- **Committed in:** `5be1a64` (part of Task 1 GREEN)

---

**Total deviations:** 2 auto-fixed (2 × Rule 1 bug)
**Impact on plan:** Both fixes necessary for correctness (undefined ref + test flakiness). No scope creep; no architectural changes; no backend changes.

## Authentication Gates

None — no auth required for this plan.

## Issues Encountered

- check:md3 #9 (motion) only globs `*.css`, so the Snackbar `0.3s` inside `ToastContext.jsx`'s template-literal CSS was never flagged — but D-MOTION-01 mandates all 5 measured consumers tokenized regardless of the gate's reach. Tokenized it to `--md-motion-duration-medium` per plan.
- The emoji cluster count (128 migrated) exceeds RESEARCH §6's 106 baseline — expected per the plan note ("every current hit must be migrated even if the count changed"); DishDetailPage/AdminStatsPage/GuestOrderPage grew since the research snapshot.

## User Setup Required

None — no external service configuration. No new dependencies (reuses committed Material Symbols + Playwright).

## Next Phase Readiness

- **Ready for 12-02** — motion/Icon/Snackbar lane complete; combined with 12-01A the full `check:md3` gate is 11/11 green. 12-02 (audit + HUMAN-UAT 6 flows) can proceed.
- **No blockers.** Backend completely untouched (LOGIC-02 verified: `git diff --name-only -- backend` empty). All business logic, requests, state machines, callbacks, routes, auth conditions, and exports preserved (LOGIC-01/03).
- Snackbar action API is additive; 213 legacy `showToast(msg, tone)` callers behaviorally identical (verified by 5 preserved legacy tests).

## Verification Results

- `npm run lint` — 97 errors (12-01A baseline; zero regression after Rule-1 fix)
- `npm run lint:css` — ✓ 0 errors
- `bash frontend/scripts/check-m3-tokens.sh` — **PASS: 11/11** (was 9/11; #9 motion + #10 emoji closed)
- `npm run build` — ✓ 0 errors (chunk-size advisory only)
- `npx playwright test snackbar.spec.js` — ✓ 9/9 pass (legacy compat + queue + timer + action + duration + isolation + callback-failure)
- Extended_Pictographic scan over `src/pages` + `src/components` + `src/utils` — ✓ 0 files (structural glyphs preserved)
- `git diff --name-only -- backend` — ✓ empty (no backend changes, LOGIC-02)

---

*Phase: 12-page-level-refactor-8dp-grid-human-uat*
*Completed: 2026-07-29*

## Self-Check: PASSED

- [x] Icon.jsx registers all 12 new entries (new-label/ramen-dining/circle + set-meal/inventory-2/mail/shopping-cart/lock/mood-bad/bolt/trending-up/send)
- [x] EmptyState.jsx — `typeof icon === 'string'` branch present, default 'mail'
- [x] ToastContext.jsx — `typeof options === 'string'` overload + `.md-snackbar__action` (4 refs: CSS rule + render className) + triggerAction
- [x] snackbar.spec.js — 9 tests (4 new + 5 legacy)
- [x] 12-01B-SUMMARY.md — exists on disk
- [x] Commits 13e11b7 / 5be1a64 / 1cab1dd / 7a3a7c8 — all verified in git log
- [x] check:md3 — 11/11 PASS
- [x] build — 0 error; lint — 97 errors (baseline); lint:css — 0 errors
- [x] Extended_Pictographic scan — 0 files across pages/components/utils
- [x] Backend diff — empty (LOGIC-02)
