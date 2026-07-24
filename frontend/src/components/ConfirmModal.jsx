/**
 * ConfirmModal Component - 通用确认弹窗
 * 支持 danger 模式（红色确认按钮）。
 * 无障碍增强（Phase 7）：role=dialog / aria-modal / aria-labelledby / ESC 关闭 / 背景滚动锁定，
 * 使撤销愿望等复用场景满足 UI-SPEC §7.5 的 W3C WAI modal 模式。
 */

import { useEffect, useRef } from 'react';
import { trapFocusWithin } from '../utils';

export default function ConfirmModal({
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  danger = false,
  confirming = false,
}) {
  const dialogRef = useRef(null);
  const confirmRef = useRef(null);

  // 锁定背景滚动、聚焦主操作，并在关闭后把焦点还给触发元素。
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    confirmRef.current?.focus();
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
  }, []);

  // ESC 关闭
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && !confirming) onCancel?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [confirming, onCancel]);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="modal-content"
        style={{ maxWidth: 360 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => trapFocusWithin(e, dialogRef.current)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-body"
        tabIndex={-1}
      >
        <div className="modal-header">
          <h3 id="confirm-modal-title">{title}</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            aria-label={`关闭${title}窗口`}
          >
            ✕
          </button>
        </div>
        <div
          id="confirm-modal-body"
          className="modal-body"
          style={{ color: 'var(--md-color-on-surface-variant)', lineHeight: 1.6 }}
        >
          {message}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={confirming}>
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={danger ? 'btn btn-outline' : 'btn btn-primary'}
            style={
              danger
                ? { borderColor: 'var(--md-color-error)', color: 'var(--md-color-error)' }
                : undefined
            }
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
