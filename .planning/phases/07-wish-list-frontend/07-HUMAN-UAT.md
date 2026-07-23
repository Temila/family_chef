---
status: partial
phase: 07-wish-list-frontend
source: [07-VERIFICATION.md]
started: 2026-07-23T12:30:00Z
updated: 2026-07-23T12:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### H-1: Mobile UX feel for user wish list

**Test:** On a 375px-wide viewport (iPhone-class), open `/my-wishes`, submit a wish via the FAB, browse the list, edit a wish, and cancel one.
expected: FAB is reachable by thumb; form fields are scannable; cards stack single-column with readable text; modal doesn't overflow; bottom-bar 愿望 tab is visible.
result: [pending]

### H-2: Mobile UX feel for chef wish queue

**Test:** On a 375px viewport, open `/chef/wishes`, switch between 全部/待处理/我的认领 tabs, claim a 待处理 wish, advance it via the dish picker, reject one with a reason.
expected: Tab pills fit horizontally without wrapping; action buttons (44px tap targets) are tappable; dish picker modal scrolls inside the picker list; reject textarea is reachable.
result: [pending]

### H-3: Deep-link highlight after CR-01 fix (POST-FIX CRITICAL CHECK)

**Test:** Log in as a user with at least one wish, then navigate directly to `/wishes/<existing-id>` (simulating a Phase-6 Feishu tap).
expected: Browser redirects to `/my-wishes?wish=<id>`; the matching wish card receives a blue outline + accent box-shadow for 4 seconds; the card is scrolled smoothly into the center of the viewport; the URL param is cleared after 4s; **no "未找到该愿望" toast appears.**
result: [pending]

### H-4: Deep-link missing-wish toast (after fix)

**Test:** Navigate to `/wishes/999999` (a non-existent id) as a user.
expected: Page redirects to `/my-wishes?wish=999999`; the wish list loads; once loaded, the "未找到该愿望，可能已撤销或需要切换标签" toast appears once and the URL param is cleared.
result: [pending]

### H-5: Modal accessibility for keyboard + screen reader

**Test:** Open each modal (WishForm create/edit, WishReject, WishAdvance, ConfirmModal for cancel) using keyboard only; verify with a screen reader (VoiceOver/NVDA).
expected: First input is autofocused (WishFormModal/WishRejectModal/WishAdvanceModal); ESC closes reliably (CR-02 fix ensures `submitting` resets on API failure — ESC suppression no longer sticks); title is announced via aria-labelledby. (Known gaps: ConfirmModal has no autofocus, missing aria-describedby, Tab can leave modal, focus not returned to trigger — tracked as WR-08 polish items, non-blocking.)
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
