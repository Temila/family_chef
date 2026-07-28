/**
 * WishFormModal Component - 愿望新建/编辑弹窗（Phase 11：thin wrapper over <Modal>）
 * 纯展示 + 表单校验组件：提交通过 onSuccess(payload) 回调委托给父页面，
 * 不直接调用 API（依据 UI-SPEC §6.2 / §7.5 / §8.10）。
 * focus trap / ESC / 滚动锁定 / 焦点归还 由 <Modal> 内建。
 */

import { useRef, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import Modal from './composites/Modal';
import Button from './primitives/Button';
import Input from './primitives/Input';

const MAX_NAME = 100;
const MAX_URL = 500;
const MAX_NOTE = 500;
const HTTP_URL_RE = /^https?:\/\//i;
const FORM_ID = 'wish-form-modal';

/**
 * 构建提交载荷。
 * - create 模式：发送三个字段（reference_url / note 为空时序列化为 null）。
 * - edit 模式：仅包含相对原值发生变化的字段；清空可选字段时显式发送 null
 *   （依据 backend wish_service.py:175-184，省略字段与 null 含义不同）。
 */
function buildWishPatch(form, originalWish, mode) {
  const dishName = form.dish_name.trim();
  const refUrl = form.reference_url.trim();
  const note = form.note.trim();

  if (mode === 'create') {
    return {
      dish_name: dishName,
      reference_url: refUrl || null,
      note: note || null,
    };
  }

  const patch = {};
  const origName = (originalWish?.dish_name || '').trim();
  const origUrl = (originalWish?.reference_url || '').trim();
  const origNote = (originalWish?.note || '').trim();

  if (dishName !== origName) patch.dish_name = dishName;
  if (refUrl !== origUrl) patch.reference_url = refUrl || null;
  if (note !== origNote) patch.note = note || null;

  return patch;
}

export default function WishFormModal({ wish = null, mode = 'create', onClose, onSuccess }) {
  const { showToast } = useToast();
  const isEdit = mode === 'edit';

  const [form, setForm] = useState({
    dish_name: wish?.dish_name || '',
    reference_url: wish?.reference_url || '',
    note: wish?.note || '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const initialFocusRef = useRef(null);

  // submitting 期间禁止关闭（ESC / backdrop / ✕ 由 Modal 内建，此处仅守卫 onClose）
  const guardedClose = () => {
    if (!submitting) onClose?.();
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const validate = () => {
    const errs = {};
    const name = form.dish_name.trim();
    if (!name) errs.dish_name = '菜名不能为空';
    else if (name.length > MAX_NAME) errs.dish_name = '菜名不能超过 100 字';

    const url = form.reference_url.trim();
    if (url) {
      if (!HTTP_URL_RE.test(url)) errs.reference_url = '请输入以 http:// 或 https:// 开头的链接';
      else if (url.length > MAX_URL) errs.reference_url = '链接不能超过 500 字';
    }

    const note = form.note.trim();
    if (note.length > MAX_NOTE) errs.note = '备注不能超过 500 字';

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const errs = validate();
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    const payload = buildWishPatch(form, wish, mode);

    // edit 模式下无任何改动 → 提示并保持弹窗打开
    if (isEdit && Object.keys(payload).length === 0) {
      showToast('未修改任何内容');
      return;
    }

    setSubmitting(true);
    // 父页面在失败时会吞掉异常并保持弹窗打开，try/finally 确保无论成功失败 submitting 都复位
    try {
      await onSuccess?.(payload);
    } finally {
      setSubmitting(false);
    }
  };

  const closeLabel = isEdit ? '放弃修改' : '暂不提交';
  const submitLabel = isEdit ? '保存修改' : '提交愿望';

  return (
    <Modal
      open
      onClose={guardedClose}
      title={isEdit ? '编辑愿望' : '新建愿望'}
      closeIcon={false}
      labelledBy="wish-form-title"
      describedBy="wish-form-description"
      style={{ maxWidth: 480 }}
      initialFocusRef={initialFocusRef}
      actions={[
        <Button key="cancel" variant="tonal" onClick={guardedClose} disabled={submitting}>
          {closeLabel}
        </Button>,
        <Button key="submit" type="submit" form={FORM_ID} variant="filled" disabled={submitting}>
          {submitLabel}
        </Button>,
      ]}
    >
      <form id={FORM_ID} onSubmit={handleSubmit}>
        <p id="wish-form-description" className="sr-only">
          请填写想吃的菜名，可选填写参考链接和备注。
        </p>
        {/* NOTIF-06 副作用提示：编辑已被认领的愿望会通知认领厨师 */}
        {isEdit && wish?.claimed_by_chef_name && (
          <div className="info-pill" style={{ marginBottom: 'var(--md-spacing-4)', width: 'fit-content' }}>
            信息：编辑此愿望将通知认领厨师「{wish.claimed_by_chef_name}」
          </div>
        )}

        <Input
          label="菜名 *"
          ref={initialFocusRef}
          type="text"
          value={form.dish_name}
          onChange={handleChange('dish_name')}
          placeholder="请输入想吃的菜名"
          maxLength={MAX_NAME}
          error={errors.dish_name || undefined}
        />

        <Input
          label="参考链接（可选）"
          type="url"
          value={form.reference_url}
          onChange={handleChange('reference_url')}
          placeholder="B站 / 抖音 / 小红书链接（可选）"
          maxLength={MAX_URL}
          error={errors.reference_url || undefined}
        />

        <Input
          multiline
          rows={3}
          label="备注（可选）"
          value={form.note}
          onChange={handleChange('note')}
          placeholder="补充说明（可选）"
          maxLength={MAX_NOTE}
          error={errors.note || undefined}
        />
      </form>
    </Modal>
  );
}
