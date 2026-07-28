/**
 * MD3 Card Primitive (Phase 10 — COMPO-03)
 *
 * 3 variants (elevated/filled/outlined) + 4 slots (image/header/children/footer)
 * + optional onClick; clickable 时启用 ripple/state/elevation/keyboard activation;
 * static 时无 cursor/ripple (符合 GuestDishCard 静态展示需求)。
 *
 * 公开 API：variant, image, header, footer, onClick, className, children, ...rest
 * Slots: image (aspect-ratio 4/3, 无 padding), header (16dp top/12dp bottom),
 *        children as body (16dp padding), footer (16dp padding, actions right-aligned)
 */

import { forwardRef } from 'react';
import Ripple from './Ripple';
import './Card.css';

const Card = forwardRef(function Card({
  variant = 'elevated',
  image,
  header,
  footer,
  onClick,
  className = '',
  children,
  ...rest
}, ref) {
  const isClickable = Boolean(onClick);

  const classes = [
    'md-card',
    `md-card--${variant}`,
    isClickable && 'md-card--clickable',
    className,
  ].filter(Boolean).join(' ');

  const handleKeyDown = isClickable
    ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      }
    : undefined;

  return (
    <Ripple disabled={!isClickable}>
      <div
        ref={ref}
        className={classes}
        onClick={onClick}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={handleKeyDown}
        {...rest}
      >
        {image && <div className="md-card__image">{image}</div>}
        {header && <div className="md-card__header">{header}</div>}
        <div className="md-card__body">{children}</div>
        {footer && <div className="md-card__footer">{footer}</div>}
      </div>
    </Ripple>
  );
});

export default Card;
