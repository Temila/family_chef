/**
 * MD3 Chip Primitive（Phase 10 — COMPO-07）
 * 4 variants：assist/filter/input/suggestion；交互反馈由 state-layer 提供。
 */

import Icon from './Icon';
import './Chip.css';

const VARIANTS = ['assist', 'filter', 'input', 'suggestion'];
const VARIANT_CLASSES = {
  assist: 'md-chip--assist',
  filter: 'md-chip--filter',
  input: 'md-chip--input',
  suggestion: 'md-chip--suggestion',
};

function ChipContent({ leadingIcon, children }) {
  return (
    <>
      {leadingIcon && <Icon name={leadingIcon} size={18} className="md-chip__leading-icon" />}
      <span className="md-chip__label">{children}</span>
    </>
  );
}

export default function Chip({
  variant = 'assist',
  selected = false,
  leadingIcon,
  onRemove,
  onClick,
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  const safeVariant = VARIANTS.includes(variant) ? variant : 'assist';
  const classes = [
    'md-chip',
    VARIANT_CLASSES[safeVariant],
    selected && safeVariant === 'filter' && 'md-chip--selected',
    disabled && 'md-chip--disabled',
    className,
  ].filter(Boolean).join(' ');

  if (safeVariant === 'filter') {
    return (
      <button
        type="button"
        className={classes}
        onClick={onClick}
        aria-pressed={selected}
        disabled={disabled}
        {...rest}
      >
        <span className="md-chip__check" aria-hidden="true">
          <Icon name="check" size={18} />
        </span>
        <ChipContent leadingIcon={leadingIcon}>{children}</ChipContent>
      </button>
    );
  }

  if (safeVariant === 'input') {
    return (
      <span className="md-chip__interactive-wrapper">
        <span className={classes} {...rest}>
          <ChipContent leadingIcon={leadingIcon}>{children}</ChipContent>
          <button
            type="button"
            className="md-chip__remove"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`移除${children}`}
          >
            <Icon name="close" size={18} />
          </button>
        </span>
      </span>
    );
  }

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick} disabled={disabled} {...rest}>
        <ChipContent leadingIcon={leadingIcon}>{children}</ChipContent>
      </button>
    );
  }

  return (
    <span className={classes} {...rest}>
      <ChipContent leadingIcon={leadingIcon}>{children}</ChipContent>
    </span>
  );
}
