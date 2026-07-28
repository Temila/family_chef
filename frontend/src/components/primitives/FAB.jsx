/**
 * MD3 FAB Primitive (Phase 10 — COMPO-05)
 *
 * 3 forms：
 *   default  — <FAB icon="add" />                                   (56dp 圆角方块)
 *   extended — <FAB variant="extended" icon="add" label="新建菜品" />(56dp 高 + label pill)
 *   small    — <FAB size="small" icon="add" />                      (40dp 视觉 in 48dp hit)
 *
 * 内置 Ripple + 内置 Icon + forwardRef。
 * --md-radius-md (16px) 圆角锁定（D-08）；无 transform: scale、无 position: fixed（placement 由 page consumer 控制）。
 *
 * 公开 API：icon, variant="default|extended", size=undefined|"small", label, ariaLabel, disabled, type, className, onClick, ...rest
 */

import { forwardRef } from 'react';
import Ripple from './Ripple';
import Icon from './Icon';
import './FAB.css';

const FAB = forwardRef(function FAB({
  icon,
  variant = 'default',
  size,
  label,
  ariaLabel,
  disabled = false,
  type = 'button',
  className = '',
  onClick,
  ...rest
}, ref) {
  // size 仅接受 undefined 或 'small'；variant='extended' 时 size 应为 undefined
  const visualSize = size === 'small' ? 'small' : 'default';

  // 开发期校验：FAB 必须有 accessible name（ariaLabel 或 label 二选一）
  if (import.meta.env.DEV && !ariaLabel && !label) {
    console.warn('[FAB] ariaLabel or label prop required for accessibility');
  }

  const classes = [
    'md-fab',
    'md-interactive',
    variant === 'extended'
      ? 'md-fab--extended'
      : visualSize === 'small'
        ? 'md-fab--small'
        : 'md-fab--default',
    className,
  ].filter(Boolean).join(' ');

  // extended 时 icon size 24；small 时 icon size 16；default 时 icon size 24
  const iconSize = visualSize === 'small' ? 16 : 24;

  return (
    <Ripple mode="self" disabled={disabled}>
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled}
        aria-label={ariaLabel || label}
        onClick={onClick}
        {...rest}
      >
        <Icon name={icon} size={iconSize} />
        {variant === 'extended' && label && (
          <span className="md-fab__label">{label}</span>
        )}
      </button>
    </Ripple>
  );
});

export default FAB;
