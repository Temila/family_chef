import { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Loading from '../components/Loading';
import { formatDate } from '../utils';

export default function AdminLogsPage() {
  const { showToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => {
    loadLogs();
  }, [page, filterAction]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = { page, page_size: 20 };
      if (filterAction) params.action = filterAction;
      const res = await api.getAdminLogs(params);
      setLogs(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      showToast('加载日志失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / 20);

  const actionLabels = {
    login: '登录', logout: '登出', create_dish: '创建菜品',
    update_dish: '更新菜品', delete_dish: '删除菜品', create_order: '创建订单',
    update_order: '更新订单', update_user: '更新用户', delete_user: '删除用户',
  };

  return (
    <div className="page-container">
        <Header title="系统日志" />

      <div className="filter-chips">
        <button
          className={`filter-chip ${filterAction === '' ? 'active' : ''}`}
          onClick={() => { setFilterAction(''); setPage(1); }}
        >
          全部 ({total})
        </button>
        {Object.entries(actionLabels).map(([key, label]) => (
          <button
            key={key}
            className={`filter-chip ${filterAction === key ? 'active' : ''}`}
            onClick={() => { setFilterAction(key); setPage(1); }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-text">暂无日志记录</div>
        </div>
      ) : (
        <section className="section pt-0 pc-content-area">
          <div className="pc-data-table-wrap">
            <table className="pc-data-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>操作</th>
                  <th>目标</th>
                  <th>详情</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--md-color-on-surface-variant)' }}>
                      {formatDate(log.created_at)}
                    </td>
                    <td>
                      <span className="badge badge-info">
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {log.target_type || '-'}{log.target_id ? ` #${log.target_id}` : ''}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--md-color-on-surface-variant)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.detail || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-card-list">
            {logs.map(log => (
              <div key={log.id} className="card" style={{ marginBottom: 10 }}>
                <div className="card-body" style={{ padding: 12 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="badge badge-info">
                      {actionLabels[log.action] || log.action}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)', marginLeft: 'auto' }}>
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--md-color-on-surface-variant)' }}>
                    {log.target_type || '-'}{log.target_id ? ` #${log.target_id}` : ''}
                  </div>
                  {log.detail && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--md-color-on-surface-variant)', marginTop: 4 }}>
                      {log.detail}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pc-pagination" style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 0' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </button>
              <span style={{ lineHeight: '32px', fontSize: '0.85rem', color: 'var(--md-color-on-surface-variant)' }}>
                {page} / {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </button>
            </div>
          )}
        </section>
      )}

      <BottomBar />
    </div>
  );
}
