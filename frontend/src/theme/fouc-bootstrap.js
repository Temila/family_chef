/**
 * 家味 · Family Chef — 首帧主题引导
 * 在 React/Vite hydration 前应用已缓存的主题，避免冷加载闪烁。
 */

import { buildCssSync, injectThemeCss } from './theme-engine.js';
import { DEFAULT_PRESET } from './presets.js';

(function bootstrapTheme() {
  try {
    var raw = localStorage.getItem('fc_active_theme');
    var legacyVariant = localStorage.getItem('fc_theme');
    var fallbackVariant = legacyVariant === 'light' || legacyVariant === 'dark'
      ? legacyVariant
      : DEFAULT_PRESET.variant;
    var theme = raw
      ? JSON.parse(raw)
      : { sourceColors: DEFAULT_PRESET.sourceColors, variant: fallbackVariant };

    if (!theme || !theme.sourceColors || !theme.sourceColors.primary) return;

    var css = buildCssSync(theme.sourceColors, theme.variant || DEFAULT_PRESET.variant);
    injectThemeCss(css);
  } catch {
    // localStorage/JSON/MCU 异常时静默回退到 tokens.css 默认令牌。
  }
})();
