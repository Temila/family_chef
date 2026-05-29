# Technology Stack — Guest Ordering Invitation Feature

**Project:** 家味·Family Chef — 访客点菜邀请
**Researched:** 2026-05-24
**Scope:** NEW technology decisions only; existing stack documented in `.planning/codebase/STACK.md`

---

## Research Area 1: Invitation Token Strategy (UUID vs JWT vs Custom)

### Recommendation: UUID4 stored in database (HIGH confidence)

**Why UUID4, not JWT:**
- JWTs are stateless — you can't revoke or mark one as "used" without a denylist, which re-introduces DB state and defeats the purpose
- The requirement is strictly one-time-use with expiry; this is inherently stateful — the server must track "has this link been used?"
- UUID4 provides 122 bits of entropy (2^122 possibilities), making brute-force enumeration infeasible
- UUID4 is natively supported by Python's `uuid.uuid4()`, SQLite can index it efficiently as a `String(36)`

**Why not custom tokens (e.g., `secrets.token_urlsafe`):**
- UUID4 is simpler, more debuggable (recognizable format), and perfectly adequate for this threat model
- `secrets.token_urlsafe(32)` is also fine — but UUID4 is more conventional for invitation links and the project already uses `uuid` in `order_service.py`

**Implementation pattern:**
```python
# In the GuestInvitation model
import uuid
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.database import Base

class GuestInvitation(Base):
    __tablename__ = "guest_invitations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    token = Column(String(36), unique=True, nullable=False, index=True)  # UUID4
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # who created the invite
    chef_id = Column(Integer, ForeignKey("users.id"), nullable=False)     # bound chef
    is_used = Column(Boolean, nullable=False, default=False)              # one-time flag
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)    # FK to created order (set after use)
    expires_at = Column(DateTime, nullable=False)                         # 2 hours from creation
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    creator = relationship("User", foreign_keys=[created_by])
    chef = relationship("User", foreign_keys=[chef_id])
    order = relationship("Order", foreign_keys=[order_id])
```

**Token generation:**
```python
token = str(uuid.uuid4())  # e.g., "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

**URL format:** `/guest/{token}` — short, clean, works in WeChat/ messaging apps.

---

## Research Area 2: Unauthenticated Guest Access in FastAPI

### Recommendation: Separate router with token-based dependency (HIGH confidence)

The existing auth system uses `HTTPBearer` + `get_current_user_from_token` as a dependency. Guest routes must bypass this entirely — no JWT, no `Authorization` header.

**Pattern: Dedicated guest router with its own dependency chain**

```python
# backend/app/routers/guest.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import GuestInvitation

router = APIRouter()  # NO security scheme attached

async def get_valid_invitation(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> GuestInvitation:
    """Validate guest invitation token — replaces JWT auth for guest routes."""
    from sqlalchemy import select
    from datetime import datetime

    result = await db.execute(
        select(GuestInvitation).where(GuestInvitation.token == token)
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(status_code=404, detail="邀请链接不存在")

    if invitation.expires_at < datetime.now():
        raise HTTPException(status_code=410, detail="邀请链接已过期")

    if invitation.is_used:
        # Used links become read-only — return invitation so caller can decide
        return invitation  # caller checks is_used to return order view

    return invitation
```

**Why a separate router, not `auto_error=False` on HTTPBearer:**

The `auto_error=False` pattern on `HTTPBearer` (documented in FastAPI 0.11.0 release notes) is designed for "authenticated OR anonymous" endpoints on the same route. But guest routes are fundamentally different:
- They use a path parameter (`/guest/{token}`), not a Bearer header
- They have completely different authorization logic (invitation validity, not user identity)
- Mixing them creates confusing API docs and unnecessary branching

**Registration in `main.py`:**
```python
from app.routers import guest
app.include_router(guest.router, prefix="/api/guest", tags=["访客点菜"])
```

**Key constraint — the 401 redirect in `ApiClient`:**

The existing `frontend/src/api/client.js:30-37` auto-redirects to `/login` on any 401. The guest API client must NOT do this. Two options:

1. **Create a separate `GuestApiClient`** (recommended) — a minimal fetch wrapper with no auth headers and no 401 redirect:
   ```javascript
   // frontend/src/api/guestClient.js
   class GuestApiClient {
     constructor() { this.baseURL = '/api/guest'; }

     async request(method, url, body = null) {
       const headers = { 'Content-Type': 'application/json' };
       const options = { method, headers };
       if (body) options.body = JSON.stringify(body);
       const res = await fetch(this.baseURL + url, options);
       const data = await res.json();
       if (!res.ok) throw new Error(data.detail || '请求失败');
       return data;
     }

     async getInvitation(token) { return this.request('GET', `/${token}`); }
     async getDishes(token) { return this.request('GET', `/${token}/dishes`); }
     async submitOrder(token, data) { return this.request('POST', `/${token}/order`, data); }
     async getOrder(token) { return this.request('GET', `/${token}/order`); }
   }
   export const guestApi = new GuestApiClient();
   ```

2. **Modify existing ApiClient** — add a `guest` flag to skip auth/redirect. Less clean, risks regressions in existing flows.

**Choose option 1** because it isolates guest concerns completely, and the guest page is a standalone SPA route anyway.

---

## Research Area 3: Mobile-First Responsive Design for Guest Order Page

### Recommendation: Standalone mobile-first page, separate from main SPA layout (HIGH confidence)

**Context:** Guest links are shared via WeChat / messaging apps. Users will open them on mobile browsers. The page must:
- Load fast on mobile (no heavy SPA bundle if possible, but we're using React so we optimize within that)
- Look like a native food ordering page (think: 美团/饿了么 dish list)
- Not show the sidebar/header/login chrome of the main app

**Frontend architecture decision:**

The guest page should be a **separate route in the same React SPA** but with a **completely different layout** — no `PcLayout`, no `Sidebar`, no `AuthProvider` dependency.

**Route setup in App.jsx:**
```jsx
{/* Guest route — outside PcLayout, no ProtectedRoute wrapper */}
<Route path="/guest/:token" element={<GuestOrderPage />} />
<Route path="/guest/:token/order" element={<GuestOrderSuccessPage />} />
```

Placing it before the `PcLayout` route ensures it renders without the sidebar. The `GuestOrderPage` component manages its own state using `GuestApiClient` (no `AuthProvider` needed).

**Mobile-first CSS approach:**

The existing `frontend/src/css/styles.css` uses CSS custom properties for theming. For the guest page:

1. **Use `100dvh`** (dynamic viewport height) — handles mobile browser chrome (address bar) properly
2. **Touch-friendly targets:** minimum 44px tap targets (WCAG guidelines, also Apple HIG)
3. **No sidebar/bottom bar** — guest page is a single-column card layout
4. **Sticky bottom cart bar** — standard food-ordering pattern (like 美团)
5. **Image lazy loading** — dish images via `<img loading="lazy">` for mobile bandwidth
6. **Avoid hover states** — design for tap, not mouse

**Recommended CSS pattern:**
```css
/* Guest page — mobile-first, single column */
.guest-page {
  min-height: 100dvh;
  max-width: 480px;        /* cap width on tablets/desktop */
  margin: 0 auto;          /* center on wider screens */
  padding-bottom: 80px;    /* space for sticky cart bar */
}

.guest-dish-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  /* tap target: entire card is clickable */
}

.guest-dish-card img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
}

.guest-cart-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 480px;        /* match parent */
  margin: 0 auto;
  padding: 12px 16px;
  background: var(--color-card);
  box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
}

.guest-submit-btn {
  min-height: 44px;        /* touch-friendly */
  width: 100%;
  border-radius: 8px;
}
```

**WeChat in-app browser considerations:**
- WeChat WebView supports standard ES2020+ and CSS custom properties — no polyfills needed
- Images served from same origin (no CORS issues with `/uploads/`)
- No special meta tags needed for basic functionality
- Add `<meta name="viewport" content="width=device-width, initial-scale=1.0">` (likely already present in `index.html`)

---

## Research Area 4: Link Expiration Strategy

### Recommendation: Database-level check on each request (HIGH confidence)

**Why not Redis:** The project uses SQLite. Adding Redis for a single feature (2-hour link expiry) is massive overkill — new infrastructure, new dependency, new failure mode.

**Why not in-memory:** Single-process app (uvicorn single worker). Works technically, but:
- Lost on restart (all active invitations become invalid)
- Doesn't scale if they ever move to multi-worker
- DB is already right there and fast enough

**Database-level check pattern:**
```python
# On every guest request:
from datetime import datetime

if invitation.expires_at < datetime.now():
    raise HTTPException(status_code=410, detail="邀请链接已过期")
```

**Performance concern — is this fast enough?**

With SQLite WAL mode (already enabled) and an index on `guest_invitations.token`, a `SELECT ... WHERE token = ?` query takes microseconds. At the scale of a family app (single-digit concurrent guests), this is negligible.

**Index requirement:**
```python
token = Column(String(36), unique=True, nullable=False, index=True)
```

The `unique=True` constraint implicitly creates an index in most databases. For SQLite specifically, the unique index handles the lookup efficiently.

**Expiration value:** Set `expires_at = created_at + 2 hours` at creation time. No background cleanup job needed — expired links are simply rejected on access. For hygiene, a manual cleanup admin endpoint can be added later.

---

## Research Area 5: Extending SQLAlchemy Models Without Disrupting Order Model

### Recommendation: New `guest_invitations` table + minimal `Order` model change (HIGH confidence)

**The key insight:** The PROJECT.md already decided that `user_id` on `Order` can be `NULL` for guest orders. This is the minimal-change approach. Let's verify the impact.

**Current `Order` model (`backend/app/models/order.py`):**
```python
user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # ← currently NOT NULL
```

**Required change:**
```python
user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # ← allow NULL for guest orders
```

**Impact analysis — what depends on `user_id` being non-null?**

1. **`OrderDetailResponse` schema** — has `user_id: int` → change to `user_id: Optional[int] = None`
2. **`create_order` service** — always passes `user_id` → guest flow passes `None`
3. **`create_order_auto_split`** — same pattern, caller decides
4. **Order list queries** — filter by `user_id` → guest orders won't appear in user order lists (correct behavior — guests don't have accounts)
5. **`Order.user` relationship** — must handle `None`: change to `user = relationship("User", foreign_keys=[user_id], lazy="selectin")` and handle None in response building
6. **`CustomerInfo` in response** — already `Optional[CustomerInfo] = None` in schema — works perfectly

**New model — `GuestInvitation` (separate table):**

See the model definition in Research Area 1 above. This is a clean separation:
- `guest_invitations` table stores invitation lifecycle (token, expiry, used flag)
- `guest_invitations.order_id` links to the created order (set when guest submits)
- `orders.guest_invitation_id` (optional reverse FK) — NOT needed; the invitation points to the order, not vice versa

**Alembic migration approach:**

Two changes in one migration:
1. Create `guest_invitations` table
2. Alter `orders.user_id` from `NOT NULL` to `NULL` (SQLite limitation: this requires table recreation via `batch_alter_table`)

```python
# Alembic migration
def upgrade():
    # Create new table
    op.create_table(
        'guest_invitations',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('token', sa.String(36), nullable=False, unique=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('chef_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('order_id', sa.Integer(), sa.ForeignKey('orders.id'), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_guest_invitations_token', 'guest_invitations', ['token'], unique=True)

    # SQLite batch alter for nullable user_id
    with op.batch_alter_table('orders') as batch_op:
        batch_op.alter_column('user_id', nullable=True)
```

**Important — SQLite batch_alter_table:** SQLite doesn't support `ALTER COLUMN`. Alembic's `batch_alter_table` handles this by creating a new table, copying data, dropping old, renaming. This is safe but worth testing.

---

## New Dependencies Required

| Library | Version | Purpose | Why Needed |
|---------|---------|---------|------------|
| None | — | — | All required technology (`uuid`, `datetime`, FastAPI path params, SQLAlchemy) is already in the stack |

**No new pip/npm packages required.** This is a significant advantage — the entire feature can be built with existing dependencies:
- `uuid.uuid4()` — stdlib, already imported in `order_service.py`
- `fastapi.APIRouter` — already used for all routers
- `sqlalchemy` — already the ORM
- `alembic` — already the migration tool
- `react-router-dom` — already handles dynamic routes (`/guest/:token`)

---

## Recommended New File Structure

```
backend/
  app/
    models/
      guest_invitation.py          # NEW — GuestInvitation model
    routers/
      guest.py                     # NEW — guest routes (no JWT auth)
    services/
      guest_service.py             # NEW — invitation CRUD, guest order creation
    schemas/
      guest.py                     # NEW — request/response schemas for guest endpoints

frontend/
  src/
    api/
      guestClient.js               # NEW — standalone API client (no auth)
    pages/
      GuestOrderPage.jsx           # NEW — mobile-first dish browsing + cart
      GuestOrderSuccessPage.jsx    # NEW — order confirmation / read-only view
```

**Files to modify (minimal changes):**

| File | Change | Scope |
|------|--------|-------|
| `backend/app/models/__init__.py` | Add `GuestInvitation` import | 2 lines |
| `backend/app/models/order.py` | `user_id` nullable → `True` | 1 line |
| `backend/app/schemas/order.py` | `user_id: int` → `Optional[int]` | 2 lines |
| `backend/app/main.py` | Register `guest.router` | 2 lines |
| `frontend/src/App.jsx` | Add guest routes (no ProtectedRoute) | 3 lines |
| `frontend/vite.config.js` | No change needed — `/api/guest/*` already proxied | 0 lines |

---

## Architecture Diagram — Guest Flow

```text
┌──────────────────────────────────────────────────────────────┐
│ Guest (mobile browser, via WeChat/SMS link)                  │
│ Opens: https://family-chef.example.com/guest/{uuid4}         │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│ React: GuestOrderPage                                         │
│ Route: /guest/:token (NO ProtectedRoute, NO AuthProvider)    │
│ API: GuestApiClient → /api/guest/{token}                     │
└─────────────────────┬────────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌────────────────────┐  ┌─────────────────────────┐
│ GET /api/guest/T   │  │ POST /api/guest/T/order  │
│ (validate token,   │  │ (submit order, mark      │
│  return chef info) │  │  invitation as used)     │
└────────┬───────────┘  └──────────┬──────────────┘
         │                         │
         ▼                         ▼
┌──────────────────────────────────────────────────────────────┐
│ FastAPI: guest.py router                                      │
│ Dependency: get_valid_invitation(token, db)                   │
│ Service: guest_service.py                                     │
│   - validate_invitation() → check expiry + used flag          │
│   - get_chef_dishes() → query DishChef for bound chef         │
│   - create_guest_order() → new Order(user_id=NULL) + items    │
│   - notify_chef() → reuse FeishuClient.send_order_notification│
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│ SQLite                                                        │
│ guest_invitations (NEW) ←→ orders (user_id now nullable)     │
│                └──→ users (created_by, chef_id FKs)           │
└──────────────────────────────────────────────────────────────┘
```

---

## Alternatives Considered

| Decision Point | Recommended | Alternative | Why Not |
|----------------|-------------|-------------|---------|
| Token format | UUID4 | JWT | Can't revoke/mark-used statelessly; need DB anyway for one-time constraint |
| Token format | UUID4 | `secrets.token_urlsafe` | Also fine, but UUID4 is more conventional and already used in codebase |
| Auth bypass | Separate router + token dep | `auto_error=False` on HTTPBearer | Guest routes use path param, not Bearer header; different auth semantics entirely |
| API client | Separate `GuestApiClient` | Modify existing `ApiClient` | Isolates guest concerns; avoids 401-redirect regression risk |
| Guest page layout | Separate React route, no PcLayout | Iframe / separate SPA / SSR | Same SPA is simplest, React Router handles it naturally |
| Guest page scope | Part of main SPA build | Separate Vite entry point / micro-front | Overkill for one page; increases build complexity |
| Expiration | DB check on access | Redis TTL | No Redis in stack; would add infra dependency for one feature |
| Expiration | DB check on access | In-memory dict | Lost on restart; doesn't survive redeploy |
| Order model | `user_id` nullable | Separate `GuestOrder` table | Duplicates order logic; the PROJECT.md already decided on nullable FK |
| Invitation storage | Dedicated `guest_invitations` table | Embed in Order as fields | Violates separation of concerns; invitation lifecycle ≠ order lifecycle |

---

## Sources

- **FastAPI `auto_error` on security schemes:** Context7 `/fastapi/fastapi` — release notes 0.11.0, confirmed `auto_error` parameter on `HTTPBearer`
- **SQLAlchemy nullable FK patterns:** Context7 `/websites/sqlalchemy_en_20` — `Mapped[Optional[int]]` with `ForeignKey`, confirmed nullable inference from `Optional[]`
- **React Router layout routes:** Context7 `/remix-run/react-router` — layout routes without `path`, `<Outlet />` for child rendering
- **FastAPI router organization:** Context7 `/fastapi/fastapi` — `APIRouter`, `include_router` with prefix/tags
- **Alembic batch mode for SQLite:** SQLAlchemy/Alembic docs — `batch_alter_table` required for column nullability changes on SQLite
- **UUID4 entropy analysis:** Python stdlib docs — `uuid.uuid4()` generates 122 random bits; NIST considers 112 bits sufficient for authentication tokens
- **Mobile touch targets:** WCAG 2.5.5 Target Size (Level AAA) — minimum 44×44 CSS pixels; Apple HIG recommends 44×44 points

---

*Stack research: 2026-05-24*
