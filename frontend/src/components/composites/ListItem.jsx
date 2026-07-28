/**
 * MD3 ListItem Composite（Phase 11 — COMPO-11）
 *
 * 支持 1/2/3-line 变体、五个 compound slots、整行点击与键盘激活。
 * Trailing slot 在冒泡阶段隔离内部操作，避免触发行级 onClick。
 */

import { forwardRef, useCallback } from 'react';

import Ripple from '../primitives/Ripple';
import './ListItem.css';

const ListItem = forwardRef(function ListItem({
  variant = '1-line',
  onClick,
  disabled = false,
  as: As = 'div',
  className = '',
  children,
  ...rest
}, ref) {
  const isClickable = Boolean(onClick) && !disabled;

  const classes = [
    'md-list-item',
    `md-list-item--${variant}`,
    isClickable && 'md-list-item--clickable',
    isClickable && 'md-interactive',
    disabled && 'md-list-item--disabled',
    className,
  ].filter(Boolean).join(' ');

  const handleKeyDown = isClickable
    ? (event) => {
        // 嵌套在 Trailing 中的按钮拥有自己的键盘行为，不能重复触发行点击。
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick(event);
        }
      }
    : undefined;

  return (
    <Ripple
      disabled={!isClickable}
      style={{ width: '100%', pointerEvents: 'auto' }}
    >
      <As
        {...rest}
        ref={ref}
        className={classes}
        onClick={isClickable ? onClick : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        aria-disabled={disabled || undefined}
        onKeyDown={handleKeyDown}
      >
        {children}
      </As>
    </Ripple>
  );
});

function Leading({ children, className = '' }) {
  const classes = ['md-list-item__leading', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
}

function Content({ children, className = '' }) {
  const classes = ['md-list-item__content', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
}

function Headline({ children, className = '' }) {
  const classes = ['md-list-item__headline', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
}

function Supporting({ children, className = '' }) {
  const classes = ['md-list-item__supporting', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
}

function Trailing({
  children,
  onClick,
  className = '',
  as: TrailingAs = 'div',
  ...rest
}) {
  const handleClick = useCallback((event) => {
    event.stopPropagation();
    onClick?.(event);
  }, [onClick]);

  const classes = ['md-list-item__trailing', className]
    .filter(Boolean)
    .join(' ');

  return (
    <TrailingAs
      {...rest}
      className={classes}
      onClick={handleClick}
    >
      {children}
    </TrailingAs>
  );
}

ListItem.Leading = Leading;
ListItem.Content = Content;
ListItem.Headline = Headline;
ListItem.Supporting = Supporting;
ListItem.Trailing = Trailing;

export default ListItem;
