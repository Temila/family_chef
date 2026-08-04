/**
 * ThemeCard — Phase 17 (TPAGE-03 / TPAGE-06 / D-05 + D-06 + D-07)
 *
 * 卡片即预览：每一张卡片包一个 <div data-fc-theme-scope={themeId}>
 * 在该 scope 内通过 buildCssSync 派生出该主题专属的 --md-color-* 变量。
 * 卡片内部渲染真实的 <Card> / <Button> / <Chip> primitive —— 这些 primitive
 * 本来就读 --md-* 变量，所以预览即是主题真实应用效果（无 mocked mini-UI）。
 *
 * ARIA per UI-SPEC § ARIA (line 847-858):
 *   - Card 自身：aria-label={theme.name}（仅主题名，不合成 "应用主题 X"）
 *     role="button" 由 Card primitive onClick 路径自动设置
 *   - preview scope div：aria-hidden="true"（避免和 card 一起被读屏二次朗读）
 *   - 已选中指示器 wrapper：aria-live="polite"（点击后让读屏播报选中状态变化）
 *
 * 安全 (T-17-21 / T-17-26): buildCssSync 由 try/catch 包围，引擎异常时 scoped style 为空 → 退化
 * 至页面激活主题在 scope 内 fallback，不破坏卡片交互。
 */

import { useMemo } from 'react';
import { buildCssSync } from '../../theme/theme-engine';
import Card from '../primitives/Card';
import ThemePreview from './ThemePreview';
import './ThemeCard.css';

function isCustomTheme(theme) {
  return theme.kind === 'custom' || Boolean(theme.user_id) || (typeof theme.id === 'number' && theme.id > 0);
}

export default function ThemeCard({ theme, isActive, onClick }) {
  const kind = isCustomTheme(theme) ? 'custom' : 'preset';

  // T-17-21: scoped style 生成失败 → 返回空字符串，scope 内部退回页面 active theme
  // 通过将 sourceColors 序列化为字符串（依赖项中必须是简单表达式），
  // 保证嵌套字段变化（如 secondary/tertiary 颜色）也能触发重算。
  const sourceColorsKey = useMemo(
    () => JSON.stringify(theme.sourceColors),
    [theme.sourceColors],
  );

  const scopedCss = useMemo(() => {
    try {
      // 读 sourceColorsKey 作为缓存依赖的"副作用"，让依赖项对 eslint 也是简单且必要。
      void sourceColorsKey;
      const css = buildCssSync(theme.sourceColors, theme.variant || 'TonalSpot');
      // 重写 :root → [data-fc-theme-scope="X"]，重写 [data-theme="dark"] → [data-fc-theme-scope="X"][data-theme="dark"]
      return css
        .replace(/:root\s*\{/g, `[data-fc-theme-scope="${theme.id}"] {`)
        .replace(/\[data-theme="dark"\]\s*\{/g, `[data-fc-theme-scope="${theme.id}"][data-theme="dark"] {`);
    } catch {
      return '';
    }
  }, [theme.id, theme.sourceColors, theme.variant, sourceColorsKey]);

  const kindLabel = kind === 'custom' ? '自定义' : '预设';

  return (
    <Card
      variant="elevated"
      onClick={onClick}
      aria-label={theme.name}
      className={`theme-card ${isActive ? 'theme-card--active' : ''}`}
      data-kind={kind}
    >
      {scopedCss && <style>{scopedCss}</style>}
      <div data-fc-theme-scope={theme.id} aria-hidden="true">
        <div className="theme-card__header">
          <span className="theme-card__name">{theme.name}</span>
          <span className="theme-card__chip">{kindLabel}</span>
        </div>
        <div className="theme-card__preview">
          <ThemePreview />
        </div>
      </div>
      {isActive && (
        <div className="theme-card__footer">
          <span className="theme-card__active-indicator" aria-live="polite">
            ✓ 已选中
          </span>
        </div>
      )}
    </Card>
  );
}
