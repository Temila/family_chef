---
phase: 14-ui-bugfix-filter-popup
reviewed: 2026-07-29T21:00:00Z
updated: 2026-07-29T22:30:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - frontend/src/components/DishCard.jsx
  - frontend/src/components/WishCard.jsx
  - frontend/src/components/composites/BottomBar.css
  - frontend/src/components/composites/Modal.css
  - frontend/src/components/composites/Modal.jsx
  - frontend/src/components/composites/Sheet.css
  - frontend/src/components/composites/Sheet.jsx
  - frontend/src/css/styles.css
  - frontend/src/pages/AdminChefsPage.jsx
  - frontend/src/pages/AdminDishesPage.jsx
  - frontend/src/pages/AdminIngredientsPage.jsx
  - frontend/src/pages/AdminUsersPage.jsx
  - frontend/src/pages/ChefDishesPage.jsx
findings:
  critical: 1
  warning: 6
  info: 4
  total: 11
resolved_findings:
  - CR-01   # closed by 433ad5e + c7898ac
  - WR-05   # closed by c7898ac
status: issues_found
---

# Phase 14: Code Review Report

**Reviewed:** 2026-07-29T21:00:00Z (initial pass)
**Updated:** 2026-07-29T22:30:00Z (re-review after gap-closure plans 14-05 / 14-06 / 14-07)
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

This phase migrates the admin/chef dish-filter UI from inline `<div>` blocks to the new `<Sheet>` composite, replaces clipped inline ingredient/semifinished dropdowns with `createPortal`-rendered dropdowns (BUG-04), unifies the mobile card layout (footer slot + truncation + placeholders), and reworks table-header alignment (BUG-02) plus the 48dp/compact-interactive-target interaction (D-08).

The initial review found one Critical (CR-01, keyboard a11y) and six Warnings. Three gap-closure plans were then executed:

- **14-05** (`e6f0530`, `62f8c0c`) — split the over-broad `th:first-child` 48px hack into a `12px` baseline + `.pc-data-table--with-leading` (`56px`) modifier, mounted on the 4 avatar-leading tables. Closes the BUG-02 VERIFICATION Gap 1. Clean change, no new issues.
- **14-06** (`433ad5e`) — extracted `openIngDropdown`/`openSfDropdown` openers so keyboard activation captures coords (closes CR-01), and added capture-phase `scroll`/`resize`/`orientationchange` listeners to close the dropdown (claims to mitigate WR-01/WR-06). The keyboard fix is correct; the **scroll-close mitigation is broken** — see new **CR-02**: it fires on scroll events originating *inside* the dropdown's own item list, making the (up-to-50-item) list un-scrollable.
- **14-07** (`c7898ac`) — migrated `ChefDishesPage` ingredient/semifinished dropdowns to `createPortal` (closes WR-05) and added a 6px inline `borderRadius` to two `AdminIngredientsPage` triggers (closes Gap 2). The Portal migration mirrors the Admin pattern correctly, **but did not carry over the 14-06 scroll/resize/orientationchange listeners** — so WR-01/WR-06 remain fully open for `ChefDishesPage` (newly portaled) and `AdminIngredientsPage` (never mitigated). See new **WR-07**.

**Net delta from this re-review:** CR-01 and WR-05 closed; **+1 new Blocker (CR-02)** and **+1 new Warning (WR-07)**. WR-01/WR-06 remain open (partially and brokenly mitigated on AdminDishesPage only). Status stays `issues_found` because CR-02 must be fixed before ship — the ingredient/semifinished picker is core to dish editing and is currently un-scrollable on the admin page.

## Resolution Matrix

| ID | Severity | Original status | After gap-closure | Closing commit |
|----|----------|-----------------|-------------------|----------------|
| CR-01 | Critical | open | ✅ RESOLVED | `433ad5e` (Admin) + `c7898ac` (Chef) |
| CR-02 | Critical | — | 🆕 NEW (open) | — |
| WR-01 | Warning | open | ⚠️ PARTIALLY MITIGATED (AdminDishesPage only, and broken per CR-02) | `433ad5e` (partial) |
| WR-02 | Warning | open | open | — |
| WR-03 | Warning | open | open | — |
| WR-04 | Warning | open | open | — |
| WR-05 | Warning | open | ✅ RESOLVED | `c7898ac` |
| WR-06 | Warning | open | ⚠️ PARTIALLY MITIGATED (AdminDishesPage only, and broken per CR-02) | `433ad5e` (partial) |
| WR-07 | Warning | — | 🆕 NEW (open) | — |
| IN-01..04 | Info | open | open | — |

## Critical Issues

### CR-01: Portal dropdowns never render on keyboard activation (a11y regression)

**File:** `frontend/src/pages/AdminDishesPage.jsx` (was 785, 821); `frontend/src/pages/ChefDishesPage.jsx`
**Status:** ✅ RESOLVED by `433ad5e` (AdminDishesPage) and `c7898ac` (ChefDishesPage)
**Resolution:** Both pages now extract a shared opener (`openIngDropdown` / `openSfDropdown`) that captures `getBoundingClientRect()` and is referenced by *both* `onClick` and `onKeyDown`. Keyboard users Tab + Enter/Space now correctly populate `ingDropdownCoords`/`sfDropdownCoords`, so the Portal render gate `showIngDropdown && ingDropdownCoords` passes and the dropdown renders. WCAG 2.1.1 / 4.1.2 satisfied. (Original problem description retained below for context.)

> The portal render condition required BOTH the visibility flag AND captured coordinates, but coordinates were captured only inside the mouse-driven `onClick` handler. The keyboard handler only toggled the flag, leaving coords `null`, so the portal never rendered.

---

### CR-02: `closeOnScroll` closes the dropdown when the user scrolls its own item list (functional regression) 🆕

**File:** `frontend/src/pages/AdminDishesPage.jsx:95-98, 100, 122-125, 127` (introduced by commit `433ad5e`, plan 14-06)
**Issue:**
Plan 14-06 added a capture-phase scroll listener to "mitigate" WR-01/WR-06:

```jsx
const closeOnScroll = () => {
  setShowIngDropdown(false);
  setIngDropdownCoords(null);
};
// ...
window.addEventListener('scroll', closeOnScroll, true);   // capture phase
```

A capture-phase scroll listener on `window` fires for `scroll` events dispatched by **any** descendant scroll container — this is the standard (and intended) behavior, and it is exactly why the comment says "capture: true 确保捕获 Modal body 内部 overflow-y:auto 的滚动事件". But the Portal dropdown itself contains scrollable regions:

- Outer Portal div (`AdminDishesPage.jsx:1124-1130`): `maxHeight: 280, overflowY: 'auto'`
- Inner list wrapper (`AdminDishesPage.jsx:1155`): `<div style={{ overflowY: 'auto' }}>`
- List contents: `filteredIngForDropdown.slice(0, 50).map(...)` — up to **50** items (`AdminDishesPage.jsx:1159`)

The search `<Input>` + category `<Chip>` row consume roughly half of the 280px `maxHeight`, leaving only ~4 list rows visible. The moment the user wheels/swipes to scroll the item list to reach row 5+, the capture-phase listener fires `closeOnScroll` and **the dropdown vanishes mid-interaction**. The ingredient/semifinished picker — core to editing a dish — is effectively un-scrollable on the admin page whenever more than ~4 candidates exist. The same defect applies to the semifinished dropdown (`AdminDishesPage.jsx:1178-1218`, up to 50 items).

This is a regression introduced by the commit that claimed to *fix* the dropdown behavior. `ChefDishesPage` (migrated in 14-07) does NOT have this listener, so it is unaffected — but only because it received no mitigation at all (see WR-07).

**Fix:** Ignore scroll events whose origin is inside the dropdown. `e.target` of a scroll event is the scrolled element; guard it before closing, and fall through to close for window/document-level scrolls:

```jsx
const closeOnScroll = (e) => {
  // 不要因为用户滚动下拉菜单自身的列表而关闭它
  if (e.target instanceof Element && e.target.closest('[data-ing-dropdown]')) return;
  setShowIngDropdown(false);
  setIngDropdownCoords(null);
};
```

Apply the analogous guard (`[data-sf-dropdown]`) to the semifinished `closeOnScroll`. After fixing, also extend the same pattern to `ChefDishesPage` and `AdminIngredientsPage` per WR-07.

## Warnings

### WR-01: Portal dropdown detaches from trigger when modal body scrolls

**File:** `frontend/src/pages/AdminDishesPage.jsx:1124-1176, 1178-1218`; `frontend/src/pages/AdminIngredientsPage.jsx:645-674`; `frontend/src/pages/ChefDishesPage.jsx:1098-1202`
**Status:** ⚠️ PARTIALLY MITIGATED — and the partial mitigation is broken (see CR-02)
**Resolution note:** Plan 14-06 added a `closeOnScroll` listener to `AdminDishesPage` only, and that listener itself has the CR-02 regression. `AdminIngredientsPage` (portaled in 14-03) and `ChefDishesPage` (portaled in 14-07) have **no** scroll handling at all, so the detached-dropdown bug remains fully live on those two pages. Reopen pending CR-02 fix + extension to the other two pages.

> All three portal dropdowns capture `getBoundingClientRect()` once at click time and render at `position: fixed` with those coordinates. The Modal body (`.md-modal__body`) is `overflow-y: auto` (`Modal.css:95-96`), so when the dish-edit modal has enough form fields to scroll, scrolling the modal body moves the trigger but leaves the dropdown visually pinned at its original screen position.
>
> **Fix:** Either render `position: absolute` inside the same scrollable container; attach a scroll/resize listener that recomputes or closes; or (chosen approach) close on first scroll — but the close handler must NOT close when the scroll originates inside the dropdown itself (CR-02).

### WR-02: Dead code — `triggerRefs` is populated but never read

**File:** `frontend/src/pages/AdminIngredientsPage.jsx:36, 334, 421`
**Status:** open (not in scope of 14-05/06/07)
**Issue:** `const triggerRefs = useRef({});` is declared and two ref-callback assignments write into `triggerRefs.current[item.id]`, but nothing ever reads it. Likely leftover scaffolding for scroll-repositioning.
**Fix:** Remove the declaration and both ref callbacks (and the `useRef` import if now unused), or implement the intended consumer.

### WR-03: Modal/Sheet has no accessible name when callers pass `title` without `labelledBy`

**File:** `frontend/src/components/composites/Modal.jsx:103, 112`
**Status:** open (not in scope of 14-05/06/07)
**Issue:** When `labelledBy` is `undefined` (every Sheet and every dish/ingredient edit modal in this phase passes `title` only), `aria-labelledby` is omitted and the `<h3>` gets no `id`, so the dialog has no accessible name.
**Fix:** Auto-generate an id via `useId()` and wire it to both `aria-labelledby` and the `<h3 id>` when `labelledBy` is not provided.

### WR-04: Transparent placeholder text "占位" is announced by screen readers

**File:** `frontend/src/pages/AdminDishesPage.jsx:694`; `frontend/src/pages/ChefDishesPage.jsx:694`
**Status:** open (not in scope of 14-05/06/07)
**Issue:** Mobile dish cards render `<span style={{ ..., color: 'transparent' }}>占位</span>` as an invisible spacer. The text is hidden visually but still read aloud by screen readers.
**Fix:** Add `aria-hidden="true"`, or replace with a textless `<span style={{ display:'inline-block', width:'1px', height:'1rem' }} aria-hidden="true" />`.

### WR-05: BUG-04 portal fix applied to AdminDishesPage but not ChefDishesPage

**File:** `frontend/src/pages/ChefDishesPage.jsx`
**Status:** ✅ RESOLVED by `c7898ac` (plan 14-07)
**Resolution:** ChefDishesPage's ingredient and semifinished dropdowns are now rendered via `createPortal(... , document.body)` with `position: 'fixed'` + `zIndex: 1000` and `data-ing-dropdown` / `data-sf-dropdown` markers, escaping the modal-body `overflow` clipping. The two click-outside `useEffect`s switched from `mousedown` to `click` with `closest('[data-ing-dropdown]')` / `closest('[data-sf-dropdown]')` guards so Portal item `onClick` fires before close — matching the AdminDishesPage pattern. The 14-07 diff also corrected a pre-existing indentation error on the `}, [showSfDropdown]);` cleanup line. (Original problem description retained below for context.)

> The Admin page was migrated to `createPortal`; the Chef page's dropdowns remained inline `position: absolute` inside the modal body, so the original clipping bug still affected chefs. Additionally the Chef page used `mousedown` for outside-click while Admin used `click` — inconsistent.

### WR-06: Portal dropdown coordinates go stale on window resize / device rotation

**File:** `frontend/src/pages/AdminDishesPage.jsx`; `frontend/src/pages/AdminIngredientsPage.jsx:645`; `frontend/src/pages/ChefDishesPage.jsx`
**Status:** ⚠️ PARTIALLY MITIGATED — and the partial mitigation is broken (shares CR-02's root cause)
**Resolution note:** Plan 14-06 added `resize` + `orientationchange` listeners to `AdminDishesPage` only. They share the same `closeOnScroll` callback (so they do correctly drop stale coords on resize/rotation for the Admin page). However `ChefDishesPage` (portaled in 14-07) and `AdminIngredientsPage` got **no** resize/orientation handling, so on those pages a rotate/resize leaves the dropdown visibly misaligned with its trigger — particularly impactful since PROJECT.md names mobile as the primary target platform and rotation is common. Reopen pending extension to the other two pages.

### WR-07: 14-06 scroll/resize mitigation not extended to ChefDishesPage (newly portaled in 14-07) 🆕

**File:** `frontend/src/pages/ChefDishesPage.jsx:84-106`
**Issue:** Plan 14-07 migrated `ChefDishesPage`'s two dropdowns to the Portal pattern but did **not** add the matching `scroll`/`resize`/`orientationchange` close listeners that 14-06 added to `AdminDishesPage`. The two pages now render identical Portal dropdowns but with inconsistent lifecycle behavior: `AdminDishesPage` (over-)aggressively closes on any scroll; `ChefDishesPage` never closes on scroll/resize/rotation at all, fully exposing both WR-01 (detached on modal scroll) and WR-06 (stale coords on rotate/resize). `AdminIngredientsPage` likewise still has no scroll/resize handling.

This appears to be an oversight in 14-07's "mirror the AdminDishesPage pattern" intent (its own SUMMARY §Decisions states the goal was to make the two pages' dropdown implementations "完全对齐" / fully aligned).

**Fix:** Once CR-02's internal-scroll guard is applied to the shared `closeOnScroll` shape, port the same three listeners (`scroll` capture, `resize`, `orientationchange`) into `ChefDishesPage`'s two `useEffect`s, and into `AdminIngredientsPage`'s dropdown `useEffect`. All three pages should then share one consistent, correct close-on-external-scroll behavior.

## Info

### IN-01: Dead descendant selectors in `.compact-interactive-target` rule

**File:** `frontend/src/css/styles.css:539-541`
**Status:** open (not addressed by 14-05; 14-05 only touched `.pc-data-table` rules)
**Issue:** Three selectors require `.compact-interactive-target` to be an ANCESTOR (`.compact-interactive-target .qty-stepper button`, `.compact-interactive-target .preference-tag button`, `.compact-interactive-target .quick-action`), but every JSX usage applies the class to the leaf element. These never match.
**Fix:** Remove the three descendant selectors, or rewrite as compound selectors if wrapper usage is actually intended.

### IN-02: Sheet `style` prop docstring claims desktop-only but applies on all viewports

**File:** `frontend/src/components/composites/Sheet.jsx:22` vs `frontend/src/components/composites/Modal.jsx:98`
**Status:** open (not in scope of 14-05/06/07)
**Issue:** The Sheet docstring documents `style` as `桌面居中模式下的样式覆写`, but Sheet passes `style` straight through to Modal which applies it for every non-full-screen variant. Latent bug for the next caller that passes `style`.
**Fix:** Update the docstring, or scope the style via a desktop-gated class.

### IN-03: Empty catch blocks silently swallow ingredient-load failures

**File:** `frontend/src/pages/AdminDishesPage.jsx:168`; `frontend/src/pages/ChefDishesPage.jsx` (parallel `loadIngredients`)
**Status:** open (not in scope of 14-05/06/07)
**Issue:** `} catch (err) {}` in `loadIngredients` swallows API failures with no toast, inconsistent with every other handler in the same file.
**Fix:** Add `showToast('加载食材失败', 'error');` in the catch block.

### IN-04: `.compact-interactive-target` shrinks touch targets to 12dp, conflicting with the stated MD3 ≥48dp standard

**File:** `frontend/src/css/styles.css:533-544`
**Status:** open (not in scope of 14-05/06/07; 14-07 added `borderRadius: '6px'` inline to two `AdminIngredientsPage` triggers but did not change the 12dp minimum)
**Issue:** The global rule mandates `min-width/min-height: 48px`; `.compact-interactive-target` overrides to `12px`, well below the MD3 floor. Deliberate per the in-file comment, but the 12dp floor is aggressive for touch. IN-01's dead qty-stepper descendant selector would silently revert qty-stepper's explicit 48dp back to 12dp if it ever activated.
**Fix:** Confirm 12dp is acceptable with design; consider a 32–40dp floor; resolve IN-01.

---

_Reviewed: 2026-07-29T21:00:00Z (initial)_
_Updated: 2026-07-29T22:30:00Z (post gap-closure re-review)_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
_Build check: `npm run build` exits 0 (chunk-size warning is pre-existing/benign)_
_Lint check: no new errors in 14-05/06/07 files; pre-existing errors in unrelated `tests/fixtures/*` and a `loadStats` hook remain_
