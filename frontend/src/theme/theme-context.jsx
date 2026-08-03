/**
 * 主题 Context — Phase 17 (D-11 memoized value + D-15/16/17 sync)
 */

/* eslint-disable react-refresh/only-export-components -- Context Provider 与 useTheme 同文件导出是 React Context 标准范式 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { api } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { buildCssSync, injectThemeCss } from './theme-engine.js';
import { DEFAULT_PRESET, PRESETS } from './presets.js';

const ACTIVE_THEME_KEY = 'fc_active_theme';
const ThemeContext = createContext(null);

function sameSourceColors(left, right) {
  return Boolean(
    left
    && right
    && left.primary === right.primary
    && left.secondary === right.secondary
    && left.tertiary === right.tertiary,
  );
}

function isValidSourceColors(sourceColors) {
  return Boolean(
    sourceColors?.primary
    && sourceColors?.secondary
    && sourceColors?.tertiary,
  );
}

function readActiveThemeFromStorage() {
  try {
    const stored = localStorage.getItem(ACTIVE_THEME_KEY);
    if (!stored) return DEFAULT_PRESET;

    const parsed = JSON.parse(stored);
    if (!isValidSourceColors(parsed.sourceColors)) return DEFAULT_PRESET;

    const matchingPreset = PRESETS.find(preset => (
      sameSourceColors(preset.sourceColors, parsed.sourceColors)
    ));
    const kind = parsed.kind === 'preset' || (!parsed.kind && matchingPreset)
      ? 'preset'
      : 'custom';

    return {
      ...parsed,
      id: parsed.id ?? matchingPreset?.id,
      name: parsed.name ?? matchingPreset?.name,
      variant: parsed.variant || 'TonalSpot',
      kind,
    };
  } catch {
    return DEFAULT_PRESET;
  }
}

function writeActiveThemeToStorage(theme) {
  localStorage.setItem(ACTIVE_THEME_KEY, JSON.stringify({
    sourceColors: theme.sourceColors,
    variant: theme.variant,
    kind: theme.kind,
    id: theme.id,
  }));
}

function normalizeTheme(theme) {
  const matchingPreset = PRESETS.find(preset => (
    preset.id === theme.id || sameSourceColors(preset.sourceColors, theme.sourceColors)
  ));
  return {
    ...theme,
    kind: theme.kind === 'preset' || matchingPreset ? 'preset' : 'custom',
  };
}

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTheme, setActiveThemeState] = useState(readActiveThemeFromStorage);
  const [customThemes, setCustomThemes] = useState([]);
  const fetchedAtRef = useRef(null);

  const setActiveTheme = useCallback((theme) => {
    setActiveThemeState(normalizeTheme(theme));
  }, []);

  const resetToDefault = useCallback(() => {
    setActiveThemeState(DEFAULT_PRESET);
  }, []);

  useEffect(() => {
    try {
      const cssText = buildCssSync(activeTheme.sourceColors, activeTheme.variant);
      injectThemeCss(cssText);
      writeActiveThemeToStorage(activeTheme);
    } catch {
      showToast('主题应用失败，已恢复默认', 'error');
      queueMicrotask(() => { setActiveThemeState(DEFAULT_PRESET); });
    }
  }, [activeTheme, showToast]);

  const refreshCustomThemes = useCallback(async () => {
    if (!user) return;

    try {
      const fetchedThemes = await api.getThemes();
      const normalizedThemes = fetchedThemes.map(theme => ({ ...theme, kind: 'custom' }));
      setCustomThemes(normalizedThemes);

      const matchedFetchedTheme = normalizedThemes.find(theme => (
        theme.id === activeTheme.id
        || sameSourceColors(theme.sourceColors, activeTheme.sourceColors)
      ));
      if (
        activeTheme.kind === 'custom'
        && fetchedAtRef.current !== null
        && activeTheme.id != null
        && matchedFetchedTheme
        && Date.parse(matchedFetchedTheme.updated_at) > Date.parse(fetchedAtRef.current)
      ) {
        setActiveTheme(matchedFetchedTheme);
        showToast('已同步最新主题', 'success');
      }

      fetchedAtRef.current = new Date().toISOString();
    } catch {
      showToast('无法同步主题（请检查网络），已使用上次缓存', 'warn');
    }
  }, [activeTheme, setActiveTheme, showToast, user]);

  useEffect(() => {
    if (!user?.id) return undefined;
    queueMicrotask(() => { refreshCustomThemes(); });
    return undefined;
  }, [user?.id, refreshCustomThemes]);

  const value = useMemo(() => ({
    activeTheme,
    setActiveTheme,
    customThemes,
    refreshCustomThemes,
    applyTheme: setActiveTheme,
    resetToDefault,
    PRESETS,
  }), [activeTheme, customThemes, setActiveTheme, refreshCustomThemes, resetToDefault]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
