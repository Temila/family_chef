# Domain Pitfalls: Guest Ordering Invitation Feature

**Domain:** Guest/unauthenticated ordering flow added to existing authenticated family meal ordering system
**Researched:** 2026-05-24
**Confidence:** HIGH (based on codebase analysis + library documentation + established patterns)

---

## Critical Pitfalls

Mistakes that cause security vulnerabilities, data corruption, or require significant rewrites.

---

### Pitfall 1: Token Enumeration via Timing / Error Differentiation

**What goes wrong:** The guest invitation endpoint returns different error messages or response times depending on whether a token exists, is expired, or has been used. An attacker systematically probes tokens to discover valid ones.

**Why it happens:** Developers naturally write helpful error messages like "邀请链接不存在" (link not found) vs "邀请链接已过期" (link expired) vs "邀请链接已使用" (link already used). These distinctions leak state.

**Consequences:** With ~128 bits of entropy in UUID4, brute-force is infeasible — but if token generation is weak (e.g., sequential IDs, short hex strings), enumeration becomes practical. Even with UUID4, the API design pattern of revealing token state is a bad habit that amplifies any future token weakness.

**Prevention:**
- Use a single generic error for all invalid-token cases: "链接无效或已过期"
- Do NOT distinguish between expired, used, and non-existent tokens in the API response
- Use constant-time comparison for token validation (`hmac.compare_digest`) to prevent timing attacks
- Ensure response time is consistent regardless of whether the token exists in DB

**Detection:** Review all guest-facing endpoints — if any return different messages based on token state, it's vulnerable.

```python
# BAD — leaks token state
if not invitation:
    raise HTTPException(404, "邀请链接不存在")
if invitation.is_expired:
    raise HTTPException(410, "邀请链接已过期")
if invitation.is_used:
    raise HTTPException(409, "邀请链接已使用")

# GOOD — single generic response
if not invitation or not invitation.is_valid:
    raise HTTPException(404, "链接无效或已过期")
```

**Confidence:** HIGH — well-established security pattern, confirmed by FastAPI security docs and OWASP guidelines.

---

### Pitfall 2: Race Condition on One-Time Link Use (Double Submission)

**What goes wrong:** A guest (or attacker) opens the invitation link in two browser tabs. Both tabs submit an order simultaneously. Two orders get created from a single "one-time" invitation.

**Why it happens:** The check-then-act pattern (`if not invitation.is_used: ... create order ... mark used`) is not atomic. Between the check and the mark, another request can pass the same check. This is the **exact same pattern** as the existing order number race condition documented in CONCERNS.md (line 68-70).

**Consequences:** Violates the "one link = one order" business rule. Chef receives two orders for the same guest. Invitation remains "used" but two orders exist with no way to reconcile.

**Prevention:**
- Use an atomic database-level approach: set `is_used = True` with a WHERE clause condition and check affected row count
- Wrap the entire check-usage-and-create-order sequence in a database transaction with appropriate isolation
- Add a UNIQUE constraint or database-level lock on the invitation's usage state

```python
# BAD — race condition window between check and update
invitation = await db.execute(select(GuestInvitation).where(token == token))
if invitation.is_used:
    raise Error("已使用")
invitation.is_used = True  # <-- another request can pass the check before this commits

# GOOD — atomic compare-and-swap
result = await db.execute(
    update(GuestInvitation)
    .where(GuestInvitation.token == token, GuestInvitation.is_used == False)
    .values(is_used=True, used_at=datetime.now(timezone.utc))
)
if result.rowcount == 0:
    raise HTTPException(409, "链接已使用或无效")
# Now safely create order
```

**Existing codebase amplification:** The codebase already has the order number race condition (CONCERNS.md line 68-70) with the same count-then-insert pattern. SQLite's single-writer lock provides limited protection under async concurrency — `await` yields control between the check and the write.

**Confidence:** HIGH — confirmed by SQLAlchemy AsyncSession docs ("not safe for use in concurrent tasks") and existing known bug in codebase.

---

### Pitfall 3: CSRF on Guest Order Submission Endpoint

**What goes wrong:** The guest order submission endpoint (`POST /api/guest/orders`) has no CSRF protection. Since guest endpoints don't use JWT (no Authorization header), the browser sends cookies automatically. If CORS is configured as `allow_origins: ["*"]` (which it currently is — see CONCERNS.md line 108), any website can forge a POST request to submit a guest order.

**Why it happens:** CSRF is typically associated with cookie-based auth. Developers reason "guests have no auth, so no CSRF risk." This is wrong if:
1. The token is passed in the URL (GET param) — attacker can craft the URL
2. The token is passed in the request body — attacker can include it
3. CORS is set to `allow_origins: ["*"]` — any origin can send the request

**Consequences:** A malicious website can submit orders on behalf of a guest who clicks a crafted link. The guest's "one-time" invitation is consumed without their knowledge.

**Prevention:**
- Pass the invitation token in the request body (not URL) for the POST submission
- Validate the `Origin` or `Referer` header on guest POST endpoints
- Use a custom header (e.g., `X-Request-With`) that browsers don't send cross-origin automatically
- **Most importantly**: Do NOT rely on the current `allow_origins: ["*"]` CORS config for guest endpoints — restrict to your actual frontend origin

```python
# Add to guest order endpoint
@router.post("/guest/orders")
async def guest_submit_order(
    request: Request,
    body: GuestOrderCreate,  # token is in body, not URL
):
    origin = request.headers.get("origin")
    if origin and origin not in ALLOWED_ORIGINS:
        raise HTTPException(403, "Forbidden origin")
    # ... proceed with order
```

**Confidence:** HIGH — FastAPI 0.65.2 release notes explicitly document a CSRF fix (Content-Type check before assuming JSON). Current codebase CORS config is `["*"]` (confirmed in config.yaml line 41).

---

### Pitfall 4: `Order.user_id` is `nullable=False` — Guest Orders Break

**What goes wrong:** The existing `Order` model has `user_id = Column(Integer, ForeignKey("users.id"), nullable=False)`. The PROJECT.md Key Decision to "set user_id to NULL for guest orders" (line 72) will fail immediately — the database constraint rejects NULL, and SQLAlchemy will raise an IntegrityError.

**Why it happens:** The decision was made at the architecture level without checking the actual model definition. The model was designed for authenticated users only.

**Consequences:** Either: (a) the migration fails, (b) runtime errors on every guest order, or (c) developers hack around it with a fake user record (which creates worse problems — ghost users in user lists, stats, and notifications).

**Prevention:**
- Run an Alembic migration to alter `user_id` from `NOT NULL` to `NULLABLE` on the `orders` table
- Update the SQLAlchemy model: `user_id = Column(Integer, ForeignKey("users.id"), nullable=True)`
- Audit ALL code that accesses `order.user_id` without null-checks — there are many:
  - `order_service.py:98` — `create_order_auto_split()` takes `user_id` as required param
  - `order_service.py:179` — `notify_order()` fetches `User` by `user_id` — will return None for guests
  - `order_service.py:335` — `update_order_status()` fetches `User` by `order.user_id`
  - `order_service.py:387` — `cancel_order()` checks `order.user_id != user_id` — always True for guest
  - Frontend `OrderPage` likely assumes `user` exists on order objects

**Prevention:**
```python
# Migration: alembic revision --autogenerate -m "allow_null_user_id_on_orders"
op.alter_column('orders', 'user_id', nullable=True)

# Model update
user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # was nullable=False

# Guard ALL user access
user_name = "访客"
if order.user_id:
    user_result = await db.execute(select(User).where(User.id == order.user_id))
    order_user = user_result.scalar_one_or_none()
    if order_user:
        user_name = order_user.display_name or order_user.username
```

**Confidence:** HIGH — verified by reading `backend/app/models/order.py` line 13: `nullable=False`.

---

### Pitfall 5: Frontend Auth Redirect Loop on Guest Routes

**What goes wrong:** The guest order page is added as a route inside the existing React SPA. The `ProtectedRoute` wrapper (App.jsx line 36-60) checks `useAuth().user` — if no user is logged in, it redirects to `/login`. Guest users have no token, so they get redirected to `/login`, which redirects back (or to `/`) creating a loop.

**Why it happens:** The existing SPA wraps nearly every route in `<ProtectedRoute>` (23 routes in App.jsx). The natural developer instinct is to add the guest route alongside existing routes. But the `ProtectedRoute` component unconditionally redirects unauthenticated users.

**Consequences:** Guest users see a blank page or infinite redirect. If they somehow reach the guest page via direct URL, the API client (`client.js` line 30-37) intercepts 401 responses and does `window.location.href = '/login'` — which is wrong for guest endpoints that intentionally don't use JWT.

**Prevention:**
- **Best approach (per PROJECT.md Key Decision):** Create the guest ordering page as a completely separate route **outside** the `<ProtectedRoute>` wrapper and **outside** the `<PcLayout>` wrapper (which includes the Sidebar).
- Do NOT use `api.getAuthHeader()` for guest API calls — create a separate `GuestApiClient` that sends the invitation token in the request body instead.
- Place the guest route **before** the catch-all `*` route (App.jsx line 240: `<Route path="*" element={<Navigate to="/" replace />} />`)
- The guest page should NOT use `useAuth()` or `AuthProvider` at all — it's a standalone page.

```jsx
// In App.jsx — guest route OUTSIDE ProtectedRoute and PcLayout
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/force-change-password" element={<ForceChangePasswordPage />} />
  {/* GUEST ROUTE — no auth, no sidebar */}
  <Route path="/guest/:token" element={<GuestOrderPage />} />
  <Route path="/" element={<RedirectRoute />} />
  
  <Route element={<PcLayout />}>
    {/* ... all protected routes ... */}
  </Route>
  
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

**Also critical:** The `ApiClient.request()` method (client.js line 30-37) auto-redirects to `/login` on any 401. Guest endpoints must NOT return 401 — they should use 404/410 for invalid tokens. Or create a separate API client for guest endpoints that doesn't intercept 401.

**Confidence:** HIGH — verified by reading App.jsx ProtectedRoute implementation and client.js 401 handling.

---

## Moderate Pitfalls

### Pitfall 6: Mid-Order Link Expiration

**What goes wrong:** A guest opens the invitation link at 1:59 PM. The link expires at 2:00 PM. The guest spends 5 minutes browsing dishes and selecting items. When they submit at 2:04 PM, the server rejects the submission because the link has expired. All their selections are lost.

**Why it happens:** Expiration is checked server-side on each request (the "database layer check" from PROJECT.md line 74). The guest frontend doesn't know when the link expires and can't warn the user.

**Consequences:** Frustrated guest gives up. Chef doesn't get the order. The invitation is now "expired" but was never actually used — a wasted invitation.

**Prevention:**
- Return the expiration timestamp in the initial invitation validation response so the frontend can display a countdown
- Add a client-side timer that warns the guest when they have < 5 minutes remaining
- Consider a grace period: allow submission within N minutes of the page load, even if the link technically expired while browsing
- **Critical:** Don't check expiration on every dish-list API call — only check on the initial page load and the final submission. This avoids the case where the dish list API returns 404 while the guest is browsing.

```python
# API response for initial invitation validation
{
    "token": "abc-123",
    "chef_name": "张大厨",
    "expires_at": "2026-05-24T14:00:00Z",  # Frontend needs this!
    "status": "valid"
}
```

**Confidence:** HIGH — standard UX pattern for time-limited flows.

---

### Pitfall 7: WeChat In-App Browser Link Mangling

**What goes wrong:** The invitation link is shared via WeChat (微信). WeChat's in-app browser modifies URLs — it may add tracking parameters, strip fragments, or in some versions, open links in its own "webview" with different behavior than standard browsers. The token in the URL might be corrupted or the SPA routing might fail.

**Why it happens:** WeChat is the primary sharing channel for Chinese users (stated in PROJECT.md line 34: "朋友通常通过手机微信打开链接"). WeChat's built-in browser has known quirks:
- May not properly handle SPA client-side routing (React Router)
- History API may behave differently
- localStorage may be cleared when the user leaves the webview
- Cookie handling is inconsistent across WeChat versions

**Consequences:** Guest can't access the ordering page, or the page loads but state is lost mid-session.

**Prevention:**
- Put the invitation token in the URL path (`/guest/{token}`) not in query parameters (`/guest?t={token}`) — path-based tokens are less likely to be stripped by URL processors
- Don't rely on localStorage for guest session state — use React state or sessionStorage (which is tab-scoped and survives page reloads but not new tabs)
- Test in WeChat DevTools (微信开发者工具) before launch
- Consider a server-rendered "landing" page that then redirects to the SPA, ensuring the token survives the initial load

**Confidence:** MEDIUM — WeChat behavior is well-documented in Chinese developer community but varies by version. Specific behavior should be validated during development.

---

### Pitfall 8: Notification Sent to Wrong Person or Missing Guest Name

**What goes wrong:** After a guest submits an order, the Feishu notification goes to the wrong person (the guest's "user" — but guests have no user record) or the notification shows "未知用户" (unknown user) because `order.user` is NULL.

**Why it happens:** The existing `notify_order()` method (order_service.py line 168-226) is designed for registered users:
- Line 179: Fetches `User` by `user_id` — will be None for guest orders
- Line 180: Gets `user_name` from the user record — crashes or returns "未知用户"
- Line 183: Fetches `TastePreference` by `user_id` — returns empty for guests (acceptable)
- Line 221-224: Notifies the **chef** — this is correct for guest orders, but the notification content will be confusing

**Consequences:** Chef receives a notification saying "未知用户 下单了" — no way to know which friend this order is from. Or worse, the notification crashes due to NoneType access on the user object.

**Prevention:**
- Store a `guest_name` field on the invitation (optional — the guest can enter their name when ordering) or in the order notes
- Modify `notify_order()` to handle the NULL user_id case
- Pass the guest's display info from the invitation, not from a User record
- The notification should clearly indicate this is a "访客订单" (guest order)

```python
# Updated notification logic
if order.user_id:
    # Existing user order
    user_result = await db.execute(select(User).where(User.id == order.user_id))
    order_user = user_result.scalar_one_or_none()
    user_name = order_user.display_name if order_user else "未知用户"
else:
    # Guest order — get name from invitation
    inv_result = await db.execute(
        select(GuestInvitation).where(GuestInvitation.order_id == order.id)
    )
    invitation = inv_result.scalar_one_or_none()
    user_name = invitation.guest_name if invitation and invitation.guest_name else "访客"
```

**Confidence:** HIGH — verified by reading `notify_order()` implementation at order_service.py lines 168-226.

---

### Pitfall 9: Invitation Table Design Leaking Chef Information

**What goes wrong:** The `guest_invitations` table stores `chef_id` (the chef whose dishes the guest can see). If the guest API returns the full invitation object including `chef_id`, or if the dish-list endpoint for guests doesn't filter properly, a guest could discover other chefs' dishes or the internal user IDs.

**Why it happens:** Reusing existing dish-list endpoints with a "chef_id filter" parameter. If the guest passes a different `chef_id` in the query, they see another chef's dishes.

**Consequences:** Information disclosure — a guest can see all dishes from all chefs, not just the invited chef.

**Prevention:**
- Create a dedicated guest dish-list endpoint that hardcodes the chef_id from the invitation token — do NOT accept chef_id as a request parameter
- Do NOT expose internal `user_id` values in guest-facing API responses
- Validate that every dish in the guest's order belongs to the invitation's bound chef

```python
# BAD — guest can manipulate chef_id
@router.get("/guest/dishes")
async def guest_list_dishes(chef_id: int, ...):
    # Guest could pass any chef_id!

# GOOD — chef_id comes from invitation, not request
@router.get("/guest/{token}/dishes")
async def guest_list_dishes(token: str, ...):
    invitation = await validate_invitation(token)
    # chef_id is hardcoded from invitation
    dishes = await dish_service.list_dishes(db, chef_id=invitation.chef_id)
```

**Confidence:** HIGH — standard authorization bypass pattern.

---

### Pitfall 10: Order Number Race Condition Amplified by Guest Flow

**What goes wrong:** The existing order number generation has a known race condition (CONCERNS.md line 68-70). Guest orders add a new concurrent path: guests and authenticated users can now create orders simultaneously, increasing the likelihood of collision.

**Why it happens:** `generate_order_no()` (order_service.py line 24-40) uses count-then-insert. With guest orders, there are now two code paths (authenticated + guest) both calling this method concurrently.

**Consequences:** Duplicate order numbers, UNIQUE constraint violations (which at least are caught), or silent data corruption if the constraint is somehow bypassed.

**Prevention:** Fix the root cause before adding guest orders:
- Use `uuid.uuid4().hex[:8].upper()` for all order numbers (the fallback at line 40 already does this)
- Or use a database sequence
- Or add a proper `SELECT ... FOR UPDATE` lock within a transaction

**Confidence:** HIGH — existing known bug, amplified by new concurrent flow.

---

## Minor Pitfalls

### Pitfall 11: Guest Order Appears in User's Order History

**What goes wrong:** If `user_id` is set to the invitation creator's ID (rather than NULL), guest orders appear in the inviting user's order history, mixing up their personal orders with guest orders they merely invited.

**Prevention:** Use `user_id = NULL` for guest orders. Add an `is_guest_order` flag or a `source` column (`"user"` / `"guest_invitation"`) to filter guest orders out of normal user queries.

**Confidence:** HIGH — straightforward data modeling concern.

---

### Pitfall 12: Multiple Invitations from Same User to Same Chef

**What goes wrong:** No limit on how many invitations a user can create for the same chef. A user could spam-create hundreds of invitations, each creating a database record. Over time, the `guest_invitations` table fills with unused expired links.

**Prevention:** Add a reasonable rate limit (e.g., max 5 active invitations per user at a time). Add periodic cleanup of expired invitations.

**Confidence:** MEDIUM — depends on expected usage patterns.

---

### Pitfall 13: Guest Page Loads Main App Bundle (Performance on Mobile)

**What goes wrong:** The guest ordering page is part of the main SPA bundle. The guest downloads the entire React app (including all admin pages, order management, etc.) just to see a simple dish list and submit button. On a mobile WeChat connection, this could be 500KB+ of unnecessary JavaScript.

**Prevention:** Consider lazy-loading the guest page component. Or, if the PROJECT.md Key Decision is to make it "independent from the main SPA," use Vite's code splitting with `React.lazy()` for the GuestOrderPage component.

```jsx
const GuestOrderPage = React.lazy(() => import('./pages/GuestOrderPage'));
```

**Confidence:** MEDIUM — depends on actual bundle size, which should be measured.

---

### Pitfall 14: Guest Access to Admin/Debug Endpoints

**What goes wrong:** The guest ordering flow bypasses JWT authentication. If the guest endpoints accidentally expose or can reach other endpoints that also bypass auth (e.g., the currently unauthenticated `GET /api/users` endpoint documented in CONCERNS.md line 73-78), a guest user can enumerate all users, roles, and Feishu open IDs.

**Prevention:** Fix the existing unauthenticated endpoints (CONCERNS.md lines 73-84) BEFORE implementing guest flow. Audit all endpoints that don't use `Depends(get_current_user_from_token)`.

**Confidence:** HIGH — existing known vulnerability, must fix regardless.

---

### Pitfall 15: Invitation Token in URL Gets Logged

**What goes wrong:** The invitation link `/guest/{token}` is accessed by the guest. Server access logs record the full URL including the token. If logs are stored persistently or shared, the token is exposed. The middleware logging module (`middleware/logging.py`) logs request details including paths.

**Prevention:** Strip or hash the token in access logs. Or use a short-lived signed URL pattern where the token in logs is useless after expiration.

**Confidence:** MEDIUM — standard operational security concern.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Database migration | `Order.user_id` NOT NULL constraint blocks guest orders (#4) | Create Alembic migration first, update model, audit all `order.user` access |
| Guest invitation API | Token enumeration via error messages (#1) | Single generic error, constant-time comparison |
| Guest order submission | Race condition on one-time use (#2) | Atomic compare-and-swap on `is_used` field |
| Guest frontend page | Auth redirect loop from ProtectedRoute (#5) | Route outside ProtectedRoute and PcLayout; separate API client |
| Feishu notification | NULL user_id crashes `notify_order()` (#8) | Handle NULL user_id branch; use guest name from invitation |
| CORS configuration | `allow_origins: ["*"]` enables CSRF on guest endpoints (#3) | Restrict CORS to actual frontend origin |
| Order number generation | Race condition amplified by guest concurrent orders (#10) | Fix root cause (use UUID-based order numbers) |
| Mobile/WeChat testing | URL mangling in WeChat in-app browser (#7) | Test in WeChat DevTools; put token in URL path |
| Expiration handling | Guest loses selections when link expires mid-order (#6) | Return `expires_at` in API response; client-side countdown |
| Dish authorization | Guest sees other chefs' dishes via parameter manipulation (#9) | Hardcode chef_id from invitation, don't accept as parameter |

---

## Summary: Must-Fix-Before-Starting Checklist

These issues from the existing codebase MUST be addressed before adding guest features:

1. **`Order.user_id` nullable migration** — Without this, guest orders are impossible (#4)
2. **Fix `notify_order()` NULL user handling** — Will crash on every guest order (#8)
3. **Fix order number race condition** — Guest flow amplifies the existing bug (#10)
4. **Restrict CORS from `["*"]`** — Guest endpoints without JWT are CSRF-vulnerable with wildcard CORS (#3)
5. **Fix unauthenticated user endpoints** — Guest users can enumerate all users via existing bugs in CONCERNS.md

---

## Sources

- **FastAPI security docs** (Context7): OAuth2PasswordBearer, `auto_error=False` for optional auth, CSRF fix in 0.65.2
- **SQLAlchemy AsyncSession docs** (Context7): "AsyncSession is not safe for use in concurrent tasks"
- **React Router docs** (Context7): `redirect()` in loaders, middleware for auth guards
- **Codebase analysis**: `backend/app/models/order.py`, `backend/app/services/order_service.py`, `frontend/src/App.jsx`, `frontend/src/contexts/AuthContext.jsx`, `frontend/src/api/client.js`, `backend/app/routers/auth.py`
- **CONCERNS.md**: Existing race conditions, unauthenticated endpoints, CORS misconfiguration
- **PROJECT.md**: Key decisions on guest flow architecture

---

*Pitfalls research: 2026-05-24*
