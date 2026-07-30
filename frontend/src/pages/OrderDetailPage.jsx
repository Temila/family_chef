import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Badge from '../components/primitives/Badge';
import Card from '../components/primitives/Card';
import Loading from '../components/Loading';
import Button from '../components/primitives/Button';
import { marked } from 'marked';
import Chip from '../components/primitives/Chip';

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
  if (!order) return <div style={{ padding: 'var(--md-spacing-7)', textAlign: 'center' }}>订单不存在</div>;

  const isChef = user?.role === 'chef' || user?.role === 'admin';

  return (
    <div className="page-container">
      <Header title={`订单 #${order.id}`} actions={
          <div className="header-action-bar" style={{ display: 'flex', gap: 'var(--md-spacing-2)'}}>
            <Button variant="tonal" size="sm" onClick={() => navigate('/chef/orders')}>← 返回</Button>
          </div>
        } />

      <section className="section">
        {/* div 1: 上下两段式中的第一段 —— 订单概览 + 下单人 */}
        <div style={{ width: '100%', marginBottom: 'var(--md-spacing-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: 'var(--md-spacing-3)' }}>
            {/* 左卡 40%: 订单号 / 状态 / 下单时间 / 用餐时间 / 备注 */}
            <Card variant="elevated">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--md-spacing-3)' }}>
                <h3 style={{ margin: 0 }}>
                  订单 #{order.id}
                  {order.is_guest && (
                    <Badge tone="warn" style={{ marginLeft: 'var(--md-spacing-2)', verticalAlign: 'middle' }}>访客订单</Badge>
                  )}
                </h3>
                <Badge status={order.status} />
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--md-color-on-surface-variant)', display: 'flex', flexDirection: 'column', gap: 'var(--md-spacing-1)' }}>
                <div>下单时间：{new Date(order.created_at).toLocaleString('zh-CN')}</div>
                {order.meal_date && (
                  <div>用餐时间：{order.meal_date} {mealTypeMap[order.meal_type] || order.meal_type}</div>
                )}
                {order.notes && <div>备注：{order.notes}</div>}
              </div>
            </Card>

            {/* 右卡 60%: 下单人 + 口味偏好 */}
            {order.customer && (
              <Card variant="elevated">
                <h4 style={{ margin: '0 0 var(--md-spacing-2)' }}>下单人</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--md-spacing-2)', marginBottom: 'var(--md-spacing-2)' }}>
                  <div className="avatar avatar-md">
                    {(order.customer.display_name || order.customer.username).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{order.customer.display_name || order.customer.username}</div>
                  </div>
                </div>
                {order.customer.preferences && order.customer.preferences.length > 0 && (
                  <div style={{ marginTop: 'var(--md-spacing-2)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 'var(--md-spacing-1)' }}>口味偏好</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--md-spacing-1)' }}>
                      {order.customer.preferences.map((p, i) => (
                        <Chip key={i} variant="assist" leadingIcon={p.type === 'allergy' ? 'warning' : undefined}>
                          {p.type === 'allergy' ? '忌口' : '不爱吃'}: {p.ingredient}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>

        {/* div 2: 菜品列表（单卡片，全宽） */}
        <Card variant="elevated">
          <h4 style={{ margin: '0 0 var(--md-spacing-2)' }}>菜品</h4>
          {order.items && order.items.map(item => (
            <div key={item.id} style={{ borderBottom: '1px solid var(--md-color-outline-variant)', paddingBottom: 'var(--md-spacing-2)', marginBottom: 'var(--md-spacing-2)' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpandedDish(expandedDish === item.dish_id ? null : item.dish_id)}
              >
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontWeight: 600 }}>{item.dish_name}</span>
                  <span style={{ color: 'var(--md-color-on-surface-variant)', marginLeft: 'var(--md-spacing-2)' }}>×{item.quantity}</span>
                </div>
                {item.recipe ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)' }}>
                    {expandedDish === item.dish_id ? '收起 ▲' : '查看菜谱 ▼'}
                  </span>
                ) : <span />}
              </div>
              {expandedDish === item.dish_id && item.recipe && (
                <div
                  style={{
                    marginTop: 'var(--md-spacing-2)', padding: 'var(--md-spacing-3)',
                    background: 'var(--md-color-surface-container)', borderRadius: 'var(--md-radius-sm)',
                    fontSize: '0.85rem', lineHeight: 1.6, textAlign: 'left',
                  }}
                  className="markdown-body"
                  dangerouslySetInnerHTML={{ __html: marked(item.recipe || '') }}
                />
              )}
            </div>
          ))}
        </Card>

        {/* chef 操作按钮区（保留原位置——位于 section 末尾、菜品卡之后） */}
        {isChef && (
          <div style={{ display: 'flex', gap: 'var(--md-spacing-2)', marginTop: 'var(--md-spacing-4)' }}>
            {order.status === 'pending' && (
              <>
                <Button variant="outlined" className="flex-1" onClick={() => handleUpdateStatus('cancelled')}>拒绝</Button>
                <Button variant="filled" className="flex-1" onClick={() => handleUpdateStatus('cooking')}>开始烹饪</Button>
              </>
            )}
            {order.status === 'accepted' && (
              <Button variant="filled" style={{ width: '100%' }} onClick={() => handleUpdateStatus('cooking')}>开始烹饪</Button>
            )}
            {order.status === 'cooking' && (
              <Button variant="filled" style={{ width: '100%' }} onClick={() => handleUpdateStatus('completed')}>完成订单</Button>
            )}
          </div>
        )}
      </section>

      <BottomBar />
    </div>
  );
}
