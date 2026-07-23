---
phase: 07-wish-list-frontend
reviewed: 2026-07-23T02:30:00Z
depth: deep
files_reviewed: 13
files_reviewed_list:
  - frontend/src/api/client.js
  - frontend/src/utils/index.js
  - frontend/src/css/styles.css
  - frontend/src/components/ConfirmModal.jsx
  - frontend/src/components/WishCard.jsx
  - frontend/src/components/WishFormModal.jsx
  - frontend/src/components/WishRejectModal.jsx
  - frontend/src/components/WishAdvanceModal.jsx
  - frontend/src/pages/UserWishesPage.jsx
  - frontend/src/pages/ChefWishesPage.jsx
  - frontend/src/pages/AdminWishesPage.jsx
  - frontend/src/App.jsx
  - frontend/src/components/Sidebar.jsx
  - frontend/src/components/BottomBar.jsx
findings:
  critical: 2
  warning: 8
  info: 12
  total: 22
status: issues-found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-07-23T02:30:00Z
**Depth:** deep
**Files Reviewed:** 13 (8 new + 5 modified)
**Status:** issues-found

## Summary

Phase 07 delivers the wish-list feature end-to-end: API client methods, three role pages, three modals, shared `WishCard`, navigation entries, route registration, and Phase-6 deep-link integration. Build (`npm run build`) is green and targeted ESLint (`--max-warnings=0`) passes over all 13 files. The `status_filter` serialization, Chinese-status badge mapping, and XSS hardening (http/https-only `reference_url`, `rel="noopener noreferrer"`, plain-text rendering for non-http schemes) are correctly implemented.

However, the review uncovered two **BLOCKER** defects that defeat headline features of the phase:

1. **CR-01 — Deep-link highlight is broken in production.** The `?wish=:id` highlight effect races with the initial list fetch: when the page mounts with `wishes=[]`, the effect immediately schedules a 0 ms `setTimeout` that fires the "未找到该愿望" toast and clears the URL directive *before* the API resolves. Over real networks the wish list never loads in time, so every Feishu deep link (`/wishes/:id`) surfaces a misleading "not found" toast instead of the highlighted wish. The Phase-6 integration that this phase exists to deliver is non-functional in any deployed environment.

2. **CR-02 — Modal "submitting" state never resets on API failure, freezing the modal.** `WishFormModal`, `WishRejectModal`, and `WishAdvanceModal` all call `setSubmitting(true)` and then delegate to the parent via `onSuccess?.(...)`. The parent catches errors, shows a toast, and intentionally keeps the modal open for retry — but `submitting` is never reset to `false`. Result: cancel/submit buttons stay `disabled`, the ESC handler is suppressed (`!submitting` check), and the only escape hatch is clicking the overlay (which has no `disabled` check). Edit/reject/advance flows become unusable after the first failed attempt.

Beyond the blockers, there are eight warnings covering admin-role dead-ends (advance action + broken empty-state link), misleading tab counts, React updater-function impurity (dev-mode double API calls in StrictMode), rapid-double-click pagination races, and incomplete modal a11y (no focus trap / autofocus / `aria-describedby`). Twelve info-level items document smaller quality concerns.

TheXS hardening, role gating on routes, backend contract conformance (`status_filter`, `mine=true`, `claimed_by_chef_id`), polling cleanup, and stale-response guards (where applied) are sound.

## Critical Issues

### CR-01: Deep-link highlight races with initial fetch — "未找到该愿望" toast fires before wish list loads

**File:** `frontend/src/pages/UserWishesPage.jsx:133-174`, `frontend/src/pages/ChefWishesPage.jsx:160-199`

**Issue:**
The highlight `useEffect` runs on mount with `wishes=[]` (initial state) and `highlightId` populated from the URL. The `targetWish = wishes.find(...)` lookup fails synchronously, and the missing-toast branch schedules a 0 ms `setTimeout`. The initial fetch effect (declared earlier in the file) has initiated `api.getWishes(...)` but its `.then()` callback is asynchronous.

Trace on mount after a Feishu deep link → `/wishes/123` → redirect → `/my-wishes?wish=123`:
1. Initial render: `wishes=[]`, `loading=true`, `highlightId="123"`.
2. Effects run in declaration order. Mount-fetch effect kicks off `api.getWishes(...)` (network roundtrip).
3. Highlight effect runs. `targetWish=undefined`. Schedules `setTimeout(0)` for the missing-toast.
4. Browser event loop: `setTimeout(0)` (capped at ~4 ms) fires *before* the network request resolves. Toast "未找到该愿望，可能已撤销或需要切换标签" is shown. `setSearchParams` deletes `?wish=123`. `setHighlightedId(null)`.
5. API resolves later. `setWishes(items)` triggers re-render. Highlight effect re-runs but `highlightId` is now `null` (URL was cleared) → early-return.

The cleanup function (`clearTimeout(missingTimer)`) only saves the day if the API resolves *before* the 0 ms timer fires — which essentially never happens over a real network. On localhost the bug can be masked, which is likely why it wasn't caught during development.

The same pattern exists in `ChefWishesPage.jsx:160-199` (covering both `/chef/wishes` and `/admin/wishes`).

This defeats the entire purpose of Plan 03 Task 3 (deep-link highlight + scroll-to) and the Phase-6 `/wishes/:id` integration contract.

**Fix:**
Do not run the missing-toast branch until the initial load has completed. Gate the missing-toast on `loading === false`, or initialize `loading=false` only after the first successful fetch, or — simplest — wait for one cycle of `wishes.length > 0 || loadingMore === false` before declaring a wish "not found":

```jsx
useEffect(() => {
  if (!highlightId) return undefined;

  // Wait until the initial list load has resolved before deciding the wish is "missing".
  // Without this guard, the 0ms setTimeout fires the missing-toast before the network resolves.
  if (loading) return undefined;

  const targetWish = wishes.find((w) => String(w.id) === String(highlightId));
  if (!targetWish) {
    const missingTimer = setTimeout(() => {
      showToast('未找到该愿望，可能已撤销或需要切换标签', 'error');
      setSearchParams(/* … delete wish … */, { replace: true });
      setHighlightedId(null);
    }, 0);
    return () => clearTimeout(missingTimer);
  }
  // … existing highlight branch …
}, [wishes, highlightId, loading, setSearchParams, showToast]);
```

The same fix must be applied to `ChefWishesPage.jsx` (its `loading` state already exists).

---

### CR-02: Modal `submitting` state never resets on API failure — modal freezes after first error

**Files:**
- `frontend/src/components/WishFormModal.jsx:113-114` (`setSubmitting(true); onSuccess?.(payload);`)
- `frontend/src/components/WishRejectModal.jsx:43-44` (`setSubmitting(true); onSuccess?.(trimmed);`)
- `frontend/src/components/WishAdvanceModal.jsx:85-86` (`setSubmitting(true); onSuccess?.(...);`)

**Issue:**
All three modals set `submitting=true` synchronously, then delegate to the parent via `onSuccess?.(...)`. The parent handler `await`s the API call. On error, the parent catches, shows a toast, and intentionally keeps the modal open so the user can retry:

- `UserWishesPage.handleCreateSubmit` catch (line 183-185): toast only, no modal close, no reset.
- `UserWishesPage.handleEditSubmit` catch (line 203-205): toast only, no modal close, no reset.
- `ChefWishesPage.handleAdvance` catch (line 228-230): toast only, `setAdvanceTarget` NOT called → modal stays open.
- `ChefWishesPage.handleReject` catch (line 247-249): toast only, `setRejectTarget` NOT called → modal stays open.

Inside each modal after a failed submit:
- Submit button: `disabled={submitting}` → stuck disabled.
- Cancel/secondary button: `disabled={submitting}` → stuck disabled (`WishFormModal:207`, `WishRejectModal:88`, `WishAdvanceModal:169`).
- ESC handler: `if (e.key === 'Escape' && !submitting) onClose?.()` → ESC suppressed.
- Overlay click (`<div className="modal-overlay" onClick={onClose}>`): no `disabled` check → **only escape hatch**.

Users discover the overlay-click escape hatch only by accident. The natural interactions (Cancel button, ESC) are dead. After one network error the form is unusable.

**Fix:**
Pass an `onError` callback (or have the parent return a promise from `onSuccess` so the modal can `await` it) and reset `submitting` to `false` on failure. Minimum-viable fix:

```jsx
// WishFormModal.jsx — change onSuccess invocation:
const handleSubmit = async (e) => {
  e.preventDefault();
  if (submitting) return;
  const errs = validate();
  setErrors(errs);
  if (Object.values(errs).some(Boolean)) return;
  const payload = buildWishPatch(form, wish, mode);
  if (isEdit && Object.keys(payload).length === 0) {
    showToast('未修改任何内容');
    return;
  }
  setSubmitting(true);
  try {
    await onSuccess?.(payload);   // parent must return its promise
  } finally {
    setSubmitting(false);
  }
};
```

The parent handlers (`handleCreateSubmit`, `handleEditSubmit`, `handleAdvance`, `handleReject`) are already `async` and therefore already return promises — they just need to *not* swallow the rejection before it reaches the modal (or re-throw after showing the toast). Apply the same `try/finally` pattern to `WishRejectModal` and `WishAdvanceModal`.

---

## Warnings

### WR-01: `ConfirmModal` "确认撤销" has no disabled state — double-submit possible

**File:** `frontend/src/components/ConfirmModal.jsx:69-79`, consumed by `UserWishesPage.jsx:328-336`

**Issue:**
`ConfirmModal` has no `disabled` prop. While `handleCancelConfirm` awaits `api.cancelWish(cancelTarget.id)` (`UserWishesPage.jsx:210-220`), the user can click "确认撤销" again. The second click triggers a second `api.cancelWish` with the same id. The first call succeeds, the second fails (404/400), and the user sees both a success toast and an error toast.

The Wave-2 SUMMARY explicitly notes that `actingId` was omitted on `UserWishesPage` because "ConfirmModal has no disabled prop" — but the resulting double-submit risk was not addressed.

**Fix:**
Add a `confirming` prop to `ConfirmModal` (or use the existing `danger` button's `disabled`), and have `handleCancelConfirm` toggle it via state:

```jsx
// UserWishesPage.jsx
const [cancelSubmitting, setCancelSubmitting] = useState(false);
const handleCancelConfirm = useCallback(async () => {
  if (!cancelTarget || cancelSubmitting) return;
  setCancelSubmitting(true);
  try {
    await api.cancelWish(cancelTarget.id);
    setCancelTarget(null);
    showToast('已撤销');
    loadWishes({ page: 1, background: true });
  } catch (err) {
    showToast(err.message || '撤销失败', 'error');
  } finally {
    setCancelSubmitting(false);
  }
}, [cancelTarget, cancelSubmitting, loadWishes, showToast]);

// Pass to ConfirmModal
<ConfirmModal
  ...
  confirming={cancelSubmitting}
  onConfirm={handleCancelConfirm}
/>
```

Then in `ConfirmModal.jsx`, accept `confirming` and apply `disabled={confirming}` to both buttons.

---

### WR-02: `WishAdvanceModal` empty-state link to `/chef/dishes` is unreachable for admins; admin advance action is effectively dead code

**Files:** `frontend/src/components/WishAdvanceModal.jsx:131-134`, `frontend/src/App.jsx:210-217`, `backend/app/services/dish_service.py:89-96, 328-335`

**Issue:**
`AdminWishesPage` mounts `ChefWishesPage` with `viewAsAdmin=true`. The admin can click `[推进愿望]` on a `准备中` wish they have claimed (or any wish per Risk 10), opening `WishAdvanceModal`. The modal queries `api.getDishes({ status: 'enabled', chef_filter: 'my-published' })`.

Backend `dish_service.py:89-96` filters by `DishChef.chef_id === current_user.id` with status `published`. Admins do not have `DishChef` rows, so the query returns 0 dishes. The modal always shows the empty state with text `"你还没有发布任何菜品，无法推进愿望"` and a `<Link to="/chef/dishes">前往菜品管理 →</Link>`.

Clicking that link routes to `/chef/dishes`, which is gated by `requiredRoles={['chef']}` (`App.jsx:213`). Admin is excluded and is redirected to `/admin`. The admin is stranded: they cannot advance the wish, cannot reach the suggested remedy, and there is no UI cue explaining the dead-end.

The net effect is that the "admin override" for the advance action (per T-07-P02 / Risk 10) is a no-op for the admin role in practice.

**Fix:**
Either (a) hide the `[推进愿望]` button for admin viewers (drop `viewAsAdmin` from the advance gate at `WishCard.jsx:81`), or (b) special-case the empty-state copy and link target for admin viewers (e.g., `viewAsAdmin` should not see the `/chef/dishes` link — instead surface "管理员暂未发布菜品，请联系厨师推进"), or (c) route admins to a generic dish picker without the `my-published` filter. Pick one and document it.

---

### WR-03: `WishAdvanceModal` empty-state copy is wrong for the search-no-match case

**File:** `frontend/src/components/WishAdvanceModal.jsx:131`

**Issue:**
The empty-state branch fires both when the chef has zero published dishes *and* when the chef has published dishes but the typed `search` query does not match any of them. In both cases the same copy `"你还没有发布任何菜品，无法推进愿望"` is shown. A chef with 30 published dishes who searches for "asdf" is told they have no dishes at all — confusing.

The variable `showEmpty` (line 90) is computed as `!loading && filteredDishes.length === 0`. The server is also filtering by `search`, so this case happens routinely.

**Fix:**
Branch on whether `dishes` (server response) is empty vs `filteredDishes` (client-filtered) is empty:

```jsx
{dishes.length === 0 ? (
  <>
    <EmptyState icon="🍽️" text="你还没有发布任何菜品，无法推进愿望" />
    <div style={{ textAlign: 'center', marginTop: 8 }}>
      <Link to="/chef/dishes">前往菜品管理 →</Link>
    </div>
  </>
) : (
  <EmptyState icon="🔍" text="没有找到匹配的菜品" />
)}
```

---

### WR-04: `loadRelatedDishNames` performs side effects inside a `setState` updater (StrictMode double-call risk)

**Files:** `frontend/src/pages/UserWishesPage.jsx:44-72`, `frontend/src/pages/ChefWishesPage.jsx:76-100`

**Issue:**
Both pages read the latest `relatedDishNames` map by calling `setRelatedDishNames((prev) => { ...; Promise.allSettled(...).then(...); return prev; })`. This uses the state updater function purely to read `prev` — but the updater also fires off a network request as a side effect. React 18 StrictMode double-invokes updater functions in development to surface impurity; this results in duplicate `Promise.allSettled` calls and duplicate `api.getDish(id)` requests per missing id during dev. The `setRelatedDishNames` SUMMARY explicitly documents this pattern as intentional, but it remains an anti-pattern that violates React's contract that updater functions must be pure.

Production behavior is correct (single invocation) but the dev-mode duplicate calls waste bandwidth and can mask other bugs.

**Fix:**
Use a `useRef` mirror of `relatedDishNames` (kept in sync via an effect) for the dedupe check, or pass the current map as an argument to `loadRelatedDishNames(items, relatedDishNames)` and add `relatedDishNames` to its `useCallback` deps.

```jsx
const relatedDishNamesRef = useRef({});
useEffect(() => { relatedDishNamesRef.current = relatedDishNames; }, [relatedDishNames]);

const loadRelatedDishNames = useCallback(async (items) => {
  if (!items || items.length === 0) return;
  const prev = relatedDishNamesRef.current;
  const missing = [...new Set(
    items.map((w) => w.related_dish_id).filter((id) => id != null && !(String(id) in prev))
  )];
  if (missing.length === 0) return;
  const results = await Promise.allSettled(missing.map((id) => api.getDish(id)));
  const next = {};
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value?.name) {
      next[String(missing[index])] = result.value.name;
    }
  });
  if (Object.keys(next).length > 0) {
    setRelatedDishNames((cur) => ({ ...cur, ...next }));
  }
}, []);
```

---

### WR-05: `handleLoadMore` stale-closure race on rapid double-click

**Files:** `frontend/src/pages/UserWishesPage.jsx:238-242`, `frontend/src/pages/ChefWishesPage.jsx:257-261`

**Issue:**
Both pages use the pattern:
```jsx
const handleLoadMore = useCallback(() => {
  setLoadingMore(true);
  setPage((p) => p + 1);
  loadWishes({ page: page + 1 });   // `page` is from the current closure
}, [loadWishes, page]);
```

`setPage` uses the functional updater (correct under batching), but `loadWishes({ page: page + 1 })` reads the stale `page` from the closure. If the user clicks "加载更多愿望" twice before React re-renders (the `disabled={loadingMore}` prop hasn't taken effect yet):
- Click 1: `setPage(p => p+1)` queues update. `loadWishes({ page: 2 })` starts. (page=1 → page+1=2)
- Click 2 (same closure): `setPage(p => p+1)` queues another update (page will become 3). `loadWishes({ page: 2 })` starts again.
- Result: state `page=3`, two requests for page 2, page 3 skipped on next click.

**Fix:**
Compute the next page from the functional updater and reuse it, or use a ref:

```jsx
const handleLoadMore = useCallback(() => {
  setPage((prev) => {
    const next = prev + 1;
    setLoadingMore(true);
    loadWishes({ page: next });
    return next;
  });
}, [loadWishes]);
```

(Doing network work inside a state updater is also impure; the cleanest fix is a `pageRef` mirror updated in an effect, then read `pageRef.current + 1` here.)

---

### WR-06: User-page refresh double-fires on tab regain (visibilitychange + focus both fire)

**File:** `frontend/src/pages/UserWishesPage.jsx:117-128`

**Issue:**
```jsx
const refresh = () => loadWishes({ page: 1, background: true });
const handleVisibility = () => {
  if (document.visibilityState === 'visible') refresh();
};
document.addEventListener('visibilitychange', handleVisibility);
window.addEventListener('focus', refresh);
```

When the user alt-tabs back to the page, both `visibilitychange` (hidden→visible) and `window focus` fire. Both call `refresh()`, generating two near-simultaneous `api.getWishes` calls. The stale-response guard (`requestSeqRef`) ensures correctness, but doubles bandwidth and backend load on every tab return.

**Fix:**
Debounce the refresh, or only listen to one event. A common pattern is to track a "last-refreshed-at" timestamp and skip if recent:

```jsx
const lastRefreshRef = useRef(0);
const refresh = useCallback(() => {
  const now = Date.now();
  if (now - lastRefreshRef.current < 2000) return;  // dedupe within 2s
  lastRefreshRef.current = now;
  loadWishes({ page: 1, background: true });
}, [loadWishes]);
```

---

### WR-07: `ChefWishesPage` tab counts are based on loaded items only — misleading badges

**File:** `frontend/src/pages/ChefWishesPage.jsx:267-268, 280-295`

**Issue:**
```jsx
const pendingCount = wishes.filter((w) => w.status === '待处理').length;
const mineCount = wishes.filter((w) => w.claimed_by_chef_id === user?.id).length;
```

These counts are derived from the currently loaded `wishes` array, not from backend totals. On tab `all` with 20 items loaded and `total=100`, the badges show `全部 (20)`, `待处理 (5)`, `我的认领 (2)` — but the actual totals are larger. On tab `pending`, the `全部` count still shows the loaded subset of pending items. The user infers these are absolute totals.

The plan (Plan 02 Task 2 action) acknowledges this is "acceptable for tabs" because fetching true counts would require an extra query — but the UX is misleading and the badges are positioned where users expect totals.

**Fix:**
Either (a) drop the counts from the tab labels (simplest), (b) show `total` from the backend for the active tab only (e.g., `待处理 (${total})` when `activeTab === 'pending'`), or (c) issue a separate count query per tab on mount.

---

### WR-08: `ConfirmModal` a11y incomplete — no focus trap, no autofocus, no `aria-describedby`

**File:** `frontend/src/components/ConfirmModal.jsx` (whole file); same gaps in `WishFormModal`, `WishRejectModal`, `WishAdvanceModal`

**Issue:**
The threat model (T-07-T08) explicitly defers focus-trap implementation to a "future" iteration, citing UI-SPEC §7.5. The current state:
- No autofocus on mount (focus stays on the triggering element behind the overlay).
- No focus trap — Tab/Shift-Tab can leave the modal and reach background controls.
- No `aria-describedby` for the message body — screen-reader users hear only the title when the dialog opens, not the message text.
- No `FocusReturn` — focus is not restored to the trigger button on close.

The body-overflow lock + ESC handler + `aria-labelledby` are good baseline hardening but fall short of the W3C WAI modal pattern referenced in the plan.

**Fix:**
Minimum-viable completeness:
1. Add `ref` to the confirm button and call `confirmRef.current.focus()` in a mount effect.
2. Add `aria-describedby="confirm-modal-body"` and `id="confirm-modal-body"` to the body wrapper.
3. Track `document.activeElement` at mount, restore focus to it in the cleanup function.
4. Implement a keydown handler for Tab/Shift+Tab that wraps focus within the modal (or pull in `focus-trap-react` — but the plan says no new packages).

---

## Info

### IN-01: `WishDeepLinkRedirect` does not `encodeURIComponent` the `id`

**File:** `frontend/src/App.jsx:88-99`

**Issue:** `return <Navigate to={base + '?wish=' + id} replace />;` interpolates the raw `useParams()` value. `useParams` decodes URL-encoded path segments, so an attacker-crafted `/wishes/foo%26evil` would land at `/my-wishes?wish=foo&evil`. Low impact (receiving page shows missing-toast or no-op), but bad practice. Use `encodeURIComponent(id)`.

### IN-02: `WishAdvanceModal` renders `<img src={dish.image_url}>` without scheme validation

**File:** `frontend/src/components/WishAdvanceModal.jsx:154-155`

**Issue:** `image_url` comes from the backend `dishes` table (trusted). `<img src>` does not execute JavaScript for `javascript:` schemes in modern browsers, so no XSS. However, a malicious chef could set `image_url=https://attacker.example/pixel.png?user=alice` to track viewers via server logs. Out of scope for this phase but worth flagging.

### IN-03: `ChefWishesPage` polling `setInterval` keeps running while hidden — CPU/battery waste

**File:** `frontend/src/pages/ChefWishesPage.jsx:148-155`

**Issue:** The interval callback checks `document.visibilityState === 'visible'` and skips the fetch when hidden, but the timer itself keeps firing every 30s while the tab is backgrounded for minutes/hours. Better: use `visibilitychange` to start/stop the interval, or use `requestIdleCallback`-based scheduling.

### IN-04: `ChefWishesPage.handleClaim/Advance/Reject` silently no-op on rapid cross-card clicks

**File:** `frontend/src/pages/ChefWishesPage.jsx:202-255`

**Issue:** The `if (actingId) return;` guard uses `actingId` from the `useCallback` closure. When the user clicks claim on card A and then immediately clicks claim on card B before React re-renders, the second handler still sees `actingId=null` (stale closure) and proceeds. Both API calls fire. Use a `useRef` mirror (`actingIdRef.current`) for the guard instead of state.

### IN-05: `WishAdvanceModal` retains `selectedDishId` after the selected dish is filtered out client-side

**File:** `frontend/src/components/WishAdvanceModal.jsx:73-86`

**Issue:** User selects dish → types in search box → client-side filter removes the selected dish from view. The "确认推进" button remains enabled with a hidden selection. The submit goes through with a dish the user can no longer see. Reset `selectedDishId` whenever `filteredDishes` no longer contains it.

### IN-06: `WishFormModal.handleSubmit` does not `await` `onSuccess`

**File:** `frontend/src/components/WishFormModal.jsx:113-114` (also `WishRejectModal.jsx:43-44`, `WishAdvanceModal.jsx:85-86`)

**Issue:** `onSuccess?.(payload)` returns a promise (the parent is async) but is not awaited. Currently safe because the parent catches errors internally, but the modal cannot react to success/failure — which is the root cause of CR-02. Awaiting the returned promise would enable `try/finally` around `setSubmitting`.

### IN-07: `WishCard` reference-URL link click bubbles to the root `onClick`, clearing the unread dot

**File:** `frontend/src/components/WishCard.jsx:131-149`

**Issue:** For a submitter viewing their own wish with `has_unread=true`, the root `onClick={() => onTap?.(wish)}` fires when the user clicks the `<a href={reference_url}>` link (which also opens in a new tab). The `<a>` click bubbles up; the action row stops propagation but the secondary-content row does not. Net effect: opening the reference link also marks the wish as read. Likely unintended but harmless. Add `onClick={(e) => e.stopPropagation()}` to the secondary container if this is not desired.

### IN-08: `ChefWishesPage` tab-change effect uses `queueMicrotask` to defer `setState`, producing a one-frame visual flicker

**File:** `frontend/src/pages/ChefWishesPage.jsx:128-145`

**Issue:** The microtask defers `setLoading(true); setPage(1);` by one tick. Between the URL change (which immediately recomputes `activeTab`) and the microtask firing, the user sees one paint with the new tab pill highlighted but the old tab's wish list still visible. The SUMMARY calls this "imperceptible" but on slower devices it is visible. Alternative: gate the entire effect behind a `loading` state machine rather than deferring setState.

### IN-09: CSS `.wish-card-unread-dot { right: 96px }` is fragile

**File:** `frontend/src/css/styles.css:433`

**Issue:** The 96px offset assumes a fixed-width status badge to its right. If a future status string is wider (e.g., during i18n), the dot will overlap the badge. Prefer positioning the dot inside `.wish-card-badge-slot` with `position: relative` on the slot rather than hardcoding `right: 96px` against the card.

### IN-10: `ChefWishesPage` tab-change effect does not cancel in-flight fetch on cleanup

**File:** `frontend/src/pages/ChefWishesPage.jsx:128-145`

**Issue:** The effect uses `requestSeqRef` to discard stale responses, but the network request itself is not aborted via `AbortController`. On rapid tab switching, multiple in-flight requests continue consuming bandwidth until they resolve. Production impact is minor but the pattern could be improved.

### IN-11: `WishFormModal` textareas/inputs do not show character-count near `maxLength`

**File:** `frontend/src/components/WishFormModal.jsx:155-204`

**Issue:** `maxLength={MAX_NAME}` (100), `MAX_URL` (500), `MAX_NOTE` (500) silently truncate input. Users near the limit get no warning until the field stops accepting characters. Add a `<div className="char-count">{value.length}/{MAX}</div>` below each field.

### IN-12: `ConfirmModal` lacks `aria-describedby` for the message body

**File:** `frontend/src/components/ConfirmModal.jsx:42, 50, 59-64`

**Issue:** The dialog declares `aria-labelledby="confirm-modal-title"` but no `aria-describedby`. Screen-reader users hear only the title ("撤销愿望") when the dialog opens; the message ("撤销后无法恢复，确定要撤销「X」吗？") is announced only if they navigate into the body. Add `id="confirm-modal-body"` to the message wrapper and `aria-describedby="confirm-modal-body"` to the overlay.

---

_Reviewed: 2026-07-23T02:30:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
