# Phase 3: Frontend Authenticated - Pattern Map

**Mapped:** 2026-05-25
**Files analyzed:** 17 (5 backend, 12 frontend)
**Analogs found:** 17 / 17

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/app/services/guest_service.py` | service | CRUD | `backend/app/services/guest_service.py` (same file) | exact |
| `backend/app/routers/guest.py` | router | request-response, CRUD | `backend/app/routers/guest.py` (same file) | exact |
| `backend/app/schemas/guest.py` | schema/model | CRUD | `backend/app/schemas/guest.py` (same file) | exact |
| `backend/app/schemas/order.py` | schema/model | CRUD | `backend/app/schemas/order.py` (same file) | exact |
| `backend/app/routers/orders.py` | router | request-response | `backend/app/routers/orders.py` (same file) | exact |
| `frontend/src/api/client.js` | utility | CRUD | `frontend/src/api/client.js` (same file) | exact |
| `frontend/src/utils/index.js` | utility | — | `frontend/src/utils/index.js` (same file) | exact |
| `frontend/src/components/Badge.jsx` | component | — | `frontend/src/components/Badge.jsx` (same file) | exact |
| `frontend/src/css/styles.css` | config/style | — | `frontend/src/css/styles.css` (same file) | exact |
| `frontend/src/pages/UserHomePage.jsx` | page/component | request-response | `frontend/src/pages/UserHomePage.jsx` (same file) | exact |
| `frontend/src/pages/ChefOrdersPage.jsx` | page/component | request-response, CRUD | `frontend/src/pages/ChefOrdersPage.jsx` (same file) | exact |
| `frontend/src/pages/OrderDetailPage.jsx` | page/component | request-response | `frontend/src/pages/OrderDetailPage.jsx` (same file) | exact |
| `frontend/src/components/InvitationsSection.jsx` | component | request-response, CRUD | `frontend/src/pages/ChefOrdersPage.jsx` | role-match |
| `frontend/src/components/InvitationsModal.jsx` | component | request-response | `frontend/src/pages/ChefOrdersPage.jsx` (modal CSS pattern) | partial |
| `frontend/src/components/ChefSelectModal.jsx` | component | request-response | `frontend/src/pages/ChefOrdersPage.jsx` (modal CSS + `.chef-select-item`) | partial |
| `frontend/src/components/CreateLinkModal.jsx` | component | — | `frontend/src/pages/ChefOrdersPage.jsx` (modal CSS pattern) | partial |
| `frontend/src/components/ConfirmModal.jsx` | component | — | `frontend/src/pages/UserProfilePage.jsx` (window.confirm pattern) | role-match |

---

## Pattern Assignments

### Backend: `backend/app/services/guest_service.py` (service, CRUD)

**Analog:** `backend/app/services/guest_service.py` (same file) — lines 19-319

**Imports pattern** (lines 1-17):
```python
"""家味 · Family Chef - 访客邀请服务"""

import uuid
from datetime import datetime, timedelta
from typing import Optional, List

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.guest_invitation import GuestInvitation
from app.models.user import User
from app.models.order import Order, OrderItem
from app.models.dish import Dish, DishChef
```

**Core `@staticmethod` singleton pattern** (lines 19-71, 318-319):
```python
class GuestService:
    """访客邀请服务"""

    @staticmethod
    async def method_name(
        db: AsyncSession,
        param: type,
    ) -> ReturnType:
        """docstring in Chinese"""
        # query logic
        return result

# 全局访客邀请服务实例
guest_service = GuestService()
```

**`list_invitations` pattern** (new method, follow the existing pagination pattern from lines 100-117):
```python
@staticmethod
async def list_invitations(
    db: AsyncSession,
    inviter_id: int,
    params,
) -> tuple[list[GuestInvitation], int]:
    """获取用户创建的邀请列表"""
    from sqlalchemy import func

    # Count total
    count_q = select(func.count()).select_from(GuestInvitation).where(
        GuestInvitation.inviter_id == inviter_id
    )
    result = await db.execute(count_q)
    total = result.scalar()

    # Query with eager load of chef name
    q = (
        select(GuestInvitation)
        .where(GuestInvitation.inviter_id == inviter_id)
        .options(selectinload(GuestInvitation.chef))
        .order_by(GuestInvitation.created_at.desc())
        .offset(params.offset)
        .limit(params.limit)
    )
    result = await db.execute(q)
    invitations = result.scalars().all()
    return list(invitations), total
```

**`revoke_invitation` pattern** (new method, follow the error handling pattern from lines 130-267):
```python
@staticmethod
async def revoke_invitation(
    db: AsyncSession,
    invitation_id: int,
    current_user_id: int,
) -> GuestInvitation:
    """撤销邀请（仅创建者可撤销，仅活跃状态可撤销）"""
    result = await db.execute(
        select(GuestInvitation).where(GuestInvitation.id == invitation_id)
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise ValueError("邀请不存在")
    if invitation.inviter_id != current_user_id:
        raise ValueError("无权撤销此邀请")
    if invitation.status != "active":
        raise ValueError("仅活跃状态的邀请可撤销")
    if invitation.expires_at < datetime.now():
        invitation.status = "expired"
        await db.flush()
        raise ValueError("邀请已过期，无法撤销")
    invitation.status = "revoked"
    await db.flush()
    await db.refresh(invitation)
    return invitation
```

**Error handling pattern** (line 36-48, 83-98): `ValueError` raised with Chinese message for business rule violations.

**Lazy expiry check pattern** (lines 92-96):
```python
if invitation.status == "expired" or invitation.expires_at < datetime.now():
    invitation.status = "expired"
    await db.flush()
    raise ValueError("邀请链接已过期")
```

---

### Backend: `backend/app/routers/guest.py` (router, request-response)

**Analog:** `backend/app/routers/guest.py` (same file) — lines 1-129

**Imports pattern** (lines 1-23):
```python
"""家味 · Family Chef - 访客邀请路由"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.auth import require_role
from app.models.user import User
from app.services.guest_service import guest_service
from app.services.dish_service import dish_service
from app.schemas.guest import (
    GuestInvitationCreate,
    GuestInvitationResponse,
    GuestOrderCreate,
    GuestOrderSummaryResponse,
)
from app.schemas.dish import DishListResponse
from app.schemas.common import PageResponse
from app.utils.pagination import PaginationParams

router = APIRouter()
```

**New: `GET /api/guest/invitations`** — follow the existing list pattern from guest router:
```python
@router.get("/invitations", response_model=PageResponse)
async def list_invitations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(require_role("chef", "user")),
    db: AsyncSession = Depends(get_db),
):
    """获取我的邀请列表"""
    from app.utils.pagination import PaginationParams
    from app.schemas.guest import GuestInvitationListResponse

    params = PaginationParams(page=page, page_size=page_size)
    try:
        invitations, total = await guest_service.list_invitations(db, current_user.id, params)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    items = []
    for inv in invitations:
        items.append(GuestInvitationListResponse.model_validate(inv))

    return PageResponse[GuestInvitationListResponse](
        total=total, page=page, page_size=page_size, items=items
    )
```

**New: `PUT /api/guest/invitations/{id}/revoke`** — follow the pattern from the existing POST:
```python
@router.put("/invitations/{invitation_id}/revoke")
async def revoke_invitation(
    invitation_id: int,
    current_user: User = Depends(require_role("chef", "user")),
    db: AsyncSession = Depends(get_db),
):
    """撤销邀请"""
    try:
        invitation = await guest_service.revoke_invitation(db, invitation_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    await db.commit()
    return GuestInvitationResponse.model_validate(invitation)
```

**Error handling pattern** (lines 36-42, 58-62, 95-101):
```python
try:
    result = await service.method(db, params)
except ValueError as e:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=str(e),
    )
```

---

### Backend: `backend/app/schemas/guest.py` (schema, CRUD)

**Analog:** `backend/app/schemas/guest.py` (same file) — lines 1-49

**New: `GuestInvitationListResponse`** — extends the existing `GuestInvitationResponse` with `chef_name`:
```python
class GuestInvitationListResponse(BaseModel):
    """访客邀请列表响应（带厨师名称）"""
    id: int
    token: str
    inviter_id: int
    chef_id: int
    chef_name: Optional[str] = None
    status: str
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
```

**Existing `GuestInvitationResponse` pattern** (lines 12-23):
```python
class GuestInvitationResponse(BaseModel):
    """访客邀请响应"""
    id: int
    token: str
    inviter_id: int
    chef_id: int
    status: str
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
```

---

### Backend: `backend/app/schemas/order.py` (schema, CRUD)

**Analog:** `backend/app/schemas/order.py` (same file) — lines 44-73

**Modify `OrderListResponse`** — add `is_guest` field (line 44-55):
```python
class OrderListResponse(BaseModel):
    """订单列表项响应"""
    id: int
    order_no: str
    status: str
    is_guest: bool = False   # ✚ NEW: computed from guest_invitation_id
    items: List[OrderItemResponse] = []
    meal_date: Optional[date] = None
    meal_type: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
```

**Modify `OrderDetailResponse`** — add `is_guest` field (line 57-73):
```python
class OrderDetailResponse(BaseModel):
    """订单详情响应"""
    id: int
    order_no: str
    user_id: int
    status: str
    is_guest: bool = False   # ✚ NEW: computed from guest_invitation_id
    chef_id: Optional[int] = None
    notes: Optional[str] = None
    items: List[OrderItemResponse] = []
    customer: Optional[CustomerInfo] = None
    meal_date: Optional[date] = None
    meal_type: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
```

---

### Backend: `backend/app/routers/orders.py` (router, request-response)

**Analog:** `backend/app/routers/orders.py` (same file) — lines 1-255

**Modify `build_order_detail`** — add `is_guest` at line 73-86:
```python
return OrderDetailResponse(
    id=order.id,
    order_no=order.order_no,
    user_id=order.user_id,
    status=order.status,
    is_guest=order.guest_invitation_id is not None,   # ✚ NEW
    chef_id=order.chef_id,
    ...
)
```

**Modify `list_orders` response building** — add `is_guest` at line 156-164:
```python
list_items.append(OrderListResponse(
    id=o.id,
    order_no=o.order_no,
    status=o.status,
    is_guest=o.guest_invitation_id is not None,   # ✚ NEW
    items=item_responses,
    ...
))
```

---

### Frontend: `frontend/src/api/client.js` (utility, CRUD)

**Analog:** `frontend/src/api/client.js` (same file) — lines 1-316

**New methods** — follow existing pattern (lines 57-68 for auth, 120-148 for orders, 249-263 for chefs):
```javascript
// ─── Guest Invitations ─────────────────────────────────────
async getInvitations(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', params.page);
  if (params.page_size) qs.set('page_size', params.page_size);
  return this.get(`/guest/invitations?${qs}`);
}

async createInvitation(chefId) {
  const body = chefId ? { chef_id: chefId } : undefined;
  return this.post('/guest/invitations', body);
}

async revokeInvitation(id) {
  return this.put(`/guest/invitations/${id}/revoke`);
}
```

**Existing CRUD method pattern** (lines 92-98, 126-131, 199-211):
```javascript
async getXxx(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', params.page);
  if (params.page_size) qs.set('page_size', params.page_size);
  return this.get(`/resource?${qs}`);
}

async createXxx(data) {
  return this.post('/resource', data);
}

async updateXxx(id, data) {
  return this.put(`/resource/${id}`, data);
}
```

**Export pattern** (lines 315-316):
```javascript
export const api = new ApiClient();
export default api;
```

---

### Frontend: `frontend/src/utils/index.js` (utility, —)

**Analog:** `frontend/src/utils/index.js` (same file) — lines 51-69

**Invitation statuses to `statusBadge` map** — add at line 66 (before closing `}`):
```javascript
active: { text: '活跃', cls: 'badge-success' },
used: { text: '已使用', cls: 'badge-info' },    // or badge-muted
expired: { text: '已过期', cls: 'badge-warn' },
revoked: { text: '已撤销', cls: 'badge-danger' },
```

Note: The `badge-muted` class for "已使用" status does not exist yet in CSS and needs to be created. Alternatively, use `badge-info` as an initial fallback. The UI spec says "used=gray" — recommend using `badge-info` (which is blue-gray) or creating `.badge-muted`.

**Existing `statusBadge` map pattern** (lines 52-69):
```javascript
export const statusBadge = (status) => {
  const map = {
    pending: { text: '待处理', cls: 'badge-warn' },
    cooking: { text: '烹饪中', cls: 'badge-accent' },
    completed: { text: '已完成', cls: 'badge-success' },
    cancelled: { text: '已取消', cls: 'badge-danger' },
    ...
  };
  const s = map[status] || { text: status, cls: 'badge-info' };
  return { text: s.text, cls: s.cls };
};
```

---

### Frontend: `frontend/src/components/Badge.jsx` (component, —)

**Analog:** `frontend/src/components/Badge.jsx` (same file) — lines 1-17

**No code changes needed in Badge.jsx itself** — it already reads from the `statusBadge` map. Adding statuses to the map in `utils/index.js` is sufficient.

**Existing Badge pattern** (lines 1-17):
```jsx
import { statusBadge } from '../utils';

export default function Badge({ status, text, type }) {
  const badgeInfo = text
    ? { text, cls: `badge-${type || 'info'}` }
    : statusBadge(status);

  return (
    <span className={`badge ${badgeInfo.cls}`}>
      {badgeInfo.text}
    </span>
  );
}
```

**Guest order badge usage** (not a Badge component change — inline pattern in ChefOrdersPage / OrderDetailPage):
```jsx
<span className="badge badge-warn">访客订单</span>
```
This uses Badge's `text`+`type` props (not `status`):
```jsx
<Badge text="访客订单" type="warn" />
```

---

### Frontend: `frontend/src/css/styles.css` (config/style, —)

**Analog:** `frontend/src/css/styles.css` (same file) — lines 110-117

**New `.badge-muted` class** — add after line 117 (after `.badge-gold`):
```css
.badge-muted { background: var(--bg-elevated); color: var(--text-muted); }
```

**Existing badge classes pattern** (lines 111-117):
```css
.badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: var(--radius-full); font-size: 0.7rem; font-weight: 500; white-space: nowrap; }
.badge-warn { background: var(--warn-light); color: var(--warn); }
.badge-danger { background: var(--danger-light); color: var(--danger); }
.badge-success { background: var(--success-light); color: var(--success); }
.badge-info { background: var(--info-light); color: var(--info); }
.badge-accent { background: var(--accent-light); color: var(--accent); }
.badge-gold { background: var(--gold-light); color: var(--gold); }
```

**Modal CSS patterns** (lines 376-384) — reuse for all modals:
```css
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 16px; }
.modal-content { background: var(--bg-card); border-radius: var(--radius-xl); width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg); }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.modal-header h3 { font-size: 1rem; font-weight: 600; color: var(--text-primary); margin: 0; }
.modal-close { width: 32px; height: 32px; border: none; background: var(--bg-elevated); border-radius: var(--radius-full); font-size: 1rem; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.modal-close:hover { color: var(--text-primary); }
.modal-body { padding: 20px; }
.modal-footer { display: flex; gap: 12px; justify-content: flex-end; padding: 16px 20px; border-top: 1px solid var(--border); }
```

**`.chef-select-item` CSS** (lines 408-411) — reuse for ChefSelectModal:
```css
.chef-select-item { display: flex; align-items: center; gap: 12px; padding: 12px; border: 2px solid var(--border); border-radius: var(--radius-md); cursor: pointer; transition: all var(--transition-fast); }
.chef-select-item:hover { border-color: var(--border-medium); }
.chef-select-item.active { border-color: var(--accent); background: var(--accent-light); }
```

**`filter-chip` CSS** (lines 122-126) — reuse for guest filter chip:
```css
.filter-chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 16px 12px; }
.filter-chip { padding: 6px 14px; border-radius: var(--radius-full); font-size: 0.8rem; font-weight: 500; background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border); cursor: pointer; transition: all var(--transition-fast); }
.filter-chip:hover { color: var(--text-primary); border-color: var(--border-medium); }
.filter-chip.active { background: var(--accent-gradient); color: #fff; border-color: transparent; box-shadow: 0 2px 10px rgba(26, 115, 232, 0.2); }
```

**`.btn-sm` + `.btn-outline`** — reuse for revoke button (lines 84-85, 89):
```css
.btn-outline { background: transparent; color: var(--accent); border: 1.5px solid var(--accent); }
.btn-outline:hover { background: var(--accent-light); }
.btn-sm { padding: 6px 14px; font-size: 0.8rem; }
```

---

### Frontend: `frontend/src/pages/UserHomePage.jsx` (page, request-response)

**Analog:** `frontend/src/pages/UserHomePage.jsx` (same file) — lines 1-56

**Add `InvitationsSection` below the menu grid** (after line 51, before `BottomBar`):
```jsx
<InvitationsSection />
```

**Import pattern to add at top of file** (after existing imports):
```jsx
import InvitationsSection from '../components/InvitationsSection';
```

**Existing page structure pattern** (lines 6-56):
```jsx
export default function UserHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ... component logic ...

  return (
    <div className="page-container">
      <Header title="家味" />
      {/* page content */}
      <BottomBar />
    </div>
  );
}
```

---

### Frontend: `frontend/src/pages/ChefOrdersPage.jsx` (page, request-response/CRUD)

**Analog:** `frontend/src/pages/ChefOrdersPage.jsx` (same file) — lines 1-179

**Import pattern** (lines 5-15):
```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Badge from '../components/Badge';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { formatDate } from '../utils';
```

**Add "访客订单" filter chip** — insert after "已完成" chip (after line 101):
```jsx
<button
  className={`filter-chip ${filterStatus === 'guest' ? 'active' : ''}`}
  onClick={() => setFilterStatus('guest')}
>
  访客订单 ({orders.filter(o => o.is_guest).length})
</button>
```

**Modify `filteredOrders` to support guest filter** — replace lines 67-70:
```javascript
const filteredOrders = orders.filter(order => {
  if (filterStatus === 'all') return true;
  if (filterStatus === 'guest') return order.is_guest;
  return order.status === filterStatus;
});
```

**Add guest badge in order header** — modify line 113:
```jsx
<div className="order-header">
  <span className="order-no">
    #{order.id}
    {order.is_guest && <span className="badge badge-warn" style={{ marginLeft: 8 }}>访客订单</span>}
  </span>
  <span className="order-date">{formatDate(order.created_at)}</span>
</div>
```

**Existing filter chip pattern** (lines 77-102):
```jsx
<div className="filter-chips">
  <button
    className={`filter-chip ${filterStatus === 'all' ? 'active' : ''}`}
    onClick={() => setFilterStatus('all')}
  >
    全部 ({orders.length})
  </button>
  ...
</div>
```

**Existing order card pattern** (lines 110-171):
```jsx
{filteredOrders.map(order => (
  <div key={order.id} className="order-card" ...>
    <div className="order-header">
      <span className="order-no">#{order.id}</span>
      <span className="order-date">{formatDate(order.created_at)}</span>
    </div>
    <div className="order-items">...</div>
    <div className="order-footer">
      <Badge status={order.status} />
      <span className="order-total">¥{order.total_price?.toFixed(2) || '0.00'}</span>
    </div>
    ...
  </div>
))}
```

---

### Frontend: `frontend/src/pages/OrderDetailPage.jsx` (page, request-response)

**Analog:** `frontend/src/pages/OrderDetailPage.jsx` (same file) — lines 1-168

**Add guest badge in card header** — modify line 65:
```jsx
<h3 style={{ margin: 0 }}>
  订单 #{order.id}
  {order.is_guest && (
    <span className="badge badge-warn" style={{ marginLeft: 8, verticalAlign: 'middle' }}>
      访客订单
    </span>
  )}
</h3>
```

**Existing page load pattern** (lines 24-38):
```jsx
useEffect(() => {
  loadOrder();
}, [id]);

const loadOrder = async () => {
  try {
    setLoading(true);
    const res = await api.getOrder(id);
    setOrder(res);
  } catch (err) {
    showToast('加载订单失败', 'error');
  } finally {
    setLoading(false);
  }
};
```

---

### New: `frontend/src/components/InvitationsSection.jsx` (component, request-response/CRUD)

**Analog:** `frontend/src/pages/ChefOrdersPage.jsx` (role-match) — data loading + list rendering pattern

**Core component pattern** (follow ChefOrdersPage lines 17-45):
```jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Badge from '../components/Badge';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { formatDate } from '../utils';

export default function InvitationsSection() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFullList, setShowFullList] = useState(false);
  const [showChefSelect, setShowChefSelect] = useState(false);
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [newLink, setNewLink] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const res = await api.getInvitations({ page: 1, page_size: 50 });
      setInvitations(res.items || []);
    } catch (err) {
      showToast('加载邀请列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInvitations(); }, []);

  // ... modal state handlers, create, revoke ...

  return (
    <>
      {/* Section content */}
      {/* Modal overlays */}
    </>
  );
}
```

**Optimistic revoke pattern** (reference from RESEARCH.md lines 366-384):
```jsx
const handleRevoke = async (invitationId) => {
  const prevInvitations = [...invitations];

  // Optimistic update
  setInvitations(prev => prev.map(inv =>
    inv.id === invitationId ? { ...inv, status: 'revoked' } : inv
  ));
  setRevokeTarget(null);

  try {
    await api.revokeInvitation(invitationId);
    showToast('邀请已撤销');
  } catch (err) {
    // Rollback to previous state
    setInvitations(prevInvitations);
    showToast('撤销失败，请稍后重试', 'error');
  }
};
```

**Section header pattern** (follow `.section-title` CSS — styles.css lines 136-137):
```jsx
<section className="section">
  <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span>邀请访客</span>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button className="btn btn-primary btn-sm" onClick={handleCreateClick}>
        创建邀请
      </button>
      {invitations.length > 0 && (
        <button
          onClick={() => setShowFullList(true)}
          style={{ fontSize: '0.85rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          查看全部 ›
        </button>
      )}
    </div>
  </div>

  {/* Loading / Empty / List */}
</section>
```

**Invitation row layout** (follow `.list-item` CSS — styles.css lines 146-152):
```jsx
{invitations.slice(0, 5).map(inv => (
  <div key={inv.id} className="list-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
      <Badge status={inv.status} />
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {formatDate(inv.created_at)}
      </div>
      {user?.role !== 'chef' && inv.chef_name && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {inv.chef_name}
        </div>
      )}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {inv.status === 'active' && (
        <>
          <button className="btn-icon" onClick={() => handleCopyLink(inv.token)} title="复制链接">
            📋
          </button>
          <button
            className="btn btn-outline btn-sm"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
            onClick={() => setRevokeTarget(inv)}
          >
            撤销
          </button>
        </>
      )}
    </div>
  </div>
))}
```

---

### New: `frontend/src/components/InvitationsModal.jsx` (component, request-response)

**Analog:** No existing full-screen modal. Use CSS `.modal-overlay` + custom full-screen size.

**Full-screen modal pattern:**
```jsx
export default function InvitationsModal({ invitations, loading, onClose, onRevoke, onCopyLink, user }) {
  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: 0 }}>
      <div
        className="modal-content"
        style={{ maxWidth: '100%', height: '100vh', borderRadius: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>邀请记录</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ padding: 0 }}>
          {/* Reuse same row layout as InvitationsSection */}
        </div>
      </div>
    </div>
  );
}
```

---

### New: `frontend/src/components/ChefSelectModal.jsx` (component, request-response)

**Analog:** Use existing `.chef-select-item` CSS and modal CSS pattern.

**Modal + Chef select pattern:**
```jsx
export default function ChefSelectModal({ onSelect, onClose }) {
  const [chefs, setChefs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getChefs();
        setChefs(Array.isArray(res) ? res : (res.items || []));
      } catch (err) {
        showToast('加载厨师列表失败', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>选择厨师</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {loading ? <Loading /> : chefs.length === 0 ? (
            <EmptyState icon="👨‍🍳" text="暂无可用厨师" />
          ) : (
            chefs.map(chef => (
              <div
                key={chef.id}
                className="chef-select-item"
                onClick={() => onSelect(chef)}
              >
                <div className="avatar avatar-sm">
                  {(chef.display_name || chef.username).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{chef.display_name || chef.username}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### New: `frontend/src/components/CreateLinkModal.jsx` (component, —)

**Analog:** Standard modal CSS pattern.

**Clipboard copy + Web Share pattern** (from RESEARCH.md lines 573-610):
```jsx
export default function CreateLinkModal({ linkUrl, onClose }) {
  const { showToast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(linkUrl);
      showToast('链接已复制到剪贴板');
    } catch {
      showToast('复制失败，请手动复制', 'error');
    }
  };

  const handleShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: '家味 · Family Chef',
          text: '来点菜吧！',
          url: linkUrl,
        });
      } catch {
        // User cancelled — no feedback needed
      }
    } else {
      showToast('当前浏览器不支持分享功能，请使用复制链接', 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>邀请链接已创建</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{
            padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 8
          }}>
            {linkUrl}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            2小时内有效
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary flex-1" onClick={handleCopy}>
              📋 复制链接
            </button>
            <button className="btn btn-outline flex-1" onClick={handleShare}>
              🚀 分享
            </button>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>完成</button>
        </div>
      </div>
    </div>
  );
}
```

---

### New: `frontend/src/components/ConfirmModal.jsx` (component, —)

**Analog:** `window.confirm` usage pattern in other pages (e.g., UserProfilePage.jsx:51, ChefOrdersPage.jsx:47). Replaced with a custom modal per D-18.

**Reusable confirm modal pattern:**
```jsx
export default function ConfirmModal({ title, message, confirmText = '确定', cancelText = '取消', onConfirm, onCancel, danger = false }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {message}
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>{cancelText}</button>
          <button
            className={`btn ${danger ? 'btn-outline' : 'btn-primary'}`}
            style={danger ? { borderColor: 'var(--danger)', color: 'var(--danger)' } : {}}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Usage in InvitationsSection:**
```jsx
{revokeTarget && (
  <ConfirmModal
    title="撤销邀请"
    message="确定要撤销这条邀请链接吗？撤销后邀请将立即失效，访客无法继续使用此链接点菜。"
    confirmText="确定撤销"
    danger
    onConfirm={() => handleRevoke(revokeTarget.id)}
    onCancel={() => setRevokeTarget(null)}
  />
)}
```

---

## Shared Patterns

### Authentication / Authorization
**Source:** `backend/app/routers/auth.py` — `require_role` dependency
**Apply to:** `backend/app/routers/guest.py` (new endpoints)

```python
current_user: User = Depends(require_role("chef", "user"))
```
- Both `GET /api/guest/invitations` and `PUT /api/guest/invitations/{id}/revoke` use `require_role("chef", "user")`.

### Error Handling — Backend
**Source:** `backend/app/routers/guest.py` lines 36-42, 95-101; `backend/app/services/guest_service.py` lines 83-98
**Apply to:** All backend service methods and router endpoints

```python
# Router layer: catch ValueError → HTTPException
try:
    result = await service.method(db, params)
except ValueError as e:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

# Service layer: raise ValueError with Chinese messages
if not record:
    raise ValueError("邀请不存在")
```

### Error Handling — Frontend
**Source:** `frontend/src/pages/ChefOrdersPage.jsx` lines 30-43, 51-57
**Apply to:** All frontend API calls

```jsx
const loadData = async () => {
  try {
    setLoading(true);
    const res = await api.method(params);
    setState(res.items || []);
  } catch (err) {
    showToast('错误信息', 'error');
  } finally {
    setLoading(false);
  }
};
```

### Data Loading Pattern
**Source:** `frontend/src/pages/ChefOrdersPage.jsx` lines 26-28; `frontend/src/pages/OrderDetailPage.jsx` lines 24-38
**Apply to:** All new data-fetching components (InvitationsSection, InvitationsModal, ChefSelectModal)

```jsx
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => { loadFunction(); }, []);

const loadFunction = async () => {
  try {
    setLoading(true);
    const res = await api.method(params);
    setData(res.items || []);
  } catch (err) {
    showToast('加载失败', 'error');
  } finally {
    setLoading(false);
  }
};
```

### Ownership Validation
**Source:** `backend/app/services/guest_service.py` — `revoke_invitation` new method pattern
**Apply to:** `revoke_invitation` — verify `inviter_id == current_user_id`

```python
if invitation.inviter_id != current_user_id:
    raise ValueError("无权撤销此邀请")
```

### Atomic State Change Pattern
**Source:** `backend/app/services/guest_service.py` lines 214-216 (mark invitation as used)
**Apply to:** `revoke_invitation` — flush after status change

```python
invitation.status = "revoked"
await db.flush()
await db.refresh(invitation)
return invitation
```

### Modal Overlay Pattern
**Source:** `frontend/src/css/styles.css` lines 376-384
**Apply to:** All new modal components

```jsx
// Prevent body scroll when modal is open
useEffect(() => {
  document.body.style.overflow = 'hidden';
  return () => { document.body.style.overflow = ''; };
}, []);

// Modal JSX structure
<div className="modal-overlay" onClick={onClose}>
  <div className="modal-content" onClick={e => e.stopPropagation()}>
    <div className="modal-header">
      <h3>Title</h3>
      <button className="modal-close" onClick={onClose}>✕</button>
    </div>
    <div className="modal-body">
      {/* content */}
    </div>
    <div className="modal-footer">
      {/* action buttons */}
    </div>
  </div>
</div>
```

### Toast Notification Pattern
**Source:** `frontend/src/contexts/ToastContext.jsx` lines 12-17; usage in ChefOrdersPage.jsx:40
**Apply to:** All interactive feedback (copy, revoke, create, error states)

```jsx
const { showToast } = useToast();
showToast('消息内容');           // success (default, green)
showToast('错误消息', 'error');  // error (red)
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/src/components/InvitationsModal.jsx` | component | request-response | No existing full-screen modal component in the project — use CSS `.modal-overlay` + full-screen styles |
| `frontend/src/components/ChefSelectModal.jsx` | component | request-response | No existing chef-picker modal — use `.chef-select-item` CSS from styles.css:408-411 |
| `frontend/src/components/CreateLinkModal.jsx` | component | — | No existing post-creation link display modal — use standard modal CSS + Clipboard/Web Share API |
| `frontend/src/components/ConfirmModal.jsx` | component | — | No existing confirm dialog component — all existing pages use `window.confirm()` (D-18 mandates custom modal) |

---

## Metadata

**Analog search scope:** `/home/temila/family_chef/frontend/src/`, `/home/temila/family_chef/backend/app/`
**Files scanned:** 22 (12 frontend, 10 backend)
**Pattern extraction date:** 2026-05-25
