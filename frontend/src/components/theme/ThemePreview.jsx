/**
 * ThemePreview — Phase 17 (TPAGE-03 / D-06)
 *
 * /theme 卡片内嵌的迷你 UI 预览（不消费独立 props —— 它读取父级 scope
 * 内的 [data-fc-theme-scope] CSS 变量，因此渲染的就是该主题真实应用
 * 效果，而非 mocked 截图）。包含：
 *   - 1 elevated Card（含标题 + 副标题）
 *   - 1 filled Button + 1 tonal Button
 *   - 1 selected filter Chip
 *   - 4 段 surface ramp（surface-container-lowest → highest）展示梯度
 *
 * 所有内联样式使用 var(--md-*) 令牌；零 hex literal（满足 Check #8）。
 */

import Button from '../primitives/Button';
import Card from '../primitives/Card';
import Chip from '../primitives/Chip';

export default function ThemePreview() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--md-spacing-2)',
      }}
    >
      <Card
        variant="elevated"
        style={{ padding: 'var(--md-spacing-2)', marginBottom: 'var(--md-spacing-1)' }}
      >
        <div
          style={{
            fontSize: '11px',
            color: 'var(--md-color-on-surface)',
            fontWeight: 600,
            fontFamily: 'var(--md-font-display)',
          }}
        >
          菜品示例
        </div>
        <div
          style={{
            fontSize: '9px',
            color: 'var(--md-color-on-surface-variant)',
            marginTop: 'var(--md-spacing-1)',
          }}
        >
          麻婆豆腐 · 川菜
        </div>
      </Card>
      <div style={{ display: 'flex', gap: 'var(--md-spacing-2)' }}>
        <Button
          variant="filled"
          size="sm"
          style={{ fontSize: '10px', padding: 'var(--md-spacing-1) var(--md-spacing-2)' }}
        >
          主操作
        </Button>
        <Button
          variant="tonal"
          size="sm"
          style={{ fontSize: '10px', padding: 'var(--md-spacing-1) var(--md-spacing-2)' }}
        >
          次操作
        </Button>
      </div>
      <Chip
        variant="filter"
        selected
        style={{
          alignSelf: 'flex-start',
          fontSize: '10px',
          padding: 'var(--md-spacing-1) var(--md-spacing-2)',
        }}
      >
        已选标签
      </Chip>
      {/* 4-step surface ramp（D-06）—— 色彩梯度一眼可见 */}
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          height: '14px',
          borderRadius: 'var(--md-radius-xs)',
          overflow: 'hidden',
          marginTop: 'var(--md-spacing-1)',
          border: '1px solid var(--md-color-outline-variant)',
        }}
      >
        <div style={{ flex: 1, background: 'var(--md-color-surface-container-lowest)' }} />
        <div style={{ flex: 1, background: 'var(--md-color-surface-container-low)' }} />
        <div style={{ flex: 1, background: 'var(--md-color-surface-container)' }} />
        <div style={{ flex: 1, background: 'var(--md-color-surface-container-high)' }} />
      </div>
    </div>
  );
}
