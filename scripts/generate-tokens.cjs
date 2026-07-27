/**
 * scripts/generate-tokens.cjs
 *
 * MD3 设计令牌生成器 —— 从锁定的 key color 派生完整的 Material Design 3 令牌表。
 *
 * 使用 @material/material-color-utilities 库在 HCT 色彩空间中计算 13 tones 的 tonal palette，
 * 并生成 light/dark 两套 DynamicScheme 语义角色。
 *
 * 运行：npm run gen:tokens（在 frontend/ 目录下）
 * 输出：frontend/src/css/tokens.css（确定性输出，重复运行产生字节一致的文件）
 *
 * 锁定的 key color（来自 CONTEXT.md D-01）：
 *   Primary   #34834E（深绿 —— 食材/自然）
 *   Secondary #506446（橄榄绿）
 *   Tertiary  #F5B43C（暖琥珀 —— 烹饪/温暖）
 *   Error     #B3261E（MD3 标准错误色）
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

/**
 * 确保 @material/material-color-utilities 的内部 ESM 导入可被 Node 解析。
 *
 * 该包 v0.4.0 存在多处打包缺陷：若干 .js 文件的 relative import 缺少 .js 扩展名，
 * 而 Node 原生 ESM 加载器不自动补全扩展名（与打包器行为不同），导致 ERR_MODULE_NOT_FOUND。
 * 已知的缺陷文件：
 *   - dynamiccolor/color_spec_2025.js: import from './dynamic_color'
 *   - scheme/scheme_*.js (9 files): import from '../dynamiccolor/dynamic_scheme'
 *
 * 此函数扫描包内所有 .js 文件，自动修补所有缺少 .js 扩展名的 relative import。
 *
 * @param {string} packageRoot — 包根目录的绝对路径
 */
async function ensurePackageImportable(packageRoot) {
  const { glob } = await import('node:fs/promises');
  // 手动遍历目录（glob 在旧版 Node 可能不可用，使用递归 readdir）
  const allFiles = await collectJsFiles(packageRoot);
  let patched = 0;
  for (const filePath of allFiles) {
    let content = await fs.readFile(filePath, 'utf-8');
    // 匹配 from './xxx' 或 from '../xxx' 但不含 .js 扩展名
    const fixed = content.replace(
      /(from\s+['"])(\.\.?\/[^'"]+)(?<!\.js)(['"])/g,
      (match, prefix, importPath, quote) => `${prefix}${importPath}.js${quote}`
    );
    if (fixed !== content) {
      await fs.writeFile(filePath, fixed, 'utf-8');
      patched++;
    }
  }
  if (patched > 0) {
    console.error(`⚠ 已自动修补 ${patched} 个文件的 ESM 导入（缺少 .js 扩展名，@material/material-color-utilities@0.4.0 打包缺陷）`);
  }
}

/** 递归收集目录下所有 .js 文件 */
async function collectJsFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

// 锁定的 key color（来自 CONTEXT.md D-01）
const PRIMARY_HEX = '#34834E';
const SECONDARY_HEX = '#506446';
const TERTIARY_HEX = '#F5B43C';
const ERROR_HEX = '#B3261E';

// MD3 标准 13 tones（tone 0 = 纯黑，tone 100 = 纯白）
const TONES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100];

/**
 * 将 ARGB 整数转换为 #RRGGBB 十六进制字符串
 * @param {number} a - ARGB 整数
 * @returns {string} #RRGGBB
 */
function hexFromArgb(a) {
  const r = ((a >> 16) & 0xff).toString(16).padStart(2, '0');
  const g = ((a >> 8) & 0xff).toString(16).padStart(2, '0');
  const b = (a & 0xff).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

// camelCase → kebab-case（如 onPrimary → on-primary）
function toKebab(name) {
  return name.replace(/([A-Z])/g, '-$1').toLowerCase();
}

// 需要提取的语义角色
// 方式 A：直接从 scheme 对象读取（基础角色已预计算）
// 方式 B：从 tonal palette 按 MD3 规范 tone 值计算（surface container 层级）
const DIRECT_ROLES = [
  'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
  'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
  'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
  'error', 'onError', 'errorContainer', 'onErrorContainer',
  'background', 'onBackground',
  'surface', 'onSurface', 'onSurfaceVariant',
  'outline', 'outlineVariant',
  'scrim', 'shadow',
  'inverseSurface', 'inverseOnSurface', 'inversePrimary',
];

// Surface container 层级 —— 从 neutral palette 按 MD3 规范 tone 值派生（默认对比度 0.0）
// tone 值来源：color_spec_2021.js ContrastCurve 的 normal 值
const SURFACE_PALETTE_ROLES = {
  // Light mode tones / Dark mode tones
  surfaceDim:                 { light: 87,  dark: 6  },
  surfaceBright:              { light: 98,  dark: 24 },
  surfaceContainerLowest:     { light: 100, dark: 4  },
  surfaceContainerLow:        { light: 96,  dark: 10 },
  surfaceContainer:           { light: 94,  dark: 12 },
  surfaceContainerHigh:       { light: 92,  dark: 17 },
  surfaceContainerHighest:    { light: 90,  dark: 22 },
};

// surfaceTint 和 surfaceVariant 从其他 palette 派生
const SPECIAL_PALETTE_ROLES = {
  surfaceTint:    { palette: 'primary',         light: 40, dark: 80 },
  surfaceVariant: { palette: 'neutralVariant',  light: 90, dark: 30 },
};

// 六个 tonal palette 家族
const PALETTE_FAMILIES = ['primary', 'secondary', 'tertiary', 'neutral', 'neutralVariant', 'error'];

// palette 家族的 CSS 变量名（neutralVariant → neutral-variant）
function paletteVarName(family) {
  return family === 'neutralVariant' ? 'neutral-variant' : family;
}

async function main() {
  // 解析包路径：优先从 frontend/node_modules 解析（脚本位于 scripts/，项目根存在
  // 残留的 node_modules/，直接 import 会命中错误的副本）
  const frontendDir = path.join(__dirname, '..', 'frontend');
  const mcuPackageRoot = path.join(
    frontendDir, 'node_modules', '@material', 'material-color-utilities'
  );

  // 自动修补已知的 ESM 导入缺陷（Rule 3 auto-fix）
  await ensurePackageImportable(mcuPackageRoot);

  // 动态导入 ESM 模块（通过绝对文件路径，避免项目根 node_modules/ 残留干扰）
  const mcu = await import(pathToFileURL(path.join(mcuPackageRoot, 'index.js')).href);
  const { argbFromHex, themeFromSourceColor } = mcu;

  // 将 key color 转换为 ARGB
  const primaryArgb = argbFromHex(PRIMARY_HEX);
  const secondaryArgb = argbFromHex(SECONDARY_HEX);
  const tertiaryArgb = argbFromHex(TERTIARY_HEX);

  // 生成完整的 MD3 主题（包含 light/dark scheme 和 tonal palettes）
  const theme = themeFromSourceColor(primaryArgb, [
    { name: 'secondary', value: secondaryArgb, blend: true },
    { name: 'tertiary', value: tertiaryArgb, blend: true },
  ]);

  const lightScheme = theme.schemes.light;
  const darkScheme = theme.schemes.dark;

  // --- 构建 CSS 输出字符串 ---
  const lines = [];

  // 文件头注释（固定文本，不含时间戳 —— 确保确定性输出）
  lines.push('/* ═══════════════════════════════════════════════════════════════════');
  lines.push('   家味 · Family Chef — MD3 Design Tokens');
  lines.push('   由 scripts/generate-tokens.cjs 自动生成（勿手动编辑）');
  lines.push('');
  lines.push('   Key Colors (CONTEXT.md D-01):');
  lines.push(`     Primary   ${PRIMARY_HEX}（深绿 —— 食材/自然）`);
  lines.push(`     Secondary ${SECONDARY_HEX}（橄榄绿）`);
  lines.push(`     Tertiary  ${TERTIARY_HEX}（暖琥珀 —— 烹饪/温暖）`);
  lines.push(`     Error     ${ERROR_HEX}（MD3 标准错误色）`);
  lines.push('');
  lines.push('   重新生成：cd frontend && npm run gen:tokens');
  lines.push('   ═══════════════════════════════════════════════════════════════════ */');
  lines.push('');

  // ===== :root 块（light mode 默认 + mode-invariant tokens）=====
  lines.push(':root {');

  // --- 语义颜色角色（light mode） ---
  lines.push('  /* ── 语义颜色角色（Light Mode） ── */');
  // 方式 A：直接从 scheme 对象读取预计算的基础角色
  for (const role of DIRECT_ROLES) {
    const val = lightScheme[role];
    if (val !== undefined) {
      lines.push(`  --md-color-${toKebab(role)}: ${hexFromArgb(val)};`);
    }
  }
  // 方式 B：从 neutral palette 按 MD3 tone 值计算 surface container 层级
  for (const [role, tones] of Object.entries(SURFACE_PALETTE_ROLES)) {
    lines.push(`  --md-color-${toKebab(role)}: ${hexFromArgb(theme.palettes.neutral.tone(tones.light))};`);
  }
  // 方式 C：surfaceTint（primary palette）和 surfaceVariant（neutralVariant palette）
  for (const [role, spec] of Object.entries(SPECIAL_PALETTE_ROLES)) {
    lines.push(`  --md-color-${toKebab(role)}: ${hexFromArgb(theme.palettes[spec.palette].tone(spec.light))};`);
  }
  lines.push('');

  // --- Tonal Palette（13 tones × 6 families） ---
  lines.push('  /* ── Tonal Palette（13 tones × 6 families，HCT 色彩空间派生）');
  lines.push('     tone 0 = 纯黑，tone 100 = 纯白');
  lines.push('     light mode: surface 用 tone 95-99，primary 用 tone 40');
  lines.push('     dark mode: surface 用 tone 10-20，primary 用 tone 80 ── */');
  for (const family of PALETTE_FAMILIES) {
    const palette = theme.palettes[family];
    lines.push(`  /* ${family} 家族 */`);
    for (const tone of TONES) {
      const hex = hexFromArgb(palette.tone(tone));
      lines.push(`  --md-palette-${paletteVarName(family)}-${tone}: ${hex};`);
    }
  }
  lines.push('');

  // --- 圆角（Shape） ── MD3 5+1 级体系 ---
  lines.push('  /* ── 圆角 Shape（MD3 标准） ── */');
  lines.push('  --md-radius-xs: 8px;    /* 极小元素：标签/Tag/徽章 */');
  lines.push('  --md-radius-sm: 12px;   /* 小组件：按钮/输入框 */');
  lines.push('  --md-radius-md: 16px;   /* 中组件：卡片/FAB (D-08) */');
  lines.push('  --md-radius-lg: 24px;   /* 大组件：模态框/抽屉/侧边栏 */');
  lines.push('  --md-radius-xl: 28px;   /* 超大组件 */');
  lines.push('  --md-radius-full: 9999px; /* 圆形/胶囊 */');
  lines.push('');

  // --- 间距（8dp 网格） ---
  lines.push('  /* ── 间距 Spacing（8dp 网格） ── */');
  lines.push('  --md-spacing-1: 4px;');
  lines.push('  --md-spacing-2: 8px;');
  lines.push('  --md-spacing-3: 12px;');
  lines.push('  --md-spacing-4: 16px;');
  lines.push('  --md-spacing-5: 24px;');
  lines.push('  --md-spacing-6: 32px;');
  lines.push('  --md-spacing-7: 40px;');
  lines.push('  --md-spacing-8: 56px;');
  lines.push('');

  // --- Elevation（5 级阴影，MD3 surface tint + shadow） ---
  lines.push('  /* ── Elevation（5 级，shadow 形式；surface tint 由组件自行叠加） ── */');
  lines.push('  --md-elevation-0: none;');
  lines.push('  --md-elevation-1: 0 1px 2px rgba(0,0,0,0.05);');
  lines.push('  --md-elevation-2: 0 1px 3px rgba(0,0,0,0.08);');
  lines.push('  --md-elevation-3: 0 2px 6px rgba(0,0,0,0.10);');
  lines.push('  --md-elevation-4: 0 4px 8px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08);');
  lines.push('  --md-elevation-5: 0 6px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.10);');
  lines.push('');

  // --- Motion（时长 + 缓动） ---
  lines.push('  /* ── Motion（时长 + 缓动函数） ── */');
  lines.push('  --md-motion-duration-short: 150ms;');
  lines.push('  --md-motion-duration-medium: 250ms;');
  lines.push('  --md-motion-duration-long: 500ms;');
  lines.push('  --md-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);');
  lines.push('  --md-motion-easing-emphasized: cubic-bezier(0.2, 0, 0, 1);');
  lines.push('');

  // --- 排版（Typography） ---
  lines.push('  /* ── 排版 Typography（中英文字体栈） ── */');
  lines.push("  --md-font-display: 'PingFang SC', 'Noto Serif SC', serif;");
  lines.push("  --md-font-body: 'PingFang SC', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;");
  lines.push('');

  // --- 焦点环（Focus Ring，MOTION-04/UX-02） ---
  lines.push('  /* ── 焦点环 Focus Ring（2px 外环 + 2px 内环） ── */');
  lines.push('  --md-focus-ring-outer: 2px solid var(--md-color-on-primary);');
  lines.push('  --md-focus-ring-inner: 2px solid var(--md-color-surface);');
  lines.push('');

  // --- 其他全局令牌 ---
  lines.push('  /* ── 其他全局令牌 ── */');
  lines.push('  --md-nav-height: 64px;');
  lines.push('  --md-color-scrim: rgba(0,0,0,0.32);');

  lines.push('}');
  lines.push('');

  // ===== [data-theme="dark"] 块（仅覆盖语义颜色角色） =====
  lines.push('/* Dark Mode —— 仅覆盖 mode-dependent 颜色角色');
  lines.push('   radius/spacing/elevation/motion/font/focus-ring/nav-height 为 mode-invariant，不在此重复声明 */');
  lines.push('[data-theme="dark"] {');
  lines.push('  /* ── 语义颜色角色（Dark Mode） ── */');
  // 方式 A：直接从 scheme 对象读取预计算的基础角色
  for (const role of DIRECT_ROLES) {
    const val = darkScheme[role];
    if (val !== undefined) {
      lines.push(`  --md-color-${toKebab(role)}: ${hexFromArgb(val)};`);
    }
  }
  // 方式 B：从 neutral palette 按 MD3 tone 值计算 surface container 层级
  for (const [role, tones] of Object.entries(SURFACE_PALETTE_ROLES)) {
    lines.push(`  --md-color-${toKebab(role)}: ${hexFromArgb(theme.palettes.neutral.tone(tones.dark))};`);
  }
  // 方式 C：surfaceTint（primary palette）和 surfaceVariant（neutralVariant palette）
  for (const [role, spec] of Object.entries(SPECIAL_PALETTE_ROLES)) {
    lines.push(`  --md-color-${toKebab(role)}: ${hexFromArgb(theme.palettes[spec.palette].tone(spec.dark))};`);
  }
  lines.push('}');
  lines.push('');

  // 写入文件（路径相对于 __dirname）
  const outputPath = path.join(__dirname, '..', 'frontend', 'src', 'css', 'tokens.css');
  const content = lines.join('\n');
  await fs.writeFile(outputPath, content, 'utf-8');

  // 统计信息输出到 stderr（不影响确定性）
  const colorCount = DIRECT_ROLES.length + Object.keys(SURFACE_PALETTE_ROLES).length + Object.keys(SPECIAL_PALETTE_ROLES).length;
  const paletteCount = PALETTE_FAMILIES.length * TONES.length;
  console.error(`✓ tokens.css 已生成：${outputPath}`);
  console.error(`  语义颜色角色：${colorCount}（light + dark 各一套）`);
  console.error(`  Tonal palette：${PALETTE_FAMILIES.length} families × ${TONES.length} tones = ${paletteCount}`);
}

main().catch((err) => {
  console.error('✗ 生成 tokens.css 失败：', err);
  process.exit(1);
});
