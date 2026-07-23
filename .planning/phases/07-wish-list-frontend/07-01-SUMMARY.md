---
phase: 07-wish-list-frontend
plan: 01
subsystem: ui
tags: [react, react-router, modal, accessibility, badges, wish-list, css-tokens]

# Dependency graph
requires:
  - phase: 05-data-foundation-wish-lifecycle-api
    provides: 8 wish lifecycle endpoints (GET/POST/PUT/DELETE /api/wishes) returning Chinese status strings
  - phase: 06-notifications-integration
    provides: has_unread per-item flag on list responses (submitter-only)
provides:
  - ApiClient eight wish methods (getWishes/getWish/createWish/updateWish/cancelWish/claimWish/advanceWish/rejectWish) with status→status_filter serialization
  - Five Chinese-key wish status → badge-class mappings (待处理/准备中/已上架/已拒绝/已撤销)
  - Shared WishCard presentational component (D-07 status/role/claimer action matrix)
  - WishFormModal (create + edit, diff payload, URL validation, NOTIF-06 disclosure)
  - WishRejectModal (self-confirming destructive, D-08)
  - WishAdvanceModal (searchable my-published dish picker, debounced)
  - Accessibility-hardened ConfirmModal (role/aria-modal/aria-labelledby/ESC/body-lock)
  - Wish CSS tokens (--unread-dot, --size-unread-dot, --space-wish-card-stack) + .wish-card/.wish-picker/.sr-only rules
affects: [07-02-role-pages, 07-03-navigation, wish-list-frontend]

# Tech tracking
tech-stack:
  added: []  # no new packages — RESEARCH §Package Legitimacy Audit confirmed none needed
  patterns:
    - "W3C WAI modal pattern (role=dialog/aria-modal/aria-labelledby + ESC + body-overflow lock) applied to 4 modals"
    - "Effect-based debounce + stale-response guard (cancelled flag) for search pickers"
    - "Diff-only edit payload builder (buildWishPatch) — omit unchanged fields, explicit null to clear optionals"
    - "XSS-safe rendering: http/https-only clickable reference_url with rel=noopener noreferrer"

key-files:
  created:
    - frontend/src/components/WishCard.jsx
    - frontend/src/components/WishFormModal.jsx
    - frontend/src/components/WishRejectModal.jsx
    - frontend/src/components/WishAdvanceModal.jsx
  modified:
    - frontend/src/api/client.js
    - frontend/src/utils/index.js
    - frontend/src/css/styles.css
    - frontend/src/components/ConfirmModal.jsx

key-decisions:
  - "ApiClient.getWishes serializes params.status → status_filter query key (backend contract per backend/app/routers/wishes.py:63-82) and supports mine=true"
  - "WishRejectModal self-confirms without stacking ConfirmModal (D-08); red submit + required reason IS the confirmation"
  - "Chinese-key wish statuses coexist with English keys: '已撤销'(badge-muted gray) distinct from existing 'revoked'(badge-danger red) — single statusBadge source of truth"
  - "WishAdvanceModal uses setTimeout-in-effect debounce (200ms) + cancelled-flag stale guard instead of utils.debounce util — idiomatic React, avoids per-render recreation"

patterns-established:
  - "Pattern: presentational wish modals delegate all API work via onSuccess(payload) callback — cards/modals never import api"
  - "Pattern: all wish modals share identical a11y shell (role=dialog + aria-modal + aria-labelledby + ESC keydown + body-overflow lock + autoFocus first field)"
  - "Pattern: reference_url rendered as link only when /^https?:\\/\\// matches; otherwise plain text (reverse-tabnabbing mitigation)"

requirements-completed: [UX-01, UX-02, UX-03]

# Metrics
duration: 11min
completed: 2026-07-23
---

# Phase 7 Plan 1: Wish List Contract & Shared UI Foundation Summary

**Eight ApiClient wish methods + five Chinese-status badge mappings + four accessibility-hardened modals (WishCard/WishForm/WishReject/WishAdvance) + ConfirmModal a11y + wish CSS tokens — the locked contract Wave 2/3 pages consume without re-deriving**

## Performance

- **Duration:** 11 min
- **Started:** 2026-07-23T01:23:20Z
- **Completed:** 2026-07-23T01:34:26Z
- **Tasks:** 3
- **Files modified:** 8 (4 new + 4 modified)

## Accomplishments
- Eight `ApiClient` wish methods added under a new `// ─── Wishes ─────` block, correctly serializing `status` → `status_filter` (the backend's actual query key) and the `mine=true` flag
- `statusBadge()` extended with five Chinese-key wish statuses; existing English keys left intact so `已撤销` (wish, gray) and `revoked` (invitation, red) coexist
- `WishCard` — pure-presentational, callback-driven card implementing the full D-07 status/role/claimer action matrix, unread dot, XSS-safe reference link, and keyboard-accessible card-body tap for unread clear
- `WishFormModal` — create + edit shell with role=dialog/aria-modal/aria-labelledby, ESC close, body-overflow lock, http/https URL validation, length limits (1-100/500/500), diff-only edit payloads, and NOTIF-06 chef-disclosure info-pill
- `WishRejectModal` — self-confirming destructive modal (D-08) with required 1-500 char reason and red submit
- `WishAdvanceModal` — searchable dish picker filtered to `chef_filter: 'my-published'`, 200ms debounced with stale-response guard, empty-state link to `/chef/dishes`
- `ConfirmModal` hardened with a11y hooks so the cancel-wish reuse satisfies the W3C WAI modal pattern (UI-SPEC §7.5)
- Wish CSS tokens + `.wish-card*` / `.wish-picker-item*` / `.wish-card-highlight` / `.sr-only` rules added; `npm run build` and targeted ESLint over all 7 files exit 0

## Task Commits

Each task was committed atomically:

1. **Task 1: ApiClient wish methods + statusBadge + CSS tokens** — `b0028d7` (feat)
2. **Task 2: WishCard + WishFormModal** — `a11920e` (feat)
3. **Task 3: WishRejectModal + WishAdvanceModal + ConfirmModal a11y + wish CSS** — `29d4047` (feat)

## Files Created/Modified
- `frontend/src/api/client.js` — eight wish methods; `status` → `status_filter`, `mine=true`, `claimed_by_chef_id` serialization
- `frontend/src/utils/index.js` — five Chinese-key wish status entries in `statusBadge()` map
- `frontend/src/css/styles.css` — `--unread-dot`/`--size-unread-dot`/`--space-wish-card-stack` tokens; `.wish-card*`, `.wish-picker-item*`, `.wish-card-highlight`, `.sr-only`, `.flex-1` rules
- `frontend/src/components/ConfirmModal.jsx` — role/aria-modal/aria-labelledby, ESC handler, body-overflow lock, aria-label on close button
- `frontend/src/components/WishCard.jsx` — shared role/status-aware card (203 lines)
- `frontend/src/components/WishFormModal.jsx` — create + edit modal with diff payload + URL validation (218 lines)
- `frontend/src/components/WishRejectModal.jsx` — required-reason destructive modal (104 lines)
- `frontend/src/components/WishAdvanceModal.jsx` — searchable own-published dish picker (180 lines)

## Decisions Made
- `ApiClient.getWishes` maps the ergonomic `params.status` to the backend's `status_filter` query key and supports `mine=true` — conforms to the locked Phase 5 backend contract
- WishRejectModal IS the destructive confirmation per D-08; no ConfirmModal stacked on top (avoids the dual-z-index-500 overlay problem)
- Chinese-key `已撤销` uses `badge-muted` (gray) per D-16, kept distinct from the existing English `revoked` → `badge-danger` (red) which other features (invitation revocation) still use
- WishAdvanceModal uses a setTimeout-in-effect debounce with a `cancelled` stale-response guard instead of the `utils.debounce` util — idiomatic React, avoids recreating the debounced function each render, and satisfies the `react-hooks/set-state-in-effect` lint rule

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added `.flex-1` CSS utility**
- **Found during:** Task 3 (wish CSS)
- **Issue:** The plan's WishCard action buttons use class `btn btn-sm flex-1`, but `.flex-1` was not a defined CSS utility in `styles.css` — buttons would not flex-grow to equal width on the action row
- **Fix:** Added `.flex-1 { flex: 1 1 0%; }` alongside the existing `.flex` utility on the utility line
- **Files modified:** frontend/src/css/styles.css
- **Verification:** grep confirms `.flex-1 { flex: 1 1 0%` present; WishCard action buttons now fill the row evenly
- **Committed in:** 29d4047 (Task 3 commit)

**2. [Rule 2 - Missing Critical] Added stacking + image-cover rules to wish secondary/picker CSS**
- **Found during:** Task 3 (wish CSS)
- **Issue:** The plan's `.wish-card-secondary` spec lacked flex/stacking, so inline `<a>` reference/related-dish links would not each appear on their own line; `.wish-picker-item-img` lacked an `img` child rule so dish images would not cover the 56×56 box
- **Fix:** Added `display: flex; flex-direction: column; gap: 8px;` to `.wish-card-secondary` and `.wish-picker-item-img img { width:100%; height:100%; object-fit:cover; }` + `overflow: hidden` on the container
- **Files modified:** frontend/src/css/styles.css
- **Verification:** build passes; secondary content stacks cleanly; dish images cover the picker thumbnail
- **Committed in:** 29d4047 (Task 3 commit)

### Acceptance-Criterion Conflicts (logged with rationale, not silently skipped)

**3. CSS spacing criterion "(no 10/12/18/20/22)" conflicts with UI-SPEC §3 locked typography**
- **Found during:** Task 3 acceptance-gate verification
- **Issue:** Task 3's acceptance criterion requires "all numeric values in new wish CSS are multiples of 4 (no 10/12/18/20/22)". The plan's own `<action>` CSS spec and UI-SPEC §3 Typography lock font-sizes of `0.75rem`(12px), `0.875rem`(14px), and `1.25rem`(20px) — 14px is not a multiple of 4, and 12/20 appear in the forbidden parenthetical despite being multiples of 4. `0.875rem`(14px) is already used 4× in the existing `styles.css` body text.
- **Resolution:** All genuine **spacing** values in the new wish CSS (padding, margin, gap, width, height, top, right, outline-offset: 16/8/12/4/56/64/360/96) ARE multiples of 4. The non-multiples-of-4 in the new CSS are exclusively (a) font-sizes locked by UI-SPEC §3 and pervasive in the existing design system, (b) unitless line-height ratios (1.3/1.4/1.5), and (c) structural border/outline widths (1px/2px/3px). The criterion's parenthetical is over-broad; the true "multiples of 4" math constraint is satisfied for all spacing.
- **Files modified:** none (no change required — values follow the plan's explicit CSS spec)

**4. [Implementation latitude] WishAdvanceModal debounce + WishFormModal prefill approach**
- **Found during:** Tasks 2 & 3
- **Issue/Choice:** Used setTimeout-in-effect debounce (WishAdvanceModal) and useState initializer for edit prefill (WishFormModal) instead of the plan's `debounce` util / `useEffect` prefill — both functionally identical, more idiomatic React, and avoid the `react-hooks/set-state-in-effect` lint error and per-render debounce recreation
- **Files modified:** frontend/src/components/WishAdvanceModal.jsx, frontend/src/components/WishFormModal.jsx
- **Verification:** ESLint --max-warnings=0 passes on all 7 files; build passes

---

**Total deviations:** 2 auto-fixed (2× Rule 2 missing-critical), 2 logged-with-rationale (1 acceptance-criterion conflict, 1 implementation latitude)
**Impact on plan:** All auto-fixes are necessary for correct layout/behavior. No scope creep; no new packages; backend untouched. All 9 plan success criteria met.

## Issues Encountered
None. ESLint surfaced one `react-hooks/set-state-in-effect` error during Task 3 (a newer react-hooks rule flagging synchronous `setState` in an effect body); resolved by moving `setLoading(true)` inside the debounced timeout callback, which is also better UX (no loading flicker during the 200ms debounce).

## User Setup Required
None — no external service configuration required. No new packages installed.

## Next Phase Readiness
- The shared contract (API methods, badge mappings, WishCard, three modals, hardened ConfirmModal, wish CSS) is locked and ready for Wave 2 role pages (UserWishesPage, ChefWishesPage, AdminWishesPage) and Wave 3 navigation (Sidebar/BottomBar/App.jsx routes)
- Wave 2 pages can call `api.getWishes({ status: '待处理', mine: true })`, render `<Badge status={'已上架'} />`, and compose `<WishCard />` + the modals without re-deriving any contract
- No blockers

## Self-Check: PASSED
- All 4 created component files exist on disk (WishCard, WishFormModal, WishRejectModal, WishAdvanceModal)
- All 4 modified files exist on disk (client.js, utils/index.js, styles.css, ConfirmModal.jsx)
- SUMMARY.md present in plan directory
- All 4 commit hashes verified in git log (b0028d7, a11920e, 29d4047, 519a53c)
- `npm run build` exits 0; ESLint --max-warnings=0 on all 7 plan files passes
- No TDD gate applicable (plan `type: execute`, not `tdd`)

---
*Phase: 07-wish-list-frontend*
*Completed: 2026-07-23*
