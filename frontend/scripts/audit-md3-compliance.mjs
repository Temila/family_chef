/**
 * Phase 12 MD3 浏览器合规审计（D-UAT-02 / D-UAT-03）。
 *
 * 四族证据：
 *   1. ripple — 真实 Playwright 指针点击触发可观察状态变化；
 *   2. header — 鉴权页面恰好一个 Header，公开页面使用显式期望值；
 *   3. grid — 可见代表元素逐边 padding/margin + row/column gap 的 4dp 对齐；
 *   4. touch — 现有交互目标维持至少 48dp。
 *
 * 凭据只从 --token/FC_TEST_TOKEN 与 --guest-token/FC_GUEST_TOKEN 读取，
 * 不写入源码、日志或 JSON。缺少测试数据时输出 INCOMPLETE，而非伪 PASS。
 */

import fs from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(SCRIPT_DIR, '..');
const OUTPUT_PATH = resolve(FRONTEND_ROOT, 'md3-compliance-results.json');
const BASE_URL = (process.env.AUDIT_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const MIN_TOUCH_TARGET = 48;
const DESKTOP_VIEWPORT = { width: 1280, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

const PUBLIC_ROUTES = [
  { name: 'Login', path: '/login', reportPath: '/login', expectedHeaders: 0, scope: 'public' },
];

const AUTH_ROUTES_BY_ROLE = {
  user: [
    ['/home', 'User Home'],
    ['/order', 'Order'],
    ['/profile', 'Profile'],
    ['/my-orders', 'User Orders'],
    ['/my-favorites', 'User Favorites'],
    ['/preferences', 'Preferences'],
    ['/my-wishes', 'User Wishes'],
  ],
  chef: [
    ['/home', 'User Home (Chef)'],
    ['/chef/orders', 'Chef Orders'],
    ['/chef/dishes', 'Chef Dishes'],
    ['/ingredients', 'Ingredients'],
    ['/admin/categories', 'Categories'],
    ['/profile', 'Profile (Chef)'],
    ['/preferences', 'Preferences (Chef)'],
    ['/chef/wishes', 'Chef Wishes'],
  ],
  admin: [
    ['/admin', 'Admin Home'],
    ['/admin/dishes', 'Admin Dishes'],
    ['/chef/orders', 'Chef Orders (Admin)'],
    ['/ingredients', 'Ingredients (Admin)'],
    ['/admin/categories', 'Categories (Admin)'],
    ['/admin/chefs', 'Admin Chefs'],
    ['/admin/users', 'Admin Users'],
    ['/admin/stats', 'Admin Stats'],
    ['/admin/logs', 'Admin Logs'],
    ['/admin/wishes', 'Admin Wishes'],
  ],
};

const GRID_SELECTORS = [
  '.login-container', '.login-card', '.login-logo', '.login-subtitle',
  '.login-theme-toggle', '.theme-toggle', 'form',
  '.page-container', '.guest-page', '.guest-confirm', '.guest-error',
  '.pc-main', '.section', '.search-bar', '.dish-grid', '.grid-2', '.grid-3',
  '.md-header', '.md-header__left', '.md-header__right',
  '.md-sidebar', '.md-sidebar__logo', '.md-sidebar__nav',
  '.md-sidebar__item', '.md-sidebar__footer',
  '.md-bottom-bar', '.md-tab', '.md-card', '.md-card__body', '.md-card__footer',
  '.md-button', '.md-icon-button', '.md-fab', '.md-chip', '.md-input-wrapper',
  '.md-input-container', '.md-input__field', '.md-input__label',
  '.md-list-item', '.preference-section', '.cart-bar',
];

function getCliValue(name) {
  const prefix = `--${name}=`;
  const argument = process.argv.find((item) => item.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : undefined;
}

function decodeJwtPayload(token) {
  if (!token) return null;
  try {
    const encoded = token.split('.')[1];
    if (!encoded) return null;
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function createStoredUser(payload) {
  if (!payload || !AUTH_ROUTES_BY_ROLE[payload.role]) return null;
  return {
    id: Number(payload.sub),
    username: payload.username || 'audit-user',
    display_name: payload.username || '审计用户',
    role: payload.role,
    is_active: true,
    force_pwd_change: false,
  };
}

function redact(value, secrets) {
  let output = String(value || '');
  for (const secret of secrets) {
    if (secret) output = output.split(secret).join('[REDACTED]');
  }
  return output.slice(0, 500);
}

async function createAuthenticatedContext(browser, token, user) {
  const context = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
  await context.addInitScript(({ accessToken, storedUser }) => {
    localStorage.setItem('fc_access_token', accessToken);
    localStorage.setItem('fc_user', JSON.stringify(storedUser));
  }, { accessToken: token, storedUser: user });
  return context;
}

async function auditRipple(browser) {
  const checks = [];
  const violations = [];
  const context = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/tests/fixtures/phase12-bugfix.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await page.getByTestId('primitives').waitFor({ state: 'visible' });

    const cases = [
      { control: '按钮', output: '按钮点击次数', kind: 'Button' },
      { control: '图标按钮', output: '图标按钮点击次数', kind: 'IconButton' },
      { control: '浮动按钮', output: '浮动按钮点击次数', kind: 'FAB' },
    ];

    for (const item of cases) {
      const control = page.getByRole('button', { name: item.control, exact: true });
      const output = page.getByLabel(item.output, { exact: true });
      const before = Number(await output.textContent());
      await control.click();
      const after = Number(await output.textContent());
      const passed = after === before + 1;
      checks.push({ kind: item.kind, action: 'Playwright pointer click', before, after, passed });
      if (!passed) {
        violations.push({ kind: item.kind, expected: before + 1, actual: after });
      }
    }

    const button = page.getByRole('button', { name: '按钮', exact: true });
    const box = await button.boundingBox();
    if (!box) {
      checks.push({ kind: 'Button', action: 'pointerdown ripple DOM', passed: false });
      violations.push({ kind: 'Button', reason: 'button has no visible bounding box' });
    } else {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      const rippleCount = await button.locator('.ripple-span').count();
      await page.mouse.up();
      const passed = rippleCount === 1;
      checks.push({ kind: 'Button', action: 'pointerdown ripple DOM', rippleCount, passed });
      if (!passed) {
        violations.push({ kind: 'Button', expectedRippleCount: 1, actualRippleCount: rippleCount });
      }
    }
  } catch (error) {
    violations.push({ kind: 'fixture', reason: redact(error.message, []) });
  } finally {
    await context.close();
  }

  return {
    status: violations.length === 0 ? 'PASS' : 'FAIL',
    checks,
    violations,
  };
}

async function inspectGrid(page) {
  return page.evaluate(({ selectors }) => {
    const properties = [
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'rowGap', 'columnGap',
    ];
    const seen = new Set();
    const candidates = [];

    for (const element of document.querySelectorAll(selectors.join(','))) {
      if (seen.has(element)) continue;
      seen.add(element);
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width === 0 || rect.height === 0) continue;
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
      candidates.push(element);
    }

    const samples = candidates.slice(0, 24).map((element) => {
      const style = getComputedStyle(element);
      const failures = [];
      for (const property of properties) {
        const value = style[property];
        if (!/^-?\d+(?:\.\d+)?px$/.test(value)) continue;
        const px = Number.parseFloat(value);
        const remainder = Math.abs(px % 4);
        if (Math.abs(px) > 0.01 && remainder > 0.01 && Math.abs(remainder - 4) > 0.01) {
          failures.push({ property, value });
        }
      }
      const classes = typeof element.className === 'string'
        ? element.className.trim().split(/\s+/).filter(Boolean).slice(0, 3)
        : [];
      return {
        element: `${element.tagName.toLowerCase()}${classes.length ? `.${classes.join('.')}` : ''}`,
        failures,
      };
    });

    const violations = samples
      .filter((sample) => sample.failures.length > 0)
      .map((sample) => ({ element: sample.element, values: sample.failures }));
    if (samples.length < 10) {
      violations.push({
        element: 'route',
        reason: `insufficient visible representative samples (${samples.length}/10)`,
      });
    }

    return { sampleCount: samples.length, violations };
  }, { selectors: GRID_SELECTORS });
}

async function inspectTouchTargets(page) {
  return page.evaluate(({ minimum }) => {
    const selectors = [
      'button', 'a[href]', 'input', 'select', 'textarea',
      '[role="button"]', '[tabindex]:not([tabindex="-1"])',
      '.md-card.md-interactive', '.md-list-item.md-interactive',
    ];
    const seen = new Set();
    const targets = [];

    for (const element of document.querySelectorAll(selectors.join(','))) {
      if (seen.has(element)) continue;
      seen.add(element);
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width === 0 || rect.height === 0) continue;
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
      const classes = typeof element.className === 'string'
        ? element.className.trim().split(/\s+/).filter(Boolean).slice(0, 3)
        : [];
      targets.push({
        element: `${element.tagName.toLowerCase()}${classes.length ? `.${classes.join('.')}` : ''}`,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
      });
    }

    return {
      checked: targets.length,
      violations: targets.filter((target) => target.width < minimum || target.height < minimum),
    };
  }, { minimum: MIN_TOUCH_TARGET });
}

async function auditRoute(context, route, secrets) {
  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') {
      consoleMessages.push({
        type: message.type(),
        text: redact(message.text(), secrets),
      });
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(redact(error.message, secrets));
  });

  const result = {
    name: route.name,
    path: route.reportPath,
    scope: route.scope,
    status: 'FAIL',
    expectedHeaders: route.expectedHeaders,
    headerCount: null,
    grid: { sampleCount: 0, violations: [] },
    touch: { checked: 0, violations: [] },
    console: { warningsAndErrors: [], pageErrors: [] },
  };

  try {
    await page.goto(`${BASE_URL}${route.path}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await page.waitForTimeout(500);

    const currentPath = new URL(page.url()).pathname;
    if (route.scope === 'authenticated' && currentPath !== route.path) {
      result.status = 'SKIPPED';
      result.skipReason = currentPath === '/login'
        ? 'authentication data rejected or expired'
        : `route redirected to ${currentPath}`;
      return result;
    }

    if (route.scope === 'guest' && await page.locator('.guest-error').count() > 0) {
      result.status = 'SKIPPED';
      result.skipReason = 'guest token did not produce an auditable menu';
      return result;
    }

    result.headerCount = await page.locator('header').count();
    result.grid = await inspectGrid(page);
    result.touch = await inspectTouchTargets(page);
    result.console = {
      warningsAndErrors: consoleMessages,
      pageErrors,
    };

    const hasViolation = result.headerCount !== route.expectedHeaders
      || result.grid.violations.length > 0
      || result.touch.violations.length > 0
      || consoleMessages.length > 0
      || pageErrors.length > 0;
    result.status = hasViolation ? 'FAIL' : 'PASS';
    return result;
  } catch (error) {
    result.error = redact(error.message, secrets);
    result.status = 'FAIL';
    return result;
  } finally {
    await page.close();
  }
}

function aggregateRoutes(routes) {
  const header = { checked: 0, violations: [] };
  const grid = { routesChecked: 0, sampledElements: 0, violations: [] };
  const touch = { routesChecked: 0, targetsChecked: 0, minTarget: MIN_TOUCH_TARGET, violations: [] };
  const consoleEvidence = { routesChecked: 0, warningsAndErrors: [], pageErrors: [] };

  for (const route of routes) {
    if (route.status === 'SKIPPED') continue;
    header.checked += 1;
    grid.routesChecked += 1;
    grid.sampledElements += route.grid.sampleCount;
    touch.routesChecked += 1;
    touch.targetsChecked += route.touch.checked;
    consoleEvidence.routesChecked += 1;

    if (route.headerCount !== route.expectedHeaders) {
      header.violations.push({
        route: route.path,
        expected: route.expectedHeaders,
        actual: route.headerCount,
      });
    }
    for (const violation of route.grid.violations) {
      grid.violations.push({ route: route.path, ...violation });
    }
    for (const violation of route.touch.violations) {
      touch.violations.push({ route: route.path, ...violation });
    }
    for (const message of route.console.warningsAndErrors) {
      consoleEvidence.warningsAndErrors.push({ route: route.path, ...message });
    }
    for (const error of route.console.pageErrors) {
      consoleEvidence.pageErrors.push({ route: route.path, error });
    }
  }

  return { header, grid, touch, console: consoleEvidence };
}

async function main() {
  const authToken = getCliValue('token') || process.env.FC_TEST_TOKEN;
  const guestToken = getCliValue('guest-token') || process.env.FC_GUEST_TOKEN;
  const secrets = [authToken, guestToken].filter(Boolean);
  const jwtPayload = decodeJwtPayload(authToken);
  const storedUser = createStoredUser(jwtPayload);
  const skips = [];
  const routeResults = [];
  const browser = await chromium.launch();

  try {
    const ripple = await auditRipple(browser);

    const publicContext = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
    for (const route of PUBLIC_ROUTES) {
      routeResults.push(await auditRoute(publicContext, route, secrets));
    }
    await publicContext.close();

    if (!authToken) {
      skips.push({ scope: 'authenticated', reason: 'FC_TEST_TOKEN/--token not provided' });
    } else if (!storedUser) {
      skips.push({ scope: 'authenticated', reason: 'token payload missing a supported role' });
    } else {
      const authContext = await createAuthenticatedContext(browser, authToken, storedUser);
      const routes = AUTH_ROUTES_BY_ROLE[storedUser.role].map(([path, name]) => ({
        name,
        path,
        reportPath: path,
        expectedHeaders: 1,
        scope: 'authenticated',
      }));
      for (const route of routes) {
        routeResults.push(await auditRoute(authContext, route, secrets));
      }
      await authContext.close();
    }

    if (!guestToken) {
      skips.push({ scope: 'guest', reason: 'FC_GUEST_TOKEN/--guest-token not provided' });
    } else {
      const guestContext = await browser.newContext({ viewport: MOBILE_VIEWPORT });
      routeResults.push(await auditRoute(guestContext, {
        name: 'Guest Order',
        path: `/guest/${encodeURIComponent(guestToken)}`,
        reportPath: '/guest/:token',
        expectedHeaders: 0,
        scope: 'guest',
      }, secrets));
      await guestContext.close();
    }

    const aggregate = aggregateRoutes(routeResults);
    for (const route of routeResults.filter((entry) => entry.status === 'SKIPPED')) {
      skips.push({ scope: route.scope, route: route.path, reason: route.skipReason });
    }

    const actualViolations = ripple.violations.length
      + aggregate.header.violations.length
      + aggregate.grid.violations.length
      + aggregate.touch.violations.length
      + aggregate.console.warningsAndErrors.length
      + aggregate.console.pageErrors.length
      + routeResults.filter((route) => route.status === 'FAIL').length;
    const overall = actualViolations > 0
      ? 'FAIL'
      : skips.length > 0
        ? 'INCOMPLETE'
        : 'PASS';

    const report = {
      auditDate: new Date().toISOString(),
      baseUrl: BASE_URL,
      viewport: { authenticated: DESKTOP_VIEWPORT, guest: MOBILE_VIEWPORT },
      credentialCoverage: {
        authenticated: Boolean(authToken && storedUser),
        guest: Boolean(guestToken),
        authRole: storedUser?.role || null,
      },
      routeStatuses: routeResults.map(({ name, path, scope, status }) => ({ name, path, scope, status })),
      routes: routeResults,
      ripple,
      header: aggregate.header,
      grid: aggregate.grid,
      touch: aggregate.touch,
      console: aggregate.console,
      skips,
      overall,
    };

    fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`MD3 compliance: ${overall}`);
    console.log(`Routes: ${routeResults.filter((route) => route.status === 'PASS').length} PASS, ${routeResults.filter((route) => route.status === 'FAIL').length} FAIL, ${routeResults.filter((route) => route.status === 'SKIPPED').length} SKIPPED`);
    console.log(`Violations: ripple=${ripple.violations.length}, header=${aggregate.header.violations.length}, grid=${aggregate.grid.violations.length}, touch=${aggregate.touch.violations.length}, console=${aggregate.console.warningsAndErrors.length + aggregate.console.pageErrors.length}`);
    console.log(`Report: ${OUTPUT_PATH}`);

    if (overall === 'FAIL') process.exitCode = 1;
    if (overall === 'INCOMPLETE') process.exitCode = 2;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  const message = redact(error.message, [
    getCliValue('token') || process.env.FC_TEST_TOKEN,
    getCliValue('guest-token') || process.env.FC_GUEST_TOKEN,
  ]);
  const report = {
    auditDate: new Date().toISOString(),
    baseUrl: BASE_URL,
    routeStatuses: [],
    ripple: { status: 'FAIL', checks: [], violations: [{ kind: 'runner', reason: message }] },
    header: { checked: 0, violations: [] },
    grid: { routesChecked: 0, sampledElements: 0, violations: [] },
    touch: { routesChecked: 0, targetsChecked: 0, minTarget: MIN_TOUCH_TARGET, violations: [] },
    console: { routesChecked: 0, warningsAndErrors: [], pageErrors: [] },
    skips: [],
    overall: 'FAIL',
  };
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.error(`MD3 compliance audit failed: ${message}`);
  process.exitCode = 1;
});
