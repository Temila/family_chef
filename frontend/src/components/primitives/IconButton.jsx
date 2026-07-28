/**
 * MD3 IconButton Primitive (Phase 10 — COMPO-02)
 *
 * density=default (40dp 视觉居中于 48dp hit box) | density=fab (48dp 视觉 = 48dp hit)
 * 内置 Ripple + 内置 Icon + forwardRef；ariaLabel 必填（开发期缺失仅 warn，不抛错）。
 *
 * 公开 API：
 *   <IconButton icon="edit" ariaLabel="编辑" onClick={fn} />
 *   <IconButton icon="check" density="fab" selected={true} ariaLabel="确认" />
 *
 * 透传 native button 属性（onClick / disabled / type / data-* / ref）。
 */

import { forwardRef } from 'react';
import Ripple from './Ripple';
import Icon from './Icon';
import './IconButton.css';

const IconButton = forwardRef(function IconButton({
  icon,
  density = 'default',
  selected = false,
  disabled = false,
  type = 'button',
  ariaLabel,
  className = '',
  onClick,
  ...rest
}, ref) {
  // 开发期校验：accessibility 要求每个 IconButton 必须有 accessible name
  if (import.meta.env.DEV && !ariaLabel) {
    console.warn('[IconButton] ariaLabel prop required for accessibility');
  }

  const classes = [
    'md-icon-button',
    'md-interactive',
    `md-icon-button--${density}`,
    selected && 'md-icon-button--selected',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Ripple mode="self" disabled={disabled}>
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-pressed={selected || undefined}
        onClick={onClick}
        {...rest}
      >
        <Icon name={icon} size={20} />
      </button>
    </Ripple>
  );
});

export default IconButton;
