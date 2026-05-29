# Feature Landscape: Guest Ordering Invitation

**Domain:** Family meal ordering app — guest ordering via shareable invitation links
**Researched:** 2026-05-24
**Confidence:** HIGH (based on existing codebase analysis + established UX patterns from food ordering apps)

---

## Table Stakes

Features users expect. Missing = product feels broken or untrustworthy.

### Invitation Generation (for registered users)

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| G1 | Generate unique invitation link (one-click) | Core value prop — the entire feature starts here | Low | Single API endpoint, returns UUID4 token. Existing `User` model has role field to determine if chef auto-binds or chef picker needed. |
| G2 | Link auto-expires after 2 hours | Safety expectation — no one wants a stale link floating around | Low | Database-level `expires_at` column, checked on every access. No background task needed. |
| G3 | Chef role auto-binds self as chef | Natural UX — chef generates link, they ARE the cook | Low | Read `current_user.role === 'chef'`, set `chef_id = current_user.id` |
| G4 | User role must pick a chef when generating | Logical — non-chef needs to specify who's cooking | Med | Requires chef picker UI. Existing `chefs` router (`/api/chefs`) likely returns chef list. Reuse `DishChef` model to find available chefs. |
| G5 | Copy link to clipboard | Table stakes for sharing — user needs to give link to guest | Low | `navigator.clipboard.writeText()` + toast. Already have ToastContext. |
| G6 | Share via WeChat / SMS intent | Primary sharing channel is WeChat in China; mobile users expect native share sheet | Med | Use Web Share API (`navigator.share()`) with fallback to copy-link. WeChat in-app browser supports this. |
| G7 | See list of my generated invitations | Creator needs to manage/know what links are active | Med | New `GET /api/guest/invitations` endpoint. Simple list page with status (active/expired/used). |

### Guest Ordering Experience

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| G8 | Access menu via link — no login required | This IS the feature. Guest refuses to register for a one-time meal | Low | Public route `/guest/:token` that bypasses JWT auth. FastAPI dependency validates token, not JWT. |
| G9 | View chef's available dishes (with images, ingredients) | Guest needs to know what they can order | Low | Query `Dish` + `DishChef` where `chef_id = invitation.chef_id` and `DishChef.status = 'listed'`. Existing dish listing logic reusable. |
| G10 | Add dishes to cart with quantity | Basic ordering interaction | Med | Reuse cart pattern from `OrderPage.jsx`. Guest cart is simpler: no multi-chef split, no favorites filter. State lives in React only (no backend cart for guest). |
| G11 | Submit order (one-time only per link) | Core constraint — one link = one order. Prevents abuse. | Med | Validate `invitation.status` on submit. Update to `'used'` in same transaction as order creation. |
| G12 | See confirmation after submission | User expects feedback that their order went through | Low | Simple success page with order summary. No need for order tracking for guests. |
| G13 | Mobile-first responsive layout | Guests open link on phone (WeChat in-app browser) | Med | New guest page must be standalone — no Sidebar, no PcLayout. Full-width mobile layout. Use CSS already in codebase. |
| G14 | Chinese language UI | Target users are Chinese-speaking family/friends | Low | All guest-facing text in Chinese. Existing app already uses Chinese throughout. |

### Post-Order (for chef)

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| G15 | Feishu notification when guest submits | Chef needs to know a guest ordered — this is how they get notified | Low | Reuse `FeishuClient.send_order_notification()`. Add guest identifier (e.g., "访客订单") to notification content. |
| G16 | Guest order visible in chef's order list | Chef must see and manage the order like any other | Low | Guest orders use same `Order` model with `user_id = NULL`. Existing `ChefOrdersPage` should display these with a "访客" badge. |

---

## Differentiators

Features that elevate the experience beyond minimum viable. Not expected, but valued.

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------|-------------------|------------|-------|
| D1 | Guest can leave dietary notes on order | Guest may be vegetarian/allergic — chef needs to know | Low | Add optional `guest_notes` field to guest order form. Pass to order as `notes`. Already supported by `Order.notes` column. |
| D2 | Link shows remaining time countdown | Creates urgency, helps guest understand the window | Low | Frontend-only: `expires_at - now` timer. Pure UX polish. |
| D3 | Chef can revoke/expire invitation early | Chef changes plans — needs to invalidate link | Low | `POST /api/guest/invitations/:id/revoke`. Set status to `'revoked'`. Simple status update. |
| D4 | Guest order includes guest's display name (optional) | Chef knows WHO ordered — "小明的朋友" is more useful than "访客" | Low | Optional name field on guest order form. Store in `Order.notes` prefix or new `guest_name` column on invitation. |
| D5 | Invitation QR code | Easy scanning in person instead of copying link | Med | Generate QR code on frontend using `qrcode.react` or similar. Useful when guest is physically present. |
| D6 | Read-only order view after submission | Guest can see what they ordered if they revisit the link | Med | After submission, link shows order summary instead of menu. Store `order_id` on invitation record. |
| D7 | Chef sees which invitations are unused vs used vs expired | Management view for chef to know link status | Low | Part of G7 — status badges (active/expired/used/revoked) on invitation list. |
| D8 | Graceful error pages (expired/used/invalid link) | Professional feel instead of blank 404 | Low | Custom pages: "链接已过期", "订单已提交", "无效链接". Clear Chinese messaging. |

---

## Anti-Features

Features to explicitly NOT build. These would hurt the experience or add unnecessary complexity.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Guest registration/login | Destroys the entire value prop — guest is supposed to be frictionless | Token-based access only. No accounts for guests. |
| Guest order modification/cancellation | Adds enormous complexity (auth, state management, race conditions with chef cooking) | "Contact your host" message on confirmation page. Guest calls/texts the inviter. |
| Multiple orders per link | Breaks the "one-time" security model and creates ambiguity about whose order it is | Strictly one order per link. Generate new link for another order. |
| Guest preference/dietary profile | Over-engineering for a one-time interaction. Guest shouldn't have to fill a profile | Optional free-text notes field per order (D1). Maximum 200 chars. |
| Menu customization per invitation | Chef doesn't want to curate a menu per guest — they cook what they cook | Show all chef's listed dishes. If chef wants to hide dishes, they manage that via existing DishChef status. |
| Payment integration | This is a family app, not a restaurant. No money changes hands via the app. | Explicitly out of scope. Free meal from family/friend. |
| Real-time order tracking (live status) | Overkill for a family dinner context. Chef isn't a delivery driver. | Feishu notification on submission is sufficient. Chef updates status manually as before. |
| Guest push notifications | No way to push notifications without a registered device/account | Link becomes read-only after submission (D6). Guest bookmarks or screenshots. |
| Social media sharing buttons | Private family context — invitation links are not for public broadcasting | Copy-link and WeChat/SMS direct share only (G5, G6). No "share to feed" feature. |
| Guest browsing history or recommendations | One-time interaction. No need for ML or personalization. | Simple menu list, maybe grouped by category. Keep it dead simple. |
| Rating/review system | This isn't Yelp. Chef is your family member. | Absolutely not. Implied trust in family context. |

---

## Feature Dependencies

```
G1 (Generate link) ─────► G8 (Guest accesses menu via link)
     │                           │
     ├── G3 (Chef auto-bind)     ├── G9 (View dishes)
     ├── G4 (User picks chef)    ├── G10 (Add to cart)
     └── G2 (2hr expiry)         └── G11 (Submit order)
                                       │
                                       ├── G12 (Confirmation page)
                                       ├── G15 (Notify chef)
                                       └── G16 (Chef sees order)

G5 (Copy link) ◄── G1 (Generate link)
G6 (Share link) ◄── G1 (Generate link)
G7 (Invitation list) ◄── G1 (Generate link)

D6 (Read-only view) ◄── G11 (Submit order) — stores order_id on invitation
D3 (Revoke link) ◄── G1 (Generate link) — needs invitation management
D8 (Error pages) ◄── G2 (Expiry) + G11 (One-time use)

G13 (Mobile layout) — independent, applies to all guest-facing features
G14 (Chinese UI) — independent, applies to all guest-facing features
```

### Hard Dependencies (must build in order)

1. **Database model** (`guest_invitations` table) — everything depends on this
2. **Invitation creation API** (G1 + G2 + G3/G4) — guest flow needs links to exist
3. **Guest menu API** (G8 + G9) — guest needs to see dishes before ordering
4. **Guest order submission** (G10 + G11) — core loop closes here
5. **Notification** (G15) — chef needs to know about the order
6. **Frontend pages** (G13 + G14 + all guest UI) — visible to end user

---

## Complexity Estimates

### By Feature Cluster

| Cluster | Features | Backend Work | Frontend Work | DB Migration | Total Effort |
|---------|----------|-------------|---------------|-------------|-------------|
| **Invitation Model** | G1, G2, G3, G4 | New model + migration + service | Minimal | Yes (new table) | 0.5 day |
| **Invitation Generation UI** | G1, G3, G4, G5, G6 | Reuse existing endpoints | New modal + chef picker + share button | No | 0.5 day |
| **Guest Menu API** | G8, G9 | 1 new public endpoint + token validation | No | No | 0.5 day |
| **Guest Menu Page** | G9, G10, G13, G14 | No | New standalone page (simplified OrderPage) | No | 1 day |
| **Guest Order Submission** | G11, G12 | 1 new public endpoint, reuse order creation logic | Confirmation UI | No (reuse orders table, `user_id=NULL`) | 1 day |
| **Chef Notification** | G15 | Extend existing Feishu notification with guest marker | No | No | 0.5 day |
| **Invitation Management** | G7, D3, D7 | List + revoke endpoints | New list page/section | No | 0.5 day |
| **Polish & Error Handling** | D2, D6, D8 | Read-only endpoint, error responses | Countdown, error pages, read-only view | No | 0.5 day |
| **Guest Name + Notes** | D1, D4 | Optional fields on invitation/order | Name input + notes textarea | Maybe (if `guest_name` column) | 0.5 day |

### Total Estimated Effort: 5–6 days

### Risk Areas (could expand)

| Risk | Why | Mitigation |
|------|-----|------------|
| `Order.user_id` currently `nullable=False` | Migration needed to allow NULL for guest orders | Check current model — it says `nullable=False` but PROJECT.md says "user_id 可为 NULL". Needs Alembic migration to alter column. |
| Frontend guest page is standalone SPA route | Must not load PcLayout, Sidebar, auth context | Create separate route tree in App.jsx outside `<PcLayout>`. Guest page is fully self-contained. |
| WeChat in-app browser quirks | WeChat WebView has limited Web Share API support | Test fallback: copy-to-clipboard button as primary, Web Share as enhancement. |
| DishChef status filtering | Must only show `'listed'` dishes to guest, not hidden/draft | Verify `DishChef.status` values in existing code. Add filter to guest menu query. |
| Rate limiting for guest endpoints | Public endpoints are abuse vectors | Extend existing `RateLimiter` middleware. Add per-token and per-IP limits for guest endpoints. |

---

## MVP Recommendation

### Phase 1 — Core Loop (must-have, ~3 days)

Build the minimal end-to-end flow:

1. **G1** Generate invitation link (API + simple button in existing UI)
2. **G2** 2-hour auto-expiry (DB column + validation)
3. **G3** Chef auto-binds when generating
4. **G4** User picks chef when generating
5. **G8** Guest accesses menu via link (public route, token validation)
6. **G9** Guest views chef's listed dishes
7. **G10** Guest adds dishes to cart
8. **G11** Guest submits order (one-time enforcement)
9. **G12** Confirmation page after submission
10. **G13** Mobile-first layout
11. **G14** Chinese language UI
15. **G15** Feishu notification to chef

### Phase 2 — Management & Polish (should-have, ~1.5 days)

1. **G5** Copy link to clipboard
2. **G6** Share via WeChat / SMS
3. **G7** Invitation list for creator
4. **D2** Countdown timer
5. **D6** Read-only order view after submission
6. **D8** Graceful error pages (expired, used, invalid)
7. **D3** Revoke invitation

### Phase 3 — Nice-to-have (optional, ~1 day)

1. **D1** Guest dietary notes
2. **D4** Guest display name
3. **D5** QR code
4. **D7** Invitation status badges (refinement of G7)

### Explicitly Deferred

- Guest registration/login (never)
- Guest order modification (never)
- Payment integration (never)
- Social sharing (never)
- Recommendation engine (never)

---

## Security Features Assessment

### Required (table stakes for public endpoints)

| Security Feature | Threat Addressed | Implementation Approach | Complexity |
|-----------------|-------------------|------------------------|------------|
| UUID4 tokens for invitation links | Prevent enumeration/guessing | `uuid.uuid4()` — 122 bits of entropy. Per OWASP, unguessable without bruteforce. | Low |
| Token expiry validation (2hr) | Limit exposure window | DB `expires_at` column checked on every request. No cron needed. | Low |
| One-time use enforcement | Prevent order spam | `invitation.status` transitions: `active` → `used`. Check on submit, update atomically with order creation. | Low |
| Per-token rate limiting | Prevent automated abuse of guest endpoints | Extend existing `RateLimiter` class. Key by `token` + `IP`. Limit: 60 req/min for menu viewing, 3 req/min for order submission. | Low |
| Per-IP rate limiting on invitation creation | Prevent link spam | Extend existing `auth_limiter` pattern. Key by `IP` + `user_id`. Limit: 10 invitations/hour. | Low |
| Input validation on guest order | Prevent injection/overflow | Pydantic schema validation (dish_id integer, quantity 1-10, notes max 200 chars). Already using Pydantic. | Low |
| CORS restriction for guest endpoints | Prevent cross-origin abuse | Guest endpoints are same-origin (same FastAPI server). No special CORS needed beyond existing config. | None |
| No sensitive data in guest responses | Information disclosure | Guest order confirmation shows only order summary, no chef personal info, no other users' orders. | Low |

### Recommended (defense in depth)

| Security Feature | Threat Addressed | Implementation Approach | Complexity |
|-----------------|-------------------|------------------------|------------|
| Per-invitation dish validation | Guest submits dish_id not on chef's menu | Validate every `dish_id` in guest order against `DishChef` for the invitation's `chef_id`. Reject invalid dish IDs. | Low |
| Order total item limit | Guest submits hundreds of items | Cap at 20 items per guest order. | Low |
| IP logging on guest access | Audit trail for abuse investigation | Log guest IP + user-agent on invitation access and order submission. Store in existing log system. | Low |
| Honeypot field on guest form | Bot detection | Hidden field that if filled = bot. Reject submission silently. | Low |

### Not Needed for This Context

| Feature | Why Not Needed |
|---------|---------------|
| CAPTCHA | Family context, link shared privately. Not a public registration form. |
| Token rotation | One-time use + expiry is sufficient. Rotation adds complexity with no real benefit. |
| OAuth/SSO for guests | Antithetical to the feature's purpose (no auth for guests). |
| WAF-level protection | Small-scale family app, not public-facing e-commerce. |
| `fastapi-guard` middleware | Overkill for this use case. Existing `RateLimiter` class is sufficient. |

---

## UX Patterns for Guest/Mobile-First Flow

### Established Patterns from Food Ordering Apps

Based on analysis of Uber Eats group ordering, Domino's share links, and similar systems:

| Pattern | Description | Applies Here | Implementation |
|---------|-------------|--------------|----------------|
| **Link-as-entry** | User taps shared link → lands directly on menu. No landing page, no "welcome" screen. | Yes | `/guest/:token` route renders menu immediately after token validation. |
| **Progressive disclosure** | Show categories first, expand to dishes. Guest doesn't need to see everything at once. | Maybe | Start with simple full list. Add category tabs if menu is large. |
| **Sticky cart bar** | Cart summary fixed to bottom of screen on mobile. Tap to expand/checkout. | Yes | Reuse pattern from existing `OrderPage.jsx` bottom bar. |
| **One-tap quantity** | Tap dish to add, +/- for quantity. No multi-step add-to-cart flow. | Yes | Direct dish card interaction. No modal required. |
| **Inline validation** | Real-time feedback on errors (link expired, item unavailable). No alert dialogs. | Yes | Toast notifications via existing ToastContext. |
| **Skeleton loading** | Show placeholders while menu loads. No blank screen. | Yes | Existing `Loading` component. |
| **Swipe-to-dismiss** | Mobile gesture for removing items from cart. | No | Over-engineering for v1. Tap to remove is fine. |
| **Deep link state** | URL contains all state. No localStorage dependency for guest. | Yes | Token in URL is the only state. Cart stored in React state (ephemeral). |

### Guest Page Structure (Recommended)

```
┌──────────────────────────┐
│  Chef Name 的菜品         │  ← Fixed header with chef name
│  链接有效：1:45:22        │  ← Countdown (D2)
├──────────────────────────┤
│  🔍 搜索                  │  ← Optional search
├──────────────────────────┤
│  ┌──────┐ ┌──────┐      │
│  │ 🍽️  │ │ 🍽️  │      │  ← Dish grid (2 cols mobile)
│  │ 宫保  │ │ 红烧  │      │
│  │ 鸡丁  │ │ 肉    │      │
│  │  +1   │ │  +1   │      │  ← Add button
│  └──────┘ └──────┘      │
│  ┌──────┐ ┌──────┐      │
│  │ ...  │ │ ...  │      │
│  └──────┘ └──────┘      │
├──────────────────────────┤
│  🛒 3件菜品  [提交订单]   │  ← Sticky cart bar
└──────────────────────────┘
```

### WeChat In-App Browser Considerations

| Concern | Impact | Solution |
|---------|--------|----------|
| No Web Share API support in older versions | Share button doesn't work | Always show copy-link as primary action. Web Share as enhancement. |
| Cache aggressive | Guest sees stale menu after chef updates | Add `Cache-Control: no-store` headers on guest API responses. |
| Back button behavior | Guest accidentally goes back, loses cart | Warn on back navigation if cart has items. Or persist cart to `sessionStorage`. |
| Limited viewport | 375px wide typical | 2-column grid, large tap targets (48px min). |
| No `navigator.share()` in some versions | D6 degraded | Detect and hide share button gracefully. |

---

## Sources

- Existing codebase analysis: `backend/app/models/`, `backend/app/routers/`, `frontend/src/` (HIGH confidence — direct observation)
- FastAPI security patterns: Context7 `/fastapi/fastapi` — dependency injection, OAuth2, Security() (HIGH confidence)
- React Router public route patterns: Context7 `/remix-run/react-router` — layout routes, auth flow (HIGH confidence)
- OWASP Forced Browsing: https://owasp.org/www-community/attacks/Forced_browsing — token enumeration risks (HIGH confidence)
- FastAPI Guard library: https://github.com/rennf93/fastapi-guard — rate limiting middleware patterns (MEDIUM confidence — reviewed for patterns, not recommending adoption)
- Food ordering UX patterns: Based on established patterns from Uber Eats group ordering, Domino's pizza tracker, DoorDash group ordering (MEDIUM confidence — pattern-level knowledge from training data)
