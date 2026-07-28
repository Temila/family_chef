/**
 * Phase 12 Bugfix 回归测试（D-BUG-01 / D-BUG-02）
 *
 * 用真实鼠标点击 / 键盘 Tab+Enter 验证 Button / IconButton / FAB 的 onClick 命中
 * （D-BUG-01 Ripple self-mode 修复），并验证 PcLayout 只渲染一个 <header>、
 * Sidebar footer 主题/退出可用且 footer 操作项为 48dp 居中于 56px 行（D-BUG-02）。
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

// ── D-BUG-02：Sidebar footer 主题切换 ──

test('Sidebar footer 主题按钮切换 data-theme', async ({ page }) => {
  await page.locator('.md-sidebar__footer').waitFor();
  const themeButton = page.locator('.md-sidebar__footer button').first();

  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await themeButton.click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(after).not.toBe(before);
});

// ── D-BUG-02：Sidebar footer 退出仍可调用（真实 AuthProvider 清空 user） ──

test('Sidebar footer 退出按钮清空认证态并卸载 Sidebar', async ({ page }) => {
  await page.locator('.md-sidebar__footer').waitFor();
  await expect(page.locator('.md-sidebar')).toHaveCount(1);

  // footer 第二个按钮为退出（主题在前、退出在后）
  await page.locator('.md-sidebar__footer button').nth(1).click();
  // 真实 logout() 清空 user → Sidebar 返回 null 卸载
  await expect(page.locator('.md-sidebar')).toHaveCount(0);
});

// ── D-BUG-02：footer 操作项 48dp 居中于 56px 行，不重叠；导航项保持 80dp ──

test('footer 操作项为 48dp 非 80dp，导航项保持 80dp，互不重叠', async ({ page }) => {
  await page.locator('.md-sidebar__footer').waitFor();

  const layout = await page.evaluate(() => {
    const footerItems = Array.from(document.querySelectorAll('.md-sidebar__footer .md-sidebar__item'));
    const navItems = Array.from(document.querySelectorAll('.md-sidebar__nav .md-sidebar__item'));
    const measure = (el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        height: r.height,
        minBlockSize: cs.minBlockSize || cs.minHeight,
        top: r.top,
        bottom: r.bottom,
      };
    };
    return {
      footer: footerItems.map(measure),
      nav: navItems.map(measure),
    };
  });

  // footer 操作项：≥48px 且 < 80px
  expect(layout.footer.length).toBe(2);
  for (const item of layout.footer) {
    expect(item.height).toBeGreaterThanOrEqual(48);
    expect(item.height).toBeLessThan(80);
    expect(parseInt(String(item.minBlockSize), 10)).toBeGreaterThanOrEqual(48);
  }
  // 两项不重叠：第一项 bottom <= 第二项 top
  expect(layout.footer[0].bottom).toBeLessThanOrEqual(layout.footer[1].top);

  // 导航项保持 80dp
  expect(layout.nav.length).toBeGreaterThan(0);
  for (const item of layout.nav) {
    expect(item.height).toBe(80);
  }
});
