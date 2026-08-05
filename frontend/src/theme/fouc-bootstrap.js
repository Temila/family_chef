/**
 * 家味 · Family Chef — 首帧主题引导
 * 在 React/Vite hydration 前应用已缓存的主题，避免冷加载闪烁。
 *
 * 季节自动切换优先级（D-08/D-11）：
 *   - 当 fc_season_enabled === 'true' 时，季节预设优先于 fc_active_theme。
 *     半球读自 fc_hemisphere（仅接受 'north'/'south'），季节由
 *     getSeasonForDate + getSeasonPresetId 解析。
 *   - 若年份不在 SOLAR_TERMS 覆盖范围（2020-2099）或解析失败，
 *     静默回退到 fc_active_theme 或 DEFAULT_PRESET（保持原行为）。
 *
 * 编译期被 esbuild IIFE 化（frontend/plugins/inline-theme-bootstrap.js），
 * 整段脚本内联到 index.html 的 <head>，无任何网络请求。
 */

import { buildCssSync, injectThemeCss } from './theme-engine.js';
import { DEFAULT_PRESET, PRESETS } from './presets.js';
import { getSeasonForDate, getSeasonPresetId, normalizeHemisphere } from './season.js';

(function bootstrapTheme() {
  try {
    var raw = localStorage.getItem('fc_active_theme');
    var seasonEnabled = localStorage.getItem('fc_season_enabled') === 'true';
    var storedHemisphere = localStorage.getItem('fc_hemisphere');
    var hemisphere = normalizeHemisphere(storedHemisphere);
    var legacyVariant = localStorage.getItem('fc_theme');
    var fallbackVariant = legacyVariant === 'light' || legacyVariant === 'dark'
      ? legacyVariant
      : DEFAULT_PRESET.variant;
    var fallbackTheme = raw
      ? JSON.parse(raw)
      : { sourceColors: DEFAULT_PRESET.sourceColors, variant: fallbackVariant };

    var seasonPreset = null;
    if (seasonEnabled) {
      var season = getSeasonForDate(new Date(), hemisphere);
      var presetId = season ? getSeasonPresetId(season) : null;
      if (presetId) {
        var match = null;
        for (var i = 0; i < PRESETS.length; i += 1) {
          if (PRESETS[i].id === presetId) { match = PRESETS[i]; break; }
        }
        if (match) seasonPreset = match;
      }
    }

    var theme = seasonPreset || fallbackTheme;
    if (!theme || !theme.sourceColors || !theme.sourceColors.primary) return;

    var css = buildCssSync(theme.sourceColors, theme.variant || DEFAULT_PRESET.variant);
    injectThemeCss(css);
  } catch {
    // localStorage/JSON/MCU 异常时静默回退到 tokens.css 默认令牌。
  }
})();