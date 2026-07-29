---
phase: 12-page-level-refactor-8dp-grid-human-uat
plan: 02
subsystem: ui
tags: [md3, audit, compliance, playwright, uat, closure]
---

# Dependency graph
requires:
  - phase: 12-00-BUGFIX
    provides: "Ripple self-mode + single Header + Sidebar footer"
  - phase: 12-01A
    provides: "8dp spacing + radius tokenization + stylelint + check:md3 gate"
  - phase: 12-01B
    provides: "Motion tokens + Icon registry + EmptyState API + actionable Snackbar"
provides:
  - "D-AUDIT-01: Zero forbidden legacy class residues across JSX consumers and CSS definitions (only 3 documented exceptions: .form-input on <select>, .fab placement, .btn-search utility)"
  - "D-UAT-02: frontend/scripts/audit-md3-compliance.mjs — browser-level Ripple/Header/grid/touch compliance auditor with 9-route JSON report"
  - "D-UAT-02: frontend/tests/md3-compliance.spec.js — 5 Playwright tests (real mouse ripple, single Header, 4dp grid, touch targets, audit:md3 entrypoint)"
  - "D-UAT-01/03/04: 12-UAT-REPORT.md — six-flow human acceptance with screenshots, automated gates table, UAT fixes record, and final human approval"

# Tech tracking
tech-stack:
  added: []  # no new dependencies

# Verification results
gates:
  lint: "97 errors (baseline, 0 regression)"
  lint_css: "0 errors"
  check_md3: "11/11 PASS"
  build: "0 errors"
  playwright_snackbar: "9/9 PASS"
  playwright_bugfix: "10/10 PASS"
  playwright_compliance: "5/5 PASS"
  audit_md3: "PASS (9 routes, 185 grid elements, 114 touch targets, 0 violations, 0 console errors)"
  touch_audit: "PASS (0 violations)"
  backend_diff: "empty (LOGIC-02 honored)"

# UAT outcome
uat:
  status: "APPROVED"
  commit: "6091b04"
  flows: 6
  flows_passed: 6
  console_errors: 0
  uat_fixes:
    - "Input overflow:hidden clip to border-radius shape"
    - "password-toggle-btn color for dark mode"
