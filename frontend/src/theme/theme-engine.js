/**
 * 家味 · Family Chef — 运行时 MD3 主题引擎
 * 从种子色同步派生 light/dark 语义令牌，并提供 DOM 注入辅助。
 */

import { argbFromHex, themeFromSourceColor } from '@material/material-color-utilities';

const DIRECT_ROLES = [
  'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
  'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
  'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
  'error', 'onError', 'errorContainer', 'onErrorContainer',
  'background', 'onBackground', 'surface', 'onSurface', 'onSurfaceVariant',
  'outline', 'outlineVariant', 'scrim', 'shadow', 'inverseSurface',
  'inverseOnSurface', 'inversePrimary',
];

const SURFACE_PALETTE_ROLES = {
  surfaceDim: { light: 87, dark: 6 },
  surfaceBright: { light: 98, dark: 24 },
  surfaceContainerLowest: { light: 100, dark: 4 },
  surfaceContainerLow: { light: 96, dark: 10 },
  surfaceContainer: { light: 94, dark: 12 },
  surfaceContainerHigh: { light: 92, dark: 17 },
  surfaceContainerHighest: { light: 90, dark: 22 },
};

export const SPECIAL_PALETTE_ROLES = {
  surfaceTint: { palette: 'primary', light: 40, dark: 80 },
  surfaceVariant: { palette: 'neutralVariant', light: 90, dark: 30 },
};

function hexFromArgb(argb) {
  const red = ((argb >> 16) & 0xff).toString(16).padStart(2, '0');
  const green = ((argb >> 8) & 0xff).toString(16).padStart(2, '0');
  const blue = (argb & 0xff).toString(16).padStart(2, '0');
  return `#${red}${green}${blue}`;
}

function toKebab(name) {
  return name.replace(/([A-Z])/g, '-$1').toLowerCase();
}

function buildSchemeCss(scheme, palettes, mode) {
  const lines = [];

  for (const role of DIRECT_ROLES) {
    lines.push(`  --md-color-${toKebab(role)}: ${hexFromArgb(scheme[role])};`);
  }

  for (const [role, tones] of Object.entries(SURFACE_PALETTE_ROLES)) {
    lines.push(
      `  --md-color-${toKebab(role)}: ${hexFromArgb(palettes.neutral.tone(tones[mode]))};`,
    );
  }

  for (const [role, spec] of Object.entries(SPECIAL_PALETTE_ROLES)) {
    lines.push(
      `  --md-color-${toKebab(role)}: ${hexFromArgb(palettes[spec.palette].tone(spec[mode]))};`,
    );
  }

  return lines.join('\n');
}

function buildElevationCss() {
  return [
    '  --md-elevation-0: none;',
    '  --md-elevation-1: 0 1px 2px 0 color-mix(in srgb, var(--md-color-surface-tint) 12%, transparent);',
    '  --md-elevation-2: 0 1px 3px 0 color-mix(in srgb, var(--md-color-surface-tint) 14%, transparent);',
    '  --md-elevation-3: 0 2px 6px 0 color-mix(in srgb, var(--md-color-surface-tint) 18%, transparent);',
    '  --md-elevation-4: 0 4px 8px 0 color-mix(in srgb, var(--md-color-surface-tint) 22%, transparent), 0 1px 3px 0 color-mix(in srgb, var(--md-color-surface-tint) 14%, transparent);',
    '  --md-elevation-5: 0 6px 12px 0 color-mix(in srgb, var(--md-color-surface-tint) 26%, transparent), 0 2px 4px 0 color-mix(in srgb, var(--md-color-surface-tint) 18%, transparent);',
  ].join('\n');
}

function isHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function validateSourceColors(sourceColors) {
  if (
    !sourceColors
    || !isHexColor(sourceColors.primary)
    || !isHexColor(sourceColors.secondary)
    || !isHexColor(sourceColors.tertiary)
  ) {
    throw new Error('Invalid sourceColors shape');
  }
}

/**
 * 同步生成 light/dark 两套 CSS。variant 目前保留参数，v1.5 固定使用 TonalSpot。
 */
export function buildCssSync(sourceColors, variant = 'TonalSpot') {
  validateSourceColors(sourceColors);

  // v1.5 只实现 TonalSpot；保留参数以兼容 Phase 18 的 variant 扩展。
  void variant;
  const theme = themeFromSourceColor(argbFromHex(sourceColors.primary), [
    {
      name: 'secondary',
      value: argbFromHex(sourceColors.secondary),
      blend: true,
    },
    {
      name: 'tertiary',
      value: argbFromHex(sourceColors.tertiary),
      blend: true,
    },
  ]);

  const light = buildSchemeCss(theme.schemes.light, theme.palettes, 'light');
  const dark = buildSchemeCss(theme.schemes.dark, theme.palettes, 'dark');

  return [
    ':root {',
    light,
    '}',
    '[data-theme="dark"] {',
    dark,
    buildElevationCss(),
    '}',
  ].join('\n');
}

/**
 * 异步兼容入口；bootstrap 使用同步版本，React 层可统一使用此签名。
 */
export function buildCss(sourceColors, variant = 'TonalSpot') {
  return Promise.resolve(buildCssSync(sourceColors, variant));
}

/**
 * 创建或复用动态主题样式节点，重复应用只替换文本内容。
 */
export function injectThemeCss(cssText) {
  let element = document.getElementById('fc-dynamic-theme');
  if (!element) {
    element = document.createElement('style');
    element.id = 'fc-dynamic-theme';
    document.head.appendChild(element);
  }
  element.textContent = cssText;
}

export const lightTokenNames = [
  ...DIRECT_ROLES,
  ...Object.keys(SURFACE_PALETTE_ROLES),
  ...Object.keys(SPECIAL_PALETTE_ROLES),
];
