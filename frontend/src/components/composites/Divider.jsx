/**
 * MD3 Divider Composite（Phase 11 — COMPO-12）
 *
 * 默认全宽；inset 变体左缩进 56dp，与包含 leading slot 的 headline 对齐。
 */

import './Divider.css';

export default function Divider({
  inset = false,
  className = '',
  ...rest
}) {
  const classes = [
    'md-divider',
    inset && 'md-divider--inset',
    className,
  ].filter(Boolean).join(' ');

  return (
    <hr
      {...rest}
      className={classes}
      role="separator"
    />
  );
}
