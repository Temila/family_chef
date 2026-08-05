---
phase: 18-custom-editor-seasonal-auto-switch
plan: 01
subsystem: theme-engine
tags: [md3, material-color-utilities, dynamic-scheme, variants, theme-engine]

# Dependency graph
requires:
  - phase: 17-theme-system-foundation-engine-page-presets-persistence
    provides: TonalSpot-only buildCssSync + ThemeContext apply + FOUC bootstrap + 5 preset source colors
provides:
  - Nine-variant MCU dispatch in buildCssSync (TonalSpot stable, 8 alternates real)
  - VARIANT_WHITELIST single source of truth for editor, presets, and persisted themes
  - Deterministic error on unknown variant (T-18-01 mitigation)
  - Reusable test fixtures (uppercase + lowercase hex, 9-variant loop, role-differentiation check)
affects: [18-02-editor-page, 18-03-react-colorful, 18-04-seasonal, theme-engine, theme-context, ThemeCard, theme-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DynamicScheme palette adapter: theme.palettes shape (TonalPalette) ⇄ DynamicScheme palette getters — same .tone() API, same buildSchemeCss loop"
    - "User-seed injection via TonalPalette.fromInt for secondary/tertiary while letting MCU derive primary/neutral/neutralVariant/error per variant rules"
    - "VARIANT_WHITELIST literal list with VARIANT_TO_MCU enum map as the single dispatcher"

key-files:
  created: []
  modified:
    - frontend/src/theme/theme-engine.js
    - frontend/src/theme/theme-engine.test.mjs

key-decisions:
  - "TonalSpot 保留 themeFromSourceColor 老路径（含 secondary/tertiary blend=true），保证 Phase 17 tokens.css 字节一致；其余 8 个 variant 才走 DynamicScheme"
  - "DynamicScheme 路径只覆盖 secondaryPalette + tertiaryPalette，primary/neutral/neutralVariant/error 全部交给 MCU variant 规则派生（与 MCU 默认行为一致，编辑时调 secondary/tertiary 即可微调）"
  - "VARIANT_WHITELIST 字面量顺序按 Material 官方文档（TonalSpot 居首），与编辑器 Chip 横向滚动顺序（18-02）同源"
  - "未知 variant 直接抛 `Error('Unsupported variant: <name>')`，不静默 coerce；localStorage 损坏数据在 buildCssSync 第一道校验就拒掉（保护 editor + persisted theme 路径）"
  - "validateSourceColors 排在 validateVariant 之前——malformed seed 的错误信息更可读；测试覆盖该顺序契约"

patterns-established:
  - "Palette adapter pattern: 通过包装对象把 DynamicScheme.primaryPalette 等 getter 转成 buildSchemeCss 期望的 { primary, neutral, neutralVariant, ... } 形态，复用既有 CSS 序列化代码"
  - "Variant whitelist + MCU enum 双层映射：白名单是用户/API 契约字面量，VARIANT_TO_MCU 字典把字符串转成 MCU Variant 枚举值，UI 不知道 MCU 内部枚举名"

requirements-completed: [EDIT-02, EDIT-07]

# Metrics
duration: 18min
completed: 2026-08-05
---

# Phase 18 Plan 01: Nine-Variant Theme Engine Summary

**buildCssSync now dispatches TonalSpot + 8 alternate MD3 variants (Vibrant/Expressive/Content/Mono/Neutral/Fidelity/Rainbow/FruitSalad) via DynamicScheme while keeping the Phase 17 TonalSpot CSS byte-identical.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-08-05T03:22:12Z
- **Completed:** 2026-08-05T03:40:00Z
- **Tasks:** 2
- **Files modified:** 2 (theme-engine.js, theme-engine.test.mjs)
- **Test count:** 13 (6 pre-existing + 7 new variant coverage)

## Accomplishments

- Replaced the `void variant` placeholder at `theme-engine.js:99` with real dispatch across the 9 named MD3 variants.
- TonalSpot continues through the Phase 17 `themeFromSourceColor` path (verified byte-identical: `#056d37` light primary, `#81d997` dark primary, `#ffffff` surface-container-lowest, 5 elevation overrides with `color-mix`).
- The other 8 variants build `DynamicScheme` instances with `Hct.fromInt(argbFromHex(primary))` + `contrastLevel: 0`, injecting user secondary/tertiary seeds via `TonalPalette.fromInt` overrides while letting MCU derive primary/neutral/neutralVariant/error from variant rules.
- Added `VARIANT_WHITELIST` as the single source of truth (re-exported from `theme-engine.js` for downstream editor chip group in 18-02); a new `VARIANT_TO_MCU` map converts the public name to MCU's enum (`Mono → MONOCHROME`, others 1:1).
- `buildSchemeCss` now accepts a "palettes adapter" that lets the same internal loop work for both `Theme.palettes` (legacy) and `DynamicScheme.*Palette` getters — no duplication.
- Unknown variant throws `Error("Unsupported variant: <name>")` before MCU derivation runs; the message is deterministic and includes the rejected name for log readability.
- Test suite now asserts: 9-variant shape lock, all variants emit both mode blocks with primary-container roles, alternate variants differ from TonalSpot, uppercase/lowercase hex equivalence, and variant/source-color validation order.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement nine-variant MCU dispatch** - `8aed6b2` (feat)
2. **Task 2: Add regression coverage for variant differentiation and role completeness** - `33ded3f` (test)

## Files Created/Modified

- `frontend/src/theme/theme-engine.js` — Replaced `void variant` with `VARIANT_WHITELIST` + dispatch. TonalSpot reuses `themeFromSourceColor`; 8 alternates use `DynamicScheme` with `secondaryPalette`/`tertiaryPalette` overrides. New exports: `VARIANT_WHITELIST`. New internal helpers: `palettesFromDynamicScheme`, `validateVariant`, `deriveTonalSpotSchemes`, `deriveDynamicSchemes`. All existing exports preserved (`DIRECT_ROLES`, `SPECIAL_PALETTE_ROLES`, `lightTokenNames`, `buildCssSync`, `buildCss`, `injectThemeCss`).
- `frontend/src/theme/theme-engine.test.mjs` — 7 new tests added: whitelist shape lock, 9-variant block + role presence loop, role-differentiation loop, per-variant uppercase-seed derivation, hex case-insensitivity, non-whitelisted variant rejection (4 cases including wrong-case and whitespace), and validation-order lock.

## Verification Evidence

- `cd frontend && node --test src/theme/theme-engine.test.mjs` — PASS: 13/13.
- `cd frontend && npm run lint -- --quiet` — PASS (no output = clean).
- `cd frontend && npm run build` — PASS (916.25 kB main bundle, 65.98 kB CSS, 1.27s build).
- `cd frontend && npm run check:tokens` — PASS: 8/8.

The TonalSpot regression (assertions at `theme-engine.test.mjs:24-32`) remains green: `--md-color-primary: #056d37;` light, `--md-color-primary: #81d997;` dark, `--md-color-surface-container-lowest: #ffffff;`, `>=28` role declarations.

## Decisions Made

- **TonalSpot path preservation over DynamicScheme unification.** The Phase 17 `themeFromSourceColor` output is what `tokens.css` and the 17-03 hex-lint sentinel baseline were built against. MCU's `SchemeTonalSpot` (which is just `DynamicScheme` with `Variant.TONAL_SPOT`) produces different hex values for the same seed (e.g. light primary `#316a42` vs. legacy `#056d37`) because the legacy path blends the user's secondary/tertiary seeds with `blend: true`. Keeping the legacy path as the TonalSpot branch is the only way to honor the Phase 17 contract; the 8 alternate variants gain the variant-specific derivation without disturbing the locked baseline.
- **User-seed injection at secondary/tertiary only.** Per D-14, the editor exposes three seed inputs and the user can tweak them to influence the result. For the 8 alternate variants, only the user's secondary/tertiary colors are interesting — primary comes from MCU's variant-driven primary palette (e.g. Vibrant pushes chroma to the max), and the neutrals are variant-derived. Forcing the user's primary into the primaryPalette slot would erase the variant character.
- **VARIANT_WHITELIST as exported constant.** Even though the validator is internal, the whitelist literal itself is the contract for the editor (18-02), the preset definitions (future seasonal presets may pick non-TonalSpot variants), and the persisted-theme schema. Exporting it lets the editor chip group and any future validation read from the same source without duplication.
- **Deterministic error includes the bad name.** `Error("Unsupported variant: Spectral")` is easier to debug in production than a generic "invalid variant" — a malformed localStorage payload that contains `Spectral` shows up immediately in the toast/theme engine log without a separate JSON dump.
- **Validation order: source-colors first.** When the user opens a corrupted custom theme, they should see the seed-shape error first (which is the actual data corruption), not a confusing "unsupported variant" message if the variant also happens to be bad. Test `source-color validation runs before variant validation so malformed seeds still surface their own error` locks this.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Variant-name case sensitivity + whitespace guard**
- **Found during:** Task 2 test writing
- **Issue:** The plan said "throw a deterministic Error for an unknown variant" but did not specify whether `'tonalspot'` (wrong case) or `' Vibrant '` (whitespace) should be accepted. The original test draft checked only `'Spectral'` and `''`. Both edge cases are real data-corruption risks (a user with a misconfigured editor or a future schema migration could produce these).
- **Fix:** Added two more `assert.throws` cases in the non-whitelisted-variant test to lock case-sensitive and whitespace-stripped rejection. The `validateVariant` implementation uses `VARIANT_WHITELIST.includes(variant)`, which already correctly rejects both (no implementation change needed — test coverage was just expanded).
- **Files modified:** frontend/src/theme/theme-engine.test.mjs
- **Verification:** All 4 `assert.throws` cases pass under `node --test`.
- **Committed in:** `33ded3f` (Task 2 commit)

No plan instructions were skipped or reinterpreted. The plan's "throw on unknown variant" requirement is satisfied; the expanded test coverage is a strict superset.

## Issues Encountered

- The first iteration of the "non-whitelisted variant is rejected" test included a `buildCssSync(..., undefined)` case. This failed because the function signature has `variant = 'TonalSpot'` as the default, so `undefined` legitimately defaults to a valid variant (not an error). The wrong-case (`'tonalspot'`) and whitespace (`' Vibrant '`) cases were substituted — they exercise the same intent (rejection of malformed variant strings) without contradicting the default-value contract.
- Pre-existing uncommitted changes (`.planning/STATE.md` modifications + deleted Phase 16 plan files + audit result JSONs in `frontend/`) are outside the scope of Plan 18-01 and were left untouched. They belong to a different workflow lane.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: validation_extension | frontend/src/theme/theme-engine.js | T-18-01 mitigation: input validation rejects bad hex + bad variant before any CSS is generated. Whitelist is the contract; case-sensitive and whitespace-stripped variants both rejected. |

## Next Phase Readiness

- **18-02 (Editor page + 9-variant Chip group + scoped preview):** Ready. `buildCssSync` now exposes `VARIANT_WHITELIST` for the chip group; `data-fc-theme-scope` CSS rewrite in `ThemeCard.jsx` continues to work (TonalSpot path byte-stable; alternate variants produce different bytes which is the intent).
- **18-03 (react-colorful color picker):** Ready. Engine accepts `#RRGGBB` (uppercase or lowercase) and is decoupled from the picker.
- **18-04 (Seasonal auto-switch + skyfield pre-generated solar-terms table):** Ready. Engine variant dispatch is orthogonal to seasonal logic; preset definitions can opt into alternate variants.
- **ThemeContext + ThemeCard + ThemePage:** No code changes required. Existing TonalSpot callers see byte-identical output; new variant callers (future editor) get real variant-derived CSS.

## Self-Check: PASSED

- `frontend/src/theme/theme-engine.js` exists, contains `VARIANT_WHITELIST` with the exact 9 names, and `buildCssSync` no longer contains `void variant`.
- `frontend/src/theme/theme-engine.test.mjs` exists, contains tests for all 9 variants.
- Task 1 commit `8aed6b2` exists in git history.
- Task 2 commit `33ded3f` exists in git history.
- `node --test src/theme/theme-engine.test.mjs` reports 13/13 PASS.
- `npm run lint -- --quiet` reports clean.
- `npm run build` succeeds.
- `npm run check:tokens` reports 8/8 PASS.

---
*Phase: 18-custom-editor-seasonal-auto-switch*
*Completed: 2026-08-05*
