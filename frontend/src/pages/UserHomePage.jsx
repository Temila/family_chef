/**
 * UserHomePage - 用户首页
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
        api.getDishes({ page: 1, page_size: 6, sort: '-rating' })
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

  return (
    <div className="page-container">
      <Header title="家味" />

      {loading ? (
        <Loading />
      ) : (
        <>
          {/* Featured Section */}
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

          {/* Search Bar */}
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索菜品名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          {/* All Dishes */}
          <section className="section">
            <div className="section-title">
              <span>🍽️</span> 全部菜品
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
