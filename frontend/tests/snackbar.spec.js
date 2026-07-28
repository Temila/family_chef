import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/snackbar.html');
});

test('showToast 保留 API 并渲染 Rich tone Snackbar', async ({ page }) => {
  await page.getByRole('button', { name: '显示成功' }).click();

  const snackbar = page.locator('.md-snackbar--success');
  await expect(snackbar).toBeVisible();
  await expect(snackbar.locator('.md-snackbar__bar--success')).toBeVisible();
  await expect(snackbar.locator('.md-snackbar__icon')).toBeVisible();
  await expect(snackbar.locator('.md-snackbar__message')).toHaveText('成功消息');
  await expect(snackbar.getByRole('button', { name: '关闭通知' })).toBeVisible();
});

test('队列只保留最新三条且最新消息位于顶部', async ({ page }) => {
  await page.getByRole('button', { name: '连续显示五条' }).click();

  const snackbars = page.locator('.md-snackbar');
  await expect(snackbars).toHaveCount(3);
  await expect(snackbars.locator('.md-snackbar__message')).toHaveText([
    '消息 5',
    '消息 4',
    '消息 3',
  ]);
});

test('关闭按钮立即 dismiss 对应消息', async ({ page }) => {
  await page.getByRole('button', { name: '显示信息' }).click();
  await expect(page.locator('.md-snackbar')).toHaveCount(1);

  await page.getByRole('button', { name: '关闭通知' }).click();
  await expect(page.locator('.md-snackbar')).toHaveCount(0);
});

test('success 在 4 秒后自动消失，hover 会暂停并恢复剩余计时', async ({ page }) => {
  await page.getByRole('button', { name: '显示成功' }).click();
  const snackbar = page.locator('.md-snackbar--success');
  await expect(snackbar).toBeVisible();

  await page.waitForTimeout(1800);
  await snackbar.hover();
  await page.waitForTimeout(3000);
  await expect(snackbar).toBeVisible();

  await page.mouse.move(0, 0);
  await page.waitForTimeout(2500);
  await expect(snackbar).toHaveCount(0);
});

test('warn 使用 6 秒自动消失时长', async ({ page }) => {
  await page.getByRole('button', { name: '显示警告' }).click();
  const snackbar = page.locator('.md-snackbar--warn');

  await page.waitForTimeout(4300);
  await expect(snackbar).toBeVisible();
  await page.waitForTimeout(2200);
  await expect(snackbar).toHaveCount(0);
});
