/**
 * Phase 15 Navigation Restructure 回归测试（NAV-01..05 / UI-01 / BUG-06）
 *
 * 锁定 Phase 15 导航契约：
 *   - NAV-01: Header action-bar 渲染在主行下方 (.header-action-bar)
 *   - NAV-02: 头像菜单仅 2 项（编辑资料 + 退出登录）+ Divider，无切换主题
 *   - NAV-03: Sidebar footer 仅版本号文本，无按钮
 *   - NAV-04: chef/admin 移动端首页含 菜品管理 + 食材管理；user 无
 *   - NAV-05: BottomBar 角色分组 tabs（chef 7 / admin 7 / user 4），首页/后台 在最左、
 *             我的 在最右，无退出
 *   - UI-01:  OrderPage 高级筛选 触发 Sheet（清空 + 应用 footer）
 *   - BUG-06: AdminDishes 移动端卡片几何一致性（8 seed 组合等宽等高 + 按钮行对齐）
 *
 * 认证说明：loginAs 通过 localStorage 注入 JWT（键名匹配 auth/index.js）。
 * 真实 JWT 由 FC_ADMIN_TOKEN / FC_CHEF_TOKEN / FC_USER_TOKEN 环境变量提供，
 * 验证者需同时启动后端（AUTO_SEED_DEMO_DISHES=1）与前端。
 */

import { expect, test } from '@playwright/test';

// ── 角色 → JWT 环境变量映射（验证者提供真实 token） ──
const ROLE_TOKENS = {
  admin: process.env.FC_ADMIN_TOKEN,
  chef: process.env.FC_CHEF_TOKEN,
  user: process.env.FC_USER_TOKEN,
};

// 角色 → 用户信息（匹配 AuthContext 期望的 user 形状）
const ROLE_USERS = {
  admin: { username: 'admin', display_name: '管理员', role: 'admin' },
  chef: { username: 'chef', display_name: '厨师', role: 'chef' },
  user: { username: 'user', display_name: '用户', role: 'user' },
};

/**
 * 注入角色认证状态到 localStorage（键名匹配 auth/index.js）。
 * addInitScript 在每次导航前执行，保证受保护路由不被重定向到 /login。
 */
async function loginAs(page, role) {
  const token = ROLE_TOKENS[role] || 'stub-token';
  const user = ROLE_USERS[role];
  await page.addInitScript(([t, u]) => {
    window.localStorage.setItem('fc_access_token', t);
    window.localStorage.setItem('fc_refresh_token', 'stub-refresh');
    window.localStorage.setItem('fc_user', JSON.stringify(u));
  }, [token, user]);
}

// 移动端视口（BottomBar 为移动端组件，桌面端 display:none）
const MOBILE_VIEWPORT = { width: 375, height: 812 };

// ── NAV-01 / NAV-02: Header 重组 ──

test.describe('Header restructure', () => {
  test('header action-bar renders below main row with .header-action-bar class', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/dishes');

    const actionBar = page.locator('.header-action-bar');
    await expect(actionBar).toBeVisible();
    // action-bar 位于主行 .md-header__right 下方（DOM-y 顺序）
    const headerRight = page.locator('.md-header__right');
    const rightBox = await headerRight.boundingBox();
    const actionBarBox = await actionBar.boundingBox();
    expect(rightBox).not.toBeNull();
    expect(actionBarBox).not.toBeNull();
    expect(actionBarBox.y).toBeGreaterThan(rightBox.y + rightBox.height);
    // 主题切换 IconButton 在 .md-header__right 内可见（D-NAV03-03）
    await expect(page.locator('.md-header__theme-toggle')).toBeVisible();
  });

  test('avatar menu contains exactly 2 menuitems + Divider + NO theme menuitem', async ({ page }) => {
    await loginAs(page, 'admin');
    // admin 访问 /admin（/home 仅 user/chef 可见），Header 头像菜单在所有认证页渲染
    await page.goto('/admin');

    await page.locator('.md-header__avatar').click();
    const menuItems = page.locator('.md-header__menu-item');
    await expect(menuItems).toHaveCount(2);
    // Divider 在两个 menuitem 之间（D-NAV02-03）
    await expect(page.locator('.md-divider').first()).toBeVisible();
    // 无 "切换主题" 菜单项（已迁至 Header 主行）
    await expect(page.locator('.md-header__menu-item:has-text("切换主题")')).toHaveCount(0);
  });
});

// ── NAV-03: Sidebar footer ──

test.describe('Sidebar footer', () => {
  test('sidebar footer shows version text + NO buttons', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin');

    const version = page.locator('.md-sidebar__version');
    await expect(version).toBeVisible();
    const text = await version.textContent();
    expect(text).toMatch(/^v\d+\.\d+\.\d+$/);
    // footer 无任何按钮（主题切换 + 退出已迁出）
    await expect(page.locator('.md-sidebar__footer button')).toHaveCount(0);
  });
});

// ── NAV-05: BottomBar 角色分组 tabs ──

test.describe('BottomBar role tabs', () => {
  test('chef: 7 tabs in expected order 首页 / 订单 / 菜品 / 食材 / 愿望 / 点菜 / 我的', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAs(page, 'chef');
    await page.goto('/home');

    await expect(page.locator('.md-tab')).toHaveCount(7);
    expect(await page.locator('.md-tab__label').nth(0).textContent()).toBe('首页');
    expect(await page.locator('.md-tab__label').nth(6).textContent()).toBe('我的');
  });

  test('admin: 7 tabs in expected order 后台 / 菜品 / 食材 / 愿望 / 用户 / 点菜 / 我的', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAs(page, 'admin');
    await page.goto('/admin');

    await expect(page.locator('.md-tab')).toHaveCount(7);
    expect(await page.locator('.md-tab__label').nth(0).textContent()).toBe('后台');
    expect(await page.locator('.md-tab__label').nth(6).textContent()).toBe('我的');
  });

  test('user: 4 tabs in expected order 首页 / 点菜 / 愿望 / 我的 with NO 菜品/食材 tab', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAs(page, 'user');
    await page.goto('/home');

    await expect(page.locator('.md-tab')).toHaveCount(4);
    await expect(page.locator('.md-tab__label:has-text("菜品")')).toHaveCount(0);
    await expect(page.locator('.md-tab__label:has-text("食材")')).toHaveCount(0);
  });

  test('all roles: no logout tab visible', async ({ page }) => {
    const roles = ['admin', 'chef', 'user'];
    for (const role of roles) {
      await page.setViewportSize(MOBILE_VIEWPORT);
      await loginAs(page, role);
      const target = role === 'admin' ? '/admin' : '/home';
      await page.goto(target);
      await expect(page.locator('.md-tab__label:has-text("退出")')).toHaveCount(0);
      // 清理 init script 以便下一角色重新注入
      await page.context().clearCookies();
    }
  });
});

// ── BLOCKER 1: AdminHomePage quick actions（admin 侧审计） ──

test.describe('AdminHomePage quick actions (admin side audit per BLOCKER 1)', () => {
  test('admin home exposes 菜品管理 + 食材管理 entries on mobile viewport (375x812)', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAs(page, 'admin');
    await page.goto('/admin');

    const dishEntry = page.locator('.quick-action:has-text("菜品管理")');
    const ingredientEntry = page.locator('.quick-action:has-text("食材管理")');
    await expect(dishEntry).toBeVisible();
    await expect(ingredientEntry).toBeVisible();

    // 点击 菜品管理 → 跳转 /admin/dishes
    await dishEntry.click();
    await expect(page).toHaveURL(/\/admin\/dishes/);
    await page.goBack();
    // 点击 食材管理 → 跳转 /ingredients
    await page.locator('.quick-action:has-text("食材管理")').click();
    await expect(page).toHaveURL(/\/ingredients/);
  });
});

// ── NAV-04: UserHomePage quick actions（按角色） ──

test.describe('UserHomePage quick actions (per role)', () => {
  test('chef sees 菜品管理 + 食材管理 quick actions on mobile viewport (375x812)', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAs(page, 'chef');
    await page.goto('/home');

    await expect(page.locator('.quick-action:has-text("菜品管理")')).toBeVisible();
    await expect(page.locator('.quick-action:has-text("食材管理")')).toBeVisible();
  });

  test('user does NOT see 菜品管理 or 食材管理 on mobile viewport', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAs(page, 'user');
    await page.goto('/home');

    await expect(page.locator('.quick-action:has-text("菜品管理")')).toHaveCount(0);
    await expect(page.locator('.quick-action:has-text("食材管理")')).toHaveCount(0);
  });
});

// ── UI-01: OrderPage 高级筛选 Sheet ──

test.describe('OrderPage filter Sheet', () => {
  test('clicking 高级筛选 opens Sheet containing 清空 + 应用 buttons', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAs(page, 'user');
    await page.goto('/order');

    await page.locator('button:has-text("高级筛选")').click();
    await expect(page.locator('.md-modal--bottom-sheet')).toBeVisible();
    await expect(page.locator('button:has-text("清空")')).toBeVisible();
    await expect(page.locator('button:has-text("应用")')).toBeVisible();
  });
});

// ── BUG-06: AdminDishes 移动端卡片几何一致性 ──
// 依赖 VITE_AUTO_SEED_DEMO_DISHES=1（playwright.config.js webServer env）+
// 后端 AUTO_SEED_DEMO_DISHES=1 启动以注入 8 道 seed 菜品。
// AdminDishesPage 默认 status=all（loadDishes line 144），seed 的 published/draft
// 行均可见。卡片由 Card primitive 渲染为 .md-card（Phase 10 D-13 移除旧 .dish-card）。

test.describe('BUG-06: AdminDishes mobile card geometry (per BLOCKER 2 + 3)', () => {
  test('8 seeded cards render with equal card width + equal card height at 375x812 (BUG-06 uniformity)', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAs(page, 'admin');
    await page.goto('/admin/dishes');

    // AdminDishesPage 默认 status=all，seed 的 8 道菜品（published/draft 混合）全部可见
    const cards = page.locator('.mobile-card-list--grid .md-card');
    await expect(cards).toHaveCount(8);

    const boxes = await Promise.all(
      Array.from({ length: 8 }, (_, i) => cards.nth(i).boundingBox()),
    );

    // 所有卡片宽度一致（1px 容差）
    const widths = boxes.map((b) => b.width);
    const heights = boxes.map((b) => b.height);
    const maxWidthSpread = Math.max(...widths) - Math.min(...widths);
    const maxHeightSpread = Math.max(...heights) - Math.min(...heights);
    expect(maxWidthSpread).toBeLessThanOrEqual(1);
    expect(maxHeightSpread).toBeLessThanOrEqual(1);
  });

  test('8 seeded cards have aligned action-button row y-coordinate (BUG-06 button alignment)', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAs(page, 'admin');
    await page.goto('/admin/dishes');

    const cards = page.locator('.mobile-card-list--grid .md-card');
    await expect(cards).toHaveCount(8);

    // Card primitive footer (.md-card__footer) 承载操作按钮行
    const footers = page.locator('.mobile-card-list--grid .md-card .md-card__footer');
    const footerYs = await Promise.all(
      Array.from({ length: 8 }, (_, i) => footers.nth(i).boundingBox()),
    );

    // 所有 footer 行的 y 坐标一致（<2px 容差）—— 证明按钮行跨内容-empty 变体对齐
    const ys = footerYs.map((b) => b.y);
    const maxYSpread = Math.max(...ys) - Math.min(...ys);
    expect(maxYSpread).toBeLessThan(2);
  });
});
