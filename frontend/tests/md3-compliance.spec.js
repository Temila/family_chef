/**
 * Phase 12 MD3 合规自动化规格（D-UAT-02）。
 *
 * 通过真实 Playwright 指针输入锁定 Ripple、单 Header、4dp 网格与 48dp 触控目标，
 * 并验证独立审计脚本的 npm/JSON 契约。
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

/* global process */

const FIXTURE = '/tests/fixtures/phase12-bugfix.html';
const FRONTEND_ROOT = process.cwd();

async function openFixture(page) {
  await page.goto(FIXTURE);
  await expect(page.getByTestId('primitives')).toBeVisible();
}

test('真实鼠标输入命中 Button/IconButton/FAB 并创建 Ripple', async ({ page }) => {
  await openFixture(page);

  const buttonCases = [
    { name: '按钮', output: '按钮点击次数' },
    { name: '图标按钮', output: '图标按钮点击次数' },
    { name: '浮动按钮', output: '浮动按钮点击次数' },
  ];

  for (const item of buttonCases) {
    const button = page.getByRole('button', { name: item.name, exact: true });
    const output = page.getByLabel(item.output, { exact: true });
    await expect(output).toHaveText('0');
    await button.click();
    await expect(output).toHaveText('1');
  }

  const button = page.getByRole('button', { name: '按钮', exact: true });
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(button.locator('.ripple-span')).toHaveCount(1);
  await page.mouse.up();
});

test('认证 shell 恰好渲染一个 Header', async ({ page }) => {
  await openFixture(page);
  await expect(page.locator('header')).toHaveCount(1);
});

test('至少十个可见代表元素的 padding/margin/gap 均落在 4dp 网格', async ({ page }) => {
  await openFixture(page);

  const result = await page.evaluate(() => {
    const properties = [
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'rowGap', 'columnGap',
    ];
    const candidates = Array.from(document.querySelectorAll([
      '.md-button', '.md-icon-button', '.md-fab', '.md-sidebar',
      '.md-sidebar__item', '.md-sidebar__footer', '.md-header',
      '.md-header__left', '.md-header__right', '.pc-main',
    ].join(','))).filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0
        && rect.height > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden';
    });

    const samples = candidates.slice(0, 20).map((element) => {
      const style = getComputedStyle(element);
      const failures = [];
      for (const property of properties) {
        const value = style[property];
        if (!/^-?\d+(?:\.\d+)?px$/.test(value)) continue;
        const px = Number.parseFloat(value);
        if (px !== 0 && Math.abs(px % 4) > 0.01) {
          failures.push({ property, value });
        }
      }
      return {
        tag: element.tagName,
        className: typeof element.className === 'string' ? element.className : '',
        failures,
      };
    });

    return {
      sampleCount: samples.length,
      failures: samples.filter((sample) => sample.failures.length > 0),
    };
  });

  expect(result.sampleCount).toBeGreaterThanOrEqual(10);
  expect(result.failures).toEqual([]);
});

// NAV-03: Sidebar footer is now a version text node (non-interactive),
// exempt from 48dp touch target — removed from the interactive-target audit.
test('代表交互目标维持至少 48dp 命中区', async ({ page }) => {
  await openFixture(page);

  const targets = await page.evaluate(() => Array.from(document.querySelectorAll([
    '.md-button', '.md-icon-button', '.md-fab',
  ].join(','))).filter((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none';
  }).map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      className: element.className,
      width: rect.width,
      height: rect.height,
    };
  }));

  // NAV-03: footer 按钮已移除，代表交互目标从原 5（含 footer 2 个）下调为 3
  expect(targets.length).toBeGreaterThanOrEqual(3);
  for (const target of targets) {
    expect(target.width).toBeGreaterThanOrEqual(48);
    expect(target.height).toBeGreaterThanOrEqual(48);
  }
});

// ── NAV-03：Sidebar footer 为版本号文本节点（非交互），校验版本号格式 ──

test('Sidebar footer 版本号文本符合 vX.Y.Z 格式', async ({ page }) => {
  await openFixture(page);
  await page.locator('.md-sidebar__footer').waitFor();
  // NAV-03: Sidebar footer is now a version text node (non-interactive),
  // exempt from 48dp touch target
  const versionText = await page.locator('.md-sidebar__version').textContent();
  expect(versionText).toMatch(/^v\d+\.\d+\.\d+$/);
});

test('audit:md3 入口声明四族结果并写入固定 JSON 报告', async () => {
  const packageJson = JSON.parse(
    await readFile(resolve(FRONTEND_ROOT, 'package.json'), 'utf8'),
  );
  expect(packageJson.scripts['audit:md3']).toBe('node scripts/audit-md3-compliance.mjs');

  const source = await readFile(
    resolve(FRONTEND_ROOT, 'scripts/audit-md3-compliance.mjs'),
    'utf8',
  );
  expect(source).toContain('md3-compliance-results.json');
  expect(source).toContain('FC_TEST_TOKEN');
  expect(source).toContain('FC_GUEST_TOKEN');
  for (const family of ['ripple', 'header', 'grid', 'touch']) {
    expect(source).toContain(family);
  }
});
