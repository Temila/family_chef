/**
 * MD3 Input Primitive (Phase 10 — COMPO-04)
 *
 * Outlined/Filled variants + label prop (CSS-only floating via :placeholder-shown)
 * + error prop + supportingText + leadingIcon/trailingIcon + forwardRef。
 * Native input/textarea 属性全透传 (type, required, autoComplete, minLength, pattern 等)。
 *
 * 三种用法 (CONTEXT D-11):
 *   <Input label="名称" />                           — MD3 浮动 label
 *   <Input label="名称" placeholder="..." />          — 浮动 label + placeholder
 *   <Input aria-label="搜索" />                      — 无 label 受控 input
 *
 * 关键: placeholder 默认注入空格 sentinel (' ') 触发 CSS :placeholder-shown 浮动条件。
 */

import { forwardRef, useId } from 'react';
import Icon from './Icon';
import './Input.css';

const Input = forwardRef(function Input({
  variant = 'outlined',
  label,
  error,
  supportingText,
  leadingIcon,
  trailingIcon,
  multiline = false,
  rows = 4,
  className = '',
  id: idProp,
  value,
  onChange,
  type = 'text',
  disabled,
  placeholder,
  ...rest
}, ref) {
  const autoId = useId();
  const id = idProp || autoId;
  const describedById = `${id}-supporting`;
  const hasError = Boolean(error);

  const classes = [
    'md-input-wrapper',
    `md-input-wrapper--${variant}`,
    hasError && 'md-input-wrapper--error',
    disabled && 'md-input-wrapper--disabled',
    multiline && 'md-input-wrapper--multiline',
    className,
  ].filter(Boolean).join(' ');

  // Dev-only warn: trailingIcon 在 multiline 模式下不适用
  if (import.meta.env.DEV && multiline && trailingIcon) {
    console.warn('[Input] trailingIcon ignored on multiline (textarea)');
  }

  const sharedProps = {
    ref,
    id,
    className: 'md-input__field',
    value,
    onChange,
    disabled,
    placeholder: placeholder || ' ', // sentinel 空格触发 CSS :placeholder-shown
    'aria-invalid': hasError || undefined,
    'aria-describedby': (supportingText || error) ? describedById : undefined,
    ...rest,
  };

  return (
    <div className={classes}>
      {leadingIcon && <Icon name={leadingIcon} size={20} className="md-input__leading-icon" />}
      {multiline ? (
        <textarea {...sharedProps} rows={rows} />
      ) : (
        <input {...sharedProps} type={type} />
      )}
      {label && (
        <label htmlFor={id} className="md-input__label">
          {label}
        </label>
      )}
      {trailingIcon && !multiline && (
        <Icon name={trailingIcon} size={20} className="md-input__trailing-icon" />
      )}
      {(supportingText || error) && (
        <div
          id={describedById}
          className={`md-input__supporting${hasError ? ' md-input__supporting--error' : ''}`}
        >
          {error || supportingText}
        </div>
      )}
    </div>
  );
});

export default Input;
