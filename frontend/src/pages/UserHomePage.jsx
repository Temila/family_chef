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

export default function UserHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [dishes, setDishes] = useState([]);
  const [featuredDishes, setFeaturedDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDishes();
  }, []);

  const loadDishes = async () => {
    try {
      setLoading(true);
      const [allDishes, featured] = await Promise.all([
        api.getDishes({ page: 1, page_size: 20 }),
        api.getDishes({ page: 1, page_size: 6, sort: 'popular' }),
      ]);
      setDishes(allDishes.items || []);
      setFeaturedDishes(featured.items || []);
    } catch (err) {
      showToast('加载菜品失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadDishes();
      return;
    }
    try {
      setLoading(true);
      const res = await api.getDishes({ search: searchQuery });
      setDishes(res.items || []);
    } catch (err) {
      showToast('搜索失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDishClick = (dish) => {
    navigate(`/dishes/${dish.id}`);
  };

  const menuEntries = [
    {
      icon: '🍽️',
      title: '开始点菜',
      desc: '浏览全部菜品',
      onClick: () => navigate('/order'),
    },
    {
      icon: '👅',
      title: '口味偏好',
      desc: '管理你的饮食偏好',
      onClick: () => navigate('/preferences'),
    },
  ];

  if (user?.role === 'chef' || user?.role === 'admin') {
    menuEntries.push({
      icon: '👨‍🍳',
      title: '订单管理',
      desc: '查看和处理订单',
      onClick: () => navigate('/chef/orders'),
    });
  }

  return (
    <div className="page-container">
      <Header title="家味" />

      {loading ? (
        <Loading />
      ) : (
        <>
          <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: `repeat(${menuEntries.length}, 1fr)`, gap: 10, marginBottom: 16 }}>
            {menuEntries.map((entry, i) => (
              <div
                key={i}
                className="quick-action"
                onClick={entry.onClick}
                style={{ flexDirection: 'column', textAlign: 'center', padding: 12 }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{entry.icon}</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{entry.title}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{entry.desc}</div>
              </div>
            ))}
          </div>

          {featuredDishes.length > 0 && (
            <section className="section pt-0">
              <div className="section-title">
                <span>✨</span> 今日推荐
              </div>
              <div className="dish-grid">
                {featuredDishes.slice(0, 6).map(dish => (
                  <DishCard key={dish.id} dish={dish} />
                ))}
              </div>
            </section>
          )}

          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索菜品名称或食材..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <section className="section">
            <div className="section-title">
              <span>🍽️</span> 全部菜品
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                点击"开始点菜"使用筛选功能
              </span>
            </div>
            {dishes.length > 0 ? (
              <div className="dish-grid">
                {dishes.map(dish => (
                  <DishCard key={dish.id} dish={dish} />
                ))}
              </div>
            ) : (
              <EmptyState icon="🔍" text="没有找到相关菜品" />
            )}
          </section>
        </>
      )}

      <BottomBar />
    </div>
  );
}
