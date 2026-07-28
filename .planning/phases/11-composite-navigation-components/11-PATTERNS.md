# Phase 11: Composite & Navigation Components - Pattern Map

**Mapped:** 2026-07-28  
**Status:** Pattern mapping complete

**Files analyzed:** 13 new composites (6 components + 5 co-located CSS + 1 context rewrite + 1 file-rename) + 22 call-site migrations + 1 styles.css cleanup  
**Analogs found:** 13 / 13

Branch: `feature/ui-rebuild`  
Stack: React 19 / FastAPI / MD3 migration / `--md-*` CSS tokens (Phase 8) / state-layer + Ripple (Phase 9) / Button/IconButton/Card/Input/FAB/Badge/Chip/Icon primitives (Phase 10)

---

## File Classification

| file | role | data flow | closest_analog | match quality |
|---|---|---|---|---|
| `frontend/src/components/composites/Modal.jsx` | composite component | request-response/event (open/close + ESC + focus trap) | `frontend/src/components/ConfirmModal.jsx:52-104` + `WishFormModal.jsx:141-221` | exact pattern (consolidates 7 wrapper components) |
| `frontend/src/components/composites/Modal.css` | composite CSS | presentation | `frontend/src/css/styles.css:402-412` (`.modal-overlay/.modal-content/.modal-header/.modal-body/.modal-footer/.modal-close`) | exact (rebuild in --md-* tokens) |
| `frontend/src/contexts/ToastContext.jsx` (rewrite as SnackbarContext) | context provider | event-driven (queue + auto-dismiss) | `frontend/src/contexts/ToastContext.jsx:1-50` (current single-toast) + `AuthContext.jsx:7-66` (provider pattern) | exact (same filename kept per D-08; 213 callers untouched) |
| `frontend/src/components/composites/Sidebar.jsx` | composite component | navigation/event (active state + navigate) | `frontend/src/components/Sidebar.jsx:1-104` (current 240px) | exact (rewrite logic preserved; 80dp width) |
| `frontend/src/components/composites/Sidebar.css` | composite CSS | presentation | `frontend/src/css/styles.css:319-345` (`.pc-sidebar/*`) | exact (240px→80dp + active indicator pill) |
| `frontend/src/components/composites/BottomBar.jsx` | composite component | navigation/event (active state + navigate) | `frontend/src/components/BottomBar.jsx:1-71` (current 80dp) | exact (logic preserved; active pill added) |
| `frontend/src/components/composites/BottomBar.css` | composite CSS | presentation | `frontend/src/css/styles.css:64-76` (`.bottom-bar/.tab-item/.tab-icon/.tab-label`) | exact (active indicator pill + label-always-visible) |
| `frontend/src/components/composites/Header.jsx` | composite component | presentation/event (page title + user menu) | `frontend/src/components/Header.jsx:1-40` (current `header-left/title/actions`) | exact (rewrite to Sidecar Header with logo + page title + user menu) |
| `frontend/src/components/composites/Header.css` | composite CSS | presentation | `frontend/src/css/styles.css:54-62` (`.header/.header-title/.header-back/.header-actions`) | exact (Sidecar layout: 3-column) |
| `frontend/src/components/composites/ListItem.jsx` | composite component (compound) | event (onClick + trailing stopPropagation) | `frontend/src/components/primitives/Card.jsx:17-63` (slot-based compound) | exact (compound slots: Leading/Content/Headline/Supporting/Trailing) |
| `frontend/src/components/composites/ListItem.css` | composite CSS | presentation | `frontend/src/css/styles.css:146-154` (`.list-item/.list-item-img/.list-item-info/.list-item-name/.list-item-meta`) | exact (1/2/3-line + clickable + state-layer) |
| `frontend/src/components/composites/Divider.jsx` | composite component (trivial) | presentation | `frontend/src/components/primitives/Card.jsx:17-63` (compound API precedent) + `styles.css:147` (`.list-item { border-bottom }`) | exact (inset/full; outline-variant color) |
| `frontend/src/components/composites/Divider.css` | composite CSS | presentation | inline `border-bottom: 1px solid var(--md-color-outline-variant)` in `.list-item` | exact (1px height token-derived) |

### Migration call-site files (15 inline + 7 wrapper consumers)

| file | role | migration target | source pattern |
|---|---|---|---|
| `frontend/src/components/ConfirmModal.jsx` | modal wrapper → thin wrapper | `<Modal>` + children | `ConfirmModal.jsx:52-104` self |
| `frontend/src/components/WishFormModal.jsx` | modal wrapper → thin wrapper | `<Modal>` + form children | `WishFormModal.jsx:141-221` self |
| `frontend/src/components/WishRejectModal.jsx` | modal wrapper → thin wrapper | `<Modal>` + Input | `WishRejectModal.jsx:67-125` self |
| `frontend/src/components/WishAdvanceModal.jsx` | modal wrapper → thin wrapper | `<Modal>` + dish picker | `WishAdvanceModal.jsx:111-209` self |
| `frontend/src/components/CreateLinkModal.jsx` | modal wrapper → thin wrapper | `<Modal>` + link preview | `CreateLinkModal.jsx:49-110` self |
| `frontend/src/components/InvitationsModal.jsx` | modal wrapper → thin wrapper | `<Modal variant="full-screen">` + list | `InvitationsModal.jsx:29-129` self |
| `frontend/src/components/ChefSelectModal.jsx` | modal wrapper → thin wrapper | `<Modal>` + chef list | `ChefSelectModal.jsx:33-79` self |
| 15 inline `<div className="modal-overlay">` JSX sites in pages | inline → `<Modal>` | `<Modal open onClose={fn}>...` | D-01 / D-02; same scroll-lock + ESC + focus trap as 7 wrappers |
| `frontend/src/pages/AdminHomePage.jsx:168` | list-item → `<ListItem>` | `<ListItem variant="2-line">` + Headline + Supporting | `styles.css:147-154` |
| `frontend/src/components/InvitationsModal.jsx:55` | list-item → `<ListItem>` | `<ListItem>` + Leading (Badge) + Content/Headline + Trailing (IconButton/Button) | `InvitationsModal.jsx:52-124` |
| `frontend/src/components/InvitationsSection.jsx:159` | list-item → `<ListItem>` | identical shape to InvitationsModal | `InvitationsSection.jsx:158-219` |
| `frontend/src/App.jsx` | layout + provider rename | `<ToastProvider>` → `<SnackbarProvider>` (per D-08); insert `<Header />` between `<Sidebar />` and `<main>` (per D-10) | `App.jsx:74-84,106,294` |
| `frontend/src/css/styles.css` | delete legacy selectors | `.modal-overlay/content/header/body/footer/close`, `.pc-sidebar/*`, `.bottom-bar/tab-item/tab-icon/tab-label`, `.list-item*`, `.toast/toast-success/toast-error/@keyframes slideDown` | `styles.css:64-76,146-154,290-294,319-345,402-412` |

---

## Pattern Assignments

### Wave 1 — 11-01 (Modal)

#### `Modal.jsx` (composite component, request-response/event)

**Analogs:** `ConfirmModal.jsx:52-104` (canonical a11y + focus trap + ESC + scroll lock) AND `WishFormModal.jsx:141-221` (form-as-children + content-as-body) AND `WishAdvanceModal.jsx:111-209` (search + list-as-body) AND `InvitationsModal.jsx:29-129` (full-screen variant via `maxWidth:100% + height:100vh`).

**Structural skeleton (extracted from `ConfirmModal.jsx:52-104`):**

```jsx
import { useEffect, useRef } from 'react';
import { trapFocusWithin } from '../../utils';
import './Modal.css';

export default function Modal({
  variant = 'basic',       // 'basic' | 'full-screen'
  open = true,
  onClose,
  title,
  closeIcon = true,
  header,                  // slot: custom header (overrides title + closeIcon)
  footer,                  // slot: custom footer
  actions,                 // ReactNode array — auto-wrapped in <div class="modal-actions">
  children,
  closeOnBackdrop = true,
  labelledBy,              // aria-labelledby id (caller-provided)
  describedBy,             // aria-describedby id (caller-provided)
  initialFocusRef,         // optional ref to focus on mount (default: close button)
  className = '',
  style,                   // max-width override (e.g. 360 / 420 / 480 / 560)
}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  // 锁定背景滚动 + 最初聚焦 + 关闭后归还焦点（FROM ConfirmModal.jsx:26-41）
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (initialFocusRef?.current || closeRef.current)?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.focus && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [open, initialFocusRef]);

  // ESC 关闭（FROM ConfirmModal.jsx:44-50）
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
  };

  const isFullScreen = variant === 'full-screen';

  return (
    <div
      className={`md-modal-overlay md-modal--${variant} ${className}`}
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="md-modal"
        style={isFullScreen ? undefined : style}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => trapFocusWithin(e, dialogRef.current)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {header !== undefined ? (
          <div className="md-modal__header">{header}</div>
        ) : (
          <div className="md-modal__header">
            <h3 className="md-modal__title" id={labelledBy}>{title}</h3>
            {closeIcon && (
              <button
                ref={closeRef}
                type="button"
                className="md-modal__close"
                onClick={onClose}
                aria-label={`关闭${title || '窗口'}`}
              >
                ✕
              </button>
            )}
          </div>
        )}

        <div className="md-modal__body">{children}</div>

        {footer !== undefined ? (
          <div className="md-modal__footer">{footer}</div>
        ) : actions ? (
          <div className="md-modal__footer">
            <div className="md-modal__actions">
              {Array.isArray(actions) ? actions : [actions]}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

**Deviations from analogs:**
- Single component replaces 7 wrapper components + 15 inline sites (D-01)
- `variant="basic"` (default) | `variant="full-screen"` (D-02 — caller opt-in, no auto-detection)
- `header`/`footer` slots override default rendering (D-03); `actions` = ReactNode array auto-wrapped in `md-modal__actions` flex container
- `closeIcon={false}` for WishFormModal-style (header has its own actions)
- `labelledBy` / `describedBy` props propagate ARIA ids (caller provides `useId()` or stable id)
- ESC closes unconditionally on no `confirming`/`submitting` flag (caller can disable via `onClose` that ignores)
- Focus trap uses `trapFocusWithin` from `utils/index.js:101-121` (cycle first ⇄ last focusable element)

**Consumers (22 sites):**
- 7 wrapper components rewritten as thin wrappers:
  - `ConfirmModal.jsx` → `<Modal title="..."><div className="md-modal-body-text">{message}</div></Modal>` with `actions={[<Button variant="tonal" onClick={onCancel}>取消</Button>, <Button variant="filled" onClick={onConfirm}>确定</Button>]}`
  - `WishFormModal.jsx` → `<Modal title="..." closeIcon={false}><form>...<Input/>...<Button type="submit"/></form></Modal>` (form is the `children`; submit acts as primary action)
  - `WishRejectModal.jsx` → `<Modal title="拒绝愿望" actions={[<Button variant="tonal">暂不拒绝</Button>, <Button variant="filled" error>确认拒绝</Button>]}><form><Input multiline .../></form></Modal>`
  - `WishAdvanceModal.jsx` → `<Modal title="..."><form><search-bar/><wish-picker-list/><actions/></form></Modal>`
  - `CreateLinkModal.jsx` → `<Modal title="邀请链接已创建"><div>(link block)</div><actions><Button>复制</Button><Button>分享</Button></actions></Modal>` (no auto-close; close via header ✕)
  - `InvitationsModal.jsx` → `<Modal variant="full-screen" title="邀请记录"><list/></Modal>` (full-screen per current `maxWidth:100% + height:100vh` override)
  - `ChefSelectModal.jsx` → `<Modal title="选择厨师"><chef-list/></Modal>`
- 15 inline `<div className="modal-overlay">` sites — same `<Modal>` rewrite

**Pattern notes:**
- Trap focus + ESC + scroll lock + restore focus are **all already correct** in 7 wrapper analogs; Phase 11 plumbs them through one component rather than re-implementing. Don't regress: any new `<Modal>` must keep all four behaviors.
- `confirming` / `submitting` guard: caller still responsible (Modal ESC always fires `onClose`; caller can no-op while submitting). See `ConfirmModal.jsx:46` and `WishFormModal.jsx:84`.

---

#### `Modal.css` (composite CSS, presentation)

**Analog:** `frontend/src/css/styles.css:402-412` (D-20: get deleted).

```css
@import '../primitives/base.css';

/* Overlay = MD3 scrim (--md-color-scrim, 32% black) + center content */
.md-modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--md-color-scrim);
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

/* Full-screen variant: edge-to-edge, no padding, no centering */
.md-modal--full-screen {
  padding: 0;
  align-items: stretch;
}

/* Surface container-lowest + 24dp radius + elevation-3 */
.md-modal {
  background: var(--md-color-surface-container-lowest);
  border-radius: var(--md-radius-lg);
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--md-elevation-3);
  display: flex;
  flex-direction: column;
  position: relative;
}
.md-modal--full-screen .md-modal {
  max-width: 100%;
  max-height: 100vh;
  height: 100vh;
  border-radius: 0;
}

/* Header: 16dp x-padding, 16/20dp vertical, 1px bottom border */
.md-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--md-color-outline-variant);
  flex-shrink: 0;
}
.md-modal__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--md-color-on-surface);
  margin: 0;
}

/* Close = 48dp hit box (base.css md-interactive) + full radius */
.md-modal__close {
  border: none;
  background: transparent;
  border-radius: var(--md-radius-full);
  font-size: 1rem;
  color: var(--md-color-on-surface-variant);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  /* base.css 48dp hit box applies via min-width/min-height on .md-interactive */
}

/* Body: 20dp padding, scroll if overflow */
.md-modal__body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

/* Footer: 12dp gap, right-aligned actions, 16dp y-padding */
.md-modal__footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--md-color-outline-variant);
  flex-shrink: 0;
}
.md-modal__actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Reduced-motion: disable transitions */
@media (prefers-reduced-motion: reduce) {
  .md-modal { transition: none; }
}
```

**Deviations from analog:**
- All selectors prefixed `md-` (Phase 10 D-02 naming convention)
- `position: fixed; inset: 0; background: var(--md-color-scrim)` retained from `.modal-overlay`
- `border-radius: var(--md-radius-lg)` (24px) per MD3 — was `var(--md-radius-lg)` in old code already
- `box-shadow: var(--md-elevation-3)` per MD3 spec
- ADD: `--md-radius-md` for full-screen = 0 (already true in old `InvitationsModal.jsx:37`)
- ADD: `flex-shrink: 0` on header/footer so body scrolls
- DELETE: `.modal-close::before` state-layer (use `md-interactive` base.css instead)

---

#### `ToastContext.jsx` (rewrite as SnackbarContext, context provider)

**Analog:** `frontend/src/contexts/ToastContext.jsx:1-50` (current single-toast, 3s timer) AND `AuthContext.jsx:7-66` (provider pattern + useAuth hook + throw on missing provider).

**Structural skeleton (extended fro 1-toast to queue-of-3):**

```jsx
// File keep: frontend/src/contexts/ToastContext.jsx (D-08 — 最小 import 改动)
// Internal rename: ToastContext → SnackbarContext, ToastProvider → SnackbarProvider
// Public API 100% preserved: showToast(message, type='success') with 213 unchanged callers

import { createContext, useCallback, useContext, useRef, useState } from 'react';

const SnackbarContext = createContext(null);

const DURATION_BY_TYPE = {
  success: 4000,
  info: 4000,
  warn: 6000,
  error: 6000,
};

const MAX_VISIBLE = 3;

let nextId = 0;

export const SnackbarProvider = ({ children }) => {
  const [items, setItems] = useState([]);  // SnackbarItem[]
  const timersRef = useRef(new Map());    // id → timeoutId

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    const timerId = timersRef.current.get(id);
    if (timerId) { clearTimeout(timerId); timersRef.current.delete(id); }
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    const id = ++nextId;
    const item = { id, message, type, createdAt: Date.now() };
    setItems((prev) => [...prev, item]);   // newest at end (D-06: bottom-up; reverse on render)
    const timerId = setTimeout(() => dismiss(id), DURATION_BY_TYPE[type] || 4000);
    timersRef.current.set(id, timerId);
  }, [dismiss]);

  const value = { showToast, dismiss };

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {items.length > 0 && (
        <div className="md-snackbar-stack" role="status" aria-live="polite">
          {/* Render in reverse order so newest appears at top (D-06) */}
          {[...items].reverse().map((it) => (
            <div key={it.id} className={`md-snackbar md-snackbar--${it.type}`}>
              <span className={`md-snackbar__bar md-snackbar__bar--${it.type}`} aria-hidden="true" />
              <span className="md-snackbar__message">{it.message}</span>
              <button
                type="button"
                className="md-snackbar__close"
                onClick={() => dismiss(it.id)}
                aria-label="关闭通知"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </SnackbarContext.Provider>
  );
};

// useToast as alias — 213 callsites unchanged (D-08)
export const useToast = () => {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useToast must be used within a SnackbarProvider');
  return ctx;
};

// Default export keeps filename-level compat
export default SnackbarContext;
```

**Deviations from analog:**
- Single-toast → queue-of-3 (newest at top per D-06)
- 3s → 4s/6s by tone (D-07)
- Adds `dismiss(id)` for manual ✕ close
- Co-located CSS via `<style>` NOT exported — styles live in `composites/SnackbarContext.css` (see D-19 SDC: 1 less import = fewer mistakes; OR inline as `<style>` in same file). Recommended: co-located `SnackbarContext.css` for consistency with other composites.
- Provider/variable internal rename (`ToastContext` → `SnackbarContext`, `ToastProvider` → `SnackbarProvider`) — `App.jsx` has 1 line change (`<ToastProvider>` → `<SnackbarProvider>`)
- All 8 `import { useToast } from '../contexts/ToastContext'` callsites: **unchanged** (filename preserved per D-08)
- `showToast` signature 100% preserved: `(message, type='success')` — 213 callsites untouched (D-04)

**Public API (zero regression contract):**
- `useToast()` returns `{ showToast(message, type), dismiss(id) }` — dismiss is new but additive
- `showToast` signature unchanged: `(message: string, type?: 'success'|'info'|'warn'|'error')`

---

### Wave 2 — 11-02 (Sidebar / BottomBar / Header)

#### `Sidebar.jsx` (composite component, navigation/event)

**Analog:** `frontend/src/components/Sidebar.jsx:1-104` (current 240px). Logic preserved; width changes to 80dp.

**Structural skeleton (role logic + nav-items identical to source):**

```jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePendingOrderCount } from '../../hooks/usePendingOrderCount';
import Icon from '../primitives/Icon';
import Ripple from '../primitives/Ripple';
import Badge from '../primitives/Badge';
import './Sidebar.css';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const pendingCount = usePendingOrderCount();

  if (!user) return null;

  // navItems copied verbatim from Sidebar.jsx:18-50 with icon → {icon, label} mapping
  let navItems;
  if (user.role === 'admin') {
    navItems = [
      { icon: 'dashboard', label: '管理后台', path: '/admin' },
      { icon: 'restaurant', label: '菜品管理', path: '/admin/dishes' },
      // ... 8 more admin items
    ];
  } else if (user.role === 'chef') {
    navItems = [
      { icon: 'home', label: '首页', path: '/home' },
      { icon: 'soup-kitchen', label: '订单管理', path: '/chef/orders' },
      // ... 6 more chef items
    ];
  } else {
    navItems = [
      { icon: 'home', label: '首页', path: '/home' },
      // ... 4 more user items
    ];
  }

  // logo icon: replace 🍲 emoji with <Icon name="restaurant" /> (deferred — agent's Discretion)
  const HomeIcon = null; // placeholder

  return (
    <aside className="md-sidebar">
      <div className="md-sidebar__logo">
        <Icon name="restaurant" size={28} />
      </div>

      <nav className="md-sidebar__nav">
        {navItems.map((item) => (
          <Ripple key={item.path} style={{ width: '100%' }}>
            <button
              className={`md-sidebar__item ${location.pathname === item.path ? 'md-sidebar__item--active' : ''}`}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              title={item.label}
            >
              <span className="md-sidebar__item-icon">
                <Icon name={item.icon} size={24} />
                {item.path === '/chef/orders' && <Badge count={pendingCount} />}
              </span>
            </button>
          </Ripple>
        ))}
      </nav>

      <div className="md-sidebar__footer">
        <Ripple style={{ width: '100%' }}>
          <button
            className="md-sidebar__item"
            onClick={() => { logout(); navigate('/login'); }}
            aria-label="退出"
            title="退出"
          >
            <span className="md-sidebar__item-icon">
              <Icon name="logout" size={24} />
            </span>
          </button>
        </Ripple>
      </div>
    </aside>
  );
}
```

**Deviations from analog:**
- Width 240px → `80px` (D-09)
- Hide labels (icon-only) — moved to Sidecar Header (D-10)
- Emoji → `<Icon>` (30 icon set per Phase 10 D-07)
- Add active indicator pill: `.md-sidebar__item--active::before` — `position: absolute; inset: 50% auto auto 50%; transform: translate(-50%, -50%); width: 56px; height: 32px; border-radius: 16px; background: var(--md-color-primary-container); z-index: -1` (D-11)
- Hide via `@media (max-width: 1023px) { .md-sidebar { display: none; } }` (already in `styles.css:396-400` — just port)
- Logout moves to footer (still 80dp wide → only Icon visible)
- User avatar moves to Sidecar Header (D-10)

---

#### `Sidebar.css` (composite CSS, presentation)

**Analog:** `frontend/src/css/styles.css:319-345` (`.pc-sidebar/*` — D-20 delete).

```css
/* 80dp navigation rail (MD3 spec) — icon-only, active pill = primary-container */
.md-sidebar {
  display: none;
  width: 80px;
  background: var(--md-color-surface-container-lowest);
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
  overflow-y: auto;
  border-right: 1px solid var(--md-color-outline-variant);
}

/* Logo at top: 32dp icon centered, 24dp y-padding */
.md-sidebar__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0 16px;
  color: var(--md-color-primary);
}

/* Nav: vertical flex, 8dp x-padding, items take full width */
.md-sidebar__nav {
  flex: 1;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  align-items: stretch;
}
.md-sidebar__footer {
  padding: 8px 0;
  border-top: 1px solid var(--md-color-outline-variant);
}

/* Each item: 80dp tall, icon centered, ripple from Phase 9 primitive */
.md-sidebar__item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 80dp;            /* 80dp hit area per MD3 spec */
  height: 80px;
  border: none;
  background: transparent;
  cursor: pointer;
  position: relative;
  color: var(--md-color-on-surface-variant);
  transition: color var(--md-motion-duration-short) var(--md-motion-easing-standard);
}

/* Active indicator pill: 56×32 centered, primary-container (D-11) */
.md-sidebar__item--active {
  color: var(--md-color-on-primary-container);
}
.md-sidebar__item--active::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 56px;
  height: 32px;
  border-radius: 16px;
  background: var(--md-color-primary-container);
  z-index: 0;
  transition: background var(--md-motion-duration-short) var(--md-motion-easing-standard);
}
.md-sidebar__item > :not(.md-ripple-layer) {
  position: relative;
  z-index: 2;
}

/* Icon container: 28×28 visual + badge overlaid */
.md-sidebar__item-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Show only on PC (≥1024px) — same breakpoint as current */
@media (min-width: 1024px) {
  .md-sidebar { display: flex; }
}
```

**Deviations from analog:**
- `.pc-sidebar` (240px) → `.md-sidebar` (80px)
- `.pc-sidebar-item` (10/14 padding, has label) → `.md-sidebar__item` (80dp tall, icon-only)
- `.pc-sidebar-item.active { background: primary-container }` → ACTIVE PILL (56×32 centered pill, not full-width block)
- DELETE: `.pc-sidebar-header`, `.pc-sidebar-logo`, `.pc-sidebar-subtitle`, `.pc-sidebar-user`, `.pc-sidebar-user-info`, `.pc-sidebar-user-name`, `.pc-sidebar-user-role`, `.pc-sidebar-footer-actions` (all moved to Sidecar Header per D-10)

---

#### `BottomBar.jsx` (composite component, navigation/event)

**Analog:** `frontend/src/components/BottomBar.jsx:1-71` (current 80dp — already correct height; add active pill).

**Structural skeleton (logic preserved verbatim from source):**

```jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePendingOrderCount } from '../../hooks/usePendingOrderCount';
import Icon from '../primitives/Icon';
import Badge from '../primitives/Badge';
import './BottomBar.css';

export default function BottomBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const pendingCount = usePendingOrderCount();

  if (!user) return null;

  // tabs copied verbatim from BottomBar.jsx:17-40 with icon → Icon name mapping
  let tabs;
  if (user.role === 'admin') {
    tabs = [
      { id: 'admin-home', icon: 'dashboard', label: '后台', path: '/admin' },
      // ... 4 more admin tabs
    ];
  } else if (user.role === 'chef') {
    tabs = [
      { id: 'chef-orders', icon: 'soup-kitchen', label: '订单', path: '/chef/orders' },
      // ... 4 more chef tabs
    ];
  } else {
    tabs = [
      { id: 'user-home', icon: 'home', label: '首页', path: '/home' },
      // ... 3 more user tabs
    ];
  }

  const isActive = (path) => {
    if (path === '/home' && location.pathname === '/') return true;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="md-bottom-bar">
      {tabs.map((tab) => (
        <Ripple key={tab.id} style={{ flex: 1 }}>
          <button
            className={`md-tab ${isActive(tab.path) ? 'md-tab--active' : ''}`}
            onClick={() => {
              if (tab.action === 'logout') { logout(); navigate('/login'); }
              else { navigate(tab.path); }
            }}
            aria-label={tab.label}
          >
            <span className="md-tab__icon">
              <Icon name={tab.icon} size={24} />
              {tab.id === 'chef-orders' && <Badge count={pendingCount} />}
            </span>
            <span className="md-tab__label">{tab.label}</span>
          </button>
        </Ripple>
      ))}
    </nav>
  );
}
```

**Deviations from analog:**
- Same 80dp height (already in source via `--md-nav-height`)
- Add active indicator pill (64×32, secondary-container per MD3 spec — agent's Discretion)
- Emoji → `<Icon name=/>` (30 icon set)
- Wrap each tab in `<Ripple>` (state-layer + ripple feedback)
- Label always visible (12sp = 0.75rem, weight 500)
- `padding-bottom: env(safe-area-inset-bottom, 0px)` preserved

---

#### `BottomBar.css` (composite CSS, presentation)

**Analog:** `frontend/src/css/styles.css:64-76` (`.bottom-bar/.tab-item/.tab-icon/.tab-label` — D-20 delete).

```css
/* 80dp navigation bar (MD3 spec) — label always visible, active pill = secondary-container */
.md-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 420px;
  height: var(--md-nav-height);       /* 80dp (already 64px in tokens; bump or pass via var) */
  background: var(--md-color-surface-container;
  border-top: 1px solid var(--md-color-outline-variant);
  padding: 12px 0 calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: 200;
  display: flex;
  justify-content: space-around;
  align-items: center;
}
@media (min-width: 640px) { .md-bottom-bar { max-width: 768px; } }
@media (min-width: 1024px) { .md-bottom-bar { max-width: 1200px; } }

/* Tab: flex-1, 80dp tall, icon + label stacked */
.md-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  border: none;
  background: transparent;
  color: var(--md-color-on-surface-variant);
  cursor: pointer;
  position: relative;
  transition: color var(--md-motion-duration-short) var(--md-motion-easing-standard);
}

/* Active indicator pill: 64×32 centered, secondary-container */
.md-tab--active {
  color: var(--md-color-on-secondary-container);
}
.md-tab--active::before {
  content: '';
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 64px;
  height: 32px;
  border-radius: 16px;
  background: var(--md-color-secondary-container);
  z-index: 0;
  transition: background var(--md-motion-duration-short) var(--md-motion-easing-standard);
}
.md-tab > :not(.md-ripple-layer) {
  position: relative;
  z-index: 2;
}

.md-tab__icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.md-tab__label {
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
}
.md-tab--active .md-tab__label {
  font-weight: 600;
}
```

**Deviations from analog:**
- `.bottom-bar` → `.md-bottom-bar`
- `.tab-item` → `.md-tab`
- Active state: `background: primary` (current) → secondary-container PILL (MD3 spec)
- Width cap (`max-width: 420px`) preserved for mobile-first
- safe-area-inset-bottom preserved

---

#### `Header.jsx` (composite component, presentation/event — rewritten as Sidecar)

**Analog:** `frontend/src/components/Header.jsx:10-40` (current page-level header). Logic preserved + extension to Sidecar (logo + title + user menu).

**Structural skeleton:**

```jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../utils';
import IconButton from '../primitives/IconButton';
import Icon from '../primitives/Icon';
import './Header.css';

// Per-page title resolver (lightweight — agent's Discretion to expand)
const PAGE_TITLES = {
  '/home': '首页',
  '/order': '点菜',
  '/preferences': '口味偏好',
  '/my-wishes': '我的愿望',
  '/profile': '我的',
  '/chef/orders': '订单管理',
  '/chef/dishes': '菜品管理',
  '/chef/wishes': '愿望管理',
  '/admin': '管理后台',
  '/admin/dishes': '菜品管理',
  '/admin/wishes': '愿望总览',
  '/admin/users': '用户管理',
  '/admin/categories': '分类管理',
  '/admin/chefs': '厨师管理',
  '/admin/stats': '数据统计',
  '/admin/logs': '系统日志',
  '/ingredients': '食材管理',
};

export default function Header({ title, showBack = false, actions }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const resolvedTitle = title || PAGE_TITLES[location.pathname] || '家味';

  return (
    <header className="md-header">
      {/* Left: back button OR logo */}
      <div className="md-header__left">
        {showBack ? (
          <IconButton icon="arrow-back" ariaLabel="返回" onClick={() => navigate(-1)} />
        ) : (
          <div className="md-header__logo">
            <Icon name="restaurant" size={20} />
            <span className="md-header__brand">家味</span>
            <span className="md-header__subtitle">Family Chef</span>
          </div>
        )}
      </div>

      {/* Center: page title */}
      <h1 className="md-header__title">{resolvedTitle}</h1>

      {/* Right: user menu + actions */}
      <div className="md-header__right" ref={menuRef}>
        {actions}
        {user && (
          <>
            <button
              type="button"
              className="md-header__avatar"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="用户菜单"
              aria-expanded={menuOpen}
            >
              {(user.display_name || user.username || '?').charAt(0).toUpperCase()}
            </button>
            {menuOpen && (
              <div className="md-header__menu" role="menu">
                <div className="md-header__menu-info">
                  <div className="md-header__menu-name">{user.display_name || user.username}</div>
                  <div className="md-header__menu-role">
                    {user.role === 'admin' ? '管理员' : user.role === 'chef' ? '厨师' : '用户'}
                  </div>
                </div>
                <button
                  type="button"
                  className="md-header__menu-item"
                  role="menuitem"
                  onClick={() => { theme.toggleTheme(); setMenuOpen(false); }}
                >
                  <Icon name={theme.getTheme() === 'dark' ? 'light-mode' : 'dark-mode'} size={18} />
                  <span>切换主题</span>
                </button>
                <button
                  type="button"
                  className="md-header__menu-item"
                  role="menuitem"
                  onClick={() => { logout(); navigate('/login'); }}
                >
                  <Icon name="logout" size={18} />
                  <span>退出</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
}
```

**Deviations from analog:**
- Add LEFT: logo + brand name + subtitle (D-10)
- Add RIGHT: user menu dropdown (display_name + role + theme toggle + logout) — replaces `ThemeToggle` standalone icon
- Center: page title via `useLocation` lookup in `PAGE_TITLES` map (caller override via `title` prop)
- Hidden < 1024px (mobile-only show BottomBar; Sidecar Header is PC-only injection)
- `showBack` prop preserved for detail pages (DishDetailPage, etc.)
- `actions` prop preserved for page-specific actions

---

#### `Header.css` (composite CSS, presentation)

**Analog:** `frontend/src/css/styles.css:54-62` (`.header/.header-title/.header-back/.header-actions` — D-20 delete).

```css
/* PC-only Sidecar Header (MD3 Top App Bar) — 3-column layout */
.md-header {
  display: none;
  position: sticky;
  top: 0;
  z-index: 100;
  height: 64px;
  background: var(--md-color-surface-container-low);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--md-color-outline-variant);
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

@media (min-width: 1024px) {
  .md-header { display: flex; }
}

/* Left: logo + brand */
.md-header__left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.md-header__logo {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--md-color-primary);
}
.md-header__brand {
  font-family: var(--md-font-display);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--md-color-primary);
}
.md-header__subtitle {
  font-size: 0.75rem;
  color: var(--md-color-on-surface-variant);
}

/* Center: page title */
.md-header__title {
  flex: 1;
  text-align: center;
  font-family: var(--md-font-display);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--md-color-on-surface);
  margin: 0;
  /* truncate if too long */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Right: actions + avatar + menu */
.md-header__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  position: relative;
}
.md-header__avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--md-radius-full);
  background: var(--md-color-primary);
  color: var(--md-color-on-primary);
  border: none;
  font-weight: 600;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: box-shadow var(--md-motion-duration-short) var(--md-motion-easing-standard);
}
.md-header__avatar:hover { box-shadow: var(--md-elevation-1); }

/* Dropdown menu */
.md-header__menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 200px;
  background: var(--md-color-surface-container-lowest);
  border: 1px solid var(--md-color-outline-variant);
  border-radius: var(--md-radius-md);
  box-shadow: var(--md-elevation-3);
  padding: 8px 0;
  z-index: 200;
}
.md-header__menu-info {
  padding: 8px 16px 12px;
  border-bottom: 1px solid var(--md-color-outline-variant);
  margin-bottom: 8px;
}
.md-header__menu-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--md-color-on-surface);
}
.md-header__menu-role {
  font-size: 0.75rem;
  color: var(--md-color-on-surface-variant);
  margin-top: 2px;
}
.md-header__menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--md-color-on-surface);
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
  transition: background var(--md-motion-duration-short) var(--md-motion-easing-standard);
}
.md-header__menu-item:hover {
  background: var(--md-color-surface-container);
}
```

**Deviations from analog:**
- `.header` → `.md-header` (already sticky)
- Add 3-column flex layout (left/title/right)
- Add user menu dropdown (avatar + name + role + theme toggle + logout)
- Hide < 1024px (mobile shows BottomBar only; Sidecar Header is PC-only)

---

### Wave 3 — 11-03 (ListItem / Divider + call-site migrations)

#### `ListItem.jsx` (composite component, compound)

**Analog:** `frontend/src/components/primitives/Card.jsx:17-63` (slot-based compound component pattern with `forwardRef` + `onClick` opt-in + `isClickable` flag + Ripple + role/tabindex + Keyboard activation).

**Structural skeleton (modeled on Card):**

```jsx
import { forwardRef, useCallback } from 'react';
import Ripple from './primitives/Ripple';
import './ListItem.css';

const ListItem = forwardRef(function ListItem({
  variant = '1-line',     // '1-line' | '2-line' | '3-line'
  onClick,
  disabled = false,
  as: As = 'div',          // override root element (default: div)
  className = '',
  children,
  ...rest
}, ref) {
  const isClickable = Boolean(onClick) && !disabled;

  const classes = [
    'md-list-item',
    `md-list-item--${variant}`,
    isClickable && 'md-list-item--clickable',
    disabled && 'md-list-item--disabled',
    className,
  ].filter(Boolean).join(' ');

  const handleKeyDown = isClickable
    ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      }
    : undefined;

  return (
    <Ripple disabled={!isClickable}>
      <As
        ref={ref}
        className={classes}
        onClick={isClickable ? onClick : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        aria-disabled={disabled || undefined}
        onKeyDown={handleKeyDown}
        {...rest}
      >
        {children}
      </As>
    </Ripple>
  );
});

// Compound sub-components (D-15)
const Leading = ({ children, className = '' }) => (
  <div className={`md-list-item__leading ${className}`}>{children}</div>
);
const Content = ({ children, className = '' }) => (
  <div className={`md-list-item__content ${className}`}>{children}</div>
);
const Headline = ({ children, className = '' }) => (
  <div className={`md-list-item__headline ${className}`}>{children}</div>
);
const Supporting = ({ children, className = '' }) => (
  <div className={`md-list-item__supporting ${className}`}>{children}</div>
);

// Trailing with auto-stopPropagation (D-16)
const Trailing = ({ children, onClick, className = '', as: TAs = 'div', ...rest }) => {
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    onClick?.(e);
  }, [onClick]);
  return (
    <TAs
      className={`md-list-item__trailing ${className}`}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </TAs>
  );
};

ListItem.Leading = Leading;
ListItem.Content = Content;
ListItem.Headline = Headline;
ListItem.Supporting = Supporting;
ListItem.Trailing = Trailing;

export default ListItem;
```

**Deviations from analog:**
- API mirrors Card.jsx: `variant`, `onClick`, `disabled`, `className`, ref, rest-spread
- 3 line variants (1/2/3-line) — controls headline/supporting max-lines + vertical padding
- Clickable only when `onClick` supplied (D-16) — same opt-in pattern as Card
- Trailing auto-stopPropagation: any click inside `<ListItem.Trailing>` does NOT bubble to `<ListItem.onClick>` (D-16)
- `disabled` → opacity 0.38 + cursor not-allowed + no ripple/state-layer (consistent with disabled across primitives)
- 5 compound slots: `Leading`, `Content`, `Headline`, `Supporting`, `Trailing`
- Internal `Divider` between items NOT auto-rendered (caller adds `<Divider />` between items, or relies on list-item last-child pseudo)

**Consumers (3 sites):**
- `AdminHomePage.jsx:168` — `<ListItem variant="2-line"><Content><Headline>{activity.action} - {activity.target_type}</Headline><Supporting>{formatDate(...)}</Supporting></Content></ListItem>` (static, no onClick)
- `InvitationsModal.jsx:55` — `<ListItem variant="3-line"><Leading><Badge text="活跃" type="success" /></Leading><Content><Headline>...date...</Headline><Supporting>...chef name...</Supporting></Content><Trailing>...IconButton + Button...</Trailing></ListItem>` (static for now; can become clickable if revocation UX requires)
- `InvitationsSection.jsx:159` — same shape as InvitationsModal

---

#### `ListItem.css` (composite CSS, presentation)

**Analog:** `frontend/src/css/styles.css:146-154` (`.list-item/.list-item-img/.list-item-info/.list-item-name/.list-item-meta` — D-20 delete).

```css
@import '../primitives/base.css';

.md-list-item {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 48px;        /* Phase 9 UX-03 hit box */
  padding: 8px 16px;
  background: var(--md-color-surface);
  border-bottom: 1px solid var(--md-color-outline-variant);
  position: relative;
  color: var(--md-color-on-surface);
  transition: background var(--md-motion-duration-short) var(--md-motion-easing-standard);
}
.md-list-item:last-child { border-bottom: none; }

/* Clickable: cursor + state-layer */
.md-list-item--clickable {
  cursor: pointer;
}
.md-list-item--clickable:focus-visible {
  outline: var(--md-focus-ring-outer);
  outline-offset: -2px;
}

/* Disabled */
.md-list-item--disabled {
  opacity: var(--md-state-layer-disabled);
  cursor: not-allowed;
  pointer-events: none;
}

/* Variants — different vertical padding */
.md-list-item--1-line { min-height: 48px; padding-top: 8px; padding-bottom: 8px; }
.md-list-item--2-line { min-height: 64px; padding-top: 12px; padding-bottom: 12px; }
.md-list-item--3-line { min-height: 88px; padding-top: 16px; padding-bottom: 16px; }

/* Slot layout */
.md-list-item__leading {
  width: 40px;
  height: 40px;
  border-radius: var(--md-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--md-color-on-surface-variant);
}
.md-list-item__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.md-list-item__headline {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--md-color-on-surface);
  line-height: 1.4;
  /* 1-line: ellipsis; 2/3-line: no clip */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.md-list-item--2-line .md-list-item__headline,
.md-list-item--3-line .md-list-item__headline {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.md-list-item__supporting {
  font-size: 0.8rem;
  color: var(--md-color-on-surface-variant);
  line-height: 1.4;
}
.md-list-item__trailing {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
```

**Deviations from analog:**
- `.list-item` → `.md-list-item`
- `.list-item::before` (state-layer) → use `md-interactive` base.css pattern
- `.list-item-img` → `.md-list-item__leading` (40×40, token-driven)
- `.list-item-info` → `.md-list-item__content`
- `.list-item-name` → `.md-list-item__headline`
- `.list-item-meta` → `.md-list-item__supporting`
- ADD: 3-line variants with -webkit-line-clamp for headline
- ADD: Trailing slot with auto-stopPropagation wrapper
- 48dp min-height retained (Phase 9 UX-03)

---

#### `Divider.jsx` (composite component, trivial)

**Analog:** inline `border-bottom: 1px solid var(--md-color-outline-variant)` on `.list-item` (styles.css:147) — extract to standalone component per D-17.

**Structural skeleton:**

```jsx
import './Divider.css';

export default function Divider({ inset = false, className = '', ...rest }) {
  const classes = [
    'md-divider',
    inset && 'md-divider--inset',
    className,
  ].filter(Boolean).join(' ');
  return <hr className={classes} role="separator" {...rest} />;
}
```

**Deviations from analog:**
- New component (no exact source); extracted from inline list-item border pattern
- `inset` prop: `false` = full-width, `true` = 56dp left indent (MD3 spec; D-17)
- `<hr>` semantic + `role="separator"` for a11y
- Use sites: caller can place between `<ListItem>` for explicit separators; standard `<ListItem>` last-child rule still removes extra border

---

#### `Divider.css` (composite CSS, presentation)

```css
.md-divider {
  border: none;
  border-top: 1px solid var(--md-color-outline-variant);
  margin: 0;
  height: 0;
}
.md-divider--inset {
  margin-left: 56px;       /* MD3 spec: align with headline starting at 16 + 40 leading */
}
```

**No analog** — new component. Inherits visual pattern from inline `border-bottom: 1px solid var(--md-color-outline-variant)` in current `.list-item`.

---

## Shared Patterns

### 1. Focus trap (Modal a11y)

**Source:** `frontend/src/utils/index.js:101-121`

```js
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export const trapFocusWithin = (event, container) => {
  if (event.key !== 'Tab' || !container) return;
  const focusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
  if (focusable.length === 0) { event.preventDefault(); container.focus(); return; }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && (active === last || !container.contains(active))) {
    event.preventDefault(); first.focus();
  }
};
```

**Apply to:** `<Modal>` — `onKeyDown={(e) => trapFocusWithin(e, dialogRef.current)}` on the modal-content div. Already correct in all 7 wrapper analogs; **must preserve** when consolidating into one component.

### 2. Scroll lock + focus restore (Modal a11y lifecycle)

**Source:** `frontend/src/components/ConfirmModal.jsx:26-41`

```jsx
useEffect(() => {
  const previouslyFocused = document.activeElement;
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  confirmRef.current?.focus();
  return () => {
    document.body.style.overflow = previousOverflow;
    if (previouslyFocused?.focus && document.contains(previouslyFocused)) {
      previouslyFocused.focus();
    }
  };
}, []);
```

**Apply to:** `<Modal>` — runs on mount, restores on unmount. **Critical:** preserves a11y by returning focus to the trigger element after close.

### 3. ESC handler (Modal close)

**Source:** `frontend/src/components/ConfirmModal.jsx:44-50`

```jsx
useEffect(() => {
  const handleKey = (e) => {
    if (e.key === 'Escape' && !confirming) onCancel?.();
  };
  document.addEventListener('keydown', handleKey);
  return () => document.removeEventListener('keydown', handleKey);
}, [confirming, onCancel]);
```

**Apply to:** `<Modal>` — `onClose` always fires on ESC; caller responsible for guarding (e.g., against `submitting`).

### 4. CSS variable usage (token-only styling)

**Source:** `frontend/src/components/primitives/Button.css:11-32` (model for token-only composite CSS)

```css
@import '../primitives/base.css';

.md-button {
  padding: 10px 20px;
  border-radius: var(--md-radius-sm);
  font-size: 14px;
  background: var(--md-color-primary);
  color: var(--md-color-on-primary);
  transition: color var(--md-motion-duration-short) var(--md-motion-easing-standard),
              background var(--md-motion-duration-short) var(--md-motion-easing-standard);
}
```

**Apply to:** All composite CSS files (Modal.css, Sidebar.css, BottomBar.css, Header.css, ListItem.css, Divider.css). **No new hex/rgb values;** all colors/radius/spacing/elevation/motion via `var(--md-*)`. Import `base.css` for shared `.md-interactive` state-layer + 48dp hit box.

### 5. Co-located `.css` import pattern

**Source:** `frontend/src/components/primitives/Card.jsx:15`

```jsx
import './Card.css';
```

**Apply to:** All 6 composite components + 6 co-located CSS files. Vite auto-bundles. **SnackbarContext may inline `<style>` or use co-located** — pick one for consistency (recommended: co-located `SnackbarContext.css` matching D-19).

### 6. Compound sub-component API

**Source:** `frontend/src/components/primitives/Card.jsx:60`

```jsx
const Card = forwardRef(function Card({ ... }, ref) { ... });
// No compound sub-components in Card — slots are passed as props (image, header, footer)
```

**Note:** Card uses **slot props** (`image`/`header`/`footer`), while ListItem uses **compound sub-components** (`ListItem.Leading`/`.Content`/etc.). The CONTEXT D-15 explicitly mandates compound for ListItem because Tail/Headline/Supporting/Trailing are polymorphic content-shaped elements. Other primitives (Button, IconButton) don't use compound. **Keep these two patterns distinct** to avoid confusion.

### 7. Provider + hook pattern (SnackbarContext)

**Source:** `frontend/src/contexts/AuthContext.jsx:7-66`

```jsx
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // state, handlers, callbacks
  const value = { user, loading, login, logout, ... };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export default AuthContext;
```

**Apply to:** `SnackbarProvider` rewrite — same shape, `useToast` as alias for backward compat with 213 callsites (D-08).

### 8. Reduced-motion handling

**Source:** `frontend/src/components/primitives/base.css:59-62`

```css
@media (prefers-reduced-motion: reduce) {
  .md-interactive::before { transition: none; }
  .md-ripple-layer { display: none; }
}
```

**Apply to:** All composite CSS files — already inherited via `@import '../primitives/base.css'`. Add per-component overrides for any custom transitions (e.g., `.md-modal` enter/exit).

### 9. Focus-visible ring (composite interactive elements)

**Source:** `frontend/src/components/primitives/Button.css:41-44`

```css
.md-button--filled:focus-visible {
  outline: var(--md-focus-ring-inner);
  outline-offset: 2px;
}
```

**Apply to:** Sidebar items, BottomBar tabs, ListItem clickable, Menu items, Divider ignores (not interactive). Use `--md-focus-ring-outer` for transparent-bg items (Sidebar/BottomBar/Header menu), `--md-focus-ring-inner` for primary-fill items (filled Button-like).

### 10. MD3 state-layer (composite hover/pressed/focused)

**Source:** `frontend/src/components/primitives/base.css:8-45`

```css
.md-interactive {
  position: relative;
  isolation: isolate;
  overflow: hidden;
}
.md-interactive::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--md-component-state-color, var(--md-state-layer-primary));
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--md-motion-duration-short) var(--md-motion-easing-standard);
}
.md-interactive:hover::before { opacity: var(--md-state-layer-hover); }
.md-interactive:active::before,
.md-interactive[data-pressed='true']::before { opacity: var(--md-state-layer-pressed); }
.md-interactive:focus-visible::before { opacity: var(--md-state-layer-focused); }
```

**Apply to:** Sidebar items (`md-interactive`), BottomBar tabs (`md-interactive`), ListItem clickable (`md-interactive`), Header menu items (`md-interactive`). Use `var(--md-component-state-color)` override per-tone:
- Primary surface tint: `var(--md-state-layer-primary)` (default)
- Container background tint: `var(--md-state-layer-on-surface)` (for active pill items)

---

## Migration Strategy

### Atomic commits per category (D-20 mirror of Phase 10 Plan 2/3 pattern)

**Commit 1 — Modal primitive + wrapper migrations:**
1. Create `frontend/src/components/composites/Modal.jsx` + `Modal.css`
2. Migrate 7 wrapper components (ConfirmModal, WishFormModal, WishRejectModal, WishAdvanceModal, CreateLinkModal, InvitationsModal, ChefSelectModal) → thin wrappers around `<Modal>`
3. Migrate 15 inline `<div className="modal-overlay">` JSX sites → `<Modal>`
4. Delete `.modal-overlay/.modal-content/.modal-header/.modal-body/.modal-footer/.modal-close` from `styles.css`
5. Verify: `grep -rE 'className=.*\bmodal-(overlay|content|header|body|footer|close)\b' frontend/src/` → 0 hits

**Commit 2 — SnackbarContext rewrite:**
1. Rewrite `frontend/src/contexts/ToastContext.jsx` (keep filename per D-08) — internal SnackbarContext + SnackbarProvider + queue/timer/dismiss logic
2. Add `SnackbarContext.css` (or inline styles) for `.md-snackbar-stack` + `.md-snackbar` + tone variants
3. Update `frontend/src/App.jsx` line 106: `<ToastProvider>` → `<SnackbarProvider>`
4. Delete `.toast/.toast-success/.toast-error/@keyframes slideDown` from `styles.css`
5. Verify: all 213 `showToast(message, type)` callsites unchanged; `useToast` import path unchanged

**Commit 3 — Sidebar + BottomBar + Header rewrite:**
1. Create `frontend/src/components/composites/Sidebar.jsx` + `Sidebar.css` (80dp, active pill, icon-only)
2. Create `frontend/src/components/composites/BottomBar.jsx` + `BottomBar.css` (active pill)
3. Create `frontend/src/components/composites/Header.jsx` + `Header.css` (Sidecar: logo + title + user menu)
4. Update `frontend/src/App.jsx` `PcLayout` (lines 74-84): insert `<Header />` between `<Sidebar />` and `<main>`
5. Replace `frontend/src/components/Sidebar.jsx`, `BottomBar.jsx`, `Header.jsx` with re-exports from `composites/` (or delete + update imports)
6. Delete `.pc-sidebar*`, `.bottom-bar/.tab-item/.tab-icon/.tab-label`, `.header/.header-title/.header-back/.header-actions` from `styles.css`
7. Verify: `grep -rE 'className=.*\b(pc-sidebar(-item|...)|bottom-bar|tab-item|tab-icon|tab-label|header(-title|-back|-actions)?)\b' frontend/src/` → 0 hits

**Commit 4 — ListItem + Divider + 3 site migrations:**
1. Create `frontend/src/components/composites/ListItem.jsx` + `ListItem.css` (compound slots + clickable + trailing stopPropagation)
2. Create `frontend/src/components/composites/Divider.jsx` + `Divider.css` (inset/full)
3. Migrate `AdminHomePage.jsx:168` → `<ListItem>`
4. Migrate `InvitationsModal.jsx:55` → `<ListItem>` (full 3-line shape with leading Badge + trailing IconButton/Button)
5. Migrate `InvitationsSection.jsx:159` → `<ListItem>` (same shape)
6. Delete `.list-item/.list-item-img/.list-item-info/.list-item-name/.list-item-meta` from `styles.css`
7. Verify: `grep -rE 'className=.*\blist-item\b' frontend/src/` → 0 hits

### Code-test gates (per commit)

1. `npm run lint` — baseline ≥90 errors (Phase 10 final); Phase 11 must **not increase** new errors
2. `npm run build` — Vite 0 error
3. `npm run dev` + manual smoke test:
   - ConfirmModal opens/closes + focus trap + ESC + scroll lock
   - WishFormModal form submission + focus restore
   - Toast (success/warn/error/info) stacks correctly + auto-dismiss + manual ✕
   - Sidebar 80dp + active pill + hover state-layer
   - BottomBar 80dp + active pill + label visible
   - Sidecar Header shows on PC only, hidden on mobile
   - ListItem trailing click does NOT trigger row onClick
4. Playwright touch-target audit: 48dp hit areas on all interactive composites
5. UAT (HUMAN) deferred to Phase 12 (D-21)

### styles.css cleanup (D-20)

Final after all 4 commits, **delete** the following selectors from `frontend/src/css/styles.css`:

- `.bottom-bar` (line 65), `@media .bottom-bar max-width` (66-67)
- `.tab-item`, `.tab-item .tab-icon`, `.tab-item .tab-label`, `.tab-item::before`, `.tab-item:hover*`, `.tab-item.active` (lines 68-76)
- `.list-item`, `.list-item:last-child`, `.list-item::before`, `.list-item:hover::before`, `.list-item-img`, `.list-item-info`, `.list-item-name`, `.list-item-meta` (147-154)
- `.toast`, `.toast-success`, `.toast-error`, `@keyframes slideDown` (291-294)
- `.pc-sidebar`, `.pc-sidebar-header`, `.pc-sidebar-logo`, `.pc-sidebar-subtitle`, `.pc-sidebar-nav`, `.pc-sidebar-item`, `.pc-sidebar-item::before`, `.pc-sidebar-item:hover*`, `.pc-sidebar-item.active`, `.pc-sidebar-icon`, `.pc-sidebar-footer`, `.pc-sidebar-user`, `.pc-sidebar-user-info`, `.pc-sidebar-user-name`, `.pc-sidebar-user-role`, `.pc-sidebar-footer-actions` (319-345)
- `.modal-overlay`, `.modal-content`, `.modal-header`, `.modal-header h3`, `.modal-close`, `.modal-close::before`, `.modal-close:hover*`, `.modal-body`, `.modal-footer` (402-412)
- `@media .tab-item:focus-visible` (538)
- `@media .pc-sidebar-item:focus-visible` (539)
- `@media .modal-close:focus-visible` (541)
- `@media .modal-close` 48dp + padding (608-613)
- `@media :where .list-item, .tab-item, .pc-sidebar-item, .modal-close` global hit-box (572-580)
- Top-level `@media (max-width: 1023px) { .pc-sidebar { display: none !important; } }` (398) — replaced by `.md-sidebar` media query

**Verification:** `grep -rE 'className=.*\b(modal-(overlay|content|header|body|footer|close)|pc-sidebar|bottom-bar|tab-item|tab-icon|tab-label|list-item|toast(-success|-error)?)\b' frontend/src/` → 0 results.

---

## No Analog Found

None. All 6 new composites have analogs (existing 7 wrapper components for Modal, current Sidebar/BottomBar/Header for self-rewrite, current ToastContext for SnackbarContext, Card.css for ListItem compound pattern). The 3 ListItem migration sites have direct analogs (current `.list-item` divs with same structure). The `Divider` component is a trivial extraction from inline CSS — no JSX analog, but visual pattern is unambiguous.

---

## Metadata

**Analog search scope:** `frontend/src/components/`, `frontend/src/components/primitives/`, `frontend/src/contexts/`, `frontend/src/css/`, `frontend/src/utils/`, `frontend/src/pages/AdminHomePage.jsx`, `frontend/src/App.jsx`.

**Files scanned/read:** 18 source files (7 Modal wrappers, current Sidebar/BottomBar/Header/ToastContext, primitives Card/Button/IconButton/Icon/Badge/Ripple/Input/FAB, base.css, tokens.css, styles.css, utils/index.js, AuthContext.jsx, AdminHomePage.jsx, InvitationsSection.jsx).

**Pattern extraction date:** 2026-07-28

---

## PATTERN MAPPING COMPLETE
