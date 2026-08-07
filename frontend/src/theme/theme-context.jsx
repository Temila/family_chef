/**
 * 主题 Context — Phase 18 (D-09 互斥 + D-03 季节缓存 + D-11 开关即时生效)
 *
 * 在 Phase 17 的基础上叠加季节自动切换状态机：
 *   - fc_season_enabled (default false) — 开关
 *   - fc_hemisphere (default 'north')    — 半球（北/南）
 *   - fc_last_season ('north:spring')   — 缓存，避免每次 mount 都重应用
 *
 * 互斥模型（D-09）：
 *   - 当 seasonEnabled=true 时，公开的 setActiveTheme / applyTheme / resetToDefault
 *     一律返回 false 不变 activeTheme。
 *   - 唯一的旁路是内部 applyCurrentSeason()，由 useEffect 触发。
 *
 * 缓存闸门（D-03）：
 *   - 只在缓存键不匹配 或 activeTheme.id 与季节不匹配时才注入新主题。
 *   - 同一次会话内季节边界切换才重新注入一次。
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
import { DEFAULT_PRESET, PRESETS, buildDefaultSeasonThemeMap } from './presets.js';
import {
  getSeasonForDate,
  normalizeHemisphere,
} from './season.js';

const ACTIVE_THEME_KEY = 'fc_active_theme';
const SEASON_ENABLED_KEY = 'fc_season_enabled';
const HEMISPHERE_KEY = 'fc_hemisphere';
const LAST_SEASON_KEY = 'fc_last_season';
const SEASON_THEME_MAP_KEY = 'fc_season_theme_map';

const ThemeContext = createContext(null);

const VALID_HEMISPHERES = new Set(['north', 'south']);
const VALID_SEASONS = new Set(['spring', 'summer', 'autumn', 'winter']);

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

// Phase 19: 账号绑定序列化——将内存主题对象转为后端 ActiveThemePayload 线上传输格式（camelCase sourceColors）
function serializeActiveTheme(theme) {
  if (!theme) return null;
  return {
    id: theme.id,
    name: theme.name,
    sourceColors: theme.sourceColors,
    variant: theme.variant,
    kind: theme.kind,
  };
}

function serializeSeasonThemeMap(map) {
  const out = {};
  for (const season of VALID_SEASONS) {
    const entry = map?.[season];
    if (entry) {
      out[season] = {
        id: entry.id,
        name: entry.name,
        sourceColors: entry.sourceColors,
        variant: entry.variant,
        kind: entry.kind,
      };
    }
  }
  return out;
}

// 读取并校验 fc_season_enabled：仅 'true' 字符串为真，否则默认 false
function readSeasonEnabledFromStorage() {
  try {
    return localStorage.getItem(SEASON_ENABLED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeSeasonEnabledToStorage(value) {
  try {
    localStorage.setItem(SEASON_ENABLED_KEY, value ? 'true' : 'false');
  } catch {
    /* localStorage 不可用时静默失败 */
  }
}

// 读取并校验 fc_hemisphere：仅 'north'/'south' 合规
function readHemisphereFromStorage() {
  try {
    const stored = localStorage.getItem(HEMISPHERE_KEY);
    return VALID_HEMISPHERES.has(stored) ? stored : 'north';
  } catch {
    return 'north';
  }
}

function writeHemisphereToStorage(value) {
  try {
    localStorage.setItem(HEMISPHERE_KEY, value);
  } catch {
    /* localStorage 不可用时静默失败 */
  }
}

// 读取并校验 fc_last_season：'hemisphere:season' 形态，季度必须是 4 个季节之一
function readLastSeasonFromStorage() {
  try {
    const stored = localStorage.getItem(LAST_SEASON_KEY);
    if (typeof stored !== 'string') return null;
    const [hemi, season] = stored.split(':');
    if (!VALID_HEMISPHERES.has(hemi)) return null;
    if (!VALID_SEASONS.has(season)) return null;
    return stored;
  } catch {
    return null;
  }
}

function writeLastSeasonToStorage(value) {
  try {
    if (value == null) {
      localStorage.removeItem(LAST_SEASON_KEY);
    } else {
      localStorage.setItem(LAST_SEASON_KEY, value);
    }
  } catch {
    /* localStorage 不可用时静默失败 */
  }
}

/**
 * 读取并校验 fc_season_theme_map：季节→主题映射。
 * - 缺失/解析失败：返回 buildDefaultSeasonThemeMap()。
 * - 存在但部分损坏：逐季节校验 sourceColors，坏项回退到默认 map 的对应预设。
 * - 合法项必须是对象且 sourceColors 通过 isValidSourceColors。
 */
function readSeasonThemeMapFromStorage() {
  const defaultMap = buildDefaultSeasonThemeMap();
  try {
    const stored = localStorage.getItem(SEASON_THEME_MAP_KEY);
    if (!stored) return defaultMap;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return defaultMap;

    const merged = {};
    for (const season of VALID_SEASONS) {
      const candidate = parsed[season];
      if (candidate && isValidSourceColors(candidate.sourceColors)) {
        merged[season] = candidate;
      } else {
        merged[season] = defaultMap[season];
      }
    }
    return merged;
  } catch {
    return defaultMap;
  }
}

function writeSeasonThemeMapToStorage(map) {
  try {
    localStorage.setItem(SEASON_THEME_MAP_KEY, JSON.stringify(map));
  } catch {
    /* localStorage 不可用时静默失败 */
  }
}

/**
 * 缓存闸门判定：仅当缓存键不同于新值，或 activeTheme.id 不等于
 * seasonThemeMap[season].id 时才注入。同季节同半球的二次 mount 直接复用，避免每次 mount 都重建 CSS。
 */
function shouldApplySeasonalPreset(season, hemisphere, cachedKey, activeTheme, seasonThemeMap) {
  const compoundKey = `${hemisphere}:${season}`;
  const cacheMatches = cachedKey === compoundKey;
  const mappedId = seasonThemeMap?.[season]?.id;
  const activeMatchesSeasonal = Boolean(
    activeTheme && mappedId != null && activeTheme.id === mappedId,
  );
  return !(cacheMatches && activeMatchesSeasonal);
}

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTheme, setActiveThemeState] = useState(readActiveThemeFromStorage);
  const [customThemes, setCustomThemes] = useState([]);
  const [seasonEnabled, setSeasonEnabledState] = useState(readSeasonEnabledFromStorage);
  const [hemisphere, setHemisphereState] = useState(readHemisphereFromStorage);
  const [seasonThemeMap, setSeasonThemeMapState] = useState(readSeasonThemeMapFromStorage);
  const fetchedAtRef = useRef(null);
  // 当 setSeasonEnabled(true) 后第一次进入自动模式，强制重新应用（即使缓存命中）。
  // 这是为了应对"用户主动打开开关"的语义：打开开关就是意图切换到当前季节，
  // 不应该被旧的 cacheHits 抑制掉（cache gate 设计上只用于 mount）。
  const justEnabledRef = useRef(false);
  // Phase 19: 账号绑定主题偏好同步（refs 避免触发重渲染）
  const preferencesLoadedRef = useRef(false); // 当前会话是否至少完成一次服务端同步
  const skipNextPutRef = useRef(false); // 跳过下一次 debounced PUT（同步/上传后置 true）
  const debouncedPutTimerRef = useRef(null); // debounce 定时器句柄

  /**
   * 公开的 setActiveTheme —— D-09 互斥闸门。
   * seasonEnabled=true 时返回 false 不变主题；返回 true 表示成功切换。
   */
  const setActiveTheme = useCallback((theme) => {
    if (seasonEnabled) return false;
    setActiveThemeState(normalizeTheme(theme));
    return true;
  }, [seasonEnabled]);

  /**
   * 公开的 resetToDefault —— D-09 互斥闸门（同 setActiveTheme）。
   */
  const resetToDefault = useCallback(() => {
    if (seasonEnabled) return false;
    setActiveThemeState(DEFAULT_PRESET);
    return true;
  }, [seasonEnabled]);

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

  // Phase 19 D-A1/D-A4: 双写——除现有 localStorage 写入外，200ms debounce PUT 到服务端
  useEffect(() => {
    if (!user || !preferencesLoadedRef.current) return;
    if (skipNextPutRef.current) {
      skipNextPutRef.current = false;
      return;
    }
    if (debouncedPutTimerRef.current) {
      clearTimeout(debouncedPutTimerRef.current);
    }
    debouncedPutTimerRef.current = setTimeout(async () => {
      try {
        await api.updateThemePreferences({
          active_theme: serializeActiveTheme(activeTheme),
          season_enabled: seasonEnabled,
          hemisphere,
          season_theme_map: serializeSeasonThemeMap(seasonThemeMap),
        });
      } catch {
        /* PUT 失败静默（D-A4）；服务端 LWW 下次拉取自然校准 */
      }
      debouncedPutTimerRef.current = null;
    }, 200);
    return () => {
      if (debouncedPutTimerRef.current) {
        clearTimeout(debouncedPutTimerRef.current);
        debouncedPutTimerRef.current = null;
      }
    };
  }, [user, activeTheme, seasonEnabled, hemisphere, seasonThemeMap]);

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

  /**
   * Phase 19 D-A4/D-A5: 登录后静默 GET 服务端偏好。
   * - 200：用服务端值水合 state + localStorage；置 skipNextPutRef 避免回声 PUT。
   * - 404：首次迁移——读取本地 4 个 fc_* key 上传为初始 payload（D-A5）。
   * - 其他错误：静默回退本地缓存，不弹 toast（D-A4）。
   */
  const refreshThemePreferences = useCallback(async () => {
    if (!user?.id) return;
    try {
      const server = await api.getThemePreferences();
      skipNextPutRef.current = true;
      const enabled = Boolean(server.season_enabled);
      const hemi = normalizeHemisphere(server.hemisphere);
      const map = server.season_theme_map || buildDefaultSeasonThemeMap();
      setActiveThemeState(normalizeTheme(server.active_theme));
      setSeasonEnabledState(enabled);
      setHemisphereState(hemi);
      setSeasonThemeMapState(map);
      writeActiveThemeToStorage(server.active_theme);
      writeSeasonEnabledToStorage(enabled);
      writeHemisphereToStorage(hemi);
      writeSeasonThemeMapToStorage(map);
      preferencesLoadedRef.current = true;
    } catch (err) {
      if (err?.status === 404) {
        // D-A5: 服务器无偏好，把本地缓存上传作为初始 payload
        const localTheme = readActiveThemeFromStorage();
        const localEnabled = readSeasonEnabledFromStorage();
        const localHemi = readHemisphereFromStorage();
        const localMap = readSeasonThemeMapFromStorage();
        skipNextPutRef.current = true;
        try {
          await api.updateThemePreferences({
            active_theme: serializeActiveTheme(localTheme),
            season_enabled: localEnabled,
            hemisphere: localHemi,
            season_theme_map: serializeSeasonThemeMap(localMap),
          });
        } catch {
          /* 上传失败静默；后续 debounced PUT 会重试 */
        }
      }
      // 其他错误（含上传失败）：静默回退本地缓存，不弹 toast（D-A4）
      preferencesLoadedRef.current = true;
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      // D-A6: 登出清理——移除 4 个账号偏好 key，重置 context state；
      // 保留 fc_theme（legacy light/dark）+ fc_last_season（渲染缓存），不与账号绑定。
      // setState 经 queueMicrotask 延迟以规避 react-hooks/set-state-in-effect 级联渲染（同文件既有范式）
      localStorage.removeItem(ACTIVE_THEME_KEY);
      localStorage.removeItem(SEASON_ENABLED_KEY);
      localStorage.removeItem(HEMISPHERE_KEY);
      localStorage.removeItem(SEASON_THEME_MAP_KEY);
      queueMicrotask(() => {
        setActiveThemeState(DEFAULT_PRESET);
        setSeasonEnabledState(false);
        setHemisphereState('north');
        setSeasonThemeMapState(buildDefaultSeasonThemeMap());
      });
      preferencesLoadedRef.current = false;
      if (debouncedPutTimerRef.current) {
        clearTimeout(debouncedPutTimerRef.current);
        debouncedPutTimerRef.current = null;
      }
      return undefined;
    }
    // 登录：并行拉取自定义主题缓存（Phase 17）+ 账号偏好（Phase 19）
    queueMicrotask(() => {
      refreshCustomThemes();
      refreshThemePreferences();
    });
    return undefined;
  }, [user?.id, refreshCustomThemes, refreshThemePreferences]);

  /**
   * D-11: 打开/关闭季节自动切换开关，即时持久化；on→off 不改主题（保留用户上次手动选择），
   * off→on 触发 justEnabledRef，下一次 applyCurrentSeason() 强制应用一次。
   */
  const setSeasonEnabled = useCallback((next) => {
    const value = Boolean(next);
    setSeasonEnabledState(value);
    writeSeasonEnabledToStorage(value);
    if (value) {
      // 主动开启：下一次应用时跳过缓存闸门
      justEnabledRef.current = true;
    }
  }, []);

  /**
   * D-06 / D-07: 切换半球。auto=ON 时立即重新评估 + 应用倒置季节预设；auto=OFF 仅持久化偏好。
   */
  const setHemisphere = useCallback((next) => {
    const value = normalizeHemisphere(next);
    setHemisphereState(value);
    writeHemisphereToStorage(value);
    // 应用层响应在外部 useEffect：依赖 seasonEnabled 时才生效
  }, []);

  /**
   * 设置某季节对应的主题（预设或自定义）。
   * 校验 season 合法 + theme.sourceColors 完整；否则静默 no-op。
   * 写入后持久化 + 触发 justEnabledRef 强制下一次 applyCurrentSeason 重应用，
   * 实现"更改当前季节主题后立即生效"。
   */
  const setSeasonTheme = useCallback((season, theme) => {
    if (!VALID_SEASONS.has(season)) return;
    if (!theme || !isValidSourceColors(theme.sourceColors)) return;
    setSeasonThemeMapState((prev) => {
      const next = { ...prev, [season]: theme };
      writeSeasonThemeMapToStorage(next);
      return next;
    });
    // 镜像 setSeasonEnabled 的即时生效范式：下一次 applyCurrentSeason 强制重应用
    justEnabledRef.current = true;
  }, []);

  /**
   * 内部旁路：直接套用预设（不经过 D-09 互斥闸门）。
   * 仅供 applyCurrentSeason() 等受控路径调用。
   */
  const applySeasonalPresetDirect = useCallback((preset) => {
    setActiveThemeState(preset);
  }, []);

  /**
   * 内部 evaluate + apply：评估当前本地季节，应用 seasonThemeMap 中该季节对应的主题；
   * 缓存命中且 active 匹配则跳过。仅当 seasonEnabled=true 时由 useEffect 触发。
   */
  const applyCurrentSeason = useCallback(({ force = false } = {}) => {
    const season = getSeasonForDate(new Date(), hemisphere);
    if (!season) return false; // 表外年份：保留 fc_active_theme/默认

    // 直接从 seasonThemeMap 读取完整主题对象（不再走 getSeasonPresetId + PRESETS.find 两步）
    const themed = seasonThemeMap[season];
    if (!themed || !isValidSourceColors(themed.sourceColors)) return false;

    const cache = readLastSeasonFromStorage();
    const shouldApply = force
      || justEnabledRef.current
      || shouldApplySeasonalPreset(season, hemisphere, cache, activeTheme, seasonThemeMap);
    if (!shouldApply) {
      justEnabledRef.current = false;
      return false;
    }

    applySeasonalPresetDirect(themed);
    writeLastSeasonToStorage(`${hemisphere}:${season}`);
    justEnabledRef.current = false;
    return true;
  }, [activeTheme, applySeasonalPresetDirect, hemisphere, seasonThemeMap]);

  // currentSeason 派生自 hemisphere + 当前时刻；hemisphere 切换即重算，无需 effect。
  const currentSeason = useMemo(
    () => getSeasonForDate(new Date(), hemisphere),
    [hemisphere],
  );

  // 开关 ON：mount / hemisphere 改变 / 用户上线时 evaluate
  useEffect(() => {
    if (!seasonEnabled) return;
    queueMicrotask(() => { applyCurrentSeason(); });
  }, [seasonEnabled, hemisphere, user?.id, applyCurrentSeason]);

  const value = useMemo(() => ({
    activeTheme,
    setActiveTheme,
    customThemes,
    refreshCustomThemes,
    applyTheme: setActiveTheme, // D-09: 公开 applyTheme 同样受互斥
    resetToDefault,
    PRESETS,
    // Phase 18 seasonal state (D-03/D-05/D-06/D-09)
    seasonEnabled,
    hemisphere,
    currentSeason,
    setSeasonEnabled,
    setHemisphere,
    // Quick 260807-121: 季节→主题映射 + setter
    seasonThemeMap,
    setSeasonTheme,
  }), [
    activeTheme,
    setActiveTheme,
    customThemes,
    refreshCustomThemes,
    resetToDefault,
    seasonEnabled,
    hemisphere,
    currentSeason,
    setSeasonEnabled,
    setHemisphere,
    seasonThemeMap,
    setSeasonTheme,
  ]);

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