/**
 * DishDetailPage - 菜品详情页
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Badge from '../components/Badge';
import Loading from '../components/Loading';
import { formatPrice } from '../utils';

export default function DishDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [dish, setDish] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadDish();
  }, [id]);

  const loadDish = async () => {
    try {
      setLoading(true);
      const res = await api.getDish(id);
      setDish(res);
    } catch (err) {
      showToast('加载菜品详情失败', 'error');
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      showToast('请先登录', 'error');
      navigate('/login');
      return;
    }

    if (addingToCart) return;

    try {
      setAddingToCart(true);
      // 这里需要实现购物车逻辑，暂时显示提示
      showToast(`已添加 ${quantity} 份到购物车`);
    } catch (err) {
      showToast('添加购物车失败', 'error');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      showToast('请先登录', 'error');
      navigate('/login');
      return;
    }

    try {
      if (dish.is_favorite) {
        await api.removeFavorite(dish.id);
        setDish({ ...dish, is_favorite: false });
        showToast('已取消收藏');
      } else {
        await api.addFavorite(dish.id);
        setDish({ ...dish, is_favorite: true });
        showToast('已收藏');
      }
    } catch (err) {
      showToast('操作失败', 'error');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <Header title="菜品详情" showBack />
        <Loading />
      </div>
    );
  }

  if (!dish) {
    return null;
  }

  return (
    <div className="page-container">
      <Header
        title={dish.name}
        showBack
        actions={
          <button
            className="btn-icon"
            onClick={handleFavorite}
            title={dish.is_favorite ? '取消收藏' : '收藏'}
          >
            {dish.is_favorite ? '❤️' : '🤍'}
          </button>
        }
      />

      {/* Dish Image */}
      {dish.image_url && (
        <div className="hero-image">
          <img src={dish.image_url} alt={dish.name} />
        </div>
      )}

      <section className="section">
        {/* Price & Status */}
        <div className="flex items-center gap-3 mb-4">
          {dish.base_price !== null && (
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>
              ¥{formatPrice(dish.base_price)}
            </span>
          )}
          <Badge status={dish.is_available ? 'published' : 'hidden'} />
          {dish.is_featured && <Badge type="gold" text="推荐" />}
        </div>

        {/* Description */}
        {dish.description && (
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
            {dish.description}
          </p>
        )}

        {/* Info Pills */}
        <div className="info-pills" style={{ marginBottom: 16 }}>
          {dish.cuisine_name && (
            <span className="info-pill">
              🍜 {dish.cuisine_name}
            </span>
          )}
          {dish.category_name && (
            <span className="info-pill">
              📁 {dish.category_name}
            </span>
          )}
          {dish.taste_names && dish.taste_names.length > 0 && (
            <span className="info-pill">
              👅 {dish.taste_names.join(', ')}
            </span>
          )}
          {dish.region_names && dish.region_names.length > 0 && (
            <span className="info-pill">
              📍 {dish.region_names.join(', ')}
            </span>
          )}
        </div>

        {/* Ingredients */}
        {dish.ingredients && dish.ingredients.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 className="section-title">🥗 主要食材</h3>
            <div className="ingredient-item">
              <span className="ingredient-icon">🧅</span>
              <span style={{ flex: 1 }}>
                {dish.ingredients.map(ing => ing.name).join(', ')}
              </span>
            </div>
          </div>
        )}

        {/* Dietary Warning */}
        {dish.dietary_warning && (
          <div
            className="card"
            style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: 'var(--warn-light)',
              borderColor: 'var(--warn)'
            }}
          >
            <div className="flex items-center gap-3">
              <span>⚠️</span>
              <span style={{ color: 'var(--warn)', fontSize: '0.85rem' }}>
                {dish.dietary_warning}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Quantity & Add to Cart */}
      {dish.is_available && (
        <div className="cart-bar">
          <div className="qty-stepper">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>
              −
            </button>
            <span className="qty-value">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)}>+</button>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAddToCart}
            disabled={addingToCart}
          >
            {addingToCart ? '添加中...' : `加入购物车 · ¥${formatPrice((dish.base_price || 0) * quantity)}`}
          </button>
        </div>
      )}

      <BottomBar />
    </div>
  );
}
