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

// ── D-SNACK-01 对象式调用（action / 自定义时长 / 计时隔离 / 回调失败） ──

test('对象式 { duration } 覆盖默认自动消失时长', async ({ page }) => {
  await page.getByRole('button', { name: '显示自定义时长' }).click();
  const snackbar = page.locator('.md-snackbar--info');

  // 自定义 2000ms：1.4s 时仍在
  await page.waitForTimeout(1400);
  await expect(snackbar).toBeVisible();
  // 越过 2000ms 后消失
  await page.waitForTimeout(900);
  await expect(snackbar).toHaveCount(0);
});

test('action 按钮渲染在 message 与 close 之间并触发回调一次后 dismiss', async ({ page }) => {
  await page.getByRole('button', { name: '显示带操作' }).click();
  const snackbar = page.locator('.md-snackbar--info');

  const action = snackbar.locator('.md-snackbar__action');
  await expect(action).toBeVisible();
  await expect(action).toHaveText('撤销');

  // 顺序断言：action 必须位于 message 之后、close 之前（DOM 顺序）
  const children = snackbar.locator(':scope > *');
  const tags = await children.evaluateAll((els) =>
    els.map((el) => (el.classList.contains('md-snackbar__action') ? 'action'
      : el.classList.contains('md-snackbar__close') ? 'close'
        : el.classList.contains('md-snackbar__message') ? 'message' : 'other')),
  );
  expect(tags.indexOf('message')).toBeLessThan(tags.indexOf('action'));
  expect(tags.indexOf('action')).toBeLessThan(tags.indexOf('close'));

  await action.click();

  // 回调恰好触发一次
  const calls = await page.evaluate(() => window.__actionCalls || 0);
  expect(calls).toBe(1);
  // 仅该 snackbar 被 dismiss
  await expect(page.locator('.md-snackbar')).toHaveCount(0);
});

test('action dismiss 只移除该条，兄弟 snackbar 计时不受影响', async ({ page }) => {
  await page.getByRole('button', { name: '显示兄弟计时' }).click();

  const all = page.locator('.md-snackbar');
  await expect(all).toHaveCount(2);

  // 点击 action 移除"兄弟计时二"
  await all.locator('.md-snackbar__action').click();
  await expect(all).toHaveCount(1);
  // 剩下的应为 success tone（兄弟计时一）
  await expect(page.locator('.md-snackbar--success')).toBeVisible();

  // success 默认 4s：若其计时被重置则 4.6s 后仍可见；此处证明它按原计时自动消失
  await page.waitForTimeout(4600);
  await expect(page.locator('.md-snackbar')).toHaveCount(0);
});

test('action 回调抛错不会变成未处理的浏览器 rejection', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.getByRole('button', { name: '显示失败操作' }).click();
  const action = page.locator('.md-snackbar__action');
  await expect(action).toBeVisible();

  await action.click();

  // 给微任务一个落定窗口
  await page.waitForTimeout(200);
  expect(errors).toEqual([]);
  // 抛错的 action 仍 dismiss 该 snackbar（回调已被调用一次）
  await expect(page.locator('.md-snackbar')).toHaveCount(0);
});
