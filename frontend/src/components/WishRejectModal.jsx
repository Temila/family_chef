/**
 * WishRejectModal Component - 拒绝愿望弹窗（Phase 11：thin wrapper over <Modal>）
 * D-08：本弹窗即破坏性确认，不再叠加 ConfirmModal。
 * 必填拒绝原因（1-500 字），提交通过 onSuccess(reason) 回调委托给父页面。
 * focus trap / ESC / 滚动锁定 / 焦点归还 由 <Modal> 内建。
 */

import { useRef, useState } from 'react';
import Modal from './composites/Modal';
import Button from './primitives/Button';
import Input from './primitives/Input';

const MAX_REASON = 500;
const FORM_ID = 'wish-reject-form';

export default function WishRejectModal({ onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const initialFocusRef = useRef(null);

  // submitting 期间禁止关闭
  const guardedClose = () => {
    if (!submitting) onClose?.();
  };

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
    <Modal
      open
      onClose={guardedClose}
      title="拒绝愿望"
      labelledBy="wish-reject-title"
      describedBy="wish-reject-description"
      style={{ maxWidth: 420 }}
      initialFocusRef={initialFocusRef}
      actions={[
        <Button key="cancel" variant="tonal" onClick={guardedClose} disabled={submitting}>
          暂不拒绝
        </Button>,
        <Button
          key="confirm"
          type="submit"
          form={FORM_ID}
          variant="filled"
          style={{ background: 'var(--md-color-error)', color: 'var(--md-color-on-error)' }}
          disabled={!isValid || submitting}
        >
          确认拒绝
        </Button>,
      ]}
    >
      <form id={FORM_ID} onSubmit={handleSubmit}>
        <p id="wish-reject-description" className="sr-only">
          请填写拒绝愿望的原因。
        </p>
        <Input
          multiline
          rows={4}
          label="拒绝原因 *"
          ref={initialFocusRef}
          value={reason}
          onChange={handleChange}
          placeholder="请说明拒绝原因（必填）"
          maxLength={MAX_REASON}
          error={error || undefined}
        />
      </form>
    </Modal>
  );
}
