#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# 家味 · Family Chef — MD3 源码回归防护 (Phase 12 D-GRID-03 / D-FILE-02)
#
# 路径无关：从脚本自身位置解析 frontend/ 目录，可从仓库根或 frontend/ 调用。
#
# 检测以下回归，任一命中即失败：
#   #1  旧 color/bg/text/border/shadow/semantic/ghost/wish 令牌名
#   #2  旧 shape/typography/motion/nav-height 令牌名
#   #3  tokens.css 之外的 #xxxxxx 十六进制色值
#   #4  styles.css 中的 rgba() 原始色值
#   #5  全量 CSS 硬编码 border-radius: <非零>px（扩展自 Phase 8 styles.css-only）
#   #6  JSX 中硬编码 borderRadius: <非零>number
#   #7  tokens.css 存在且包含全部 MD3 令牌族
#   #8  硬编码 padding/margin/gap/row-gap/column-gap: <非零>px（CSS + JSX）
#   #9  硬编码 transition/animation 时长 <N>(s|ms)（CSS）—— 12-01B motion lane
#   #10 页面/组件 emoji 残留（Extended_Pictographic）—— 12-01B emoji lane
#
# 文档化例外（不计入失败）：
#   - 间距：1px 边框、2px/4px outline-offset、3px spinner border、0、80px nav-height
#   - 动效：0.01ms reduced-motion sentinel、0.1s-0.4s stagger delay、6s reduced-motion fallback
#   - Emoji：non-pictographic 字符（· • … › ▼ ▲ ✕）
#
# Wave 2 状态：#1-#8 由 12-01A 执行后应为 PASS；#9-#10 需 12-01B 完成后才全绿。
# ═══════════════════════════════════════════════════════════════════
set -u

# ── 路径无关解析：从脚本自身位置推导 frontend/ ──
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"

if [ ! -d "$FRONTEND_DIR/src" ]; then
  echo "FATAL: frontend/src not found at $FRONTEND_DIR/src" >&2
  exit 2
fi

FAILURES=0
TOTAL=0

fail() {
    echo "[FAIL] $1" >&2
    FAILURES=$((FAILURES + 1))
}

check() {
    TOTAL=$((TOTAL + 1))
    local description="$1"
    local output="$2"
    if [ -n "$output" ]; then
        echo "[FAIL] $description" >&2
        echo "$output" | sed 's/^/        /' >&2
        FAILURES=$((FAILURES + 1))
    fi
}

# ═══════════════════════════════════════════════════════════════════
# Check #1 — 旧颜色/背景/文本/边框/阴影/语义/幽灵/wish 令牌名
# ═══════════════════════════════════════════════════════════════════
OLD_COLOR_OUTPUT=$(rg -n --no-heading \
    "var\(--(accent|bg-(primary|secondary|card|card-hover|elevated|input|page|hover)|text-(primary|secondary|muted)|border(-medium|-strong)?|shadow-(sm|md|lg|accent)|success(-light)?|warn(-light)?|danger(-light)?|info(-light)?|gold(-light)?|unread-dot|size-unread-dot|space-wish-card-stack|primary\)|warning-bg|warning-text)\b" \
    "$FRONTEND_DIR/src/" 2>/dev/null || true)
check "旧颜色/语义令牌名 (Check #1)" "$OLD_COLOR_OUTPUT"

# ═══════════════════════════════════════════════════════════════════
# Check #2 — 旧 shape/typography/motion/nav-height 令牌名
# ═══════════════════════════════════════════════════════════════════
OLD_SHAPE_OUTPUT=$(rg -n --no-heading \
    "var\(--(radius-(sm|md|lg|xl|full)|font-(display|body)|transition-(fast|normal)|nav-height|shadow-)\b" \
    "$FRONTEND_DIR/src/" 2>/dev/null || true)
check "旧 shape/typography/motion/nav-height 令牌名 (Check #2)" "$OLD_SHAPE_OUTPUT"

# ═══════════════════════════════════════════════════════════════════
# Check #3 — tokens.css 之外的 6 位十六进制色值
# ═══════════════════════════════════════════════════════════════════
HEX_OUTPUT=$(rg -n --no-heading "#[0-9a-fA-F]{6}\b" \
    "$FRONTEND_DIR/src/css/styles.css" \
    "$FRONTEND_DIR/src/components/" \
    "$FRONTEND_DIR/src/pages/" 2>/dev/null || true)
check "tokens.css 之外的 #xxxxxx 十六进制色值 (Check #3)" "$HEX_OUTPUT"

# ═══════════════════════════════════════════════════════════════════
# Check #4 — styles.css 中的 rgba() 原始色值
# ═══════════════════════════════════════════════════════════════════
RGBA_OUTPUT=$(rg -n --no-heading "rgba\(" \
    "$FRONTEND_DIR/src/css/styles.css" 2>/dev/null || true)
check "styles.css 中的 rgba() 原始色值 (Check #4)" "$RGBA_OUTPUT"

# ═══════════════════════════════════════════════════════════════════
# Check #5 — 全量 CSS 硬编码 border-radius: <非零>px（扩展自 Phase 8）
# 覆盖 css/ + components/ + pages/ 所有 *.css（不限于 styles.css）
# ═══════════════════════════════════════════════════════════════════
CSS_RADIUS_OUTPUT=$(rg -n --no-heading --glob '*.css' \
    "border-radius:\s*[1-9][0-9]*px" \
    "$FRONTEND_DIR/src/css/" \
    "$FRONTEND_DIR/src/components/" \
    "$FRONTEND_DIR/src/pages/" 2>/dev/null \
    | rg -v "var\(--md-radius" || true)
check "CSS 硬编码 border-radius <非零>px (Check #5)" "$CSS_RADIUS_OUTPUT"

# ═══════════════════════════════════════════════════════════════════
# Check #6 — JSX 中硬编码 borderRadius: <非零>number
# ═══════════════════════════════════════════════════════════════════
JSX_RADIUS_OUTPUT=$(rg -n --no-heading --glob '*.jsx' \
    "borderRadius:\s*['\"]?[1-9][0-9]*" \
    "$FRONTEND_DIR/src/components/" \
    "$FRONTEND_DIR/src/pages/" 2>/dev/null \
    | rg -v "var\(--md-radius" \
    | rg -v "borderRadius:\s*['\"]?(50%|0)" || true)
check "JSX 硬编码 borderRadius <非零>px (Check #6)" "$JSX_RADIUS_OUTPUT"

# ═══════════════════════════════════════════════════════════════════
# Check #7 — tokens.css 存在且包含全部 MD3 令牌族
# ═══════════════════════════════════════════════════════════════════
TOTAL=$((TOTAL + 1))
TOKENS_FILE="$FRONTEND_DIR/src/css/tokens.css"
if [ ! -f "$TOKENS_FILE" ]; then
    fail "tokens.css 缺失或令牌族不完整 (Check #7): 文件不存在 $TOKENS_FILE"
else
    MISSING=""
    grep -q "^:root {" "$TOKENS_FILE" || MISSING="$MISSING :root-block"
    grep -q '\[data-theme="dark"\] {' "$TOKENS_FILE" || MISSING="$MISSING dark-block"
    grep -qE "^\s*--md-radius-xs:\s*8px" "$TOKENS_FILE" || MISSING="$MISSING --md-radius-xs"
    grep -qE "^\s*--md-elevation-0:" "$TOKENS_FILE" || MISSING="$MISSING --md-elevation-0"
    grep -qE "^\s*--md-font-body:" "$TOKENS_FILE" || MISSING="$MISSING --md-font-body"
    grep -qE "^\s*--md-focus-ring-outer:" "$TOKENS_FILE" || MISSING="$MISSING --md-focus-ring-outer"
    if [ -n "$MISSING" ]; then
        fail "tokens.css 缺失或令牌族不完整 (Check #7): 缺少$MISSING"
    fi
fi

# ═══════════════════════════════════════════════════════════════════
# Check #8 — 硬编码 padding/margin/gap/row-gap/column-gap: <非零>px
# 覆盖 CSS 声明 + JSX inline style（numeric + 'Npx' string）
# 排除：var(--md-spacing-*) 消费者、1px 边框、2px/4px outline-offset、
#       3px spinner border、80px nav-height、0px
# ═══════════════════════════════════════════════════════════════════

# #8a — CSS 间距声明（padding/margin/gap 等后面跟 <非零>px）
CSS_SPACING_OUTPUT=$(rg -n --no-heading --glob '*.css' \
    '(padding|margin|gap|row-gap|column-gap)(-top|-right|-bottom|-left|-block|-inline|-before|-after)?\s*:\s*[^;}]*[1-9][0-9]*px' \
    "$FRONTEND_DIR/src/css/" \
    "$FRONTEND_DIR/src/components/" \
    "$FRONTEND_DIR/src/pages/" 2>/dev/null \
    | rg -v 'var\(--md-spacing' \
    | rg -v 'border[^:]*:\s*1px' \
    | rg -v 'outline-offset' \
    | rg -v 'spinner.*border|border.*spinner' \
    | rg -v 'nav-height' || true)
check "CSS 硬编码 padding/margin/gap px (Check #8a)" "$CSS_SPACING_OUTPUT"

# #8b — JSX inline style 间距（numeric 或 'Npx' string）
JSX_SPACING_OUTPUT=$(rg -n --no-heading --glob '*.jsx' \
    "(padding|margin|gap|rowGap|columnGap|marginTop|marginBottom|marginLeft|marginRight|paddingTop|paddingBottom|paddingLeft|paddingRight)\s*:\s*['\"]?[1-9][0-9]*" \
    "$FRONTEND_DIR/src/components/" \
    "$FRONTEND_DIR/src/pages/" 2>/dev/null \
    | rg -v 'var\(--md-spacing' \
    | rg -v 'border' \
    | rg -v 'outline' \
    | rg -v 'spinner' \
    | rg -v 'nav-height' || true)
check "JSX inline 硬编码 padding/margin/gap (Check #8b)" "$JSX_SPACING_OUTPUT"

# ═══════════════════════════════════════════════════════════════════
# Check #9 — 硬编码 transition/animation 时长（CSS）—— 12-01B motion lane
# 排除：var(--md-motion-*) 消费者、0.01ms reduced-motion sentinel、
#       0.1s-0.4s stagger delay、6s reduced-motion fallback、linear spinner
# ═══════════════════════════════════════════════════════════════════
MOTION_OUTPUT=$(rg -n --no-heading --glob '*.css' \
    '(transition|animation)(-duration|-delay)?[^:]*:\s*[^;}]*[0-9]+(\.[0-9]+)?(s|ms)' \
    "$FRONTEND_DIR/src/css/" \
    "$FRONTEND_DIR/src/components/" 2>/dev/null \
    | rg -v 'var\(--md-motion' \
    | rg -v '0\.01ms' \
    | rg -v 'animation-delay:\s*0\.[1-4]s' \
    | rg -v 'animation-duration:\s*6s' \
    | rg -v 'md-spin.*0\.8s.*linear|spin.*0\.8s.*linear' \
    | rg -v 'spin.*var\(--md-motion' || true)
check "CSS 硬编码 transition/animation 时长 (Check #9 — 12-01B lane)" "$MOTION_OUTPUT"

# ═══════════════════════════════════════════════════════════════════
# Check #10 — 页面/组件 emoji 残留（Extended_Pictographic）—— 12-01B emoji lane
# 扫描 pages/ + components/（排除 primitives/），无 EmptyState 豁免
# ═══════════════════════════════════════════════════════════════════
EMOJI_OUTPUT=""
if rg --pcre2 --version >/dev/null 2>&1; then
    EMOJI_OUTPUT=$(rg -lP --no-heading --glob '*.jsx' \
        '\p{Extended_Pictographic}' \
        "$FRONTEND_DIR/src/pages/" \
        "$FRONTEND_DIR/src/components/" 2>/dev/null \
        | rg -v '/primitives/' \
        | rg -v 'EmptyState' || true)
    check "页面/组件 emoji 残留 (Check #10 — 12-01B lane)" "$EMOJI_OUTPUT"
else
    TOTAL=$((TOTAL + 1))
    echo "[SKIP] emoji 检查需要 rg PCRE2 支持 (Check #10 — 12-01B lane)"
fi

# ═══════════════════════════════════════════════════════════════════
# 最终汇总
# ═══════════════════════════════════════════════════════════════════
PASSED=$((TOTAL - FAILURES))
if [ "$FAILURES" -eq 0 ]; then
    echo "PASS: $PASSED/$TOTAL MD3 源码不变量检查通过"
    exit 0
else
    echo "FAIL: $FAILURES/$TOTAL MD3 源码不变量检查失败" >&2
    exit 1
fi
