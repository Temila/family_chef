/**
 * MD3 Modal Composite (Phase 11 — COMPO-08)
 *
 * 统一 Modal 组件：basic + full-screen 双变体。
 * 替换 7 个 wrapper Modal 组件 + 15 个 inline modal-overlay 站点。
 *
 * 内建 MD3 行为：focus trap + ESC 关闭 + 背景滚动锁定 + 焦点归还。
 *
 * 公开 API：
 *   variant        'basic' | 'full-screen' | 'bottom-sheet'（caller 显式 opt-in）
 *   open           控制渲染（false → return null）
 *   onClose        backdrop / ESC / close icon 触发的关闭回调
 *   title          标题文本（默认 header slot 渲染）
 *   closeIcon      是否渲染右上角 ✕（默认 true；form 场景显式 false）
 *   header         自定义 header slot（覆盖默认 title + closeIcon）
 *   footer         自定义 footer slot（覆盖默认 actions）
 *   actions        ReactNode 数组（自动包 md-modal__actions flex 容器）
 *   children       modal-body 内容
 *   closeOnBackdrop 点击 backdrop 是否触发 onClose（默认 true）
 *   labelledBy     aria-labelledby id（caller 提供）
 *   describedBy    aria-describedby id（caller 提供）
 *   initialFocusRef 可选，打开时聚焦元素（默认 close button）
 *   className      附加 class
 *   style          max-width 等样式覆写（full-screen 变体忽略）
 */

import { useEffect, useRef } from 'react';
import { trapFocusWithin } from '../../utils';
import './Modal.css';

export default function Modal({
  variant = 'basic',
  open = true,
  onClose,
  title,
  closeIcon = true,
  header,
  footer,
  actions,
  children,
  closeOnBackdrop = true,
  labelledBy,
  describedBy,
  initialFocusRef,
  className = '',
  style,
}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  // 锁定背景滚动、聚焦初始元素，并在关闭后把焦点还给触发元素。
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (initialFocusRef?.current || closeRef.current)?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (
        previouslyFocused &&
        typeof previouslyFocused.focus === 'function' &&
        document.contains(previouslyFocused)
      ) {
        previouslyFocused.focus();
      }
    };
  }, [open, initialFocusRef]);

  // ESC 关闭（caller 在 onClose 中自行 guarding submitting/confirming）
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
  };

  const isFullScreen = variant === 'full-screen';
  const overlayClasses = [
    'md-modal-overlay',
    `md-modal--${variant}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={overlayClasses} onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        className="md-modal"
        style={isFullScreen ? undefined : style}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => trapFocusWithin(e, dialogRef.current)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {/* Header slot：自定义 slot 优先；否则默认 title + closeIcon */}
        {header !== undefined ? (
          <div className="md-modal__header">{header}</div>
        ) : (
          <div className="md-modal__header">
            <h3 className="md-modal__title" id={labelledBy}>
              {title}
            </h3>
            {closeIcon && (
              <button
                ref={closeRef}
                type="button"
                className="md-modal__close md-interactive"
                onClick={onClose}
                aria-label={`关闭${title || '窗口'}`}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Body：children 直接渲染 */}
        <div className="md-modal__body">{children}</div>

        {/* Footer slot：自定义 slot 优先；否则 actions 数组自动包 flex 容器 */}
        {footer !== undefined ? (
          <div className="md-modal__footer">{footer}</div>
        ) : actions ? (
          <div className="md-modal__footer">
            <div className="md-modal__actions">
              {Array.isArray(actions) ? actions : [actions]}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
