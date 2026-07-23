/**
 * WishRejectModal Component - 拒绝愿望弹窗（D-08：本弹窗即破坏性确认，不再叠加 ConfirmModal）
 * 必填拒绝原因（1-500 字），提交通过 onSuccess(reason) 回调委托给父页面。
 */

import { useEffect, useState } from 'react';

const MAX_REASON = 500;

export default function WishRejectModal({ onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 背景滚动锁定（W3C WAI modal 模式）
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // ESC 关闭（提交中除外）
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, submitting]);

  const trimmed = reason.trim();
  const isValid = trimmed.length >= 1 && trimmed.length <= MAX_REASON;

  const handleChange = (e) => {
    setReason(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !isValid) return;
    setSubmitting(true);
    // 父页面在失败时会吞掉异常并保持弹窗打开，try/finally 确保无论成功失败 submitting 都复位
    try {
      await onSuccess?.(trimmed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wish-reject-title"
      >
        <div className="modal-header">
          <h3 id="wish-reject-title">拒绝愿望</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="关闭拒绝愿望窗口"
          >
            ✕
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="wish-reject-reason">
              拒绝原因 *
            </label>
            <textarea
              id="wish-reject-reason"
              className="form-input"
              rows={4}
              value={reason}
              onChange={handleChange}
              placeholder="请说明拒绝原因（必填）"
              maxLength={MAX_REASON}
              autoFocus
            />
            <div className={'form-error' + (error ? ' show' : '')}>{error}</div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              暂不拒绝
            </button>
            <button
              type="submit"
              className="btn"
              style={{ background: 'var(--danger)', color: '#fff' }}
              disabled={!isValid || submitting}
            >
              确认拒绝
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
