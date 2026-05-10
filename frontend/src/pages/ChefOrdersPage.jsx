/**
 * ChefOrdersPage - 厨师工作台
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Badge from '../components/Badge';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { formatDate } from '../utils';

export default function ChefOrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadOrders();
  }, [filterStatus]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = { page: 1, page_size: 50 };
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      const res = await api.getOrders(params);
      setOrders(res.items || []);
    } catch (err) {
      showToast('加载订单失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    if (!window.confirm(`确定要将订单状态更改为 "${newStatus}" 吗？`)) {
      return;
    }

    try {
      await api.updateOrderStatus(orderId, newStatus);
      showToast('订单状态已更新');
      loadOrders();
    } catch (err) {
      showToast('更新失败', 'error');
    }
  };

  const statusOptions = {
    pending: '已接单',
    cooking: '烹饪中',
    completed: '已完成',
    cancelled: '已取消'
  };

  const filteredOrders = orders.filter(order => {
    if (filterStatus === 'all') return true;
    return order.status === filterStatus;
  });

  return (
    <div className="page-container">
      <Header title="订单管理" />

      {/* Filter Tabs */}
      <div className="filter-chips">
        <button
          className={`filter-chip ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          全部 ({orders.length})
        </button>
        <button
          className={`filter-chip ${filterStatus === 'pending' ? 'active' : ''}`}
          onClick={() => setFilterStatus('pending')}
        >
          待处理 ({orders.filter(o => o.status === 'pending').length})
        </button>
        <button
          className={`filter-chip ${filterStatus === 'cooking' ? 'active' : ''}`}
          onClick={() => setFilterStatus('cooking')}
        >
          烹饪中 ({orders.filter(o => o.status === 'cooking').length})
        </button>
        <button
          className={`filter-chip ${filterStatus === 'completed' ? 'active' : ''}`}
          onClick={() => setFilterStatus('completed')}
        >
          已完成 ({orders.filter(o => o.status === 'completed').length})
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : filteredOrders.length === 0 ? (
        <EmptyState icon="📋" text="没有找到订单" />
      ) : (
        <section className="section pt-0">
          {filteredOrders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <span className="order-no">#{order.id}</span>
                <span className="order-date">{formatDate(order.created_at)}</span>
              </div>

              <div className="order-items">
                {order.items && order.items.map((item, index) => (
                  <div key={index}>
                    {item.quantity}x {item.dish_name}
                  </div>
                ))}
              </div>

              <div className="order-footer">
                <Badge status={order.status} />
                <span className="order-total">
                  ¥{order.total_price?.toFixed(2) || '0.00'}
                </span>
              </div>

              {/* Action Buttons */}
              {order.status === 'pending' && (
                <div className="flex gap-3 mt-4">
                  <button
                    className="btn btn-outline btn-sm flex-1"
                    onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                  >
                    拒绝
                  </button>
                  <button
                    className="btn btn-primary btn-sm flex-1"
                    onClick={() => handleUpdateStatus(order.id, 'cooking')}
                  >
                    开始烹饪
                  </button>
                </div>
              )}

              {order.status === 'cooking' && (
                <div className="flex gap-3 mt-4">
                  <button
                    className="btn btn-primary btn-sm btn-block"
                    onClick={() => handleUpdateStatus(order.id, 'completed')}
                  >
                    完成订单
                  </button>
                </div>
              )}

              {order.status === 'completed' && (
                <div className="flex gap-3 mt-4">
                  <button
                    className="btn btn-secondary btn-sm btn-block"
                    disabled
                  >
                    已完成
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      <BottomBar />
    </div>
  );
}
