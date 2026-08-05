/**
 * 季节解析器 — Phase 18 (SEAS-01/02/03)
 *
 * 纯函数：基于 SOLAR_TERMS 表 + 用户本地时区判定当前季节。
 * - 不调用任何浏览器/IP/启发式 API（SEAS-03）。
 * - 不依赖后端、无网络请求；运行时纯前端常量消费，无生成期工具链依赖（SEAS-02）。
 * - 边界按本地日历日比较（getFullYear/getMonth/getDate），不比较 UTC 字符串。
 * - 北半球映射：立春→spring, 立夏→summer, 立秋→autumn, 立冬→winter
 * - 南半球取反：立春→autumn, 立夏→winter, 立秋→spring, 立冬→summer
 */

import { SOLAR_TERMS } from './solar-terms.js';

/** 合法的季节取值（按顺序：春→夏→秋→冬） */
export const SEASONS = Object.freeze(['spring', 'summer', 'autumn', 'winter']);
const SEASON_SET = new Set(SEASONS);

export const HEMISPHERE_NORTH = 'north';
export const HEMISPHERE_SOUTH = 'south';
const HEMISPHERE_SET = new Set([HEMISPHERE_NORTH, HEMISPHERE_SOUTH]);

/** 节气名 -> 北半球季节名（其余六个节气忽略；只用于四立） */
const TERM_TO_NORTH_SEASON = Object.freeze({
  lichun: 'spring',
  lixia: 'summer',
  liqiu: 'autumn',
  lidong: 'winter',
});

/** 北→南半球映射（直接交换：春↔秋, 夏↔冬） */
const NORTH_TO_SOUTH = Object.freeze({
  spring: 'autumn',
  summer: 'winter',
  autumn: 'spring',
  winter: 'summer',
});

/**
 * 验证并规范化 hemisphere 入参；非法/缺失时回退到 'north'。
 * 这是 D-05 / D-06 / D-07 唯一认可的半球来源（手动设置 + localStorage），
 * 任何 IP/时区启发式必须走这里收敛。
 */
export function normalizeHemisphere(hemisphere) {
  return HEMISPHERE_SET.has(hemisphere) ? hemisphere : HEMISPHERE_NORTH;
}

/**
 * 把 JS Date 的本地日历分量压缩成单个整数 YYYYMMDD，
 * 便于无歧义地比较两个本地日期的先后顺序（避免 Date 实例比较的瞬时语义陷阱）。
 */
function localDateKey(d) {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/**
 * 解析指定日期（默认当前本地时间）所在的季节。
 *
 * 返回：
 *   - 'spring' | 'summer' | 'autumn' | 'winter' 之一（合法季节）
 *   - null  —— 当 date.getFullYear() 不在 SOLAR_TERMS 覆盖范围（2020–2099）内
 *
 * 严格遵循 D-04：本函数永不返回 'default' 或任何自定义主题 id；
 * 自定义主题只能通过 ThemeContext 的 setActiveTheme 显式选择。
 */
export function getSeasonForDate(date = new Date(), hemisphere = HEMISPHERE_NORTH) {
  const hemi = normalizeHemisphere(hemisphere);
  const year = date.getFullYear();
  const terms = SOLAR_TERMS[year];
  if (!terms) return null;

  // 每个节气 UTC 时刻在用户本地时区的日历分量
  const lichunKey = localDateKey(new Date(terms.lichun));
  const lixiaKey = localDateKey(new Date(terms.lixia));
  const liqiuKey = localDateKey(new Date(terms.liqiu));
  const lidongKey = localDateKey(new Date(terms.lidong));
  const todayKey = localDateKey(date);

  let northSeason;
  if (todayKey < lichunKey || todayKey >= lidongKey) {
    northSeason = 'winter'; // 立冬~次年立春之间
  } else if (todayKey < lixiaKey) {
    northSeason = 'spring';
  } else if (todayKey < liqiuKey) {
    northSeason = 'summer';
  } else {
    northSeason = 'autumn';
  }

  return hemi === HEMISPHERE_SOUTH ? NORTH_TO_SOUTH[northSeason] : northSeason;
}

/**
 * 将季节名映射到 PRESETS 表里的 preset id。
 * 四季预设的 id 本身就是季节名，故返回值与入参相同 —— 但入口必须校验，
 * 防止 theme-context 误传自定义主题 id。
 *
 * 返回：
 *   - 'spring' | 'summer' | 'autumn' | 'winter'（合法季节预设 id）
 *   - null（任何非季节名入参，包括 'default'、自定义 id、null/undefined）
 */
export function getSeasonPresetId(season) {
  if (typeof season !== 'string' || !SEASON_SET.has(season)) return null;
  return season;
}