/**
 * ConfirmModal Component - 通用确认弹窗（Phase 11：thin wrapper over <Modal>）
 * 支持 danger 模式（红色确认按钮）。
 * 无障碍行为（focus trap / ESC / 滚动锁定 / 焦点归还）由 <Modal> 内建。
 * confirming 期间 onClose 被守卫，防止误关闭。
 */

import { useRef } from 'react';
import Modal from './composites/Modal';
import Button from './primitives/Button';

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
  const confirmRef = useRef(null);

  // confirming 期间禁止关闭（ESC / backdrop / ✕）
  const guardedClose = () => {
    if (!confirming) onCancel?.();
  };

  return (
    <Modal
      open
      onClose={guardedClose}
      title={title}
      closeIcon
      style={{ maxWidth: 360 }}
      labelledBy="confirm-modal-title"
      describedBy="confirm-modal-body"
      initialFocusRef={confirmRef}
      actions={[
        <Button key="cancel" variant="tonal" onClick={onCancel} disabled={confirming}>
          {cancelText}
        </Button>,
        <Button
          key="confirm"
          ref={confirmRef}
          variant={danger ? 'outlined' : 'filled'}
          style={
            danger
              ? { borderColor: 'var(--md-color-error)', color: 'var(--md-color-error)' }
              : undefined
          }
          onClick={onConfirm}
          disabled={confirming}
        >
          {confirmText}
        </Button>,
      ]}
    >
      <div
        id="confirm-modal-body"
        style={{ color: 'var(--md-color-on-surface-variant)', lineHeight: 1.6 }}
      >
        {message}
      </div>
    </Modal>
  );
}
