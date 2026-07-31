/**
 * AdminHomePage - 管理后台首页
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import ListItem from '../components/composites/ListItem';
import Loading from '../components/Loading';
import Icon from '../components/primitives/Icon';
import { formatDate } from '../utils';

export default function AdminHomePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [stats, setStats] = useState({
    totalDishes: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalChefs: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [dishesRes, ordersRes, usersRes, chefsRes, logsRes] = await Promise.all([
        api.getDishes({ page: 1, page_size: 1 }),
        api.getOrders({ page: 1, page_size: 1 }),
        api.getUsers({ page: 1, page_size: 1 }),
        api.getChefs(),
        api.getAdminLogs({ page: 1, page_size: 10 })
      ]);

      setStats({
        totalDishes: dishesRes.total || 0,
        totalOrders: ordersRes.total || 0,
        totalUsers: usersRes.total || 0,
        totalChefs: chefsRes.length || 0
      });

      setRecentActivity(logsRes.items || []);
    } catch {
      showToast('加载仪表板数据失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // queueMicrotask 规避 set-state-in-effect
    queueMicrotask(() => { loadDashboardData(); });
  }, [loadDashboardData]);

  const quickActions = [
    {
      icon: 'set-meal',
      title: '菜品管理',
      desc: '添加、编辑、删除菜品',
      onClick: () => navigate('/admin/dishes')
    },
    {
      icon: 'eco',
      title: '食材管理',
      desc: '管理食材、分类、别名',
      onClick: () => navigate('/ingredients')
    },
    {
      icon: 'folder',
      title: '分类管理',
      desc: '种类、菜系、口味、季节',
      onClick: () => navigate('/admin/categories')
    },
    {
      icon: 'chef',
      title: '厨师管理',
      desc: '厨师列表、飞书绑定',
      onClick: () => navigate('/admin/chefs')
    },
    {
      icon: 'group',
      title: '用户管理',
      desc: '管理用户、厨师账号',
      onClick: () => navigate('/admin/users')
    },
    {
      icon: 'bar-chart',
      title: '数据统计',
      desc: '查看运营数据报表',
      onClick: () => navigate('/admin/stats')
    },
    {
      icon: 'edit',
      title: '系统日志',
      desc: '查看系统操作记录',
      onClick: () => navigate('/admin/logs')
    }
  ];

  if (loading) {
    return (
      <div className="page-container">
        <Header title="管理后台" />
        <Loading />
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header title="管理后台" />

      {/* Stats Grid */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.totalDishes}</div>
          <div className="stat-label">菜品总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalOrders}</div>
          <div className="stat-label">订单总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalUsers}</div>
          <div className="stat-label">用户总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalChefs}</div>
          <div className="stat-label">厨师总数</div>
        </div>
      </div>

      {/* Quick Actions */}
      <section className="section">
        <div className="section-title">
          <span><Icon name="bolt" size={20} /></span> 快捷操作
        </div>
        <div style={{ display: 'grid', gap: 'var(--md-spacing-3)'}}>
          {quickActions.map((action, index) => (
            <div
              key={index}
              className="quick-action"
              onClick={action.onClick}
            >
              <div className="quick-action-icon"><Icon name={action.icon} size={24} /></div>
              <div style={{ flex: 1 }}>
                <div className="quick-action-text">{action.title}</div>
                <div className="quick-action-desc">{action.desc}</div>
              </div>
              <span style={{ color: 'var(--md-color-on-surface-variant)' }}>›</span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <section className="section">
          <div className="section-title">
            <span><Icon name="inventory-2" size={20} /></span> 最近活动
          </div>
          <div>
            {recentActivity.map((activity, index) => (
              <ListItem key={index} variant="2-line" className="md-list-item--static">
                <ListItem.Content>
                  <ListItem.Headline>
                    {activity.action} - {activity.target_type}
                  </ListItem.Headline>
                  <ListItem.Supporting>
                    {formatDate(activity.created_at)}
                  </ListItem.Supporting>
                </ListItem.Content>
              </ListItem>
            ))}
          </div>
        </section>
      )}

      <BottomBar />
    </div>
  );
}
