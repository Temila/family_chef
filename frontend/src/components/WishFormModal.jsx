/**
 * WishFormModal Component - 愿望新建/编辑弹窗
 * 纯展示 + 表单校验组件：提交通过 onSuccess(payload) 回调委托给父页面，
 * 不直接调用 API（依据 UI-SPEC §6.2 / §7.5 / §8.10）。
 */

import { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';

const MAX_NAME = 100;
const MAX_URL = 500;
const MAX_NOTE = 500;
const HTTP_URL_RE = /^https?:\/\//i;

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

  const handleSubmit = (e) => {
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
    onSuccess?.(payload);
  };

  const closeLabel = isEdit ? '放弃修改' : '暂不提交';
  const submitLabel = isEdit ? '保存修改' : '提交愿望';
  const titleId = 'wish-form-title';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-header">
          <h3 id={titleId}>{isEdit ? '编辑愿望' : '新建愿望'}</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={isEdit ? '关闭编辑愿望窗口' : '关闭新建愿望窗口'}
          >
            ✕
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {/* NOTIF-06 副作用提示：编辑已被认领的愿望会通知认领厨师 */}
          {isEdit && wish?.claimed_by_chef_name && (
            <div className="info-pill" style={{ marginBottom: 16, width: 'fit-content' }}>
              信息：编辑此愿望将通知认领厨师「{wish.claimed_by_chef_name}」
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="wish-dish-name">
              菜名 *
            </label>
            <input
              id="wish-dish-name"
              type="text"
              className="form-input"
              value={form.dish_name}
              onChange={handleChange('dish_name')}
              placeholder="请输入想吃的菜名"
              maxLength={MAX_NAME}
              autoFocus
            />
            <div className={'form-error' + (errors.dish_name ? ' show' : '')}>
              {errors.dish_name}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="wish-reference-url">
              参考链接（可选）
            </label>
            <input
              id="wish-reference-url"
              type="url"
              className="form-input"
              value={form.reference_url}
              onChange={handleChange('reference_url')}
              placeholder="B站 / 抖音 / 小红书链接（可选）"
              maxLength={MAX_URL}
            />
            <div className={'form-error' + (errors.reference_url ? ' show' : '')}>
              {errors.reference_url}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="wish-note">
              备注（可选）
            </label>
            <textarea
              id="wish-note"
              className="form-input"
              rows={3}
              value={form.note}
              onChange={handleChange('note')}
              placeholder="补充说明（可选）"
              maxLength={MAX_NOTE}
            />
            <div className={'form-error' + (errors.note ? ' show' : '')}>
              {errors.note}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              {closeLabel}
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
