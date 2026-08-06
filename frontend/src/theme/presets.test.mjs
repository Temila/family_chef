/**
 * presets.js 单元测试 — Quick 260807-121
 *
 * 覆盖 buildDefaultSeasonThemeMap 纯函数：默认季节→主题映射与
 * 开启季节自动切换的历史行为等价（春→春预设 … 冬→冬预设）。
 *
 * 设计目标：
 * - 验证返回对象含四季键（spring/summer/autumn/winter）；
 * - 每个键映射到 PRESETS 中 id 相同的预设（引用相等，非拷贝）；
 * - 映射值含完整预设字段（id/name/kind/sourceColors{primary,secondary,tertiary}/variant）；
 * - 返回对象被 Object.freeze 冻结，调用方修改不影响 PRESETS。
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { PRESETS, buildDefaultSeasonThemeMap } from './presets.js';

test('buildDefaultSeasonThemeMap 返回四季键', () => {
  const result = buildDefaultSeasonThemeMap();
  assert.deepEqual(
    Object.keys(result).sort(),
    ['autumn', 'spring', 'summer', 'winter'],
  );
});

test('buildDefaultSeasonThemeMap 每季映射到匹配的预设（引用相等）', () => {
  const result = buildDefaultSeasonThemeMap();
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const matched = PRESETS.find(p => p.id === season);
    assert.ok(matched, `PRESETS 缺少 ${season} 预设`);
    // 引用相等：返回值就是 PRESETS 中的同一对象，而非拷贝
    assert.equal(result[season], matched, `${season} 映射值与 PRESETS 中对应项引用不一致`);
  }
});

test('buildDefaultSeasonThemeMap 映射值含完整预设字段', () => {
  const result = buildDefaultSeasonThemeMap();
  const sample = result.spring;
  assert.equal(sample.id, 'spring');
  assert.equal(sample.name, '春');
  assert.equal(sample.kind, 'preset');
  assert.ok(sample.sourceColors, '缺少 sourceColors');
  assert.ok(sample.sourceColors.primary, '缺少 sourceColors.primary');
  assert.ok(sample.sourceColors.secondary, '缺少 sourceColors.secondary');
  assert.ok(sample.sourceColors.tertiary, '缺少 sourceColors.tertiary');
  assert.ok(sample.variant, '缺少 variant');
});

test('buildDefaultSeasonThemeMap 结果被冻结', () => {
  const result = buildDefaultSeasonThemeMap();
  assert.ok(Object.isFrozen(result), '返回对象应被 Object.freeze 冻结');
});
