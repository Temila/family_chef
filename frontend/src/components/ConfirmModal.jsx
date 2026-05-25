/**
 * ConfirmModal Component - 通用确认弹窗
 * 支持 danger 模式（红色确认按钮）
 */

export default function ConfirmModal({
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  danger = false,
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content"
        style={{ maxWidth: 360 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onCancel}>
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
          <button className="btn btn-secondary" onClick={onCancel}>
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
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
