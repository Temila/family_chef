/**
 * EmptyState Component - 空状态
 *
 * Phase 12 D-EMOJI-01: icon prop 接受 string（Icon 名称）或 ReactNode。
 *   - string：经 <Icon name={icon} size={48} /> 渲染为 Material Symbols
 *   - ReactNode：原样渲染（保留调用方自定义能力）
 * 默认 'mail'（空收件箱隐喻）。
 */

import Icon from './primitives/Icon';

export default function EmptyState({ icon = 'mail', text = '暂无数据', subtext }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {typeof icon === 'string' ? <Icon name={icon} size={48} /> : icon}
      </div>
      <div className="empty-state-text">{text}</div>
      {subtext && (
        <div style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)', marginTop: 'var(--md-spacing-1)', lineHeight: 1.5 }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
