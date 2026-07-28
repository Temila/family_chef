import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Button from '../components/primitives/Button';
import Card from '../components/primitives/Card';

export default function UserFavoritesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const res = await api.getFavorites({ page: 1, page_size: 100 });
      setDishes(res.items || []);
    } catch (err) {
      showToast('加载收藏失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (dish) => {
    try {
      await api.removeFavorite(dish.id);
      showToast(`已取消收藏 ${dish.name}`);
      setDishes(prev => prev.filter(d => d.id !== dish.id));
    } catch (err) {
      showToast('取消收藏失败', 'error');
    }
  };

  return (
    <div className="page-container">
      <Header title="我的收藏" showBack />

      {loading ? (
        <Loading />
      ) : dishes.length === 0 ? (
        <EmptyState icon="❤️" text="还没有收藏任何菜品" />
      ) : (
        <section className="section pt-0">
          <div className="dish-grid">
            {dishes.map(dish => (
              <Card
                key={dish.id}
                variant="elevated"
                image={dish.image_url ? (
                  <img src={dish.image_url} alt={dish.name} onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', background: 'var(--md-color-surface-container)' }}>🍽️</div>
                )}
                onClick={() => navigate(`/dishes/${dish.id}`)}
              >
                <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 6, fontFamily: 'var(--md-font-display)' }}>{dish.name}</div>
                <Button
                  variant="outlined"
                  size="sm"
                  style={{ marginTop: 6, width: '100%' }}
                  onClick={(e) => { e.stopPropagation(); handleRemoveFavorite(dish); }}
                >
                  取消收藏
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      <BottomBar />
    </div>
  );
}
