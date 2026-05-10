/**
 * AdminDishesPage - 菜品管理页面
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

export default function AdminDishesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDish, setEditingDish] = useState(null);

  useEffect(() => {
    loadDishes();
  }, [filterStatus, searchQuery]);

  const loadDishes = async () => {
    try {
      setLoading(true);
      const params = { page: 1, page_size: 50 };
      if (searchQuery) params.search = searchQuery;

      const res = await api.getDishes(params);
      let items = res.items || [];

      if (filterStatus !== 'all') {
        items = items.filter(dish => {
          if (filterStatus === 'published') return dish.is_available;
          if (filterStatus === 'hidden') return !dish.is_available;
          return true;
        });
      }

      setDishes(items);
    } catch (err) {
      showToast('加载菜品失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingDish(null);
    setShowModal(true);
  };

  const handleEdit = (dish) => {
    setEditingDish(dish);
    setShowModal(true);
  };

  const handleDelete = async (dishId) => {
    if (!window.confirm('确定要删除这道菜品吗？')) {
      return;
    }

    try {
      await api.deleteDish(dishId);
      showToast('删除成功');
      loadDishes();
    } catch (err) {
      showToast('删除失败', 'error');
    }
  };

  const handleToggleStatus = async (dish) => {
    const newStatus = dish.is_available ? false : true;
    const statusText = newStatus ? '上架' : '下架';

    try {
      await api.updateDishStatus(dish.id, newStatus ? 'published' : 'hidden');
      showToast(`${statusText}成功`);
      loadDishes();
    } catch (err) {
      showToast(`${statusText}失败`, 'error');
    }
  };

  const filteredDishes = dishes;

  return (
    <div className="page-container">
      <Header
        title="菜品管理"
        actions={
          <button
            className="btn btn-primary btn-sm"
            onClick={handleCreate}
          >
            + 添加
          </button>
        }
      />

      {/* Search Bar */}
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="搜索菜品名称..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div className="filter-chips">
        <button
          className={`filter-chip ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          全部 ({dishes.length})
        </button>
        <button
          className={`filter-chip ${filterStatus === 'published' ? 'active' : ''}`}
          onClick={() => setFilterStatus('published')}
        >
          已上架 ({dishes.filter(d => d.is_available).length})
        </button>
        <button
          className={`filter-chip ${filterStatus === 'hidden' ? 'active' : ''}`}
          onClick={() => setFilterStatus('hidden')}
        >
          已下架 ({dishes.filter(d => !d.is_available).length})
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : filteredDishes.length === 0 ? (
        <EmptyState icon="🍽️" text="没有找到菜品" />
      ) : (
        <section className="section pt-0">
          {filteredDishes.map(dish => (
            <div key={dish.id} className="card" style={{ marginBottom: 12 }}>
              <div className="card-body" style={{ padding: 12 }}>
                <div className="flex items-center gap-3 mb-4">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {dish.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {dish.cuisine_name} · {dish.category_name}
                    </div>
                  </div>
                  <Badge status={dish.is_available ? 'published' : 'hidden'} />
                </div>

                {dish.description && (
                  <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    marginBottom: 8,
                    lineHeight: 1.5
                  }}>
                    {dish.description}
                  </p>
                )}

                <div className="flex gap-3" style={{ marginTop: 12 }}>
                  <button
                    className="btn btn-outline btn-sm flex-1"
                    onClick={() => handleEdit(dish)}
                  >
                    编辑
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleToggleStatus(dish)}
                  >
                    {dish.is_available ? '下架' : '上架'}
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleDelete(dish.id)}
                    style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      <BottomBar />
    </div>
  );
}
