/**
 * Playwright 触控目标审计脚本 — Phase 9 Wave 2 (UX-03)
 *
 * 测量所有可交互元素的 width/height，输出 <48dp 违规清单到 touch-audit-results.json。
 * 支持通过 --token=<JWT> 或 FC_TEST_TOKEN 环境变量注入鉴权 token。
 *
 * 用法:
 *   node scripts/audit-touch-targets.mjs                    # 仅审计公开页面 (login)
 *   node scripts/audit-touch-targets.mjs --token=<JWT>      # 注入 JWT 审计全部页面
 *   FC_TEST_TOKEN=<JWT> node scripts/audit-touch-targets.mjs
 *
 * 运行前置:
 *   1. npm install   (@playwright/test 已在 devDependencies)
 *   2. npx playwright install chromium   (首次运行需下载 Chromium)
 *   3. cd frontend && npm run dev &      (Vite dev server on :5173)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import { resolve } from 'node:path';

// MD3 触控目标最小尺寸（dp ≈ px @ 1x）
const MIN_TOUCH = 48;

// 审计结果累积器
const RESULTS = [];

// 项目根路径（脚本在 frontend/scripts/ 下，项目根为父目录）
const FRONTEND_ROOT = resolve(process.cwd());
const OUTPUT_PATH = resolve(FRONTEND_ROOT, 'touch-audit-results.json');

// Dev server base URL — Vite 默认 5173
const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:5173';

function decodeJwtPayload(token) {
  if (!token) return null;
  try {
    const encoded = token.split('.')[1];
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

// 待审计页面清单（来自 UI-SPEC.md §5 + 09-02 PLAN.md task1 action）
// roles 使单个 JWT 只审计其实际可访问路由，避免把角色重定向误记为目标页 PASS。
const PAGES = [
  { url: '/login', name: 'Login', auth: false, roles: [] },
  { url: '/home', name: 'User Home', auth: true, roles: ['user', 'chef'] },
  { url: '/chef/orders', name: 'Chef Orders', auth: true, roles: ['chef', 'admin'] },
  { url: '/admin/dishes', name: 'Admin Dishes', auth: true, roles: ['admin'] },
  { url: '/my-wishes', name: 'User Wishes', auth: true, roles: ['user'] },
  { url: '/chef/wishes', name: 'Chef Wishes', auth: true, roles: ['chef', 'admin'] },
  { url: '/admin/wishes', name: 'Admin Wishes', auth: true, roles: ['admin'] },
  { url: '/admin/chefs', name: 'Admin Chefs', auth: true, roles: ['admin'] },
  { url: '/order', name: 'Order Page', auth: true, roles: ['user'] },
  { url: '/profile', name: 'Profile', auth: true, roles: ['user', 'chef', 'admin'] },
  { url: '/preferences', name: 'Preferences', auth: true, roles: ['user', 'chef', 'admin'] },
  { url: '/admin/stats', name: 'Stats', auth: true, roles: ['admin'] },
];

/**
 * 在单个页面上审计触控目标违规。
 * @param {import('playwright').Page} page - Playwright page 实例
 * @param {string} url - 完整 URL
 * @param {string} name - 页面名（用于报告）
 */
async function auditPage(page, url, name) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    const expectedPath = new URL(url).pathname;
    const currentPath = new URL(page.url()).pathname;
    if (currentPath !== expectedPath) {
      throw new Error(`route redirected to ${currentPath}`);
    }

    // 在浏览器上下文中查询所有可交互元素并测量尺寸
    const violations = await page.evaluate((min) => {
      // 选择器列表来自 RESEARCH.md:660-669 + UI-SPEC.md:282-293
      const selectors = [
        'button', 'a', 'input', 'select', 'textarea',
        '[role="button"]', '[tabindex]:not([tabindex="-1"])',
        '.btn', '.list-item', '.dish-card', '.card', '.tab-item',
        '.filter-chip', '.pc-sidebar-item', '.header-back',
        '.theme-toggle', '.modal-close', '.qty-stepper button',
        '.fab', '.menu-item', '.chef-select-item', '.wish-picker-item',
        '.guest-add-btn', '.dish-fav-btn', '.preference-tag button',
        '.quick-action', '.wish-card',
      ];
      const all = document.querySelectorAll(selectors.join(','));

      // 仅检查可见元素（避免 hidden/display:none 误报）
      return Array.from(all)
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return false;
          const style = window.getComputedStyle(el);
          return style.display !== 'none'
            && style.visibility !== 'hidden'
            && style.opacity !== '0';
        })
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const record = {
            tag: el.tagName,
            class: (typeof el.className === 'string' ? el.className : '').slice(0, 80),
            text: (el.textContent || '').trim().slice(0, 40),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            violations: [],
          };
          if (record.width < min) record.violations.push(`width=${record.width}px`);
          if (record.height < min) record.violations.push(`height=${record.height}px`);
          return record;
        })
        .filter((el) => el.violations.length > 0);
    }, MIN_TOUCH);

    RESULTS.push({ page: name, url, status: violations.length === 0 ? 'PASS' : 'FAIL', violations });
    console.log(`${name}: ${violations.length} violations`);
  } catch (error) {
    // 页面加载失败（404、超时、重定向）— 记录 FAIL，不用空违规伪装 PASS
    RESULTS.push({ page: name, url, status: 'FAIL', error: error.message, violations: [] });
    console.log(`${name}: FAIL (${error.message})`);
  }
}

/**
 * 主入口 — async IIFE。
 * 步骤: 解析 token → 启动 Chromium → 注入 JWT → 逐页审计 → 输出报告 → 关闭浏览器。
 */
(async () => {
  // 1. 解析 JWT token（CLI --token= 优先，env FC_TEST_TOKEN 兜底）
  const tokenArg = process.argv.find((a) => a.startsWith('--token='));
  const token = tokenArg ? tokenArg.split('=')[1] : process.env.FC_TEST_TOKEN;
  const payload = decodeJwtPayload(token);
  const role = payload?.role;
  const storedUser = payload ? {
    id: Number(payload.sub),
    username: payload.username || 'audit-user',
    display_name: payload.username || '审计用户',
    role,
    is_active: true,
    force_pwd_change: false,
  } : null;

  if (!token) {
    console.warn('No FC_TEST_TOKEN provided — authenticated routes will be SKIPPED');
  } else if (!role) {
    console.warn('FC_TEST_TOKEN payload has no supported role — authenticated routes will be SKIPPED');
  }

  // 2. 启动 Chromium
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }, // iPhone X 维度（mobile-first 审计）
  });
  const page = await context.newPage();

  // 3. 注入 JWT（如有）— 使用生产 AuthManager 的 fc_access_token/fc_user 键名
  if (token && storedUser) {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.evaluate(({ accessToken, user }) => {
      localStorage.setItem('fc_access_token', accessToken);
      localStorage.setItem('fc_user', JSON.stringify(user));
    }, { accessToken: token, user: storedUser });
  }

  // 4. 逐页审计
  const auditDate = new Date().toISOString();
  let totalPages = 0;
  let totalViolations = 0;
  let roleSkippedPages = 0;
  for (const { url, name, auth, roles } of PAGES) {
    if (auth && (!token || !role)) {
      console.log(`${name}: SKIPPED (auth required, usable token not provided)`);
      RESULTS.push({ page: name, url, status: 'SKIPPED', error: 'auth required, usable token not provided', violations: [] });
      continue;
    }
    if (auth && !roles.includes(role)) {
      console.log(`${name}: SKIPPED (not applicable to ${role} role)`);
      RESULTS.push({ page: name, url, status: 'SKIPPED', skipReason: `not applicable to ${role} role`, violations: [] });
      roleSkippedPages += 1;
      continue;
    }
    const fullUrl = `${BASE_URL}${url}`;
    await auditPage(page, fullUrl, name);
    totalPages += 1;
  }

  // 5. 关闭浏览器
  await browser.close();

  // 6. 汇总统计
  for (const entry of RESULTS) {
    totalViolations += entry.violations ? entry.violations.length : 0;
  }
  const hasRuntimeFailure = RESULTS.some((entry) => entry.status === 'FAIL' && entry.error);
  const status = totalViolations > 0 || hasRuntimeFailure
    ? 'FAIL'
    : !token || !role
      ? 'INCOMPLETE'
      : 'PASS';

  // 7. 输出 JSON 报告（不含 token）
  const report = {
    auditDate,
    pagesAudited: totalPages,
    pagesSkipped: RESULTS.filter((entry) => entry.status === 'SKIPPED').length,
    roleSkippedPages,
    auditedRole: role || null,
    totalViolations,
    status,
    minTouchTarget: MIN_TOUCH,
    pages: RESULTS,
  };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));

  console.log('\n========================================');
  console.log(`Audit complete: ${totalPages} pages, ${totalViolations} violations`);
  console.log(`Status: ${status}`);
  console.log(`Report: ${OUTPUT_PATH}`);
  console.log('========================================');

  if (status === 'FAIL') process.exitCode = 1;
  if (status === 'INCOMPLETE') process.exitCode = 2;

  // Guest page touch coverage lives in audit-md3-compliance.mjs and requires FC_GUEST_TOKEN.
})();
