import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Badge from '../components/primitives/Badge';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Button from '../components/primitives/Button';
import { formatDate } from '../utils';
import Chip from '../components/primitives/Chip';
import Icon from '../components/primitives/Icon';

const MEAL_TYPE_MAP = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  now: '现在就想吃',
};

export default function UserOrdersPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState(null);

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

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('确定要取消这个订单吗？')) return;
    try {
      await api.cancelOrder(orderId);
      showToast('订单已取消');
      loadOrders();
    } catch (err) {
      showToast('取消失败', 'error');
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filterStatus === 'all') return true;
    return order.status === filterStatus;
  });

  return (
    <div className="page-container">
      <Header title="我的订单" showBack />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--md-spacing-2)', padding: '0 var(--md-spacing-4) var(--md-spacing-3)'}}>
        <Chip variant="filter" selected={filterStatus === 'all'}
          
          onClick={() => setFilterStatus('all')}
        >
          全部 ({orders.length})
        </Chip>
        <Chip variant="filter" selected={filterStatus === 'pending'}
          
          onClick={() => setFilterStatus('pending')}
        >
          待处理 ({orders.filter(o => o.status === 'pending').length})
        </Chip>
        <Chip variant="filter" selected={filterStatus === 'cooking'}
          
          onClick={() => setFilterStatus('cooking')}
        >
          烹饪中 ({orders.filter(o => o.status === 'cooking').length})
        </Chip>
        <Chip variant="filter" selected={filterStatus === 'completed'}
          
          onClick={() => setFilterStatus('completed')}
        >
          已完成 ({orders.filter(o => o.status === 'completed').length})
        </Chip>
      </div>

      {loading ? (
        <Loading />
      ) : filteredOrders.length === 0 ? (
        <EmptyState icon="inventory-2" text="没有找到订单" />
      ) : (
        <section className="section pt-0">
          {filteredOrders.map(order => (
            <div
              key={order.id}
              className="order-card"
              style={{ cursor: 'pointer' }}
              onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
            >
              <div className="order-header">
                <span className="order-no">#{order.order_no}</span>
                <span className="order-date">{formatDate(order.created_at)}</span>
              </div>

              {(order.meal_date || order.meal_type) && (
                <div style={{ fontSize: '0.8rem', color: 'var(--md-color-on-surface-variant)', marginBottom: 'var(--md-spacing-1)'}}>
                  <Icon name="set-meal" size={16} /> {order.meal_date} {MEAL_TYPE_MAP[order.meal_type] || order.meal_type}
                </div>
              )}

              <div className="order-items">
                {order.items && order.items.map((item, index) => (
                  <div key={index}>
                    {item.quantity}x {item.dish_name}
                  </div>
                ))}
              </div>

              <div className="order-footer">
                <Badge status={order.status} />
                <span style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)' }}>
                  {expandedOrder === order.id ? '收起 ▲' : '展开详情 ▼'}
                </span>
              </div>

              {expandedOrder === order.id && (
                <div style={{ marginTop: 'var(--md-spacing-3)', padding: 'var(--md-spacing-3)', background: 'var(--md-color-surface-container)', borderRadius: 'var(--md-radius-sm)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--md-color-on-surface-variant)', marginBottom: 'var(--md-spacing-2)'}}>
                    <div>订单号：{order.order_no}</div>
                    <div>下单时间：{new Date(order.created_at).toLocaleString()}</div>
                    {order.meal_date && <div>用餐时间：{order.meal_date} {MEAL_TYPE_MAP[order.meal_type] || ''}</div>}
                    {order.notes && <div>备注：{order.notes}</div>}
                  </div>
                  <div style={{ fontSize: '0.8rem' }}>
                    {order.items && order.items.map((item, index) => (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--md-spacing-1) 0'}}>
                        <span>{item.dish_name}</span>
                        <span>x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  {order.status === 'pending' && (
                    <Button
                      variant="outlined"
                      size="sm"
                      style={{ marginTop: 'var(--md-spacing-3)', width: '100%', borderColor: 'var(--md-color-error)', color: 'var(--md-color-error)' }}
                      onClick={(e) => { e.stopPropagation(); handleCancelOrder(order.id); }}
                    >
                      取消订单
                    </Button>
                  )}
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
