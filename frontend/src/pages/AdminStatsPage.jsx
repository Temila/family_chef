import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Loading from '../components/Loading';
import Badge from '../components/primitives/Badge';
import Icon from '../components/primitives/Icon';

export default function AdminStatsPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getAdminStats();
      setStats(res);
    } catch {
      showToast('加载统计数据失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // queueMicrotask 规避 set-state-in-effect
    queueMicrotask(() => { loadStats(); });
  }, [loadStats]);

  if (loading) {
    return (
      <div className="page-container">
        <Header title="数据统计" />
        <Loading />
        <BottomBar />
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: '用户总数', value: stats.users?.total || 0, sub: `${stats.users?.active || 0} 活跃`, icon: 'group', color: 'var(--md-color-primary)' },
    { label: '菜品总数', value: stats.dishes?.total || 0, sub: `${stats.dishes?.published || 0} 已上架`, icon: 'set-meal', color: 'var(--md-color-primary)' },
    { label: '今日订单', value: stats.orders?.today || 0, sub: '今日', icon: 'inventory-2', color: 'var(--md-color-tertiary)' },
    { label: '本周订单', value: stats.orders?.week || 0, sub: '本周', icon: 'schedule', color: 'var(--md-color-secondary)' },
    { label: '本月订单', value: stats.orders?.month || 0, sub: '本月', icon: 'bar-chart', color: 'var(--md-color-tertiary)' },
    { label: '订单总数', value: stats.orders?.total || 0, sub: '累计', icon: 'inventory-2', color: 'var(--md-color-primary)' },
  ];

  const dishStats = [
    { label: '已上架', value: stats.dishes?.published || 0, tone: 'success' },
    { label: '草稿', value: stats.dishes?.draft || 0, tone: 'info' },
  ];

  return (
    <div className="page-container">
      <Header title="数据统计" />

      <section className="section pc-content-area">
        <div className="section-title"><span><Icon name="trending-up" size={20} /></span> 核心指标</div>
        <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {statCards.map((s, i) => (
            <div key={i} className="stat-card" style={{ borderLeft: `3px solid ${s.color}` }}>
              <div style={{ marginBottom: 'var(--md-spacing-1)'}}><Icon name={s.icon} size={28} /></div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--md-color-on-surface-variant)', marginTop: 'var(--md-spacing-1)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section pc-content-area">
        <div className="section-title"><span><Icon name="set-meal" size={20} /></span> 菜品分布</div>
        <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
          {dishStats.map((d, i) => (
            <div key={i} className="stat-card" style={{ flex: 1, minWidth: 120 }}>
              <Badge tone={d.tone} style={{ marginBottom: 'var(--md-spacing-2)'}}>{d.label}</Badge>
              <div className="stat-value">{d.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section pc-content-area">
        <div className="section-title"><span><Icon name="inventory-2" size={20} /></span> 用户概况</div>
        <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
          <div className="stat-card" style={{ flex: 1, minWidth: 120 }}>
            <div className="stat-value">{stats.users?.total || 0}</div>
            <div className="stat-label">总用户</div>
          </div>
          <div className="stat-card" style={{ flex: 1, minWidth: 120 }}>
            <div className="stat-value">{stats.users?.active || 0}</div>
            <div className="stat-label">活跃用户</div>
          </div>
        </div>
      </section>

      <BottomBar />
    </div>
  );
}
