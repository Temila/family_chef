/**
 * ChefWishesPage - 厨师/管理员愿望队列页（共享引擎）
 * 实现 URL 标签（全部/待处理/我的认领）、30s 可见轮询、认领/推进/拒绝生命周期。
 * AdminWishesPage 以 viewAsAdmin=true 复用本引擎。
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
import WishCard from '../components/WishCard';
import WishAdvanceModal from '../components/WishAdvanceModal';
import WishRejectModal from '../components/WishRejectModal';
import Button from '../components/primitives/Button';
import Chip from '../components/primitives/Chip';

const PAGE_SIZE = 20;
const POLL_INTERVAL_MS = 30000;
const VALID_TABS = new Set(['all', 'pending', 'mine']);

// 构造后端查询参数：pending → status_filter；mine → mine=true。
// status_filter 与 mine 的实际序列化由 api.getWishes 内部完成。
function buildWishParams(tab, page = 1) {
  const params = { page, page_size: PAGE_SIZE };
  if (tab === 'pending') params.status = '待处理';
  if (tab === 'mine') params.mine = true;
  return params;
}

const EMPTY_STATES = {
  all: { icon: '📭', text: '当前还没有可管理的愿望', sub: '用户提交新愿望后会显示在这里' },
  pending: { icon: '✅', text: '当前没有待处理愿望', sub: '所有愿望都已被认领或处理' },
  mine: { icon: '📋', text: '你还没有认领任何愿望', sub: '前往「待处理」认领一个愿望' },
};

export default function ChefWishesPage({ viewAsAdmin = false }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedTab = searchParams.get('tab') || 'all';
  const activeTab = VALID_TABS.has(requestedTab) ? requestedTab : 'all';
  const highlightId = searchParams.get('wish');

  const [wishes, setWishes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  // 仅在 .then 成功分支（seq 未过期且 setWishes 已执行）置 true；
  // .finally(setLoading(false)) 在过期响应下仍会执行，loading 单独不足以判定"列表已就绪"。
  const [fetchedOnce, setFetchedOnce] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [relatedDishNames, setRelatedDishNames] = useState({});
  const [actingId, setActingId] = useState(null);
  const [advanceTarget, setAdvanceTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const requestSeqRef = useRef(0);
  const relatedDishNamesRef = useRef({});
  const pageRef = useRef(1);
  const loadMoreInFlightRef = useRef(false);

  useEffect(() => {
    relatedDishNamesRef.current = relatedDishNames;
  }, [relatedDishNames]);

  // 标签切换：写回 URL，触发 activeTab 重算并重置列表
  const selectTab = useCallback(
    (tab) => {
      setSearchParams(
        (cur) => {
          const next = new URLSearchParams(cur);
          next.set('tab', tab);
          return next;
        },
        { replace: false }
      );
    },
    [setSearchParams]
  );

  // 并行去重拉取 related_dish_name（与 UserWishesPage 相同模式）
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

  // 拉取当前 tab 的愿望列表。
  // 注：不在函数体内同步调用 setLoading(true) —— 会触发 set-state-in-effect 规则。
  // 切标签 / 挂载均由下方 effect 直接内联 fetch，handler 只负责 background 刷新。
  const loadWishes = useCallback(
    async ({ page: p, background = false, tab = activeTab } = {}) => {
      const targetPage = p == null ? 1 : p;
      const seq = ++requestSeqRef.current;
      try {
        const res = await api.getWishes(buildWishParams(tab, targetPage));
        if (seq !== requestSeqRef.current) return;
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
    [activeTab, loadRelatedDishNames, showToast]
  );

  // 标签切换 / 挂载：内联 fetch 以规避 set-state-in-effect。
  // 切标签时重置分页到第 1 页。同步 setState 通过 queueMicrotask 延迟一拍执行。
  useEffect(() => {
    const seq = ++requestSeqRef.current;
    queueMicrotask(() => {
      setLoading(true);
      pageRef.current = 1;
      api
        .getWishes(buildWishParams(activeTab, 1))
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
    });
  }, [activeTab, loadRelatedDishNames, showToast]);

  // 30s 可见轮询：仅在 document.visibilityState === 'visible' 时静默刷新第 1 页。
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadWishes({ page: 1, background: true });
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadWishes]);

  // 深链高亮：?wish=:id 命中时，匹配卡片描边 4s 并滚动入视；未命中则提示并清除指令。
  // setState 通过 setTimeout 延迟到下一个 tick 执行，规避 react-hooks/set-state-in-effect
  // （与 Wave 2 的 queueMicrotask 同类处理）。admin 视图（viewAsAdmin）与本引擎共享同一行为。
  useEffect(() => {
    if (!highlightId) return undefined;
    const targetWish = wishes.find((w) => String(w.id) === String(highlightId));
    if (!targetWish) {
      // 列表仍在加载中 — 等待 wishes 更新后再次进入本 effect 判定，避免误报"未找到"
      // fetchedOnce 守门：.finally(setLoading(false)) 在 requestSeqRef 丢弃的过期响应下仍会执行，
      // 造成 wishes=[] && loading=false 的瞬态窗口；此时 fetchedOnce 仍为 false，阻止误判。
      if (loading || !fetchedOnce) return undefined;
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

  // 生命周期动作：认领（管理员总览只读）
  const handleClaim = useCallback(
    async (wish) => {
      if (viewAsAdmin || actingId) return;
      setActingId(wish.id);
      try {
        await api.claimWish(wish.id);
        showToast('已认领');
      } catch (err) {
        showToast(err.message || '认领失败', 'error');
      } finally {
        await loadWishes({ page: 1, background: true });
        setActingId(null);
      }
    },
    [actingId, loadWishes, showToast, viewAsAdmin]
  );

  // 生命周期动作：推进（关联本人已发布的菜品）
  const handleAdvance = useCallback(
    async (wish, relatedDishId, dishName) => {
      if (viewAsAdmin || actingId) return;
      setActingId(wish.id);
      try {
        await api.advanceWish(wish.id, relatedDishId);
        showToast('已成功关联 ' + dishName);
        setAdvanceTarget(null);
      } catch (err) {
        showToast(err.message || '推进失败', 'error');
      } finally {
        await loadWishes({ page: 1, background: true });
        setActingId(null);
      }
    },
    [actingId, loadWishes, showToast, viewAsAdmin]
  );

  // 生命周期动作：拒绝（必填原因）
  const handleReject = useCallback(
    async (wish, reason) => {
      if (viewAsAdmin || actingId) return;
      setActingId(wish.id);
      try {
        await api.rejectWish(wish.id, reason);
        showToast('已拒绝，提交者会收到通知');
        setRejectTarget(null);
      } catch (err) {
        showToast(err.message || '拒绝失败', 'error');
      } finally {
        await loadWishes({ page: 1, background: true });
        setActingId(null);
      }
    },
    [actingId, loadWishes, showToast, viewAsAdmin]
  );

  const openAdvance = useCallback(
    (wish) => {
      if (!viewAsAdmin) setAdvanceTarget(wish);
    },
    [viewAsAdmin]
  );

  const openReject = useCallback(
    (wish) => {
      if (!viewAsAdmin) setRejectTarget(wish);
    },
    [viewAsAdmin]
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

  const currentRole = viewAsAdmin ? 'admin' : 'chef';
  const title = viewAsAdmin ? '愿望总览' : '愿望管理';
  const empty = EMPTY_STATES[activeTab] || EMPTY_STATES.all;

  return (
    <div className="page-container">
      <Header title={title} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--md-spacing-2)', padding: '0 var(--md-spacing-4) var(--md-spacing-3)'}}>
        <Chip variant="filter" selected={activeTab === 'all'}
          
          
          onClick={() => selectTab('all')}
        >
          全部
        </Chip>
        <Chip variant="filter" selected={activeTab === 'pending'}
          
          
          onClick={() => selectTab('pending')}
        >
          待处理
        </Chip>
        <Chip variant="filter" selected={activeTab === 'mine'}
          
          
          onClick={() => selectTab('mine')}
        >
          我的认领
        </Chip>
      </div>

      {loading ? (
        <Loading />
      ) : wishes.length === 0 ? (
        <>
          <EmptyState icon={empty.icon} text={empty.text} />
          <div style={{ textAlign: 'center', color: 'var(--md-color-on-surface-variant)', fontSize: '0.875rem' }}>
            {empty.sub}
          </div>
        </>
      ) : (
        <section className="section pt-0">
          {wishes.map((w) => (
            <WishCard
              key={w.id}
              wish={w}
              currentUser={user}
              currentRole={currentRole}
              viewAsAdmin={viewAsAdmin}
              relatedDishName={relatedDishNames[String(w.related_dish_id)]}
              highlighted={highlightedId === String(w.id)}
              onClaim={handleClaim}
              onAdvance={openAdvance}
              onReject={openReject}
            />
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

      {/* 单 overlay 不变量：同时只渲染一个弹窗 */}
      {!viewAsAdmin && advanceTarget && (
        <WishAdvanceModal
          onClose={() => setAdvanceTarget(null)}
          onSuccess={(dishId, dishName) => handleAdvance(advanceTarget, dishId, dishName)}
        />
      )}
      {!viewAsAdmin && rejectTarget && (
        <WishRejectModal
          onClose={() => setRejectTarget(null)}
          onSuccess={(reason) => handleReject(rejectTarget, reason)}
        />
      )}

      <BottomBar />
    </div>
  );
}
