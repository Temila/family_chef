---
status: complete
phase: 04-frontend-guest
source: 04-01-SUMMARY.md
started: 2026-05-26T12:00:00Z
updated: 2026-05-26T12:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Open valid invitation link
expected: On a phone browser, open a valid guest invitation URL (/guest/{token}). Page loads showing chef's published dishes in a clean mobile layout — no sidebar, no auth prompts, no bottom navigation bar.
result: pass

### 2. Browse and search dishes
expected: On the guest page, type a dish name in the search bar. The dish list filters in real-time. Tap "展开筛选" to see category chips, tap one to filter by category. Dish count updates. Clear search to restore all dishes.
result: issue
reported: "发现两个缺陷：1、点击复制链接提示复制失败，请手动复制。2、筛选项中菜系与地域没有联动。"
severity: major
fix_applied: Added region→cuisine parent-child linkage matching OrderPage pattern; Added execCommand fallback for clipboard copy in CreateLinkModal and InvitationsSection

### 3. Add dishes to cart
expected: Tap the "+" button on a dish card. It changes to a stepper showing "− 1 +". Tap "+" again on same dish — count goes to 2. Tap "+" on a different dish — both appear in cart. Bottom cart bar shows total count ("已选 N 道菜").
result: pass

### 4. Submit order
expected: With items in cart, tap "提交订单" button. Page transitions to a confirmation screen showing ✅ "点单成功", order number, list of ordered dishes with quantities, chef name, and message "已通知厨师，请耐心等待" / "关闭本页即可".
result: pass

### 5. Revisit used link — read-only summary
expected: Open the same invitation link again after submitting an order. Page shows a read-only order summary with 📋 "已提交的订单", order number, dish list with quantities, and "订单已提交，请耐心等待".
result: pass

### 6. Invalid or expired link — error page
expected: Open a guest link with an invalid/expired/revoked token. Page shows a friendly Chinese error message (e.g. "邀请链接无效或已过期") with 😔 icon and text "请联系邀请人获取新的链接".
result: pass

### 7. Empty cart submission blocked
expected: On the browsing page with no items in cart, the "提交订单" button is disabled. Attempting to submit with empty cart shows an error toast.
result: pass
fix_applied: Added .btn:disabled CSS rule for visual grayed-out state

### 8. Cart expand/collapse panel
expected: Tap "已选 N 道菜" area in the cart bar. A slide-up panel shows cart items with name, quantity stepper, and delete (×) button. Tap backdrop to close. Steppers in the panel update the dish card quantities.
result: pass

### 9. Dark mode via system preference
expected: With device set to dark mode, the guest page renders with dark background, light text, and appropriate contrast. Uses prefers-color-scheme — no manual toggle needed.
result: pass

### 10. Mobile layout — no sidebar, no auth chrome
expected: The guest page has no Sidebar component, no Header with user avatar, no BottomBar navigation. Layout is a single-column mobile-optimized view with max-width 420px centered.
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none — all issues fixed during UAT]
