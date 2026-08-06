/**
 * 家味 · Family Chef — 前端内置主题预设
 * 预设是只读的种子色常量，编辑时由后续流程 fork 为自定义主题。
 */

import { SEASONS } from './season.js';

export const PRESETS = [
  {
    id: 'default',
    name: '默认',
    kind: 'preset',
    sourceColors: { primary: '#34834E', secondary: '#506446', tertiary: '#F5B43C' },
    variant: 'TonalSpot',
  },
  {
    id: 'spring',
    name: '春',
    kind: 'preset',
    sourceColors: { primary: '#7A9568', secondary: '#9C8E5E', tertiary: '#E89A6B' },
    variant: 'TonalSpot',
  },
  {
    id: 'summer',
    name: '夏',
    kind: 'preset',
    sourceColors: { primary: '#2E7A8C', secondary: '#5BA8B5', tertiary: '#F4D35E' },
    variant: 'TonalSpot',
  },
  {
    id: 'autumn',
    name: '秋',
    kind: 'preset',
    sourceColors: { primary: '#A04B2E', secondary: '#C77B5C', tertiary: '#D4A24C' },
    variant: 'TonalSpot',
  },
  {
    id: 'winter',
    name: '冬',
    kind: 'preset',
    sourceColors: { primary: '#3E5C76', secondary: '#6B7F8C', tertiary: '#B8C5CC' },
    variant: 'TonalSpot',
  },
];

export const DEFAULT_PRESET = PRESETS[0];

/**
 * 默认季节→主题映射，与开启季节自动切换的历史行为等价：
 * 春→春预设、夏→夏预设、秋→秋预设、冬→冬预设。
 *
 * 返回值：被 Object.freeze 冻结的 { spring, summer, autumn, winter } 对象，
 * 每个键的值就是 PRESETS 中对应 id 的预设（同一引用，非拷贝），
 * 以保证调用方修改外层结构时不会污染 PRESETS 源数据。
 *
 * 若未来某个季节预设缺失，对应键的值将为 undefined ——
 * 上游 applyCurrentSeason 已对 undefined / 非法 sourceColors 做兜底处理。
 */
export function buildDefaultSeasonThemeMap() {
  const map = {};
  for (const season of SEASONS) {
    map[season] = PRESETS.find(p => p.id === season);
  }
  return Object.freeze(map);
}
