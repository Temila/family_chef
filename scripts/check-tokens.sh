#!/bin/bash
# ================================================
# 家味 · Family Chef — MD3 设计令牌回归防护 (Wave 3)
#
# 检测以下回归，任一命中即失败：
#   1. 旧 color/bg/text/border/shadow/semantic/ghost/wish 令牌名
#   2. 旧 shape/typography/motion/nav-height 令牌名
#   3. tokens.css 之外的 #xxxxxx 十六进制色值
#   4. styles.css 中的 rgba() 原始色值（应通过 --md-elevation-* 消费）
#   5. styles.css 中的硬编码 border-radius: <非零>px
#   6. JSX 中的硬编码 borderRadius: <非零>number
#   7. tokens.css 存在且包含全部 MD3 令牌族
#   8. JSX style prop 中 color/background 的硬编码 #xxxxxx 十六进制色值（Phase 17 D-23 — .js 主题色生成器天然豁免）
# ================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_DIR/frontend"

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

if [ ! -d "$FRONTEND_DIR/src" ]; then
    echo "FATAL: frontend/src not found at $FRONTEND_DIR/src" >&2
    exit 2
fi

# Check #1 — 旧颜色/背景/文本/边框/阴影/语义/幽灵/wish 令牌名
OLD_COLOR_OUTPUT=$(rg -n --no-heading \
    "var\(--(accent|bg-(primary|secondary|card|card-hover|elevated|input|page|hover)|text-(primary|secondary|muted)|border(-medium|-strong)?|shadow-(sm|md|lg|accent)|success(-light)?|warn(-light)?|danger(-light)?|info(-light)?|gold(-light)?|unread-dot|size-unread-dot|space-wish-card-stack|primary\)|warning-bg|warning-text)\b" \
    "$FRONTEND_DIR/src/" 2>/dev/null || true)
check "旧颜色/语义令牌名 (Check #1)" "$OLD_COLOR_OUTPUT"

# Check #2 — 旧 shape/typography/motion/nav-height 令牌名
OLD_SHAPE_OUTPUT=$(rg -n --no-heading \
    "var\(--(radius-(sm|md|lg|xl|full)|font-(display|body)|transition-(fast|normal)|nav-height|shadow-)\b" \
    "$FRONTEND_DIR/src/" 2>/dev/null || true)
check "旧 shape/typography/motion/nav-height 令牌名 (Check #2)" "$OLD_SHAPE_OUTPUT"

# Check #3 — tokens.css 之外的 6 位十六进制色值
HEX_OUTPUT=$(rg -n --no-heading "#[0-9a-fA-F]{6}\b" \
    "$FRONTEND_DIR/src/css/styles.css" \
    "$FRONTEND_DIR/src/components/" \
    "$FRONTEND_DIR/src/pages/" 2>/dev/null || true)
check "tokens.css 之外的 #xxxxxx 十六进制色值 (Check #3)" "$HEX_OUTPUT"

# Check #4 — styles.css 中的 rgba() 原始色值
RGBA_OUTPUT=$(rg -n --no-heading "rgba\(" \
    "$FRONTEND_DIR/src/css/styles.css" 2>/dev/null || true)
check "styles.css 中的 rgba() 原始色值 (Check #4)" "$RGBA_OUTPUT"

# Check #5 — styles.css 中硬编码 border-radius: <非零>px
CSS_RADIUS_OUTPUT=$(rg -n --no-heading "border-radius:\s*[1-9][0-9]*px" \
    "$FRONTEND_DIR/src/css/styles.css" 2>/dev/null || true)
check "styles.css 硬编码 border-radius (Check #5)" "$CSS_RADIUS_OUTPUT"

# Check #6 — JSX 中硬编码 borderRadius: <非零>number
JSX_RADIUS_OUTPUT=$(rg -n --no-heading "borderRadius:\s*[1-9][0-9]*[,\s}]" \
    "$FRONTEND_DIR/src/components/" \
    "$FRONTEND_DIR/src/pages/" 2>/dev/null || true)
check "JSX 硬编码 borderRadius (Check #6)" "$JSX_RADIUS_OUTPUT"

# Check #7 — tokens.css 存在且包含全部 MD3 令牌族
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

# Check #8 — JSX style prop 中的硬编码 #xxxxxx 十六进制色值（Phase 17 D-23）
# presets.js / theme-engine.js 因扩展名为 .js 不匹配 --glob '*.jsx'，天然豁免
echo "=== Check 8: JSX hex-lint ==="
JSX_HEX_OUTPUT=$(rg -n --no-heading "\b(color|background[A-Za-z]*):\s*['\"]#[0-9a-fA-F]{6}\b" \
    --glob '*.jsx' \
    "$FRONTEND_DIR/src/components/" \
    "$FRONTEND_DIR/src/pages/" 2>/dev/null || true)
check "JSX 中的 #xxxxxx 硬编码色值 (Check #8)" "$JSX_HEX_OUTPUT"

# 最终汇总
PASSED=$((TOTAL - FAILURES))
if [ "$FAILURES" -eq 0 ]; then
    echo "PASS: $PASSED/$TOTAL 令牌不变量检查通过"
    exit 0
else
    echo "FAIL: $FAILURES/$TOTAL 令牌不变量检查失败" >&2
    exit 1
fi
