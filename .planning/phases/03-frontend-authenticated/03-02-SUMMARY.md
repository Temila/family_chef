---
phase: 03-frontend-authenticated
plan: 02
type: execute
subsystem: guest-invitation-ui
tags:
  - invitation
  - modal
  - clipboard
  - web-share
  - optimistic-update
requires:
  - 03-01: invitation API client methods + statusBadge entries
provides:
  - InvitationsSection — invitation management block embedded in UserHomePage
  - InvitationsModal — full-screen invitation list
  - ChefSelectModal — chef picker for User role invite creation
  - CreateLinkModal — link display with copy + share buttons
  - ConfirmModal — generic confirm dialog with danger mode
affects:
  - frontend/src/pages/UserHomePage.jsx — adds InvitationsSection embed
  - frontend/src/components/EmptyState.jsx — adds subtext prop support
tech-stack:
  added: []
  patterns:
    - "Optimistic update with rollback on error (handleRevoke)"
    - "Role-based create flow branching (chef → direct, user → chef select)"
    - "Clipboard API + Web Share API dual-path sharing"
    - "Modal composition pattern (InvitationsSection owns all modal state)"
key-files:
  created:
    - frontend/src/components/InvitationsSection.jsx
    - frontend/src/components/InvitationsModal.jsx
    - frontend/src/components/ChefSelectModal.jsx
    - frontend/src/components/CreateLinkModal.jsx
    - frontend/src/components/ConfirmModal.jsx
  modified:
    - frontend/src/pages/UserHomePage.jsx
    - frontend/src/components/EmptyState.jsx
---

# Phase 03 Frontend Authenticated Plan 02: Invitation UI Components

Build the invitation management UI: invitation block on UserHomePage, create/revoke/copy flows, full-screen list modal, chef selection modal, link sharing modal, and generic confirm dialog.

## Decisions Made

- **EmptyState subtext prop**: Existing EmptyState component lacked `subtext` support. Added the prop to display a secondary description below the main empty state text, used by InvitationsSection's empty state.
- **Badge usage**: Use `<Badge text="活跃" type="success" />` (not `status="active"`) for active invitations since the `statusBadge` map's "active" entry shows "启用" from AdminChefsPage.
- **Modal composition**: InvitationsSection owns all modal visibility state (showFullList, showChefSelect, showCreateLink, revokeTarget). Each modal is a pure presentation component.

## Task Execution

### Task 1: InvitationsSection + InvitationsModal + UserHomePage embed

- Created `InvitationsSection.jsx` — manages invitation list state, handles create (role-based), copy, and revoke (optimistic) flows. Renders up to 5 invitations with Badge, date, chef name, copy icon, revoke button. Includes conditional modal rendering for all 4 modals.
- Created `InvitationsModal.jsx` — full-screen modal, no "创建邀请" button (D-04 enforcement), body scroll lock via useEffect.
- Modified `UserHomePage.jsx` — added `import InvitationsSection` and `<InvitationsSection />` between menu grid and BottomBar.
- Modified `EmptyState.jsx` — added `subtext` prop for secondary text.

**Verification:** All assertions passed.

### Task 2: ChefSelectModal + CreateLinkModal + ConfirmModal

- Created `ChefSelectModal.jsx` — loads chef list from API on mount, displays avatars with display_name/username, chef selection calls onSelect (auto-proceeds).
- Created `CreateLinkModal.jsx` — displays link URL in monospace, copy button (Clipboard API + toast), share button (Web Share API + fallback toast), "2小时内有效" hint, "完成" footer.
- Created `ConfirmModal.jsx` — generic confirm dialog, accepts title/message/confirmText/cancelText/danger props, danger mode uses red border button styling.

**Verification:** All assertions passed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added subtext prop to EmptyState component**
- **Found during:** Task 1
- **Issue:** The plan's InvitationsSection code calls `<EmptyState text="还没有邀请记录" subtext="创建邀请链接..." />` but the existing EmptyState component only accepted `icon` and `text` props — no `subtext` support.
- **Fix:** Added optional `subtext` prop to EmptyState.jsx. When provided, renders a secondary muted text line below the main empty state text.
- **Files modified:** frontend/src/components/EmptyState.jsx
- **Commit:** 31de9be

## Known Stubs

None — all components are fully wired with functional state management, API calls, and error handling.

## Threat Flags

None — all files implement client-side UI only (Clipboard API, Web Share API) within existing trust boundaries per the plan's threat model.

## Verification Results

```
All plan 03-02 assertions passed
```

## Commits

| Hash | Message |
|------|---------|
| `31de9be` | feat(03-frontend-authenticated-02): create InvitationsSection + InvitationsModal + embed in UserHomePage |
| `922ae7d` | feat(03-frontend-authenticated-02): create ChefSelectModal + CreateLinkModal + ConfirmModal |

## Self-Check: PASSED
