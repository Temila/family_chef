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

  const [wishes, setWishes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [relatedDishNames, setRelatedDishNames] = useState({});
  const [actingId, setActingId] = useState(null);
  const [advanceTarget, setAdvanceTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const requestSeqRef = useRef(0);

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
  const loadRelatedDishNames = useCallback((items) => {
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
      return prev;
    });
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
      setPage(1);
      api
        .getWishes(buildWishParams(activeTab, 1))
        .then((res) => {
          if (seq !== requestSeqRef.current) return;
          const items = res.items || [];
          setWishes(items);
          setTotal(res.total || 0);
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

  // 生命周期动作：认领
  const handleClaim = useCallback(
    async (wish) => {
      if (actingId) return;
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
    [actingId, loadWishes, showToast]
  );

  // 生命周期动作：推进（关联本人已发布的菜品）
  const handleAdvance = useCallback(
    async (wish, relatedDishId, dishName) => {
      if (actingId) return;
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
    [actingId, loadWishes, showToast]
  );

  // 生命周期动作：拒绝（必填原因）
  const handleReject = useCallback(
    async (wish, reason) => {
      if (actingId) return;
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
    [actingId, loadWishes, showToast]
  );

  const handleLoadMore = useCallback(() => {
    setLoadingMore(true);
    setPage((p) => p + 1);
    loadWishes({ page: page + 1 });
  }, [loadWishes, page]);

  const currentRole = viewAsAdmin ? 'admin' : 'chef';
  const title = viewAsAdmin ? '愿望总览' : '愿望管理';
  const empty = EMPTY_STATES[activeTab] || EMPTY_STATES.all;

  const pendingCount = wishes.filter((w) => w.status === '待处理').length;
  const mineCount = wishes.filter((w) => w.claimed_by_chef_id === user?.id).length;

  return (
    <div className="page-container">
      <Header title={title} />

      <div className="filter-chips">
        <button
          type="button"
          className={'filter-chip' + (activeTab === 'all' ? ' active' : '')}
          onClick={() => selectTab('all')}
        >
          全部 ({wishes.length})
        </button>
        <button
          type="button"
          className={'filter-chip' + (activeTab === 'pending' ? ' active' : '')}
          onClick={() => selectTab('pending')}
        >
          待处理 ({pendingCount})
        </button>
        <button
          type="button"
          className={'filter-chip' + (activeTab === 'mine' ? ' active' : '')}
          onClick={() => selectTab('mine')}
        >
          我的认领 ({mineCount})
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : wishes.length === 0 ? (
        <>
          <EmptyState icon={empty.icon} text={empty.text} />
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
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
              onClaim={handleClaim}
              onAdvance={(wish) => setAdvanceTarget(wish)}
              onReject={(wish) => setRejectTarget(wish)}
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

      {/* 单 overlay 不变量：同时只渲染一个弹窗 */}
      {advanceTarget && (
        <WishAdvanceModal
          onClose={() => setAdvanceTarget(null)}
          onSuccess={(dishId, dishName) => handleAdvance(advanceTarget, dishId, dishName)}
        />
      )}
      {rejectTarget && (
        <WishRejectModal
          onClose={() => setRejectTarget(null)}
          onSuccess={(reason) => handleReject(rejectTarget, reason)}
        />
      )}

      <BottomBar />
    </div>
  );
}
