import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/list-item.html');
  await expect(page.getByTestId('list')).toBeVisible({ timeout: 5000 });
});

test('ListItem 支持 1/2/3-line 高度、compound slots 与全宽布局', async ({ page }) => {
  const items = page.locator('.md-list-item');
  await expect(items).toHaveCount(3);

  const metrics = await items.evaluateAll((elements) => elements.map((element) => {
    const styles = getComputedStyle(element);
    return {
      minHeight: styles.minHeight,
      width: element.getBoundingClientRect().width,
    };
  }));

  expect(metrics.map(({ minHeight }) => minHeight)).toEqual(['48px', '64px', '88px']);
  expect(metrics.every(({ width }) => width === 320)).toBe(true);
  await expect(page.locator('.md-list-item__leading')).toHaveCount(1);
  await expect(page.locator('.md-list-item__content')).toHaveCount(3);
  await expect(page.locator('.md-list-item__headline')).toHaveCount(3);
  await expect(page.locator('.md-list-item__supporting')).toHaveCount(2);
  await expect(page.locator('.md-list-item__trailing')).toHaveCount(1);
});

test('clickable item 支持键盘激活，Trailing 点击自动停止冒泡', async ({ page }) => {
  const clickable = page.locator('.md-list-item--clickable');
  await expect(clickable).toHaveAttribute('role', 'button');
  await expect(clickable).toHaveAttribute('tabindex', '0');

  await clickable.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('行点击次数')).toHaveText('1');

  await page.getByRole('button', { name: '尾部操作', exact: true }).click();
  await expect(page.getByLabel('尾部点击次数')).toHaveText('1');
  await expect(page.getByLabel('行点击次数')).toHaveText('1');
});

test('disabled item 不可交互并使用禁用状态', async ({ page }) => {
  const disabled = page.locator('.md-list-item--disabled');
  await expect(disabled).toHaveAttribute('aria-disabled', 'true');
  await expect(disabled).not.toHaveAttribute('role', 'button');

  const styles = await disabled.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { opacity: computed.opacity, pointerEvents: computed.pointerEvents };
  });
  expect(styles).toEqual({ opacity: '0.38', pointerEvents: 'none' });
});

test('Divider 渲染 full-width 与 56px inset 变体', async ({ page }) => {
  const dividerStyles = await page.getByTestId('divider').evaluate((element) => {
    const computed = getComputedStyle(element);
    return { borderTopWidth: computed.borderTopWidth, marginLeft: computed.marginLeft };
  });
  const insetStyles = await page.getByTestId('divider-inset').evaluate((element) => {
    const computed = getComputedStyle(element);
    return { borderTopWidth: computed.borderTopWidth, marginLeft: computed.marginLeft };
  });

  expect(dividerStyles).toEqual({ borderTopWidth: '1px', marginLeft: '0px' });
  expect(insetStyles).toEqual({ borderTopWidth: '1px', marginLeft: '56px' });
});
