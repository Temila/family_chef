# Phase 6: Notifications Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-22
**Phase:** 06-notifications-integration
**Areas discussed:** Badge tracking mechanism, Feishu card content, Notification targets

---

## Badge Tracking Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| A — WishEvent table | Event log table; enables future history; most flexible | |
| B — Timestamps | last_status_change_at + submitter_last_viewed_at on Wish; simple, minimal | ✓ |
| C — Boolean flag | submitter_unread boolean; minimal change, loses temporal detail | |

**User's choice:** B — Timestamps approach
**Notes:** Prefers minimal schema change; temporal detail not needed for v1.1; WISH-F04 history can be added later if needed.

---

## Feishu Notification Method

| Option | Description | Selected |
|--------|-------------|----------|
| A — Dedicated method | send_wish_notification() in FeishuClient; clean separation | ✓ |
| B — Reuse existing pattern | Adapt send_order_notification() with wish-shaped data | |

**User's choice:** A — Dedicated method
**Notes:** Clean separation between order and wish notifications; easier to evolve wish notifications independently.

---

## Feishu Card Content

| Option | Description | Selected |
|--------|-------------|----------|
| All fields | dish_name + submitter + reference_url + note + deep link | ✓ |
| Core only | dish_name + submitter + what changed; skip optional fields | |
| Minimal | dish_name + submitter only | |

**User's choice:** All fields
**Notes:** Chefs get complete context including reference URL and notes; deep link placeholder included for Phase 7 integration.

---

## Notification Targets (NOTIF-05)

| Option | Description | Selected |
|--------|-------------|----------|
| All chefs with feishu_open_id | Fan out to all bound chefs; aligns with order pattern | ✓ |
| All chefs (no binding required) | Even unbound chefs get a record | |
| Admins + voluntary | Opt-in per chef | |

**User's choice:** All chefs with feishu_open_id bound
**Notes:** Consistent with how order notifications work; unbound chefs simply don't receive push.

---

## Submitter Feishu Push

| Option | Description | Selected |
|--------|-------------|----------|
| Badge only | In-app badge per NOTIF-03/04; no Feishu push for status changes | ✓ |
| Badge + Feishu push | Submitter also gets Feishu card; requires feishu binding | |
| Feishu only | No badge; rely entirely on Feishu push | |

**User's choice:** Badge only
**Notes:** Per NOTIF-03/04 requirements; avoids notification overload; simpler Phase 6 scope.

---

## Deferred Ideas

- **WISH-F04 (愿望状态历史记录)** — Full event log deferred; Phase 6's two-column approach satisfies NOTIF-03/04 without blocking future history
- **Per-chef notification opt-out** — Deferred to future phase
- **Submitter Feishu push** — Badge only for v1.1; Feishu push to submitter noted as potential UX enhancement
- **Deep link URL** — Placeholder used in Phase 6; Phase 7 registers the actual route

---

*Discussion log — Phase 6 Notifications Integration — 2026-07-22*
