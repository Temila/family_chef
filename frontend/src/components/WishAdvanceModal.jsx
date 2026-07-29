/**
 * WishAdvanceModal Component - 推进愿望弹窗（Phase 11：thin wrapper over <Modal>）
 * D-09：可搜索的本人已发布菜品选择器。
 * 调用 api.getDishes({ status:'enabled', chef_filter:'my-published' }) 获取候选菜品，
 * 选中后通过 onSuccess(selectedDishId, selectedDishName) 回调委托给父页面。
 * focus trap / ESC / 滚动锁定 / 焦点归还 由 <Modal> 内建。
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../contexts/ToastContext';
import Modal from './composites/Modal';
import Loading from './Loading';
import EmptyState from './EmptyState';
import Button from './primitives/Button';
import Icon from './primitives/Icon';

const SEARCH_DEBOUNCE_MS = 200;
const FORM_ID = 'wish-advance-form';

export default function WishAdvanceModal({ onClose, onSuccess }) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDishId, setSelectedDishId] = useState(null);
  const [selectedDishName, setSelectedDishName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const initialFocusRef = useRef(null);

  // submitting 期间禁止关闭
  const guardedClose = () => {
    if (!submitting) onClose?.();
  };

  // 挂载 + 搜索变化时加载菜品（200ms 防抖，带过期响应保护）
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!cancelled) setLoading(true);
      try {
        const res = await api.getDishes({
          status: 'enabled',
          chef_filter: 'my-published',
          search,
          page: 1,
          page_size: 100,
        });
        if (!cancelled) setDishes(res.items || []);
      } catch {
        if (!cancelled) {
          showToast('加载菜品失败', 'error');
          setDishes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, showToast]);

  // 客户端二次过滤，缓解请求竞态（服务端同样在过滤）
  const query = search.trim().toLowerCase();
  const filteredDishes = query
    ? dishes.filter((d) => (d.name || '').toLowerCase().includes(query))
    : dishes;

  const handleSelect = (dish) => {
    setSelectedDishId(dish.id);
    setSelectedDishName(dish.name || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || selectedDishId == null) return;
    setSubmitting(true);
    // 父页面在失败时会吞掉异常并保持弹窗打开，try/finally 确保无论成功失败 submitting 都复位
    try {
      await onSuccess?.(selectedDishId, selectedDishName);
    } finally {
      setSubmitting(false);
    }
  };

  const hasDishes = !loading && filteredDishes.length > 0;
  const showEmpty = !loading && filteredDishes.length === 0;

  return (
    <Modal
      open
      onClose={guardedClose}
      title="推进愿望 — 关联菜品"
      labelledBy="wish-advance-title"
      describedBy="wish-advance-description"
      style={{ maxWidth: 560 }}
      initialFocusRef={initialFocusRef}
      actions={[
        <Button key="cancel" variant="tonal" onClick={guardedClose} disabled={submitting}>
          暂不推进
        </Button>,
        <Button
          key="confirm"
          type="submit"
          form={FORM_ID}
          variant="filled"
          disabled={selectedDishId == null || submitting}
        >
          确认推进
        </Button>,
      ]}
    >
      <form id={FORM_ID} onSubmit={handleSubmit}>
        <p id="wish-advance-description" className="sr-only">
          请选择一个本人已发布的菜品来推进愿望。
        </p>
        <div className="search-bar" style={{ marginBottom: 'var(--md-spacing-4)'}}>
          <span className="search-icon"><Icon name="search" size={20} /></span>
          <input
            ref={initialFocusRef}
            type="text"
            placeholder="搜索已上架的菜品"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="wish-picker-list">
          {loading ? (
            <Loading />
          ) : showEmpty ? (
            query ? (
              <EmptyState icon="search" text="没有找到匹配的菜品" />
            ) : (
              <>
                <EmptyState icon="set-meal" text="你还没有发布任何菜品，无法推进愿望" />
                <div style={{ textAlign: 'center', marginTop: 'var(--md-spacing-2)'}}>
                  <Link to="/chef/dishes">前往菜品管理 →</Link>
                </div>
              </>
            )
          ) : (
            hasDishes &&
            filteredDishes.map((dish) => (
              <div
                key={dish.id}
                className={'wish-picker-item' + (selectedDishId === dish.id ? ' active' : '')}
                onClick={() => handleSelect(dish)}
                role="button"
                tabIndex={0}
                aria-pressed={selectedDishId === dish.id}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(dish);
                  }
                }}
              >
                <div className="wish-picker-item-img">
                  {dish.image_url ? (
                    <img src={dish.image_url} alt={dish.name || ''} />
                  ) : (
                    <span aria-hidden="true"><Icon name="set-meal" size={32} /></span>
                  )}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--md-color-on-surface)', flex: 1, minWidth: 0 }}>
                  {dish.name}
                </div>
              </div>
            ))
          )}
        </div>
      </form>
    </Modal>
  );
}
