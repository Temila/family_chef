/**
 * OrderPage - 点菜/购物车页面
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import DishCard from '../components/DishCard';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { formatPrice } from '../utils';

export default function OrderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [dishes, setDishes] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDishes();
    loadCart();
  }, []);

  const loadDishes = async () => {
    try {
      setLoading(true);
      const res = await api.getDishes({ page: 1, page_size: 50 });
      setDishes(res.items || []);
    } catch (err) {
      showToast('加载菜品失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCart = () => {
    const saved = localStorage.getItem('fc_cart');
    setCart(saved ? JSON.parse(saved) : []);
  };

  const addToCart = (dish, quantity = 1) => {
    const newCart = [...cart];
    const existing = newCart.find(item => item.dish_id === dish.id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      newCart.push({
        dish_id: dish.id,
        dish_name: dish.name,
        base_price: dish.base_price,
        quantity
      });
    }

    setCart(newCart);
    localStorage.setItem('fc_cart', JSON.stringify(newCart));
    showToast(`已添加 ${quantity} 份到购物车`);
  };

  const removeFromCart = (dishId) => {
    const newCart = cart.filter(item => item.dish_id !== dishId);
    setCart(newCart);
    localStorage.setItem('fc_cart', JSON.stringify(newCart));
  };

  const updateQuantity = (dishId, delta) => {
    const newCart = cart.map(item => {
      if (item.dish_id === dishId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
      }
      return item;
    }).filter(Boolean);

    setCart(newCart);
    localStorage.setItem('fc_cart', JSON.stringify(newCart));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + (item.base_price || 0) * item.quantity,
    0
  );

  const handleSubmitOrder = async () => {
    if (!user) {
      showToast('请先登录', 'error');
      navigate('/login');
      return;
    }

    if (cart.length === 0) {
      showToast('购物车为空', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await api.createOrder({
        items: cart.map(item => ({
          dish_id: item.dish_id,
          quantity: item.quantity
        }))
      });

      // 清空购物车
      setCart([]);
      localStorage.removeItem('fc_cart');

      showToast('订单提交成功');
      navigate('/profile');
    } catch (err) {
      showToast('提交订单失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const availableDishes = dishes.filter(d => d.is_available);

  return (
    <div className="page-container">
      <Header title="点菜" />

      {loading ? (
        <Loading />
      ) : (
        <>
          {/* Dishes Grid */}
          <section className="section pt-0">
            <div className="section-title">
              <span>🍽️</span> 可选菜品 ({availableDishes.length})
            </div>
            {availableDishes.length > 0 ? (
              <div className="dish-grid">
                {availableDishes.map(dish => (
                  <div key={dish.id}>
                    <DishCard dish={dish} />
                    <button
                      className="btn btn-primary btn-sm btn-block"
                      style={{ marginTop: 8 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(dish, 1);
                      }}
                    >
                      加入
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="🍽️" text="暂无可点菜品" />
            )}
          </section>

          {/* Cart Bar */}
          {cart.length > 0 && (
            <div className="cart-bar">
              <div className="flex items-center gap-3">
                <span>购物车 {cart.length} 项</span>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  ¥{formatPrice(cartTotal)}
                </span>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSubmitOrder}
                disabled={submitting}
              >
                {submitting ? '提交中...' : '提交订单'}
              </button>
            </div>
          )}

          {/* Cart Items Preview */}
          {cart.length > 0 && (
            <section className="section" style={{ marginBottom: 80 }}>
              <div className="section-title">🛒 购物车</div>
              {cart.map(item => (
                <div
                  key={item.dish_id}
                  className="list-item"
                  style={{ justifyContent: 'space-between' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="list-item-name">{item.dish_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="qty-stepper">
                      <button onClick={() => updateQuantity(item.dish_id, -1)}>
                        −
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.dish_id, 1)}>
                        +
                      </button>
                    </div>
                    <button
                      className="btn-icon btn-sm"
                      onClick={() => removeFromCart(item.dish_id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      <BottomBar />
    </div>
  );
}
