/**
 * WishAdvanceModal Component - 推进愿望弹窗（D-09：可搜索的本人已发布菜品选择器）
 * 调用 api.getDishes({ status:'enabled', chef_filter:'my-published' }) 获取候选菜品，
 * 选中后通过 onSuccess(selectedDishId, selectedDishName) 回调委托给父页面。
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../contexts/ToastContext';
import Loading from './Loading';
import EmptyState from './EmptyState';

const SEARCH_DEBOUNCE_MS = 200;

export default function WishAdvanceModal({ onClose, onSuccess }) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDishId, setSelectedDishId] = useState(null);
  const [selectedDishName, setSelectedDishName] = useState('');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting || selectedDishId == null) return;
    setSubmitting(true);
    onSuccess?.(selectedDishId, selectedDishName);
  };

  const hasDishes = !loading && filteredDishes.length > 0;
  const showEmpty = !loading && filteredDishes.length === 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 560 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wish-advance-title"
      >
        <div className="modal-header">
          <h3 id="wish-advance-title">推进愿望 — 关联菜品</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="关闭推进愿望窗口"
          >
            ✕
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="search-bar" style={{ marginBottom: 16 }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索已上架的菜品"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="wish-picker-list">
            {loading ? (
              <Loading />
            ) : showEmpty ? (
              <>
                <EmptyState icon="🍽️" text="你还没有发布任何菜品，无法推进愿望" />
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <Link to="/chef/dishes">前往菜品管理 →</Link>
                </div>
              </>
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
                      <span aria-hidden="true">🍽️</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', flex: 1, minWidth: 0 }}>
                    {dish.name}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              暂不推进
            </button>
            <button type="submit" className="btn btn-primary" disabled={selectedDishId == null || submitting}>
              确认推进
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
