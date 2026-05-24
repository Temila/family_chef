# Architecture: Guest Ordering Invitation Feature

**Domain:** Brownfield feature addition — guest ordering invitations
**Researched:** 2026-05-24
**Confidence:** HIGH (all conclusions drawn from direct codebase analysis)

## Executive Summary

The guest ordering invitation feature integrates into the existing layered architecture (Router → Service → Model) with minimal disruption. The key architectural decision is **one new independent model** (`GuestInvitation`) plus **one nullable FK addition** to the existing `Order` model (`guest_invitation_id`, plus making `user_id` nullable). A new `guest.py` router handles both authenticated endpoints (create invitation) and public endpoints (browse/submit via token). On the frontend, guest pages live inside the same SPA but bypass `ProtectedRoute` — the SPA catch-all (`html=True` in `StaticFiles` mount) and Vite dev server both handle this transparently.

No new frameworks, no new build entries, no background tasks required.

---

## 1. New Model: `GuestInvitation`

**File:** `backend/app/models/guest_invitation.py`

**Rationale:** The invitation is its own lifecycle entity — it is created, it expires, it is used once. It is not an order. Decoupling avoids polluting the Order model with invitation-specific fields (token, expires_at, inviter_id). The Order model only needs a nullable FK back to the invitation.

### Schema Design

```
Table: guest_invitations
┌────────────────────┬──────────────┬───────────┬──────────────────────────────────────────────┐
│ Column             │ Type         │ Nullable  │ Notes                                        │
├────────────────────┼──────────────┼───────────┼──────────────────────────────────────────────┤
│ id                 │ INTEGER      │ NO (PK)   │ Auto-increment                               │
│ token              │ VARCHAR(36)  │ NO (UQ)   │ UUID4 string,不可猜测                         │
│ inviter_id         │ INTEGER      │ NO (FK)   │ → users.id — who created the invitation      │
│ chef_id            │ INTEGER      │ NO (FK)   │ → users.id — which chef the guest orders from│
│ status             │ VARCHAR(20)  │ NO        │ 'active' | 'used' | 'expired'                │
│ guest_name         │ VARCHAR(100) │ YES       │ Optional display name the guest can provide  │
│ expires_at         │ DATETIME     │ NO        │ created_at + 2 hours                         │
│ used_at            │ DATETIME     │ YES       │ When the guest submitted their order         │
│ guest_order_id     │ INTEGER      │ YES (FK)  │ → orders.id — the resulting order            │
│ created_at         │ DATETIME     │ NO        │ server_default=func.now()                    │
└────────────────────┴──────────────┴───────────┴──────────────────────────────────────────────┘

Indexes:
  - UNIQUE on token (for lookup by URL token)
  - INDEX on expires_at (for expiry checks — optional, SQLite is fine without)
  - INDEX on inviter_id (list invitations by user)
  - INDEX on chef_id (list invitations by chef)
```

### Model Code (pattern-matching existing models)

```python
"""访客邀请模型"""
import uuid
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class GuestInvitation(Base):
    __tablename__ = "guest_invitations"
    __table_args__ = (UniqueConstraint("token", name="uq_guest_invitation_token"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    token = Column(String(36), nullable=False, unique=True, default=lambda: str(uuid.uuid4()))
    inviter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    chef_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), nullable=False, default="active")
    guest_name = Column(String(100), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    guest_order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    inviter = relationship("User", foreign_keys=[inviter_id])
    chef = relationship("User", foreign_keys=[chef_id])
    guest_order = relationship("Order", foreign_keys=[guest_order_id])
```

### Registration

Add to `backend/app/models/__init__.py`:

```python
from app.models.guest_invitation import GuestInvitation
# Add to __all__ list
```

---

## 2. Extending the Existing `Order` Model

**File:** `backend/app/models/order.py`

### Changes Required

1. **Make `user_id` nullable** — Guest orders have no user account. Currently `nullable=False`; change to `nullable=True`.

2. **Add `guest_invitation_id` column** — Nullable FK back to `guest_invitations.id`. This provides a bidirectional link: invitation → order (via `guest_order_id`) and order → invitation (via `guest_invitation_id`).

3. **Add `guest_name` column** — Display name for the guest on the order itself (copied from invitation at order creation time).

```python
# In Order model, CHANGE:
user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # was nullable=False

# ADD:
guest_invitation_id = Column(Integer, ForeignKey("guest_invitations.id"), nullable=True)
guest_name = Column(String(100), nullable=True)

# ADD relationship:
guest_invitation = relationship("GuestInvitation", foreign_keys=[guest_invitation_id])
```

### Migration Strategy

**Two Alembic migrations needed:**

1. **Migration 1: Add `guest_invitations` table** — New table, no existing data affected.
2. **Migration 2: Alter `orders` table** — Make `user_id` nullable, add `guest_invitation_id` column, add `guest_name` column.

> **Why two migrations?** The `guest_invitations` table must exist before the FK `orders.guest_invitation_id → guest_invitations.id` can be created. Alembic's autogenerate will handle this if both models exist, but if it generates a single migration, verify the table creation order. If it creates them in one migration, that's fine — just ensure `guest_invitations` CREATE TABLE comes before the ALTER on `orders`.

### Impact on Existing Code

| Code Area | Impact | Required Change |
|-----------|--------|-----------------|
| `OrderService.create_order_auto_split()` | Low | `user_id` is still passed explicitly — no breakage when it becomes nullable |
| `OrderService.list_orders()` (user filter) | Low | `where(Order.user_id == user_id)` — NULL values excluded by default in SQL |
| `OrderService.cancel_order()` | Medium | Checks `order.user_id != user_id` — guest orders (NULL) will fail this check. Must add `or order.user_id is None` guard |
| `build_order_detail()` in orders router | Medium | Currently queries user by `order.user_id` — must handle NULL case for guest orders |
| `OrderService.notify_order()` | Medium | Queries user by `user_id` — must handle guest case, use `guest_name` instead |
| `OrderDetailResponse` schema | Low | `user_id` should become `Optional[int]` |
| Frontend `OrderPage`, `UserOrdersPage` | None | These are authenticated-only, won't see guest orders |
| Frontend `ChefOrdersPage`, `OrderDetailPage` | Low | Must display guest name when `user_id` is null |

---

## 3. Backend Router Design: New `guest.py` Router

**File:** `backend/app/routers/guest.py`

**Rationale for a NEW router (not extending existing `orders.py`):**

1. **Different auth model** — All existing order endpoints require JWT via `Depends(get_current_user_from_token)`. Guest endpoints use token-based invitation validation. Mixing these creates confusing auth patterns.
2. **Different URL semantics** — Guest endpoints are keyed by invitation token (`/api/guest/{token}/...`), not by order ID. This is a distinct resource hierarchy.
3. **Separation of concerns** — Guest flow is a self-contained use case with its own lifecycle. Keeping it isolated makes it easy to audit security boundaries.

### Endpoint Design

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Authenticated Endpoints (require JWT)                                            │
├────────┬──────────────────────────────────┬──────────┬───────────────────────────┤
│ Method │ Path                             │ Auth     │ Description               │
├────────┼──────────────────────────────────┼──────────┼───────────────────────────┤
│ POST   │ /api/guest-invitations           │ JWT      │ Create invitation         │
│        │                                  │ chef/user│ (chef auto-binds self,    │
│        │                                  │          │  user must specify chef)   │
├────────┼──────────────────────────────────┼──────────┼───────────────────────────┤
│ GET    │ /api/guest-invitations           │ JWT      │ List my invitations       │
├────────┼──────────────────────────────────┼──────────┼───────────────────────────┤
│ DELETE │ /api/guest-invitations/{id}      │ JWT      │ Cancel/revoke invitation  │
└────────┴──────────────────────────────────┴──────────┴───────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│ Public Endpoints (no JWT, invitation token in URL)                               │
├────────┬──────────────────────────────────┬──────────┬───────────────────────────┤
│ Method │ Path                             │ Auth     │ Description               │
├────────┼──────────────────────────────────┼──────────┼───────────────────────────┤
│ GET    │ /api/guest/{token}               │ Token    │ Get invitation info +     │
│        │                                  │          │ chef's published dishes   │
├────────┼──────────────────────────────────┼──────────┼───────────────────────────┤
│ POST   │ /api/guest/{token}/orders        │ Token    │ Submit guest order        │
├────────┼──────────────────────────────────┼──────────┼───────────────────────────┤
│ GET    │ /api/guest/{token}/orders        │ Token    │ View submitted order      │
│        │                                  │          │ (read-only after submit)  │
└────────┴──────────────────────────────────┴──────────┴───────────────────────────┘
```

### Why Split Prefix (`/api/guest-invitations` vs `/api/guest`)?

- `/api/guest-invitations` — Authenticated CRUD, follows existing plural-noun convention (`/api/orders`, `/api/dishes`). These are managed by the inviter.
- `/api/guest/{token}` — Public guest-facing API. Token is the primary key. This is a different access pattern entirely.

This separation makes the security boundary immediately visible in the URL structure.

### Router Registration in `main.py`

```python
from app.routers import guest

# Authenticated invitation management
app.include_router(guest.router, prefix="/api/guest-invitations", tags=["访客邀请"])
# Public guest access
app.include_router(guest.guest_public_router, prefix="/api/guest", tags=["访客点菜"])
```

> **Two routers in one file.** The module exports two `APIRouter` instances: `router` (authenticated) and `guest_public_router` (public). This keeps all guest-related routing logic in one file while maintaining clear prefix separation.

### Auth Bypass Pattern

Public endpoints do NOT use `Depends(get_current_user_from_token)`. Instead, they use a custom dependency:

```python
# In backend/app/routers/guest.py

async def get_invitation_by_token(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> GuestInvitation:
    """Validate invitation token and return active invitation."""
    result = await db.execute(
        select(GuestInvitation).where(GuestInvitation.token == token)
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(status_code=404, detail="邀请链接不存在")

    # Check expiry (database-level check, no background task needed)
    if invitation.status == "expired" or invitation.expires_at < datetime.now():
        invitation.status = "expired"
        await db.flush()
        raise HTTPException(status_code=410, detail="邀请链接已过期")

    return invitation
```

This dependency is used on the public endpoints instead of `get_current_user_from_token`.

---

## 4. Service Layer: `GuestInvitationService`

**File:** `backend/app/services/guest_invitation_service.py`

### Design

```python
class GuestInvitationService:
    """访客邀请服务"""

    @staticmethod
    async def create_invitation(db, inviter_id, chef_id, hours=2) -> GuestInvitation:
        """Create a new guest invitation. Returns invitation with token."""

    @staticmethod
    async def get_invitation_by_token(db, token) -> Optional[GuestInvitation]:
        """Look up invitation by token, check expiry."""

    @staticmethod
    async def get_chef_dishes_for_guest(db, chef_id) -> list:
        """Get all published dishes for a chef (for guest browsing)."""

    @staticmethod
    async def create_guest_order(db, token, order_items, guest_name=None) -> Order:
        """Submit a guest order. Validates token, creates order, marks invitation used."""

    @staticmethod
    async def list_invitations(db, user_id, params) -> tuple:
        """List invitations created by a user."""

    @staticmethod
    async def revoke_invitation(db, invitation_id, user_id) -> GuestInvitation:
        """Cancel an active invitation."""

guest_invitation_service = GuestInvitationService()
```

### Key Interaction Points

**`create_guest_order`** orchestrates:
1. Validate invitation token (active, not expired, not used)
2. Validate dishes exist and belong to the chef (via `DishChef` with status="published")
3. Create `Order` with `user_id=None`, `chef_id=invitation.chef_id`, `guest_invitation_id=invitation.id`
4. Create `OrderItem` records
5. Update invitation: `status="used"`, `used_at=now()`, `guest_order_id=order.id`
6. Call `OrderService.notify_order()` (reuse existing Feishu notification)
7. Return order

**Reuse of existing services:**
- `OrderService.generate_order_no()` — reuse order number generation
- `OrderService.notify_order()` — reuse Feishu notification (adapt for guest name)
- `DishService` query patterns — replicate the "chef published dishes" query (simple `DishChef` join)

> **Why not call `OrderService.create_order_auto_split()`?** The auto-split logic groups items by chef from a potentially multi-chef cart. Guest orders are pre-bound to a single chef — no splitting needed. A simpler, dedicated order creation path avoids unnecessary complexity and ensures the `guest_invitation_id` is set correctly.

---

## 5. Schema Layer

**File:** `backend/app/schemas/guest_invitation.py`

```python
"""访客邀请 Schema"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class GuestInvitationCreate(BaseModel):
    """创建邀请请求"""
    chef_id: Optional[int] = None  # Required for 'user' role; auto-filled for 'chef' role
    hours: Optional[int] = 2       # Expiry duration


class GuestInvitationResponse(BaseModel):
    """邀请响应"""
    id: int
    token: str
    inviter_id: int
    chef_id: int
    chef_name: Optional[str] = None
    status: str
    expires_at: datetime
    used_at: Optional[datetime] = None
    guest_order_id: Optional[int] = None
    guest_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GuestDishResponse(BaseModel):
    """Guest-facing dish info"""
    id: int
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    ingredients: List[dict] = []
    categories: List[dict] = []


class GuestInvitationInfoResponse(BaseModel):
    """Guest-facing invitation info (what the guest sees)"""
    chef_name: str
    status: str  # 'active' | 'used' | 'expired'
    expires_at: datetime
    dishes: List[GuestDishResponse] = []
    order: Optional[dict] = None  # If used, the read-only order


class GuestOrderCreate(BaseModel):
    """访客提交订单"""
    items: List[GuestOrderItemCreate]
    guest_name: Optional[str] = None


class GuestOrderItemCreate(BaseModel):
    """访客订单项"""
    dish_id: int
    quantity: int = 1
    special_notes: Optional[str] = None
```

---

## 6. Frontend Routing Strategy

### Decision: Routes Inside the Existing SPA (No Separate Entry Point)

**Why not a separate entry point?**
1. The production build serves all routes via `StaticFiles(html=True)` — the SPA catch-all already works for any path.
2. Vite dev server also handles SPA routing automatically.
3. A separate HTML entry point would require Vite multipage configuration, a separate React root, and build complexity.
4. Guest pages share components (`DishCard`, `Loading`, `EmptyState`) and CSS with the main app.

**Why inside the SPA works:**
- Guest routes simply don't wrap in `<ProtectedRoute>` — no JWT check.
- The guest page reads the token from the URL and calls public API endpoints.
- The `ApiClient` class can be extended with a `guestRequest` method that skips the `Authorization` header and the 401→redirect logic.

### Route Addition in `App.jsx`

```jsx
// Guest pages — NO ProtectedRoute wrapper, NO AuthProvider needed
import GuestOrderPage from './pages/GuestOrderPage';
import GuestOrderViewPage from './pages/GuestOrderViewPage';

// Inside <Routes>, BEFORE the catch-all:
<Route path="/guest/:token" element={<GuestOrderPage />} />
<Route path="/guest/:token/view" element={<GuestOrderViewPage />} />
```

### Guest Pages Structure

```
frontend/src/
├── pages/
│   ├── GuestOrderPage.jsx       # Guest browsing + cart + submit
│   └── GuestOrderViewPage.jsx   # Read-only order view after submission
├── api/
│   └── client.js                # ADD: guestApi methods (no auth header)
```

### API Client Extension

Add a separate lightweight fetch helper for guest endpoints (no JWT, no 401 redirect):

```javascript
// In frontend/src/api/client.js — ADD these methods:

// ─── Guest (no auth) ─────────────────────────────────
async getGuestInvitation(token) {
  return this.guestGet(`/${token}`);
}

async createGuestOrder(token, data) {
  return this.guestPost(`/${token}/orders`, data);
}

async getGuestOrder(token) {
  return this.guestGet(`/${token}/orders`);
}

// Guest-specific HTTP methods (no auth header, no 401 redirect)
async guestRequest(method, url, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch('/api/guest' + url, options);
  if (res.status === 410) throw new Error('expired');  // Special handling
  if (res.status === 404) throw new Error('not_found');

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || '请求失败');
  return data;
}
```

### Mobile Optimization

Guest pages must be mobile-first (requirement: "朋友通常通过手机微信打开链接"):

- Full-width layout, no sidebar
- Large touch targets for dish selection
- Simple cart with count badges
- Bottom sticky submit button
- WeChat in-app browser compatible (no special APIs needed, standard HTML/CSS works)

---

## 7. Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  Authenticated User (chef/user)                                      │
│  ┌──────────────────┐         ┌─────────────────────────────┐       │
│  │ UserHomePage     │────────▶│ POST /api/guest-invitations │       │
│  │ ChefOrdersPage   │         │ GET  /api/guest-invitations │       │
│  └──────────────────┘         │ DEL  /api/guest-invitations │       │
│                               └──────────────┬──────────────┘       │
│                                              │ JWT auth              │
│                                              ▼                      │
│                               ┌──────────────────────────────┐      │
│                               │ GuestInvitationService        │      │
│                               │ (backend/app/services/)       │      │
│                               └──────────────┬───────────────┘      │
│                                              │                      │
│  ┌──────────────────┐         ┌──────────────▼───────────────┐      │
│  │  guest_           │◀────────│ guest_invitations table       │      │
│  │  invitations      │         │ (token, inviter_id, chef_id, │      │
│  │  model            │         │  status, expires_at)         │      │
│  └──────────────────┘         └──────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Guest (no auth, token in URL)                                       │
│                                                                      │
│  ┌──────────────────┐                                                │
│  │ GuestOrderPage   │─── GET /api/guest/{token} ──▶ dishes list     │
│  │ (/guest/:token)  │                                                │
│  │                  │─── POST /api/guest/{token}/orders              │
│  └──────────────────┘              │                                 │
│                                    ▼                                 │
│                    ┌───────────────────────────────┐                  │
│                    │ GuestInvitationService         │                  │
│                    │   .get_invitation_by_token()   │                  │
│                    │   .create_guest_order()        │                  │
│                    │       ↓                        │                  │
│                    │   OrderService.notify_order()  │──▶ Feishu       │
│                    └───────────────────────────────┘                  │
│                                    │                                 │
│                                    ▼                                 │
│                    ┌───────────────────────────────┐                  │
│                    │ orders table (user_id=NULL)    │                  │
│                    │ + guest_invitation_id          │                  │
│                    │ + guest_name                   │                  │
│                    └───────────────────────────────┘                  │
│                                                                      │
│  ┌──────────────────┐                                                │
│  │ GuestOrderView   │─── GET /api/guest/{token}/orders              │
│  │ (/guest/:token/  │    (read-only after submission)               │
│  │  view)           │                                                │
│  └──────────────────┘                                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Data Flow: Guest Order Submission

```
1. Guest opens link: https://family-chef.app/guest/a1b2c3d4-...
2. React Router matches /guest/:token → GuestOrderPage
3. GuestOrderPage calls api.getGuestInvitation(token)
   → GET /api/guest/{token}
   → guest_public_router: get_invitation_by_token dependency validates token
   → GuestInvitationService.get_chef_dishes_for_guest(chef_id)
   → Returns: { chef_name, dishes[], status: "active", expires_at }
4. Guest browses dishes, adds to local cart state
5. Guest submits: api.createGuestOrder(token, { items, guest_name })
   → POST /api/guest/{token}/orders
   → GuestInvitationService.create_guest_order()
     a. Validate invitation (active, not expired, not used)
     b. Validate dishes belong to chef and are published (DishChef join)
     c. Generate order_no (reuse OrderService.generate_order_no)
     d. Create Order (user_id=None, chef_id=invitation.chef_id,
                      guest_invitation_id=invitation.id, guest_name=...)
     e. Create OrderItem records
     f. Update invitation: status="used", used_at=now(), guest_order_id=order.id
     g. Call OrderService.notify_order() with guest_name
   → Returns: Order response
6. GuestOrderPage redirects to GuestOrderViewPage (/guest/{token}/view)
7. Chef receives Feishu notification
```

---

## 9. Suggested Build Order

Ordered by dependency chain. Each step is testable before moving to the next.

### Phase A: Backend Data Layer

| Step | File(s) | What | Dependencies |
|------|---------|------|-------------|
| A1 | `backend/app/models/guest_invitation.py` | Create `GuestInvitation` model | None |
| A2 | `backend/app/models/__init__.py` | Export new model | A1 |
| A3 | `backend/app/models/order.py` | Make `user_id` nullable, add `guest_invitation_id`, `guest_name` | A1 (FK target) |
| A4 | Alembic migration | `alembic revision --autogenerate -m "add guest invitations"` | A1–A3 |

### Phase B: Backend Schema + Service Layer

| Step | File(s) | What | Dependencies |
|------|---------|------|-------------|
| B1 | `backend/app/schemas/guest_invitation.py` | Create Pydantic schemas | None |
| B2 | `backend/app/services/guest_invitation_service.py` | Implement service methods | A1, A3 |
| B3 | Modify `backend/app/services/order_service.py` | Adapt `notify_order` for guest orders (handle NULL user_id) | A3 |

### Phase C: Backend Router Layer

| Step | File(s) | What | Dependencies |
|------|---------|------|-------------|
| C1 | `backend/app/routers/guest.py` | Create router with all endpoints | B1, B2 |
| C2 | `backend/app/main.py` | Register new routers | C1 |
| C3 | Modify `backend/app/routers/orders.py` | Adapt `build_order_detail` for guest orders (NULL user_id) | A3 |
| C4 | Manual API testing | Verify all endpoints work | C1–C3 |

### Phase D: Frontend — Authenticated Side

| Step | File(s) | What | Dependencies |
|------|---------|------|-------------|
| D1 | `frontend/src/api/client.js` | Add `guestInvitation` methods (authenticated) | C2 |
| D2 | Invitation creation UI | Add "generate link" button to UserHomePage / ChefOrdersPage | D1 |
| D3 | Invitation list/management UI | Optional: list + revoke invitations | D1 |

### Phase E: Frontend — Guest Pages

| Step | File(s) | What | Dependencies |
|------|---------|------|-------------|
| E1 | `frontend/src/api/client.js` | Add guest API methods (no auth) | C2 |
| E2 | `frontend/src/pages/GuestOrderPage.jsx` | Guest browsing + cart + submit | E1 |
| E3 | `frontend/src/pages/GuestOrderViewPage.jsx` | Read-only order view | E1 |
| E4 | `frontend/src/App.jsx` | Add guest routes (no ProtectedRoute) | E2, E3 |

### Phase F: Polish + Testing

| Step | What | Dependencies |
|------|------|-------------|
| F1 | Backend tests (`backend/tests/test_guest_invitation.py`) | C2 |
| F2 | Mobile CSS optimization for guest pages | E2, E3 |
| F3 | Chef orders page update (display guest name) | E4 |
| F4 | End-to-end flow testing | All |

---

## 10. Security Considerations

### Token Security
- **UUID4 tokens** — 122 bits of entropy. Brute-force infeasible at any scale.
- **No sequential IDs in URLs** — Token is the only URL parameter, not invitation ID.
- **One-time use** — Status transitions to `used` on first order submission. Subsequent access is read-only.

### Access Control
- **Guest can only see dishes** from the bound chef (filtered by `DishChef` with status="published").
- **Guest cannot modify or cancel** orders after submission.
- **Guest cannot access** any authenticated endpoints.
- **Invitation creator** can revoke active invitations.

### Data Protection
- **No PII collection** — Guest name is optional, no email/phone required.
- **Expiry enforced on every access** — No background task needed; each `GET /api/guest/{token}` checks `expires_at`.
- **Expired invitations return 410 Gone** — Not 404, to distinguish "never existed" from "expired".

### Authenticated Endpoint Rules
| Endpoint | Required Role | Notes |
|----------|--------------|-------|
| `POST /api/guest-invitations` | `chef` or `user` | Chefs auto-bind themselves; users must specify `chef_id` |
| `GET /api/guest-invitations` | Any authenticated | Filter by `inviter_id == current_user.id` |
| `DELETE /api/guest-invitations/{id}` | `chef` or `user` | Only own invitations |

---

## 11. Patterns to Follow

### Pattern 1: Token-as-Auth Dependency

**What:** Replace JWT dependency with invitation token validation dependency on public endpoints.
**When:** Any endpoint where access is controlled by invitation token, not user session.
**Example:**
```python
@guest_public_router.get("/{token}")
async def get_guest_invitation(
    invitation: GuestInvitation = Depends(get_invitation_by_token),
    db: AsyncSession = Depends(get_db),
):
    """Public: get invitation info + dishes for guest"""
    dishes = await guest_invitation_service.get_chef_dishes_for_guest(
        db, invitation.chef_id
    )
    return GuestInvitationInfoResponse(
        chef_name=invitation.chef.display_name or invitation.chef.username,
        status=invitation.status,
        expires_at=invitation.expires_at,
        dishes=dishes,
    )
```

### Pattern 2: Status Machine for Invitation Lifecycle

```
              create()
                │
                ▼
           ┌─────────┐
           │ active  │◀─── expiry check (on access)
           └────┬────┘
                │  order submitted
                ▼
           ┌─────────┐
           │  used   │ (terminal state)
           └─────────┘

           ┌─────────┐
           │ expired │ (terminal state, set on access or revocation)
           └─────────┘
```

No background task needed. Status is checked lazily on every access.

### Pattern 3: Dual Router in One File

```python
# backend/app/routers/guest.py

router = APIRouter()              # Authenticated endpoints
guest_public_router = APIRouter() # Public endpoints (no JWT)
```

Registered separately in `main.py` with different prefixes.

---

## 12. Anti-Patterns to Avoid

### Anti-Pattern 1: Adding Guest Fields Directly to Order Model

**What:** Adding `guest_token`, `guest_expires_at`, `inviter_id` directly on the `orders` table.
**Why bad:** Couples invitation lifecycle with order lifecycle. An invitation exists before an order is created (and may expire without one). Mixing these makes queries complex and violates single responsibility.
**Instead:** Separate `guest_invitations` table with FK link to `orders`.

### Anti-Pattern 2: Extending Existing Order Router for Guest Endpoints

**What:** Adding guest endpoints to `backend/app/routers/orders.py`.
**Why bad:** The orders router is fully JWT-authenticated. Adding token-based auth endpoints creates a confusing security boundary in a single file. Future developers may accidentally apply JWT checks to guest endpoints or remove them from authenticated endpoints.
**Instead:** Separate `guest.py` router with explicit auth boundary.

### Anti-Pattern 3: Background Task for Expiry

**What:** Using FastAPI `BackgroundTasks` or a cron job to mark expired invitations.
**Why bad:** Adds infrastructure complexity for no benefit. The system is single-process SQLite — no distributed coordination needed. Checking on access is simpler and always accurate.
**Instead:** Lazy expiry check in `get_invitation_by_token` dependency.

### Anti-Pattern 4: Separate Frontend Build Entry

**What:** Creating a second Vite entry point (`guest.html`) for guest pages.
**Why bad:** Doubles build complexity, prevents sharing components, requires Vite multipage config, and complicates Docker build. The existing SPA catch-all (`StaticFiles(html=True)`) already handles any path.
**Instead:** Guest routes in the same SPA, outside `<ProtectedRoute>`.

### Anti-Pattern 5: Reusing `OrderService.create_order_auto_split()` for Guest Orders

**What:** Calling the auto-split logic and passing `user_id=None`.
**Why bad:** Auto-split is designed for multi-chef carts where items get grouped by chef. Guest orders are pre-bound to a single chef — the grouping logic is unnecessary overhead. Also, the auto-split function calls `notify_order` with `user_id`, which would fail on NULL.
**Instead:** Dedicated `create_guest_order` method in `GuestInvitationService` with simpler single-chef flow.

---

## Sources

- Direct codebase analysis: `backend/app/models/order.py`, `backend/app/models/dish.py`, `backend/app/routers/auth.py`, `backend/app/routers/orders.py`, `backend/app/services/order_service.py`, `backend/app/main.py`, `frontend/src/App.jsx`, `frontend/src/api/client.js`, `frontend/vite.config.js`
- `.planning/PROJECT.md` — Requirements and constraints
- `.planning/codebase/ARCHITECTURE.md` — Existing architecture documentation
- `.planning/codebase/STRUCTURE.md` — Directory structure and conventions

**Confidence: HIGH** — All architectural decisions are based on direct codebase analysis, not training data assumptions. No external library documentation was needed as this is purely about extending existing patterns within the codebase.
