---
phase: 14-ui-bugfix-filter-popup
reviewed: 2026-07-29T21:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - frontend/src/components/DishCard.jsx
  - frontend/src/components/WishCard.jsx
  - frontend/src/components/composites/BottomBar.css
  - frontend/src/components/composites/Modal.css
  - frontend/src/components/composites/Modal.jsx
  - frontend/src/components/composites/Sheet.css
  - frontend/src/components/composites/Sheet.jsx
  - frontend/src/css/styles.css
  - frontend/src/pages/AdminDishesPage.jsx
  - frontend/src/pages/AdminIngredientsPage.jsx
  - frontend/src/pages/ChefDishesPage.jsx
findings:
  critical: 1
  warning: 6
  info: 4
  total: 11
status: issues_found
---

# Phase 14: Code Review Report

**Reviewed:** 2026-07-29T21:00:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

This phase migrates the admin/chef dish-filter UI from inline `<div>` blocks to the new `<Sheet>` composite, replaces clipped inline ingredient/semifinished dropdowns with `createPortal`-rendered dropdowns (BUG-04), unifies the mobile card layout (footer slot + truncation + placeholders), and reworks table-header alignment (BUG-02) plus the 48dp/compact-interactive-target interaction (D-08).

The most serious issue is a **keyboard-accessibility regression** introduced by the portal migration: dropdown triggers capture position coordinates only inside their `onClick` handler, but the portal render condition requires those coordinates. Keyboard activation (`Enter`/`Space`) toggles visibility state without ever capturing coordinates, so the portal never renders and keyboard-only users cannot open the dropdowns.

Beyond that, the portal-dropdown positioning strategy is fragile (no scroll/resize tracking, detaches inside the scrollable modal body), the Modal composite silently drops the accessible name when callers pass `title` without `labelledBy`, and the BUG-04 portal fix was applied to `AdminDishesPage` but not to the parallel code paths in `ChefDishesPage`, leaving the original clipping bug intact for chef users.

## Critical Issues

### CR-01: Portal dropdowns never render on keyboard activation (a11y regression)

**File:** `frontend/src/pages/AdminDishesPage.jsx:785, 821` (ingredient trigger + semifinished trigger)
**Issue:**
The ingredient and semifinished dropdown triggers were migrated from inline `<div>` dropdowns to `createPortal`-rendered dropdowns. The portal render condition requires BOTH the visibility flag AND captured coordinates:

```jsx
{showIngDropdown && ingDropdownCoords && createPortal(   // line 1087
  ...
)}
```

But coordinates are captured only inside the mouse-driven `onClick` handler (lines 776-784):
```jsx
onClick={() => {
  if (showIngDropdown) {
    setShowIngDropdown(false);
  } else if (ingDropdownRef.current) {
    const rect = ingDropdownRef.current.getBoundingClientRect();
    setIngDropdownCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setShowIngDropdown(true);
  }
}}
```

The keyboard handler (line 785) only toggles the flag and never captures coordinates:
```jsx
onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowIngDropdown(!showIngDropdown); } }}
```

Result: On first use, a keyboard-only user focuses the trigger (a `<div role="button" tabIndex={0}>`), presses `Enter`, the visibility flag becomes `true`, but `ingDropdownCoords` remains `null` — so the portal never renders. The dropdown is completely invisible and inoperable via keyboard. The previous (pre-phase) inline dropdown rendered solely on `showIngDropdown`, so this is a regression. The same defect exists for the semifinished trigger (line 821 / portal at line 1141).

This violates WCAG 2.1 SC 2.1.1 (Keyboard) and SC 4.1.2 (Name, Role, Value).

**Fix:**
Capture coordinates in the keyboard handler too, or factor coordinate capture into a shared opener:

```jsx
const openIngDropdown = () => {
  if (ingDropdownRef.current) {
    const rect = ingDropdownRef.current.getBoundingClientRect();
    setIngDropdownCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }
  setShowIngDropdown(prev => !prev);
};
// ...
<div
  className="field-trigger compact-interactive-target"
  role="button"
  tabIndex={0}
  onClick={openIngDropdown}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openIngDropdown();
    }
  }}
>
```

## Warnings

### WR-01: Portal dropdown detaches from trigger when modal body scrolls

**File:** `frontend/src/pages/AdminDishesPage.jsx:1087-1139, 1141-1183`; `frontend/src/pages/AdminIngredientsPage.jsx:645-674`
**Issue:**
All three portal dropdowns capture `getBoundingClientRect()` once at click time and render at `position: fixed` with those coordinates. The Modal body (`.md-modal__body`) is `overflow-y: auto` (`Modal.css:95-96`), so when the dish-edit modal has enough form fields to scroll, scrolling the modal body moves the trigger but leaves the dropdown visually pinned at its original screen position — producing a detached, floating dropdown whose items no longer correspond to the trigger the user clicked. The same pattern applies to the linked-dishes dropdown in `AdminIngredientsPage`. There is no scroll/resize listener and no repositioning logic.

**Fix:**
Either (a) render the dropdown `position: absolute` inside the same scrollable container as the trigger so it scrolls with its anchor; (b) attach a scroll/resize listener (on the nearest scrollable ancestor + `window`) that recomputes coords or closes the dropdown; or (c) at minimum, close the dropdown on first scroll event so the user is not misled by a detached menu.

### WR-02: Dead code — `triggerRefs` is populated but never read

**File:** `frontend/src/pages/AdminIngredientsPage.jsx:36, 334, 421`
**Issue:**
`const triggerRefs = useRef({});` is declared at line 36 and the ref callback stores each trigger element:
```jsx
ref={(el) => { if (el) triggerRefs.current[item.id] = el; else delete triggerRefs.current[item.id]; }}
```
A repo-wide search for `triggerRefs` finds only these three sites (declaration + two assignments) — nothing ever reads `triggerRefs.current`. This is leftover scaffolding (likely intended for scroll-repositioning, which would have mitigated WR-01).

**Fix:** Remove the `useRef` import (if now unused), the declaration, and both ref callbacks. If the intent was to support repositioning, implement that consumer and keep the refs.

### WR-03: Modal/Sheet has no accessible name when callers pass `title` without `labelledBy`

**File:** `frontend/src/components/composites/Modal.jsx:103, 112`
**Issue:**
The dialog div carries `aria-labelledby={labelledBy}` and the default header renders `<h3 className="md-modal__title" id={labelledBy}>`. When `labelledBy` is `undefined` (the common case — every Sheet opened in this phase, plus every dish/ingredient edit modal, passes `title` only), React omits the `aria-labelledby` attribute and the `<h3>` gets no `id`. The dialog therefore has no accessible name; screen readers announce only "dialog" with no label.

Every `<Sheet>`/`<Modal>` call site in `AdminDishesPage.jsx` (lines 497, 703, 863, 952) and `AdminIngredientsPage.jsx` (lines 281, 460, 501) is affected — none pass `labelledBy`.

**Fix:** Auto-generate an id for the title and wire it to `aria-labelledby` when `labelledBy` is not provided:

```jsx
import { useId } from 'react';
// ...
const autoId = useId();
const labelledByResolved = labelledBy || (title ? autoId : undefined);
// ...
<div ... aria-labelledby={labelledByResolved} ...>
  <h3 className="md-modal__title" id={labelledByResolved}>{title}</h3>
```

### WR-04: Transparent placeholder text "占位" is announced by screen readers

**File:** `frontend/src/pages/AdminDishesPage.jsx:694`; `frontend/src/pages/ChefDishesPage.jsx:694`
**Issue:**
Mobile dish cards render `<span style={{ fontSize: '0.75rem', color: 'transparent' }}>占位</span>` as an invisible spacer when a dish has no published chefs. The text is hidden visually via `color: transparent` but is still in the DOM and will be read aloud by screen readers as "占点" (placeholder) on every card that lacks published chefs. This pollutes the screen-reader stream with meaningless words.

**Fix:** Add `aria-hidden="true"` to the spacer span, or replace with `<span style={{ display: 'inline-block', width: '1px', height: '1rem' }} aria-hidden="true" />` to achieve the same min-height without text content.

### WR-05: BUG-04 portal fix applied to AdminDishesPage but not ChefDishesPage

**File:** `frontend/src/pages/ChefDishesPage.jsx:783-837, 867-911, 88, 99`
**Issue:**
The phase's stated goal (per commit `eaeed75`: "AdminDishesPage Sheet filter + Portal ingredient/sf dropdowns (BUG-04/UI-02)") is to fix the BUG-04 dropdown clipping issue. The Admin page was migrated to `createPortal`. The Chef page's ingredient and semifinished dropdowns were NOT migrated — they remain inline `position: absolute` blocks inside the modal body (lines 783-837, 867-911). The original clipping bug (dropdown gets cut off by the modal's `overflow-y: auto` body) still affects chefs editing a dish.

Additionally, `ChefDishesPage` still listens for `mousedown` (lines 88, 99) for outside-click while `AdminDishesPage` switched to `click` (to allow portal item `onClick` to fire first) — inconsistent behavior between two pages that render the same form.

**Fix:** Either apply the same portal + `click` migration to `ChefDishesPage`, or explicitly document in the phase summary why the chef page is intentionally excluded. Given both pages share the identical dish-edit form, leaving one fixed and one broken is likely to generate a follow-up bug report.

### WR-06: Portal dropdown coordinates go stale on window resize / device rotation

**File:** `frontend/src/pages/AdminDishesPage.jsx:1087, 1141`; `frontend/src/pages/AdminIngredientsPage.jsx:645`
**Issue:**
Dropdown coordinates are captured once via `getBoundingClientRect()` at click time. If the user resizes the browser, rotates a mobile device, or (when not inside a modal) scrolls the page, the dropdown remains anchored to the original absolute coordinates. On mobile — the primary target platform per `PROJECT.md` — device rotation is common and would leave the dropdown visibly misaligned with its trigger. There is no `resize`/`orientationchange`/scroll listener to recompute or dismiss.

**Fix:** Attach a `resize`/`orientationchange` listener (and a scroll listener on the nearest scroll container) while the dropdown is open; on trigger, either recompute coords from the stored trigger ref or close the dropdown.

## Info

### IN-01: Dead descendant selectors in `.compact-interactive-target` rule

**File:** `frontend/src/css/styles.css:539-541`
**Issue:**
Three selectors require `.compact-interactive-target` to be an ANCESTOR of the listed element:
```css
.compact-interactive-target .qty-stepper button,
.compact-interactive-target .preference-tag button,
.compact-interactive-target .quick-action { ... }
```
But every JSX usage in the codebase applies `.compact-interactive-target` to the leaf element itself (the dropdown trigger button), never as a wrapper around `.qty-stepper`/`.preference-tag`/`.quick-action`. These three selectors never match. The `.compact-interactive-target.chef-select-item` etc. compound selectors on adjacent lines DO match — those are correct.

**Fix:** Remove the three descendant selectors, or rewrite as `.compact-interactive-target.qty-stepper button` if wrapper usage is actually intended.

### IN-02: Sheet `style` prop docstring claims desktop-only but applies on all viewports

**File:** `frontend/src/components/composites/Sheet.jsx:22` vs `frontend/src/components/composites/Modal.jsx:98`
**Issue:**
The Sheet docstring documents `style` as `桌面居中模式下的样式覆写` (desktop centered mode override), implying the style only applies at `≥1024px`. But Sheet passes `style` straight through to Modal, and Modal applies it for every non-full-screen variant (`style={isFullScreen ? undefined : style}`), including `bottom-sheet`. Inline styles override stylesheet rules without `!important`, so on mobile a caller passing `style={{ maxWidth: 600 }}` would defeat `Sheet.css`'s `.md-modal--bottom-sheet .md-modal { max-width: 100% }`. No current caller passes `style` to Sheet, so this is latent — but the docstring is misleading and the next caller will likely trigger the bug.

**Fix:** Either update the docstring to clarify the style applies on all viewports, or actually scope the style to desktop (e.g., apply it via a class that is itself gated by `@media (min-width: 1024px)`).

### IN-03: Empty catch blocks silently swallow ingredient-load failures

**File:** `frontend/src/pages/AdminDishesPage.jsx:140`; `frontend/src/pages/ChefDishesPage.jsx:137`
**Issue:**
```jsx
const loadIngredients = async () => {
  try {
    const ingRes = await api.getIngredients();
    setAllIngredients(ingRes.items || []);
    const sfRes = await api.getSemifinishedDishes();
    setSemifinishedDishes(sfRes || []);
  } catch (err) {}
};
```
If either API call fails, the user sees an empty ingredient/semifinished dropdown with no toast and no indication that data failed to load. This is inconsistent with every other error handler in the same file (which call `showToast(..., 'error')`). This pattern is pre-existing but lives in a reviewed file.

**Fix:** Add `showToast('加载食材失败', 'error');` (or a more specific message) inside the catch block.

### IN-04: `.compact-interactive-target` shrinks touch targets to 12dp, conflicting with the stated MD3 ≥48dp standard

**File:** `frontend/src/css/styles.css:533-544`
**Issue:**
The global rule at lines 516-524 mandates `min-width: 48px; min-height: 48px` for all interactive elements per MD3 accessibility guidelines. The new `.compact-interactive-target` override at lines 533-544 shrinks those same minimums to `12px` — well below the 48dp touch-target floor. The comment documents this as intentional ("Phase 14 D-08 紧凑交互目标覆盖"), and it is applied via explicit className in JSX (not globally), so it is a deliberate design tradeoff rather than an accidental regression. However:
- The 12dp floor is so far below MD3 guidance that touch users will struggle on small targets like the `▾` linked-dishes trigger.
- IN-01's dead `.compact-interactive-target .qty-stepper button` descendant selector, if it ever activates, would silently revert qty-stepper's explicitly-mandated 48dp (lines 560-564) back to 12dp.

**Fix:** Confirm with design that 12dp is acceptable for the listed compact elements; consider a more conservative 32-40dp floor. Also resolve IN-01 so the qty-stepper descendant selector cannot shadow the explicit 48dp rule.

---

_Reviewed: 2026-07-29T21:00:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
