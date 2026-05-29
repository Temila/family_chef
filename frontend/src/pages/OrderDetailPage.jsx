import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Badge from '../components/Badge';
import Loading from '../components/Loading';
import { marked } from 'marked';

const mealTypeMap = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', now: '现在就想吃' };

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedDish, setExpandedDish] = useState(null);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const res = await api.getOrder(id);
      setOrder(res);
    } catch (err) {
      showToast('加载订单失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await api.updateOrderStatus(order.id, newStatus);
      showToast('状态已更新');
      loadOrder();
    } catch (err) {
      showToast('更新失败', 'error');
    }
  };

  if (loading) return <Loading />;
  if (!order) return <div style={{ padding: 40, textAlign: 'center' }}>订单不存在</div>;

  const isChef = user?.role === 'chef' || user?.role === 'admin';

  return (
    <div className="page-container">
      <Header title={`订单 #${order.id}`} actions={
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/chef/orders')}>← 返回</button>
        } />

      <section className="section">
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>
                订单 #{order.id}
                {order.is_guest && (
                  <span className="badge badge-warn" style={{ marginLeft: 8, verticalAlign: 'middle' }}>
                    访客订单
                  </span>
                )}
              </h3>
              <Badge status={order.status} />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>下单时间：{new Date(order.created_at).toLocaleString('zh-CN')}</div>
              {order.meal_date && (
                <div>用餐时间：{order.meal_date} {mealTypeMap[order.meal_type] || order.meal_type}</div>
              )}
              {order.notes && <div>备注：{order.notes}</div>}
            </div>
          </div>
        </div>

        {order.customer && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-body">
              <h4 style={{ margin: '0 0 8px' }}>下单人</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div className="avatar avatar-md">
                  {(order.customer.display_name || order.customer.username).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{order.customer.display_name || order.customer.username}</div>
                </div>
              </div>
              {order.customer.preferences && order.customer.preferences.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>口味偏好</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {order.customer.preferences.map((p, i) => (
                      <span
                        key={i}
                        className={`filter-chip ${p.type === 'allergy' ? 'active' : ''}`}
                        style={{
                          fontSize: '0.7rem', padding: '2px 8px',
                          background: p.type === 'allergy' ? 'var(--danger, #e74c3c)' : p.type === 'dislike' ? 'var(--warning-bg, #FFF3E0)' : undefined,
                          color: p.type === 'allergy' ? '#fff' : undefined,
                        }}
                      >
                        {p.type === 'allergy' ? '忌口' : '不爱吃'}: {p.ingredient}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-body">
            <h4 style={{ margin: '0 0 8px' }}>菜品</h4>
            {order.items && order.items.map(item => (
              <div key={item.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 8 }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setExpandedDish(expandedDish === item.dish_id ? null : item.dish_id)}
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>{item.dish_name}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>×{item.quantity}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {item.recipe ? (expandedDish === item.dish_id ? '收起 ▲' : '查看菜谱 ▼') : ''}
                  </span>
                </div>
                {expandedDish === item.dish_id && item.recipe && (
                  <div
                    style={{
                      marginTop: 8, padding: 12,
                      background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem', lineHeight: 1.6, textAlign: 'left',
                    }}
                    className="markdown-body"
                    dangerouslySetInnerHTML={{ __html: marked(item.recipe || '') }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {isChef && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {order.status === 'pending' && (
              <>
                <button className="btn btn-outline flex-1" onClick={() => handleUpdateStatus('cancelled')}>拒绝</button>
                <button className="btn btn-primary flex-1" onClick={() => handleUpdateStatus('cooking')}>开始烹饪</button>
              </>
            )}
            {order.status === 'accepted' && (
              <button className="btn btn-primary btn-block" onClick={() => handleUpdateStatus('cooking')}>开始烹饪</button>
            )}
            {order.status === 'cooking' && (
              <button className="btn btn-primary btn-block" onClick={() => handleUpdateStatus('completed')}>完成订单</button>
            )}
          </div>
        )}
      </section>

      <BottomBar />
    </div>
  );
}
