/**
 * UserWishesPage - 我的愿望页（提交者视图）
 * 实现愿望的创建/编辑/撤销全流程（WISH-03/04），并在 visibilitychange + focus 时静默刷新。
 * 消费 Wave-1 的 WishCard、WishFormModal、ConfirmModal 与 ApiClient 愿望方法。
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import WishCard from '../components/WishCard';
import WishFormModal from '../components/WishFormModal';

const PAGE_SIZE = 20;

export default function UserWishesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [wishes, setWishes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [relatedDishNames, setRelatedDishNames] = useState({});
  // 注：actingId 在用户页没有消费者（ConfirmModal 无 disabled prop），故省略。
  // 撤销期间的 in-flight 保护由 ConfirmModal 自身保证：成功即关闭，失败保持打开。
  const [showCreate, setShowCreate] = useState(false);
  const [editingWish, setEditingWish] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const requestSeqRef = useRef(0);

  // 后端返回的 related_dish_id 是数字，但被加载过的菜品名也需要按数字 id 索引。
  // 用 parallel Promise.allSettled 拉取、合并到现有 map 中，避免重复请求。
  const loadRelatedDishNames = useCallback(async (items) => {
    if (!items || items.length === 0) return;
    setRelatedDishNames((prev) => {
      const missing = [
        ...new Set(
          items
            .map((w) => w.related_dish_id)
            .filter((id) => id != null && !(String(id) in prev))
        ),
      ];
      if (missing.length === 0) return prev;

      // 副作用：并行拉取缺失的菜品名
      Promise.allSettled(missing.map((id) => api.getDish(id))).then((results) => {
        const next = {};
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value?.name) {
            next[String(missing[index])] = result.value.name;
          }
        });
        if (Object.keys(next).length > 0) {
          setRelatedDishNames((cur) => ({ ...cur, ...next }));
        }
      });

      // 返回 prev 保持本次渲染的引用一致；真正的更新由上面的 setRelatedDishNames 完成
      return prev;
    });
  }, []);

  // 拉取愿望列表；background=true 时显示加载中按钮而不是全屏 Loading。
  // 注：不在此处同步调用 setLoading(true) — 会触发 react-hooks/set-state-in-effect 规则。
  // 初次挂载时 loading 已默认为 true；后续刷新均为 background 模式（无 spinner）。
  const loadWishes = useCallback(
    async ({ page: p, background = false } = {}) => {
      const targetPage = p == null ? 1 : p;
      const seq = ++requestSeqRef.current;
      try {
        const res = await api.getWishes({ page: targetPage, page_size: PAGE_SIZE });
        if (seq !== requestSeqRef.current) return; // 过期响应，丢弃
        const items = res.items || [];
        setWishes((prev) => (targetPage === 1 ? items : [...prev, ...items]));
        setTotal(res.total || 0);
        loadRelatedDishNames(items);
      } catch {
        showToast('加载愿望失败', 'error');
      } finally {
        if (background) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [loadRelatedDishNames, showToast]
  );

  // 挂载时初次加载。
  // 注：直接在 effect 体内调用 loadWishes 会触发 react-hooks/set-state-in-effect（该函数内含 setState）。
  // 改为内联 .then() 链——setState 仅出现在异步回调中，规避级联渲染告警。
  useEffect(() => {
    const seq = ++requestSeqRef.current;
    api
      .getWishes({ page: 1, page_size: PAGE_SIZE })
      .then((res) => {
        if (seq !== requestSeqRef.current) return;
        const items = res.items || [];
        setWishes(items);
        setTotal(res.total || 0);
        loadRelatedDishNames(items);
      })
      .catch(() => showToast('加载愿望失败', 'error'))
      .finally(() => setLoading(false));
  }, [loadRelatedDishNames, showToast]);

  // 提交者刷新模式：仅 visibilitychange → visible + window focus 时静默拉取（无 30s 轮询）
  useEffect(() => {
    const refresh = () => loadWishes({ page: 1, background: true });
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', refresh);
    };
  }, [loadWishes]);

  const handleCreateSubmit = useCallback(
    async (payload) => {
      try {
        await api.createWish(payload);
        setShowCreate(false);
        showToast('愿望已提交，厨师会尽快认领');
        loadWishes({ page: 1, background: true });
      } catch (err) {
        showToast(err.message || '提交失败', 'error');
      }
    },
    [loadWishes, showToast]
  );

  const handleEditSubmit = useCallback(
    async (payload) => {
      if (!editingWish) return;
      if (Object.keys(payload).length === 0) {
        showToast('未修改任何内容', 'error');
        return;
      }
      try {
        await api.updateWish(editingWish.id, payload);
        const wasClaimed = editingWish.status === '准备中';
        setEditingWish(null);
        showToast(wasClaimed ? '已保存，已通知认领厨师' : '已保存');
        loadWishes({ page: 1, background: true });
      } catch (err) {
        showToast(err.message || '保存失败', 'error');
      }
    },
    [editingWish, loadWishes, showToast]
  );

  const handleCancelConfirm = useCallback(async () => {
    if (!cancelTarget) return;
    try {
      await api.cancelWish(cancelTarget.id);
      setCancelTarget(null);
      showToast('已撤销');
      loadWishes({ page: 1, background: true });
    } catch (err) {
      showToast(err.message || '撤销失败', 'error');
    }
  }, [cancelTarget, loadWishes, showToast]);

  // NOTIF-04：仅提交者本人且 has_unread=true 时点击卡片清除红点
  const handleCardTap = useCallback(
    async (wish) => {
      if (!user || wish.user_id !== user.id || wish.has_unread !== true) return;
      try {
        const detail = await api.getWish(wish.id);
        setWishes((prev) =>
          prev.map((w) => (w.id === wish.id ? { ...w, ...detail, has_unread: false } : w))
        );
      } catch (err) {
        showToast(err.message || '加载愿望详情失败', 'error');
      }
    },
    [user, showToast]
  );

  const handleLoadMore = useCallback(() => {
    setLoadingMore(true);
    setPage((p) => p + 1);
    loadWishes({ page: page + 1 });
  }, [loadWishes, page]);

  const openCreate = useCallback(() => setShowCreate(true), []);

  return (
    <div className="page-container">
      <Header
        title="我的愿望"
        actions={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={openCreate}
            aria-label="新建愿望"
          >
            + 新建愿望
          </button>
        }
      />

      {loading ? (
        <Loading />
      ) : wishes.length === 0 ? (
        <>
          <EmptyState icon="💡" text="还没有愿望，去提交一个吧" />
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            点击右下角「+」新建一个愿望
          </div>
        </>
      ) : (
        <section className="section pt-0">
          {wishes.map((w) => (
            <WishCard
              key={w.id}
              wish={w}
              currentUser={user}
              currentRole="user"
              relatedDishName={relatedDishNames[String(w.related_dish_id)]}
              onEdit={(wish) => setEditingWish(wish)}
              onCancel={(wish) => setCancelTarget(wish)}
              onTap={handleCardTap}
            />
          ))}

          {wishes.length < total ? (
            <button
              type="button"
              className="btn btn-secondary btn-block wish-load-more"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? '加载中...' : '加载更多愿望'}
            </button>
          ) : (
            <div className="wish-end-of-list">没有更多愿望了</div>
          )}
        </section>
      )}

      {/* FAB — 仅用户页有，渲染在 Header 外部以避开 header-right 的堆叠上下文 */}
      <button
        type="button"
        className="fab"
        onClick={openCreate}
        aria-label="新建愿望"
      >
        +
      </button>

      {/* 单 overlay 不变量：同时只渲染一个弹窗 */}
      {showCreate && (
        <WishFormModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSuccess={handleCreateSubmit}
        />
      )}
      {editingWish && (
        <WishFormModal
          wish={editingWish}
          mode="edit"
          onClose={() => setEditingWish(null)}
          onSuccess={handleEditSubmit}
        />
      )}
      {cancelTarget && (
        <ConfirmModal
          title="撤销愿望"
          message={`撤销后无法恢复，确定要撤销「${cancelTarget.dish_name}」吗？`}
          confirmText="确认撤销"
          danger={true}
          onConfirm={handleCancelConfirm}
          onCancel={() => setCancelTarget(null)}
        />
      )}

      <BottomBar />
    </div>
  );
}
