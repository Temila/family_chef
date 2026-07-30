/**
 * Phase 12 Bugfix 回归测试（D-BUG-01 / D-BUG-02）
 *
 * 用真实鼠标点击 / 键盘 Tab+Enter 验证 Button / IconButton / FAB 的 onClick 命中
 * （D-BUG-01 Ripple self-mode 修复），并验证 PcLayout 只渲染一个 <header>、
 * Sidebar footer 仅显示版本号无按钮、Header 主行主题切换可用、导航项保持 80dp
 * （D-BUG-02 / Phase 15 NAV-03 迁移：footer 按钮移除，主题切换迁至 Header）。
 *
 * 不使用 HTMLElement.click() —— 回归点是浏览器命中测试（hit-testing）。
 */

import { expect, test } from '@playwright/test';

const FIXTURE = '/tests/fixtures/phase12-bugfix.html';

test.beforeEach(async ({ page }) => {
  await page.goto(FIXTURE);
  await expect(page.getByTestId('primitives')).toBeVisible();
});

// ── D-BUG-01：原生鼠标点击命中 primitive 的 onClick ──

test('Button 鼠标点击触发 onClick 一次', async ({ page }) => {
  const counter = page.getByLabel('按钮点击次数', { exact: true });
  await expect(counter).toHaveText('0');

  await page.getByRole('button', { name: '按钮', exact: true }).click();
  await expect(counter).toHaveText('1');

  await page.getByRole('button', { name: '按钮', exact: true }).click();
  await expect(counter).toHaveText('2');
});

test('IconButton 鼠标点击触发 onClick 一次', async ({ page }) => {
  const counter = page.getByLabel('图标按钮点击次数');
  await expect(counter).toHaveText('0');

  await page.getByRole('button', { name: '图标按钮' }).click();
  await expect(counter).toHaveText('1');
});

test('FAB 鼠标点击触发 onClick 一次', async ({ page }) => {
  const counter = page.getByLabel('浮动按钮点击次数');
  await expect(counter).toHaveText('0');

  await page.getByRole('button', { name: '浮动按钮' }).click();
  await expect(counter).toHaveText('1');
});

// ── D-BUG-01：键盘 Tab + Enter 同样命中 ──

test('Button 键盘 Tab+Enter 触发 onClick 一次', async ({ page }) => {
  const counter = page.getByLabel('按钮点击次数', { exact: true });
  await page.getByRole('button', { name: '按钮', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(counter).toHaveText('1');
});

// ── D-BUG-01：pointerdown 在原生 button 下创建 .ripple-span ──

test('pointerdown 在 Button 原生 button 下创建 .ripple-span', async ({ page }) => {
  const button = page.getByRole('button', { name: '按钮', exact: true });
  const box = await button.boundingBox();
  // 直接对按钮中心按下（不抬起），触发 Ripple self-mode 的 onPointerDown
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(button.locator('.ripple-span')).toHaveCount(1);
  await page.mouse.up();
});

// ── D-BUG-01：默认 wrap 模式的外部子元素仍然可点击 ──

test('默认 wrap 模式 Ripple 的子按钮可被鼠标点击', async ({ page }) => {
  const counter = page.getByLabel('wrap 点击次数');
  await expect(counter).toHaveText('0');

  await page.getByRole('button', { name: 'wrap 子按钮' }).click();
  await expect(counter).toHaveText('1');
});

// ── D-BUG-02：PcLayout 只渲染一个 <header> ──

test('已认证布局仅渲染一个 header 元素', async ({ page }) => {
  await page.getByTestId('shell').waitFor();
  const headerCount = await page.evaluate(() => document.querySelectorAll('header').length);
  expect(headerCount).toBe(1);
});

// ── NAV-03：Sidebar footer 仅显示版本号（footer 按钮已移除） ──

test('Sidebar footer 仅显示版本号，无按钮', async ({ page }) => {
  await page.locator('.md-sidebar__footer').waitFor();
  // footer 现为版本号文本节点（D-NAV03-01），不再包含任何交互按钮
  await expect(page.locator('.md-sidebar__version')).toBeVisible();
  await expect(page.locator('.md-sidebar__footer button')).toHaveCount(0);
});

// ── NAV-03 / D-NAV03-03：主题切换迁至 Header 主行（替代原 Sidebar footer 测试） ──

test('Header 主题按钮切换 data-theme（替代原 Sidebar footer 测试）', async ({ page }) => {
  await page.locator('.md-header').waitFor();
  const themeButton = page.locator('.md-header__theme-toggle');

  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await themeButton.click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(after).not.toBe(before);
});

// ── NAV-03：footer 已无按钮；仅保留 导航项 80dp 不变量 ──
// （原 D-BUG-02 footer 48dp 校验已在 Phase 15 NAV-03 失效：footer 按钮已移除）

test('导航项保持 80dp（footer 按钮已在 NAV-03 移除）', async ({ page }) => {
  await page.locator('.md-sidebar__nav').waitFor();

  const navHeights = await page.evaluate(() => {
    const navItems = Array.from(
      document.querySelectorAll('.md-sidebar__nav .md-sidebar__item'),
    );
    return navItems.map((el) => el.getBoundingClientRect().height);
  });

  // 导航项保持 80dp
  expect(navHeights.length).toBeGreaterThan(0);
  for (const height of navHeights) {
    expect(height).toBe(80);
  }
});
