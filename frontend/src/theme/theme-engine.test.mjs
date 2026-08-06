import assert from 'node:assert/strict';
import test from 'node:test';

import {
  VARIANT_WHITELIST,
  buildCssSync,
  injectThemeCss,
  lightTokenNames,
} from './theme-engine.js';

const DEFAULT_SOURCE_COLORS = {
  primary: '#34834E',
  secondary: '#506446',
  tertiary: '#F5B43C',
};

const UPPER_SOURCE_COLORS = {
  primary: '#FF6B35',
  secondary: '#4A6B8A',
  tertiary: '#F7C548',
};

function getBlocks(css) {
  return {
    light: css.match(/:root \{([\s\S]*?)\n\}/)?.[1] ?? '',
    dark: css.match(/\[data-theme="dark"\] \{([\s\S]*?)\n\}/)?.[1] ?? '',
  };
}

function countRoleDeclarations(css) {
  return (css.match(/--md-color-/g) ?? []).length;
}

test('default seed produces light + dark blocks with primary tones', () => {
  const css = buildCssSync(DEFAULT_SOURCE_COLORS, 'TonalSpot');

  assert.match(css, /:root \{/);
  assert.match(css, /\[data-theme="dark"\] \{/);
  assert.match(css, /--md-color-primary: #056d37;/);
  assert.match(css, /--md-color-primary: #81d997;/);
  assert.match(css, /--md-color-surface-container-lowest: #ffffff;/);
  assert.ok(countRoleDeclarations(css) >= 28);
});

test('dark block emits 5 elevation overrides with tint color-mix (FND-06)', () => {
  const { light, dark } = getBlocks(buildCssSync(DEFAULT_SOURCE_COLORS));

  assert.doesNotMatch(light, /--md-elevation-/);
  assert.match(dark, /--md-elevation-0: none;/);
  for (const level of [1, 2, 3, 4, 5]) {
    assert.match(dark, new RegExp(`--md-elevation-${level}:`));
    assert.match(dark, /color-mix\(in srgb, var\(--md-color-surface-tint\)/);
  }
  assert.match(light, /--md-color-surface-tint:/);
  assert.match(dark, /--md-color-surface-tint:/);
});

test('TonalSpot responds to secondary seed changes (UAT Test 5 regression)', () => {
  const baseSecondary = matchRole(
    buildCssSync(DEFAULT_SOURCE_COLORS, 'TonalSpot'),
    'secondary',
  );
  const altSecondary = matchRole(
    buildCssSync({ ...DEFAULT_SOURCE_COLORS, secondary: '#FF0000' }, 'TonalSpot'),
    'secondary',
  );
  assert.notEqual(
    baseSecondary,
    altSecondary,
    'changing secondary seed must change --md-color-secondary in TonalSpot output',
  );
});

test('TonalSpot responds to tertiary seed changes (UAT Test 5 regression)', () => {
  const baseTertiary = matchRole(
    buildCssSync(DEFAULT_SOURCE_COLORS, 'TonalSpot'),
    'tertiary',
  );
  const altTertiary = matchRole(
    buildCssSync({ ...DEFAULT_SOURCE_COLORS, tertiary: '#0000FF' }, 'TonalSpot'),
    'tertiary',
  );
  assert.notEqual(
    baseTertiary,
    altTertiary,
    'changing tertiary seed must change --md-color-tertiary in TonalSpot output',
  );
});

test('TonalSpot primary is unaffected by secondary/tertiary seed changes', () => {
  const basePrimary = matchRole(
    buildCssSync(DEFAULT_SOURCE_COLORS, 'TonalSpot'),
    'primary',
  );
  const altSeedsPrimary = matchRole(
    buildCssSync({ primary: '#34834E', secondary: '#FF0000', tertiary: '#0000FF' }, 'TonalSpot'),
    'primary',
  );
  assert.equal(
    basePrimary,
    altSeedsPrimary,
    'primary must remain #056d37 regardless of secondary/tertiary seeds',
  );
});

test('custom source colors produce a different primary role', () => {
  const css = buildCssSync({
    primary: '#6750A4',
    secondary: '#625B71',
    tertiary: '#7D5260',
  });

  assert.match(css, /--md-color-primary:/);
  assert.doesNotMatch(css, /--md-color-primary: #056d37;/);
  assert.match(css, /--md-elevation-5:/);
});

test('invalid sourceColors throws', () => {
  assert.throws(
    () => buildCssSync({}, 'TonalSpot'),
    /Invalid sourceColors shape/,
  );
});

test('injectThemeCss is idempotent', () => {
  const source = injectThemeCss.toString();

  assert.match(source, /document\.getElementById/);
  assert.match(source, /document\.head\.appendChild/);
});

test('lightTokenNames has 28+ entries', () => {
  assert.ok(lightTokenNames.length >= 28);
});

test('VARIANT_WHITELIST enumerates the 9 named MD3 variants in Material order', () => {
  assert.deepEqual(VARIANT_WHITELIST, [
    'TonalSpot',
    'Vibrant',
    'Expressive',
    'Content',
    'Mono',
    'Neutral',
    'Fidelity',
    'Rainbow',
    'FruitSalad',
  ]);
});

test('each variant emits both :root and [data-theme="dark"] blocks with primary-container roles', () => {
  for (const variant of VARIANT_WHITELIST) {
    const css = buildCssSync(DEFAULT_SOURCE_COLORS, variant);

    assert.match(css, /:root \{/, `${variant} missing :root block`);
    assert.match(css, /\[data-theme="dark"\] \{/, `${variant} missing [data-theme="dark"] block`);
    assert.match(
      css,
      /--md-color-primary-container:/,
      `${variant} missing --md-color-primary-container`,
    );
    assert.match(
      css,
      /--md-color-on-primary-container:/,
      `${variant} missing --md-color-on-primary-container`,
    );
    assert.ok(
      countRoleDeclarations(css) >= 28,
      `${variant} emitted only ${countRoleDeclarations(css)} role declarations (<28)`,
    );
  }
});

test('alternate variants emit at least one differing primary/secondary/tertiary role from TonalSpot', () => {
  const tonalSpotCss = buildCssSync(DEFAULT_SOURCE_COLORS, 'TonalSpot');
  const tonalSpotRoles = new Set([
    matchRole(tonalSpotCss, 'primary'),
    matchRole(tonalSpotCss, 'secondary'),
    matchRole(tonalSpotCss, 'tertiary'),
    matchRole(tonalSpotCss, 'primary-container'),
    matchRole(tonalSpotCss, 'on-primary-container'),
  ]);

  for (const variant of VARIANT_WHITELIST) {
    if (variant === 'TonalSpot') continue;
    const css = buildCssSync(DEFAULT_SOURCE_COLORS, variant);
    const alternateRoles = [
      matchRole(css, 'primary'),
      matchRole(css, 'secondary'),
      matchRole(css, 'tertiary'),
      matchRole(css, 'primary-container'),
      matchRole(css, 'on-primary-container'),
    ];
    const anyDifferent = alternateRoles.some(value => value && !tonalSpotRoles.has(value));
    assert.ok(
      anyDifferent,
      `${variant} produced identical primary/secondary/tertiary values to TonalSpot`,
    );
  }
});

test('each variant receives a different user seed and re-derives correctly', () => {
  const previous = new Map();
  for (const variant of VARIANT_WHITELIST) {
    const css = buildCssSync(UPPER_SOURCE_COLORS, variant);
    const primary = matchRole(css, 'primary');
    assert.ok(primary, `${variant} produced no primary role`);
    previous.set(variant, primary);
  }
  // 不同 variant 至少有一个不同的 primary 值（之前每变体独立 dispatch 的证据）
  const unique = new Set(previous.values());
  assert.ok(
    unique.size >= 4,
    `expected at least 4 distinct primary hex values across 9 variants, got ${unique.size}`,
  );
});

test('hex seeds are accepted as uppercase or lowercase', () => {
  const lower = buildCssSync({
    primary: '#34834e',
    secondary: '#506446',
    tertiary: '#f5b43c',
  });
  const upper = buildCssSync({
    primary: '#34834E',
    secondary: '#506446',
    tertiary: '#F5B43C',
  });
  assert.equal(lower, upper);
});

test('non-whitelisted variant is rejected with a deterministic error', () => {
  assert.throws(
    () => buildCssSync(DEFAULT_SOURCE_COLORS, 'Spectral'),
    /Unsupported variant: Spectral/,
  );
  assert.throws(
    () => buildCssSync(DEFAULT_SOURCE_COLORS, ''),
    /Unsupported variant/,
  );
  // variant 名称大小写敏感：'tonalspot' 不是合法 'TonalSpot'
  assert.throws(
    () => buildCssSync(DEFAULT_SOURCE_COLORS, 'tonalspot'),
    /Unsupported variant: tonalspot/,
  );
  // whitespace 污染也被拒绝
  assert.throws(
    () => buildCssSync(DEFAULT_SOURCE_COLORS, ' Vibrant '),
    /Unsupported variant:  Vibrant /,
  );
});

test('source-color validation runs before variant validation so malformed seeds still surface their own error', () => {
  assert.throws(
    () => buildCssSync({ primary: 'red' }, 'TonalSpot'),
    /Invalid sourceColors shape/,
  );
  assert.throws(
    () => buildCssSync({ primary: 'red' }, 'Vibrant'),
    /Invalid sourceColors shape/,
  );
});

function matchRole(css, role) {
  const re = new RegExp(`--md-color-${role}: (#[0-9a-fA-F]{6});`);
  return css.match(re)?.[1];
}
