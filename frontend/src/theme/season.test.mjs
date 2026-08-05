/**
 * season.js 单元测试 — Phase 18 SEAS-01/02/03
 *
 * 设计目标：
 * - 边界测试用 UTC 锁定（process.env.TZ = 'UTC'），确保 local-date 解析可重复；
 *   半球倒置、unsupported year 等与 host-tz 无关的契约在中性时间也能稳定通过。
 * - 引用日期一律通过 new Date(year, monthIdx, day) 构造（本地日历字段），
 *   避免 UTC ISO 字符串造成的隐式 0 点偏移。
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HEMISPHERE_NORTH,
  HEMISPHERE_SOUTH,
  SEASONS,
  getSeasonForDate,
  getSeasonPresetId,
  normalizeHemisphere,
} from './season.js';
import { SOLAR_TERMS } from './solar-terms.js';

// 锁定 host 时区为 UTC，使 new Date(iso).getFullYear/Month/Date 与 SOLAR_TERMS 数据一致。
// 必须在 import season.js 之前生效（Node 在首次构造 Date 时读取 TZ）。
process.env.TZ = 'UTC';

/** 用日历字段构造本地日期（month 是 0-indexed） */
function localDate(year, monthIdx, day) {
  return new Date(year, monthIdx, day);
}

test('SOLAR_TERMS 覆盖 80 年（2020-2099）且每年 4 个节气', () => {
  const years = Object.keys(SOLAR_TERMS).map(Number).sort((a, b) => a - b);
  assert.equal(years.length, 80, `expected 80 years, got ${years.length}`);
  assert.equal(years[0], 2020);
  assert.equal(years[years.length - 1], 2099);
  for (const year of years) {
    const terms = SOLAR_TERMS[year];
    assert.deepEqual(
      Object.keys(terms).sort(),
      ['lichun', 'lidong', 'liqiu', 'lixia'],
      `year ${year} missing term keys`,
    );
    for (const term of ['lichun', 'lixia', 'liqiu', 'lidong']) {
      assert.match(
        terms[term],
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
        `year ${year} ${term} malformed ISO`,
      );
    }
  }
});

test('SEASONS 出口值就是 PRESETS 中季节预设的 id', () => {
  assert.deepEqual(SEASONS, ['spring', 'summer', 'autumn', 'winter']);
});

test('normalizeHemisphere 接受 north/south，其它一律回退到 north', () => {
  assert.equal(normalizeHemisphere(HEMISPHERE_NORTH), 'north');
  assert.equal(normalizeHemisphere(HEMISPHERE_SOUTH), 'south');
  assert.equal(normalizeHemisphere(undefined), 'north');
  assert.equal(normalizeHemisphere(null), 'north');
  assert.equal(normalizeHemisphere(''), 'north');
  assert.equal(normalizeHemisphere('SOUTH'), 'north', '大小写敏感');
  assert.equal(normalizeHemisphere('equator'), 'north');
});

test('春/夏/秋/冬 季中日期在两半球下分别映射正确', () => {
  // 三月中旬：北半球春，南半球秋
  assert.equal(getSeasonForDate(localDate(2020, 2, 15), 'north'), 'spring');
  assert.equal(getSeasonForDate(localDate(2020, 2, 15), 'south'), 'autumn');

  // 六月：北半球夏，南半球冬
  assert.equal(getSeasonForDate(localDate(2020, 5, 15), 'north'), 'summer');
  assert.equal(getSeasonForDate(localDate(2020, 5, 15), 'south'), 'winter');

  // 十月：北半球秋，南半球春
  assert.equal(getSeasonForDate(localDate(2020, 9, 15), 'north'), 'autumn');
  assert.equal(getSeasonForDate(localDate(2020, 9, 15), 'south'), 'spring');

  // 十二月：北半球冬，南半球夏
  assert.equal(getSeasonForDate(localDate(2020, 11, 15), 'north'), 'winter');
  assert.equal(getSeasonForDate(localDate(2020, 11, 15), 'south'), 'summer');
});

test('立春前一日（Jan 15）仍属冬；立春当日及之后属春', () => {
  // 立春前
  assert.equal(getSeasonForDate(localDate(2020, 0, 15), 'north'), 'winter');
  assert.equal(getSeasonForDate(localDate(2020, 0, 15), 'south'), 'summer');

  // 立春当日：2020 立春 = 2020-02-04T09:03:19Z（UTC），在 UTC 解释下 local 仍是 Feb 4
  assert.equal(getSeasonForDate(localDate(2020, 1, 4), 'north'), 'spring');
  assert.equal(getSeasonForDate(localDate(2020, 1, 4), 'south'), 'autumn');

  // 立春后一天
  assert.equal(getSeasonForDate(localDate(2020, 1, 5), 'north'), 'spring');
});

test('夏/秋/冬 三个边界日在两半球下映射正确', () => {
  // 立夏当日：2020-05-05 (UTC) -> local May 5
  assert.equal(getSeasonForDate(localDate(2020, 4, 5), 'north'), 'summer');
  assert.equal(getSeasonForDate(localDate(2020, 4, 5), 'south'), 'winter');
  assert.equal(getSeasonForDate(localDate(2020, 4, 4), 'north'), 'spring');
  assert.equal(getSeasonForDate(localDate(2020, 4, 4), 'south'), 'autumn');

  // 立秋当日：2020-08-07 (UTC) -> local Aug 7
  assert.equal(getSeasonForDate(localDate(2020, 7, 7), 'north'), 'autumn');
  assert.equal(getSeasonForDate(localDate(2020, 7, 7), 'south'), 'spring');
  assert.equal(getSeasonForDate(localDate(2020, 7, 6), 'north'), 'summer');
  assert.equal(getSeasonForDate(localDate(2020, 7, 6), 'south'), 'winter');

  // 立冬当日：2020-11-06 (UTC) -> local Nov 6
  assert.equal(getSeasonForDate(localDate(2020, 10, 6), 'north'), 'winter');
  assert.equal(getSeasonForDate(localDate(2020, 10, 6), 'south'), 'summer');
  assert.equal(getSeasonForDate(localDate(2020, 10, 5), 'north'), 'autumn');
  assert.equal(getSeasonForDate(localDate(2020, 10, 5), 'south'), 'spring');
});

test('unsupported year（2019 / 2100）返回 null，绝不返回 default / 自定义 id', () => {
  // 表外年份：2019 在覆盖之前，2100 在覆盖之后
  assert.equal(getSeasonForDate(localDate(2019, 5, 15), 'north'), null);
  assert.equal(getSeasonForDate(localDate(2019, 5, 15), 'south'), null);
  assert.equal(getSeasonForDate(localDate(2100, 5, 15), 'north'), null);
  assert.equal(getSeasonForDate(localDate(2100, 5, 15), 'south'), null);
  // null 半球入参：仍然走 north 默认分支返回 null
  assert.equal(getSeasonForDate(localDate(2019, 5, 15), undefined), null);
});

test('getSeasonPresetId 仅接受 4 个季节名，其它返回 null', () => {
  assert.equal(getSeasonPresetId('spring'), 'spring');
  assert.equal(getSeasonPresetId('summer'), 'summer');
  assert.equal(getSeasonPresetId('autumn'), 'autumn');
  assert.equal(getSeasonPresetId('winter'), 'winter');

  // 默认主题与自定义 id 都不能通过
  assert.equal(getSeasonPresetId('default'), null);
  assert.equal(getSeasonPresetId('Spring'), null, '大小写敏感');
  assert.equal(getSeasonPresetId(' SPRING '), null, 'whitespace 不裁剪');
  assert.equal(getSeasonPresetId(123), null);
  assert.equal(getSeasonPresetId(null), null);
  assert.equal(getSeasonPresetId(undefined), null);
  assert.equal(getSeasonPresetId(''), null);
});

test('南半球倒置是精确对称（春↔秋、夏↔冬）', () => {
  // 在一年内任取一天，北/南结果必然互为四季映射对
  const samples = [
    localDate(2024, 0, 30),  // 接近立春
    localDate(2024, 2, 30),  // 春末
    localDate(2024, 4, 30),  // 接近立夏
    localDate(2024, 7, 30),  // 接近立秋
    localDate(2024, 10, 30), // 接近立冬
  ];
  for (const d of samples) {
    const n = getSeasonForDate(d, 'north');
    const s = getSeasonForDate(d, 'south');
    const expected = { spring: 'autumn', summer: 'winter', autumn: 'spring', winter: 'summer' }[n];
    assert.equal(s, expected, `date ${d.toISOString()} hemisphere inversion broken`);
  }
});

test('默认 hemisphere 入参 = north', () => {
  const d = localDate(2024, 5, 1);  // June
  assert.equal(getSeasonForDate(d), 'summer');
  assert.equal(getSeasonForDate(d, undefined), 'summer');
});