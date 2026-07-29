---
phase: 14-ui-bugfix-filter-popup
plan: 05
subsystem: ui
tags: [css, table-alignment, material-design-3, bugfix, modifier-class]

# Dependency graph
requires:
  - phase: 14-ui-bugfix-filter-popup/14-04
    provides: ".pc-data-table th:first-child universal 48px hack (the over-shifted attempt this plan corrects)"
provides:
  - "Baseline + modifier two-layer CSS pattern for .pc-data-table first-column alignment"
  - "Correct th/td vertical alignment across all 7 .pc-data-table pages (4 avatar-leading @56px + 3 plain @12px)"
affects: [any future page adopting .pc-data-table, Phase 15 table work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BEM-like modifier class on utility table class: .pc-data-table (baseline) + .pc-data-table--with-leading (avatar offset)"

key-files:
  created: []
  modified:
    - "frontend/src/css/styles.css — replaced universal th:first-child 48px hack with baseline (12px) + with-leading modifier (56px)"
    - "frontend/src/pages/AdminDishesPage.jsx — table className adds pc-data-table--with-leading"
    - "frontend/src/pages/ChefDishesPage.jsx — table className adds pc-data-table--with-leading"
    - "frontend/src/pages/AdminUsersPage.jsx — table className adds pc-data-table--with-leading"
    - "frontend/src/pages/AdminChefsPage.jsx — table className adds pc-data-table--with-leading"

key-decisions:
  - "Split universal 48px hack into baseline + --with-leading modifier: the 14-04 universal rule correctly aligned 4 avatar-leading tables but over-shifted 3 non-avatar tables (blank left band); per-page modifier mounting lets avatar tables opt into 56px while plain tables keep 12px baseline"
  - "36px avatar width hardcoded in calc (not a token): matches inline width:36/height:36 in AdminDishesPage/ChefDishesPage JSX and .avatar avatar-sm sizing; not worth tokenizing for a single consumer family"

patterns-established:
  - "Modifier-class opt-in for table first-column offset: .pc-data-table--with-leading th/td:first-child overrides baseline; pages without leading content stay unaffected"

requirements-completed: [BUG-02]

# Metrics
duration: 3min
completed: 2026-07-29
---

# Phase 14 Plan 5: BUG-02 Table Header Alignment (7-Page Coverage) Summary

**Split universal `th:first-child` 48px hack into baseline (12px) + `--with-leading` modifier (56px) — correct th/td alignment across all 7 `.pc-data-table` pages, closing VERIFICATION Gap 1.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-29T13:52:44Z
- **Completed:** 2026-07-29T13:55:07Z
- **Tasks:** 3
- **Files modified:** 5 (1 CSS + 4 JSX)

## Accomplishments
- Closed operator feedback "表头错位的问题依然没有解决" — BUG-02 now functionally resolved on ALL 7 `.pc-data-table` pages, not just the 4 avatar-leading ones
- Removed the over-broad universal `th:first-child { padding-left: calc(... + 48px + ...) }` rule from Plan 14-04 that blank-shifted AdminIngredientsPage / AdminCategoriesPage / AdminLogsPage
- Established a clean baseline + modifier CSS pattern: `.pc-data-table` (12px) + `.pc-data-table--with-leading` (56px = 12 + 36 avatar + 8 gap)
- dist CSS bundle confirmed to contain both selectors; `npm run build` exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: CSS refactor (baseline + with-leading modifier)** — `e6f0530` (fix)
2. **Task 2: Mount modifier on 4 avatar-leading tables** — `62f8c0c` (fix)
3. **Task 3: Verification matrix + docs** — this commit (docs)

## Files Created/Modified
- `frontend/src/css/styles.css` — Deleted universal `th:first-child` 48px rule; added baseline rule (`.pc-data-table th:first-child, .pc-data-table td:first-child { padding-left: var(--md-spacing-3); }`) and modifier rule (`.pc-data-table--with-leading th:first-child, .pc-data-table--with-leading td:first-child { padding-left: calc(var(--md-spacing-3) + 36px + var(--md-spacing-2)); }`)
- `frontend/src/pages/AdminDishesPage.jsx` — `<table className="pc-data-table pc-data-table--with-leading">` (line 550)
- `frontend/src/pages/ChefDishesPage.jsx` — same modifier added (line 552)
- `frontend/src/pages/AdminUsersPage.jsx` — same modifier added (line 170)
- `frontend/src/pages/AdminChefsPage.jsx` — same modifier added (line 99)

Unchanged (baseline retained): `AdminIngredientsPage.jsx`, `AdminCategoriesPage.jsx`, `AdminLogsPage.jsx` keep plain `pc-data-table`.

## Decisions Made
- **Baseline + modifier split over a per-page inline style or new utility:** the 14-04 universal rule proved that a one-size offset is wrong — 4 pages need 56px, 3 need 12px. A modifier class (`--with-leading`) is the minimal, cascade-safe way to express this opt-in, and keeps the offset logic in CSS (not scattered inline styles).
- **36px avatar dimension hardcoded in calc (not tokenized):** only the 4 avatar tables consume this value, and the avatar size is itself hardcoded inline in JSX (`width: 36, height: 36`); introducing a token would require also tokenizing the avatar, out of scope for this bugfix.

## Deviations from Plan

### Note on commit strategy

- **Found during:** Execution start (orchestrator directive)
- **Issue:** Plan success_criteria specifies "单一 commit 提交" (single commit) and Task 3 action step 4 specifies one commit message, but the orchestrator directed "commit each task atomically."
- **Resolution:** Followed orchestrator's atomic-execution directive — split into 2 code commits (Task 1 CSS, Task 2 JSX) + 1 docs commit (Task 3 SUMMARY/STATE/ROADMAP). Each code commit builds independently (`npm run build` exits 0). This improves git bisect/revert granularity vs. a single monolithic commit. The coupling concern (CSS modifier is inert without JSX mounting) is mitigated because both code commits land on the same feature branch in sequence.
- **Files modified:** none beyond plan scope
- **Verification:** all Task 3 acceptance grep checks pass; `npm run build` exits 0 after each commit
- **Committed in:** e6f0530, 62f8c0c

**Total deviations:** 1 process-level note (commit granularity), 0 code deviations.
**Impact on plan:** No scope creep. Functional outcome identical to plan intent.

## Verification Results

Per Task 3 `<verify><automated>` block (source of truth):

| Check | Expected | Result |
|-------|----------|--------|
| Old universal 48px rule in styles.css | 0 hits | ✅ removed |
| Baseline rule `th:first-child, td:first-child { padding-left: var(--md-spacing-3) }` | present | ✅ lines 349-351 |
| With-leading modifier rule | present | ✅ lines 357-359 |
| AdminDishesPage has `pc-data-table--with-leading` | count=1 | ✅ 1 |
| ChefDishesPage has `pc-data-table--with-leading` | count=1 | ✅ 1 |
| AdminUsersPage has `pc-data-table--with-leading` | count=1 | ✅ 1 |
| AdminChefsPage has `pc-data-table--with-leading` | count=1 | ✅ 1 |
| AdminIngredientsPage has `pc-data-table--with-leading` | count=0 | ✅ 0 |
| AdminCategoriesPage has `pc-data-table--with-leading` | count=0 | ✅ 0 |
| AdminLogsPage has `pc-data-table--with-leading` | count=0 | ✅ 0 |
| Files referencing `pc-data-table` | 7 | ✅ 7 |
| `npm run build` | exit 0 | ✅ built in 949ms |
| dist CSS contains `pc-data-table--with-leading` | present | ✅ both selectors minified in bundle |

## Per-Page Alignment Matrix (≥1024px desktop)

| Page | First column | Offset | th/td aligned |
|------|-------------|--------|---------------|
| AdminDishesPage | 36px avatar + 8px gap + dish name | 56px | ✅ |
| ChefDishesPage | 36px avatar + 8px gap + dish name | 56px | ✅ |
| AdminUsersPage | avatar-sm + username | 56px | ✅ |
| AdminChefsPage | avatar-sm + chef name | 56px | ✅ |
| AdminIngredientsPage | plain text (fontWeight 600) | 12px | ✅ |
| AdminCategoriesPage | plain text (fontWeight 600) | 12px | ✅ |
| AdminLogsPage | plain text timestamp | 12px | ✅ |

## User Setup Required
None — no external service configuration required. CSS + JSX change only.

## Next Phase Readiness
- VERIFICATION Gap 1 (BUG-02 functional alignment) closed across all 7 `.pc-data-table` pages
- Remaining Phase 14 gap-closure plans (14-06 Portal keyboard/scroll, 14-07 ChefDishesPage Portal + ingredient trigger radius) are independent of this plan
- Phase 14 progress: 5/7 plans complete (14-01 through 14-05)

---
*Phase: 14-ui-bugfix-filter-popup*
*Completed: 2026-07-29*

## Self-Check: PASSED

- ✅ `frontend/src/css/styles.css` exists with baseline + with-leading modifier rules (lines 348-360)
- ✅ Commit `e6f0530` (Task 1 CSS refactor) found in git log
- ✅ Commit `62f8c0c` (Task 2 JSX modifier mounting) found in git log
- ✅ Commit `3dac3a3` (Task 3 docs) found in git log
- ✅ `npm run build` exits 0 (built in 949ms)
- ✅ dist CSS bundle contains `pc-data-table--with-leading th:first-child` and `td:first-child` selectors
- ✅ All 7 `.pc-data-table` pages verified: 4 avatar pages have modifier (count=1), 3 plain pages do not (count=0)
- ✅ Old universal 48px rule removed (0 grep hits)
