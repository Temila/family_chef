/**
 * ConfirmModal Component - 通用确认弹窗
 * 支持 danger 模式（红色确认按钮）。
 * 无障碍增强（Phase 7）：role=dialog / aria-modal / aria-labelledby / ESC 关闭 / 背景滚动锁定，
 * 使撤销愿望等复用场景满足 UI-SPEC §7.5 的 W3C WAI modal 模式。
 */

import { useEffect } from 'react';

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
  // 背景滚动锁定
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // ESC 关闭
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="modal-content"
        style={{ maxWidth: 360 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="confirm-modal-title">{title}</h3>
          <button
            className="modal-close"
            onClick={onCancel}
            aria-label={`关闭${title}窗口`}
          >
            ✕
          </button>
        </div>
        <div
          className="modal-body"
          style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}
        >
          {message}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel} disabled={confirming}>
            {cancelText}
          </button>
          <button
            className={danger ? 'btn btn-outline' : 'btn btn-primary'}
            style={
              danger
                ? { borderColor: 'var(--danger)', color: 'var(--danger)' }
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
