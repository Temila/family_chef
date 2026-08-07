/**
 * UserWishesPage - 我的愿望页（提交者视图）
 * 实现愿望的创建/编辑/撤销全流程（WISH-03/04），并在 visibilitychange + focus 时静默刷新。
 * 消费 Wave-1 的 WishCard、WishFormModal、ConfirmModal 与 ApiClient 愿望方法。
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import Button from '../components/primitives/Button';
import FAB from '../components/primitives/FAB';

const PAGE_SIZE = 20;
const FOCUS_REFRESH_DEDUPE_MS = 2000;

export default function UserWishesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('wish');
  const [highlightedId, setHighlightedId] = useState(null);

  const [wishes, setWishes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  // 仅在 .then 成功分支（seq 未过期且 setWishes 已执行）置 true；
  // .finally(setLoading(false)) 在过期响应下仍会执行，loading 单独不足以判定"列表已就绪"。
  const [fetchedOnce, setFetchedOnce] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [relatedDishNames, setRelatedDishNames] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [editingWish, setEditingWish] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const requestSeqRef = useRef(0);
  const cancelSubmittingRef = useRef(false);
  const relatedDishNamesRef = useRef({});
  const pageRef = useRef(1);
  const loadMoreInFlightRef = useRef(false);
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    relatedDishNamesRef.current = relatedDishNames;
  }, [relatedDishNames]);

  // 后端返回的 related_dish_id 是数字，但被加载过的菜品名也需要按数字 id 索引。
  // 用 parallel Promise.allSettled 拉取、合并到现有 map 中，避免重复请求。
  const loadRelatedDishNames = useCallback(async (items) => {
    if (!items || items.length === 0) return;
    const knownNames = relatedDishNamesRef.current;
    const missing = [
      ...new Set(
        items
          .map((w) => w.related_dish_id)
          .filter((id) => id != null && !(String(id) in knownNames))
      ),
    ];
    if (missing.length === 0) return;

    const results = await Promise.allSettled(missing.map((id) => api.getDish(id)));
    const next = {};
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value?.name) {
        next[String(missing[index])] = result.value.name;
      }
    });
    if (Object.keys(next).length > 0) {
      relatedDishNamesRef.current = { ...relatedDishNamesRef.current, ...next };
      setRelatedDishNames((current) => ({ ...current, ...next }));
    }
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
        if (targetPage === 1) pageRef.current = 1;
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
        setFetchedOnce(true);
        loadRelatedDishNames(items);
      })
      .catch(() => showToast('加载愿望失败', 'error'))
      .finally(() => setLoading(false));
  }, [loadRelatedDishNames, showToast]);

  // 提交者刷新模式：visibilitychange 与 focus 可能连续触发，2 秒内只静默刷新一次。
  useEffect(() => {
    const refresh = () => {
      const now = Date.now();
      if (now - lastRefreshRef.current < FOCUS_REFRESH_DEDUPE_MS) return;
      lastRefreshRef.current = now;
      loadWishes({ page: 1, background: true });
    };
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

  // 深链高亮：?wish=:id 命中时，匹配卡片描边 4s 并滚动入视；未命中则提示并清除指令。
  // setState 通过 setTimeout 延迟到下一个 tick 执行，规避 react-hooks/set-state-in-effect
  // （与 Wave 2 的 queueMicrotask 同类处理）。重复导航会重新触发本 effect，旧定时器由 cleanup 清理。
  useEffect(() => {
    if (!highlightId) return undefined;
    const targetWish = wishes.find((w) => String(w.id) === String(highlightId));
    if (!targetWish) {
      // 列表仍在加载中 — 等待 wishes 更新后再次进入本 effect 判定，避免误报"未找到"
      // fetchedOnce 守门：.finally(setLoading(false)) 在 requestSeqRef 丢弃的过期响应下仍会执行，
      // 造成 wishes=[] && loading=false 的瞬态窗口；此时 fetchedOnce 仍为 false，阻止误判。
      if (loading || !fetchedOnce) return undefined;
      // 加载完成仍未命中 — 提示并清除 URL 指令
      // 100ms（而非 0ms）给后续 setWishes commit + cleanup 一个窗口清理本定时器，兜底其它潜在 race
      const missingTimer = setTimeout(() => {
        showToast('未找到该愿望，可能已撤销或需要切换标签', 'error');
        setSearchParams(
          (cur) => {
            const next = new URLSearchParams(cur);
            next.delete('wish');
            return next;
          },
          { replace: true }
        );
        setHighlightedId(null);
      }, 100);
      return () => clearTimeout(missingTimer);
    }
    // 命中 — 应用描边、滚动入视，4s 后清除描边与 URL 指令
    const applyTimer = setTimeout(() => {
      setHighlightedId(String(highlightId));
      document
        .querySelector('[data-wish-id="' + highlightId + '"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
    const clearTimer = setTimeout(() => {
      setHighlightedId(null);
      setSearchParams(
        (cur) => {
          const next = new URLSearchParams(cur);
          next.delete('wish');
          return next;
        },
        { replace: true }
      );
    }, 4000);
    return () => {
      clearTimeout(applyTimer);
      clearTimeout(clearTimer);
    };
  }, [wishes, highlightId, setSearchParams, showToast, loading, fetchedOnce]);

  const handleCreateSubmit = useCallback(
    async (payload) => {
      try {
        const created = await api.createWish(payload);
        setShowCreate(false);
        // D-SNACK-01: 用返回的 wish id + 现有 cancelWish API 提供"撤销"补救操作
        showToast('愿望已提交，厨师会尽快认领', {
          action: {
            label: '撤销',
            onClick: async () => {
              try {
                await api.cancelWish(created.id);
                loadWishes({ page: 1, background: true });
              } catch {
                // 撤销失败不阻塞——主流程（提交成功）已完成，补救操作静默失败
              }
            },
          },
        });
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
    if (!cancelTarget || cancelSubmittingRef.current) return;
    cancelSubmittingRef.current = true;
    setCancelSubmitting(true);
    try {
      await api.cancelWish(cancelTarget.id);
      setCancelTarget(null);
      showToast('已撤销');
      loadWishes({ page: 1, background: true });
    } catch (err) {
      showToast(err.message || '撤销失败', 'error');
    } finally {
      cancelSubmittingRef.current = false;
      setCancelSubmitting(false);
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

  const handleLoadMore = useCallback(async () => {
    if (loadMoreInFlightRef.current) return;
    loadMoreInFlightRef.current = true;
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    setLoadingMore(true);
    try {
      await loadWishes({ page: nextPage, background: true });
    } finally {
      loadMoreInFlightRef.current = false;
      setLoadingMore(false);
    }
  }, [loadWishes]);

  const openCreate = useCallback(() => setShowCreate(true), []);

  return (
    <div className="page-container">
      <Header title="我的愿望" />

      {loading ? (
        <Loading />
      ) : wishes.length === 0 ? (
        <>
          <EmptyState icon="lightbulb" text="还没有愿望，去提交一个吧" />
          <div style={{ textAlign: 'center', color: 'var(--md-color-on-surface-variant)', fontSize: '0.875rem' }}>
            点击右下角「+」新建一个愿望
          </div>
        </>
      ) : (
        <section className="section pt-0">
          {wishes.map((w) => (
            <div key={w.id} style={{ width: '100%' }}>
              <WishCard
                wish={w}
                currentUser={user}
                currentRole="user"
                relatedDishName={relatedDishNames[String(w.related_dish_id)]}
                highlighted={highlightedId === String(w.id)}
                onEdit={(wish) => setEditingWish(wish)}
                onCancel={(wish) => setCancelTarget(wish)}
                onTap={handleCardTap}
              />
            </div>
          ))}

          {wishes.length < total ? (
            <Button
              type="button"
              variant="tonal"
              className="wish-load-more"
              loading={loadingMore}
              style={{ width: '100%' }}
              onClick={handleLoadMore}
            >
              加载更多愿望
            </Button>
          ) : (
            <div className="wish-end-of-list">没有更多愿望了</div>
          )}
        </section>
      )}

      {/* FAB — 仅用户页有，渲染在 Header 外部以避开 header-right 的堆叠上下文。
          placement 通过 inline style 传递（Ripple self 模式注入 position:relative 为内联样式，
          CSS class 无法覆盖；childProps.style 在 composedStyle 中排在 base 之后，可安全覆盖）。 */}
      <FAB
        icon="add"
        ariaLabel="新建愿望"
        onClick={openCreate}
        className="fab"
        style={{
          position: 'fixed',
          bottom: 'calc(var(--md-nav-height) + var(--md-spacing-4))',
          right: 'var(--md-spacing-5)',
          zIndex: 150,
        }}
      />

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
          confirming={cancelSubmitting}
          onConfirm={handleCancelConfirm}
          onCancel={() => setCancelTarget(null)}
        />
      )}

      <BottomBar />
    </div>
  );
}
