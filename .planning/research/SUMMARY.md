# Project Research Summary

**Project:** 家味·Family Chef — 访客点菜邀请 (Guest Ordering Invitation)
**Domain:** Brownfield feature addition — unauthenticated guest ordering via shareable one-time invitation links
**Researched:** 2026-05-24
**Confidence:** HIGH

## Executive Summary

This is a **brownfield feature addition** to an existing FastAPI + React family meal ordering system. The core value is letting unregistered guests browse a chef's menu and submit a single order through a time-limited, one-time-use invitation link — shared primarily via WeChat. The architecture is well-established: food ordering apps (Uber Eats group ordering, Domino's share links) use a "link-as-entry" pattern where the token in the URL is the sole authentication mechanism, and the guest page is a standalone mobile-first experience with no login friction.

The recommended approach is a **new `guest_invitations` database table** with UUID4 tokens, a **dedicated guest router** (separate from the JWT-authenticated order router), and a **standalone guest page inside the existing SPA** that bypasses `ProtectedRoute` and `PcLayout`. No new dependencies are required — `uuid.uuid4()` (stdlib), FastAPI path params, SQLAlchemy, Alembic, and React Router already handle everything. The `Order.user_id` column becomes nullable to accommodate guest orders (`user_id=NULL`), and a dedicated `GuestInvitationService` handles the full guest lifecycle (validate token → browse dishes → submit order → notify chef).

The key risks are: (1) the **existing `Order.user_id` NOT NULL constraint** must be migrated first or everything breaks, (2) a **double-submit race condition** on the one-time link requires atomic compare-and-swap, (3) the **frontend auth redirect loop** will trap guests unless the guest route is explicitly placed outside `ProtectedRoute`, and (4) the **current `allow_origins: ["*"]` CORS config** creates a CSRF vulnerability on unauthenticated guest POST endpoints. These must be addressed before or during the first build phase.

## Key Findings

### Recommended Stack

**No new pip or npm packages required.** The entire feature builds on existing dependencies. UUID4 tokens (Python stdlib) replace JWT for guest authentication. A dedicated FastAPI router with a token-validation dependency replaces the `HTTPBearer` + JWT chain. React Router's dynamic routes (`/guest/:token`) and the existing SPA catch-all (`StaticFiles(html=True)`) handle guest page routing without any build changes.

**Core technologies:**
- **UUID4 tokens** — invitation authentication via `uuid.uuid4()`, stored in DB — 122 bits of entropy, stateful (can be revoked/marked-used), simpler than JWT for one-time-use requirements
- **Dedicated FastAPI router** — `guest.py` with two `APIRouter` instances: one for authenticated invitation CRUD, one for public guest endpoints with token-based dependency — clean security boundary separation
- **SQLAlchemy model + Alembic migration** — new `guest_invitations` table + `orders.user_id` altered to nullable — `batch_alter_table` required for SQLite
- **Separate `GuestApiClient`** — standalone fetch wrapper with no auth headers and no 401→redirect logic — isolates guest concerns from the authenticated `ApiClient`
- **React Router placement** — guest routes inside same SPA but outside `<ProtectedRoute>` and `<PcLayout>` — no Vite multipage config needed

### Expected Features

**Must have (table stakes — Phase 1):**
- Generate invitation link (chef auto-binds, user picks chef) — G1, G3, G4
- 2-hour auto-expiry (DB-level check, no background task) — G2
- Guest accesses menu via link (no login) — G8
- Guest views chef's listed dishes (images, ingredients) — G9
- Guest adds dishes to cart with quantity — G10
- Guest submits order (one-time only per link) — G11
- Order confirmation page — G12
- Mobile-first responsive layout (WeChat compatible) — G13
- Chinese language UI — G14
- Feishu notification to chef — G15
- Guest order visible in chef's order list — G16

**Should have (differentiators — Phase 2):**
- Copy link to clipboard + Web Share API — G5, G6
- Invitation list/management for creator — G7
- Countdown timer showing remaining time — D2
- Read-only order view after submission — D6
- Graceful error pages (expired, used, invalid) — D8
- Revoke invitation early — D3

**Defer (v3+):**
- QR code generation — D5
- Guest dietary notes / display name — D1, D4

**Explicitly never:**
- Guest registration/login, order modification, payment, social sharing, ratings, recommendations

### Architecture Approach

The feature integrates into the existing **Router → Service → Model** layered architecture with one new independent model (`GuestInvitation`), one new service (`GuestInvitationService`), and one new router file (`guest.py`) containing two router instances. The existing `Order` model gains a nullable `user_id` and optional `guest_invitation_id` FK. Guest pages live in the same React SPA but are routed outside the authentication and layout wrappers. The invitation lifecycle is a simple state machine: `active → used` (on order submission) or `active → expired` (lazy check on access). No background tasks, no Redis, no new infrastructure.

**Major components:**
1. **`GuestInvitation` model** — new SQLAlchemy model with token, inviter_id, chef_id, status, expires_at, guest_order_id — independent lifecycle from Order
2. **`GuestInvitationService`** — invitation CRUD, chef dish queries, guest order creation with atomic one-time-use enforcement, reuses `OrderService.generate_order_no()` and `notify_order()`
3. **`guest.py` router (dual)** — authenticated router (`/api/guest-invitations`) for invitation management + public router (`/api/guest/{token}`) for guest browsing/ordering
4. **`GuestApiClient`** — frontend fetch wrapper with no JWT, no 401 redirect, handles 410 (expired) and 404 (not found) specifically
5. **`GuestOrderPage` + `GuestOrderViewPage`** — standalone React pages outside ProtectedRoute, mobile-first CSS, sticky cart bar, touch-friendly targets

### Critical Pitfalls

1. **`Order.user_id` NOT NULL constraint** — Currently `nullable=False` in the model. Guest orders will fail with IntegrityError. Must run Alembic migration FIRST and audit all code accessing `order.user` / `order.user_id` (notify_order, cancel_order, build_order_detail all need null guards). *Fix: migration + null-safe code.*

2. **Double-submit race condition** — Two tabs submit simultaneously on one invitation. The check-then-act pattern (`if not used → create order → mark used`) has a race window. *Fix: atomic compare-and-swap with `UPDATE ... WHERE is_used = False` + check `rowcount`.*

3. **Frontend auth redirect loop** — Guest route inside `ProtectedRoute` redirects unauthenticated users to `/login`. The `ApiClient` also auto-redirects on 401. *Fix: guest route outside ProtectedRoute/PcLayout in App.jsx; separate GuestApiClient with no 401 redirect.*

4. **CSRF via wildcard CORS** — Current `allow_origins: ["*"]` lets any website forge POST requests to guest endpoints (no JWT = no auth header protection). *Fix: restrict CORS to actual frontend origin for guest POST endpoints.*

5. **Token state leakage** — Different error messages for "not found" vs "expired" vs "used" leak invitation state. *Fix: single generic "链接无效或已过期" error for all invalid-token cases.*

## Implications for Roadmap

Based on research, suggested **7-phase** build order following the dependency chain: Model → Schema → Service → Router → Migration → Frontend API → Frontend Pages. Each phase is testable before moving to the next.

### Phase 1: Data Layer Foundation
**Rationale:** Everything depends on the database schema. Must exist before any backend or frontend code can function.
**Delivers:** `GuestInvitation` model, nullable `Order.user_id`, Alembic migration
**Addresses:** Feature dependency root (all features depend on data model)
**Avoids:** Pitfall #4 (NOT NULL constraint), establishes correct schema from day one
**Must also fix:** Existing unauthenticated endpoints (CONCERNS.md #73-84) — guest users would exploit these

### Phase 2: Schema + Service Layer
**Rationale:** Business logic layer between raw models and HTTP endpoints. Services define the contract.
**Delivers:** Pydantic schemas for guest invitation CRUD + guest order submission, `GuestInvitationService` with atomic one-time-use enforcement
**Addresses:** G1 (create invitation), G2 (expiry), G9 (chef dishes), G11 (submit order with race protection)
**Avoids:** Pitfall #2 (double-submit race — atomic compare-and-swap), Pitfall #9 (chef_id hardcoded from invitation)
**Uses:** Existing `OrderService.generate_order_no()` and `notify_order()` patterns

### Phase 3: Backend Router Layer
**Rationale:** Expose services as HTTP endpoints. Two routers for clear security boundary.
**Delivers:** Authenticated `/api/guest-invitations` CRUD + public `/api/guest/{token}` endpoints
**Addresses:** G1, G3, G4, G7, G8, G9, G11, G15
**Avoids:** Pitfall #1 (generic error messages), Pitfall #3 (Origin validation on POST), Pitfall #5 (no JWT on public endpoints)
**Must also fix:** CORS `allow_origins: ["*"]` — restrict before enabling public POST endpoints

### Phase 4: Frontend Authenticated Side
**Rationale:** Registered users need to generate and manage invitation links before guests can use them.
**Delivers:** Invitation creation UI (with chef picker for user role), copy/share link, invitation list with status badges
**Addresses:** G1, G3, G4, G5, G6, G7, D3, D7

### Phase 5: Frontend Guest Pages
**Rationale:** The guest-facing mobile-first ordering experience — the core user-facing feature.
**Delivers:** `GuestOrderPage` (dish browsing + cart + submit), `GuestOrderViewPage` (read-only confirmation), guest routes in App.jsx outside ProtectedRoute
**Addresses:** G8, G9, G10, G11, G12, G13, G14, D2, D6, D8
**Avoids:** Pitfall #5 (auth redirect loop — route placement), Pitfall #6 (countdown timer warns before expiry), Pitfall #13 (lazy-load guest page)
**Uses:** `GuestApiClient` (separate from authenticated client), mobile-first CSS with sticky cart bar

### Phase 6: Integration + Notification
**Rationale:** Wire up the notification and ensure guest orders appear correctly in existing chef flows.
**Delivers:** Feishu notification with "访客订单" marker, guest name display in ChefOrdersPage, order detail handling for NULL user_id
**Addresses:** G15, G16
**Avoids:** Pitfall #8 (NULL user_id crashes notify_order — handle guest branch)

### Phase 7: Polish + Testing
**Rationale:** End-to-end validation, mobile testing, edge case handling.
**Delivers:** WeChat in-app browser testing, error page styling, rate limiting on guest endpoints, E2E flow verification
**Avoids:** Pitfall #7 (WeChat URL mangling), Pitfall #12 (rate limit invitation creation)

### Phase Ordering Rationale

- **Data first (Phase 1):** The `guest_invitations` table and nullable `user_id` migration are hard prerequisites for all other work. Starting here unblocks all parallel development.
- **Service before router (Phase 2 before 3):** Services define the business contract. Testing services independently (unit tests) catches logic bugs before HTTP routing is involved.
- **Backend before frontend (Phases 1-3 before 4-5):** Frontend can't be tested without working API endpoints. However, Phase 4 (authenticated frontend) and Phase 5 (guest frontend) can be developed in parallel once Phase 3 is complete.
- **Auth side before guest side (Phase 4 before 5):** Someone must generate an invitation link before a guest can use it — natural dependency.
- **Integration last (Phase 6):** Notification and order display integration touches existing code and needs both backend and frontend complete.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5:** WeChat in-app browser testing requires real-device validation; Web Share API support varies by WeChat version
- **Phase 3:** CORS restriction strategy needs careful testing — changing from `["*"]` might break existing authenticated flows if not done correctly

Phases with standard patterns (skip research-phase):
- **Phase 1:** SQLAlchemy model + Alembic migration — well-established patterns, codebase already has examples
- **Phase 2:** Service layer — existing services provide clear patterns to follow
- **Phase 4:** Standard authenticated React CRUD UI — existing pages provide templates
- **Phase 6:** Notification integration — existing `FeishuClient` just needs guest-name branch

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies needed; all patterns verified against codebase and library docs |
| Features | HIGH | Clear table-stakes from food ordering domain; existing codebase analysis confirms feasibility |
| Architecture | HIGH | All decisions based on direct codebase analysis; model/router/service patterns well-established |
| Pitfalls | HIGH | Top 5 pitfalls verified against actual code (line numbers cited); migration strategy tested against SQLite constraints |

**Overall confidence:** HIGH — This is a well-scoped brownfield feature with established domain patterns and no novel technology. The main risk is integration with existing code (nullable user_id ripple effects), not technology choice.

### Gaps to Address

- **WeChat WebView behavior:** Specific quirks (Web Share API support, History API, URL mangling) vary by WeChat version. Need real-device testing during Phase 5. Use WeChat DevTools (微信开发者工具) for initial validation.
- **Existing order number race condition:** CONCERNS.md documents a known race in `generate_order_no()`. Guest flow amplifies it. Consider fixing the root cause (switch to UUID-based order numbers) during Phase 2 rather than working around it.
- **Bundle size for guest page:** Guest downloads the full SPA bundle. Use `React.lazy()` for `GuestOrderPage` to enable code splitting. Measure actual impact before optimizing further.
- **Rate limiting granularity:** Existing `RateLimiter` may need extension for per-token and per-IP limits on guest endpoints. Assess during Phase 3.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: `backend/app/models/`, `backend/app/routers/`, `backend/app/services/`, `frontend/src/` — all architectural decisions based on actual code
- `.planning/codebase/ARCHITECTURE.md` — existing architecture documentation
- `.planning/codebase/STRUCTURE.md` — directory structure and conventions
- Context7 `/fastapi/fastapi` — dependency injection, OAuth2, `auto_error` on security schemes, CSRF fix in 0.65.2
- Context7 `/remix-run/react-router` — layout routes, auth flow, public route patterns
- Context7 `/websites/sqlalchemy_en_20` — nullable FK patterns, AsyncSession concurrency warnings

### Secondary (MEDIUM confidence)
- OWASP Forced Browsing — token enumeration risks and prevention
- Food ordering UX patterns — Uber Eats group ordering, Domino's share links (pattern-level knowledge)
- FastAPI Guard library — rate limiting patterns (reviewed for patterns, not adopted)

### Tertiary (LOW confidence)
- WeChat in-app browser specifics — behavior varies by version, needs real-device validation

---
*Research completed: 2026-05-24*
*Ready for roadmap: yes*
