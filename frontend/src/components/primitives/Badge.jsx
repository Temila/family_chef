/**
 * MD3 Badge Primitive（Phase 10 — COMPO-06）
 * 纯视觉组件：3 variants × 8 tones，并保留旧 status/text/type API（D-15）。
 */

import { statusBadge } from '../../utils';
import Icon from './Icon';
import './Badge.css';

const CLS_TO_TONE = {
  'badge-warn': 'warn',
  'badge-danger': 'error',
  'badge-success': 'success',
  'badge-info': 'info',
  'badge-accent': 'primary',
  'badge-gold': 'tertiary',
  'badge-muted': 'muted',
};

const VARIANTS = ['assist', 'filter', 'state', 'count'];
const TONES = ['primary', 'secondary', 'tertiary', 'error', 'success', 'warn', 'info', 'muted'];

export default function Badge({
  variant = 'state',
  tone,
  status,
  text,
  type,
  leadingIcon,
  count,
  children,
  className = '',
  ...rest
}) {
  if (count !== undefined && count !== null) {
    if (!count) return null;
    const displayCount = Number(count) > 99 ? '99+' : count;
    return (
      <span className={`md-badge md-badge--count md-badge--error ${className}`.trim()} {...rest}>
        {displayCount}
      </span>
    );
  }

  let resolvedText = children;
  let resolvedTone = tone;

  if (status !== undefined) {
    const badgeInfo = statusBadge(status);
    resolvedText = badgeInfo.text;
    resolvedTone = CLS_TO_TONE[badgeInfo.cls] || 'info';
  } else if (text !== undefined) {
    resolvedText = text;
    resolvedTone = CLS_TO_TONE[`badge-${type || 'info'}`] || 'info';
  }

  const safeVariant = VARIANTS.includes(variant) ? variant : 'state';
  const safeTone = TONES.includes(resolvedTone) ? resolvedTone : 'info';
  const classes = [
    'md-badge',
    `md-badge--${safeVariant}`,
    `md-badge--${safeTone}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} {...rest}>
      {leadingIcon && <Icon name={leadingIcon} size={14} className="md-badge__icon" />}
      {resolvedText}
    </span>
  );
}
