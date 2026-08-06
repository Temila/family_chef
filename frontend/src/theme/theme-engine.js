/**
 * 家味 · Family Chef — 运行时 MD3 主题引擎
 * 从种子色同步派生 light/dark 语义令牌，并提供 DOM 注入辅助。
 *
 * 9 种 MD3 变体（TonalSpot / Vibrant / Expressive / Content /
 * Mono / Neutral / Fidelity / Rainbow / FruitSalad）均通过 MCU
 * DynamicScheme 派生（含用户 secondary/tertiary 种子注入）。
 * TonalSpot 原走 themeFromSourceColor，Phase 18-07 gap closure
 * 统一为 DynamicScheme 以修复 secondary/tertiary 被忽略的问题。
 */

import {
  Hct,
  TonalPalette,
  DynamicScheme,
  Variant,
  argbFromHex,
} from '@material/material-color-utilities';

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

/**
 * 9 个白名单 variant —— 编辑器、保存、presets、localStorage 持久化
 * 共用同一字面量；顺序遵循 Material 官方文档，TonalSpot 居首。
 * 编辑器 Chip 组（Phase 18-02）也按此顺序横向排列。
 */
export const VARIANT_WHITELIST = [
  'TonalSpot',
  'Vibrant',
  'Expressive',
  'Content',
  'Mono',
  'Neutral',
  'Fidelity',
  'Rainbow',
  'FruitSalad',
];

/**
 * 引擎白名单字符串 → MCU Variant 枚举值映射。
 * Mono 对应 MCU 的 MONOCHROME；其它名称一一对应。
 */
const VARIANT_TO_MCU = {
  TonalSpot: Variant.TONAL_SPOT,
  Vibrant: Variant.VIBRANT,
  Expressive: Variant.EXPRESSIVE,
  Content: Variant.CONTENT,
  Mono: Variant.MONOCHROME,
  Neutral: Variant.NEUTRAL,
  Fidelity: Variant.FIDELITY,
  Rainbow: Variant.RAINBOW,
  FruitSalad: Variant.FRUIT_SALAD,
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

/**
 * 从 DynamicScheme 提取 buildSchemeCss 期望的 palettes 形态。
 * DynamicScheme 直接暴露 primaryPalette/secondaryPalette/.../neutralVariantPalette/
 * errorPalette 全套 TonalPalette；tone() 接口与 themeFromSourceColor 的
 * theme.palettes 兼容，因此可复用既有 buildSchemeCss 内部循环。
 */
function palettesFromDynamicScheme(ds) {
  return {
    primary: ds.primaryPalette,
    secondary: ds.secondaryPalette,
    tertiary: ds.tertiaryPalette,
    neutral: ds.neutralPalette,
    neutralVariant: ds.neutralVariantPalette,
    error: ds.errorPalette,
  };
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

function validateVariant(variant) {
  if (!VARIANT_WHITELIST.includes(variant)) {
    throw new Error(`Unsupported variant: ${variant}`);
  }
}

/**
 * 全部 9 个 variant 走 DynamicScheme 路径：primary/neutral/neutralVariant/
 * error 由 MCU 按变体规则派生；用户种子 secondary/tertiary 通过
 * TonalPalette.fromInt 显式注入，确保用户能微调这两个色相。
 */
function deriveDynamicSchemes(sourceColors, variant) {
  const variantEnum = VARIANT_TO_MCU[variant];
  const options = {
    sourceColorHct: Hct.fromInt(argbFromHex(sourceColors.primary)),
    variant: variantEnum,
    contrastLevel: 0,
    isDark: false,
    secondaryPalette: TonalPalette.fromInt(argbFromHex(sourceColors.secondary)),
    tertiaryPalette: TonalPalette.fromInt(argbFromHex(sourceColors.tertiary)),
  };
  const light = new DynamicScheme({ ...options, isDark: false });
  const dark = new DynamicScheme({ ...options, isDark: true });
  return {
    light,
    dark,
    palettes: palettesFromDynamicScheme(light),
    darkPalettes: palettesFromDynamicScheme(dark),
  };
}

/**
 * 同步生成 light/dark 两套 CSS。variant 决定派生的 MCU 变体：
 * 所有 variant 统一走 DynamicScheme 路径（含用户 secondary/tertiary 种子注入）。
 * 未知 variant 直接抛 Error（防止 localStorage 损坏数据被静默吞掉）。
 */
export function buildCssSync(sourceColors, variant = 'TonalSpot') {
  validateSourceColors(sourceColors);
  validateVariant(variant);

  const { light, dark, palettes, darkPalettes } = deriveDynamicSchemes(sourceColors, variant);
  const lightCss = buildSchemeCss(light, palettes, 'light');
  const darkCss = buildSchemeCss(dark, darkPalettes, 'dark');

  return [
    ':root {',
    lightCss,
    '}',
    '[data-theme="dark"] {',
    darkCss,
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
 * 创建或复用动态主题样式节点。每次调用都重新 appendChild 到 <head> 末尾，
 * 确保 fc-dynamic-theme 始终是 <head> 最后一个 <style>，在 CSS 级联中
 * 胜出（同特异性 :root 选择器，后源序优先）。修复 Vite dev 模式下
 * tokens.css 注入到 fc-dynamic-theme 之后导致动态主题被覆盖的问题。
 */
export function injectThemeCss(cssText) {
  let element = document.getElementById('fc-dynamic-theme');
  if (!element) {
    element = document.createElement('style');
    element.id = 'fc-dynamic-theme';
    document.head.appendChild(element);
  }
  element.textContent = cssText;
  document.head.appendChild(element);
}

export const lightTokenNames = [
  ...DIRECT_ROLES,
  ...Object.keys(SURFACE_PALETTE_ROLES),
  ...Object.keys(SPECIAL_PALETTE_ROLES),
];
