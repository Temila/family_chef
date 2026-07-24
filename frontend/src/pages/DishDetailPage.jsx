import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useCategories } from '../contexts/CategoriesContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Badge from '../components/Badge';
import Loading from '../components/Loading';

export default function DishDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { getTypeMeta, categoryTypes } = useCategories();

  const ING_CATEGORY_ICONS = {
    '肉类': '🥩',
    '蔬菜': '🥬',
    '海鲜': '🦐',
    '水果': '🍎',
    '调味品': '🧂',
    '辅料': '🧄',
    '其他': '📦',
  };

  const [dish, setDish] = useState(null);
  const [loading, setLoading] = useState(true);
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

  const getCart = () => {
    const saved = localStorage.getItem('fc_cart');
    return saved ? JSON.parse(saved) : [];
  };

  const saveCart = (newCart) => {
    localStorage.setItem('fc_cart', JSON.stringify(newCart));
  };

  const handleAddToCart = () => {
    if (!user) {
      showToast('请先登录', 'error');
      navigate('/login');
      return;
    }
    const cart = getCart();
    const existing = cart.find(item => item.dish_id === dish.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        dish_id: dish.id,
        dish_name: dish.name,
        quantity,
      });
    }
    saveCart(cart);
    showToast(`已添加 ${quantity} 份 ${dish.name}`);
    setQuantity(1);
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

  if (!dish) return null;

  const dishCategoryGroups = categoryTypes()
    .filter(t => t.key !== 'ingredient')
    .map(t => ({
      type: t.key,
      meta: t,
      items: (dish.categories || []).filter(c => c.type === t.key),
    }))
    .filter(g => g.items.length > 0);

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

      {dish.image_url && (
        <div className="hero-image">
          <img src={dish.image_url} alt={dish.name} />
        </div>
      )}

      <section className="section">
        <div className="flex items-center gap-3 mb-4">
          <h2 style={{ fontFamily: 'var(--md-font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--md-color-on-surface)' }}>
            {dish.name}
          </h2>
          {dish.is_popular && <Badge status="published" text="推荐" type="gold" />}
          {dish.is_semifinished && (
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 4, background: 'var(--md-color-tertiary-container)', color: 'var(--md-color-on-tertiary-container)', fontWeight: 600 }}>半成品</span>
          )}
        </div>

        {dish.description && (
          <p style={{ color: 'var(--md-color-on-surface-variant)', lineHeight: 1.6, marginBottom: 16, fontSize: '0.9rem' }}>
            {dish.description}
          </p>
        )}

        {dish.dietary_warning && (
          <div
            className={`dietary-warning-card ${dish.dietary_warning.type === 'allergy' ? 'allergy' : 'dislike'}`}
          >
            <span>⚠️</span>
            <span>
              {dish.dietary_warning.type === 'allergy' ? '严格忌口' : '不爱吃'}: {dish.dietary_warning.ingredient}
            </span>
          </div>
        )}

        <div className="info-pills" style={{ marginBottom: 16 }}>
          {dishCategoryGroups.map(g => (
            <span className="info-pill" key={g.type}>{g.meta.icon} {g.items.map(c => c.name).join('、')}</span>
          ))}
        </div>

        {dish.ingredients && dish.ingredients.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 className="section-title">🥗 食材列表</h3>
            {Object.entries(
              dish.ingredients.reduce((acc, ing) => {
                const cat = ing.category || '其他';
                (acc[cat] = acc[cat] || []).push(ing);
                return acc;
              }, {})
            ).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: '1rem' }}>{ING_CATEGORY_ICONS[cat] || '📦'}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--md-color-on-surface-variant)' }}>{cat}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {items.map(ing => (
                    <span key={ing.id} className="ingredient-tag">
                      {ing.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {dish.semifinished_ingredients && dish.semifinished_ingredients.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 className="section-title">🍳 半成品食材</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {dish.semifinished_ingredients.map(sf => (
                <span key={sf.id} className="ingredient-tag" style={{ background: 'var(--md-color-tertiary-container)', color: 'var(--md-color-on-tertiary-container)' }}>
                  {sf.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {dish.status === 'published' && !dish.is_semifinished && (
        <div className="cart-bar">
          <div className="qty-stepper">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
            <span className="qty-value">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)}>+</button>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAddToCart}
          >
            加入已点菜品 · {quantity}份
          </button>
        </div>
      )}

      <BottomBar />
    </div>
  );
}
