/**
 * 家味 · Family Chef — 前端内置主题预设
 * 预设是只读的种子色常量，编辑时由后续流程 fork 为自定义主题。
 */

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
