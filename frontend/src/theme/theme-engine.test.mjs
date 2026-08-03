import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCssSync,
  injectThemeCss,
  lightTokenNames,
} from './theme-engine.js';

const DEFAULT_SOURCE_COLORS = {
  primary: '#34834E',
  secondary: '#506446',
  tertiary: '#F5B43C',
};

function getBlocks(css) {
  return {
    light: css.match(/:root \{([\s\S]*?)\n\}/)?.[1] ?? '',
    dark: css.match(/\[data-theme="dark"\] \{([\s\S]*?)\n\}/)?.[1] ?? '',
  };
}

test('default seed produces light + dark blocks with primary tones', () => {
  const css = buildCssSync(DEFAULT_SOURCE_COLORS, 'TonalSpot');

  assert.match(css, /:root \{/);
  assert.match(css, /\[data-theme="dark"\] \{/);
  assert.match(css, /--md-color-primary: #056d37;/);
  assert.match(css, /--md-color-primary: #81d997;/);
  assert.match(css, /--md-color-surface-container-lowest: #ffffff;/);
  assert.ok((css.match(/--md-color-/g) ?? []).length >= 28);
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
