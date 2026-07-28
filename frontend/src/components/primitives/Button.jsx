/**
 * MD3 Button Primitive (Phase 10 — COMPO-01)
 *
 * 4 variants × 3 sizes + loading + 内置 Ripple + 16dp spinner + forwardRef。
 * Variants: filled | tonal | outlined | text
 * Sizes:    sm (32dp visual / 48dp hit) | md (40dp / 48dp) | lg (48dp / 48dp)
 *
 * 公开 API：variant, size, loading, disabled, type, icon, children, className, onClick, ...rest
 * 默认 type="button"，调用方需 form submit 时显式 type="submit"。
 */

import { forwardRef } from 'react';
import Ripple from './Ripple';
import Icon from './Icon';
import './Button.css';

const Button = forwardRef(function Button({
  variant = 'filled',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  icon,
  children,
  className = '',
  onClick,
  ...rest
}, ref) {
  const classes = [
    'md-button',
    'md-interactive',
    `md-button--${variant}`,
    `md-button--${size}`,
    loading && 'md-button--loading',
    className,
  ].filter(Boolean).join(' ');

  const showSpinner = loading === true;
  const showIcon = !showSpinner && icon;
  const iconSize = size === 'sm' ? 16 : (size === 'lg' ? 20 : 18);

  return (
    <Ripple mode="self" disabled={disabled || loading}>
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        onClick={showSpinner ? undefined : onClick}
        {...rest}
      >
        {showSpinner && (
          <svg
            className="md-button__spinner"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <circle
              cx="8"
              cy="8"
              r="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="28 10"
              strokeLinecap="round"
            />
          </svg>
        )}
        {showIcon && <Icon name={icon} size={iconSize} />}
        {children}
      </button>
    </Ripple>
  );
});

export default Button;
