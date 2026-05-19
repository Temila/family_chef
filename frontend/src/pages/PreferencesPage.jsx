import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

export default function PreferencesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [preferences, setPreferences] = useState({ dislikes: [], allergies: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [addingTo, setAddingTo] = useState(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const res = await api.getPreferences();
      setPreferences({
        dislikes: res.dislikes || [],
        allergies: res.allergies || [],
      });
    } catch (err) {
      showToast('加载偏好失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.getIngredients(null, query);
      const items = res.items || [];
      const dislikeIds = preferences.dislikes.map(d => d.ingredient_id);
      const allergyIds = preferences.allergies.map(a => a.ingredient_id);
      const existingIds = [...dislikeIds, ...allergyIds];
      setSearchResults(items.filter(i => !existingIds.includes(i.id)));
    } catch (err) {
      setSearchResults([]);
    }
  };

  const handleAddDislike = async (ingredient) => {
    try {
      const newIds = [...preferences.dislikes.map(d => d.ingredient_id), ingredient.id];
      const allergyIds = preferences.allergies.map(a => a.ingredient_id);
      await api.updatePreferences({
        dislikes: newIds,
        allergies: allergyIds,
      });
      setPreferences(prev => ({
        ...prev,
        dislikes: [...prev.dislikes, { ingredient_id: ingredient.id, ingredient_name: ingredient.name }],
      }));
      setSearchResults(prev => prev.filter(i => i.id !== ingredient.id));
      setSearchQuery('');
      setSearchResults([]);
      showToast(`已添加「${ingredient.name}」到不爱吃`);
    } catch (err) {
      showToast('添加失败', 'error');
    }
  };

  const handleAddAllergy = async (ingredient) => {
    try {
      const newIds = [...preferences.allergies.map(a => a.ingredient_id), ingredient.id];
      const dislikeIds = preferences.dislikes.map(d => d.ingredient_id);
      await api.updatePreferences({
        dislikes: dislikeIds,
        allergies: newIds,
      });
      setPreferences(prev => ({
        ...prev,
        allergies: [...prev.allergies, { ingredient_id: ingredient.id, ingredient_name: ingredient.name }],
      }));
      setSearchResults(prev => prev.filter(i => i.id !== ingredient.id));
      setSearchQuery('');
      setSearchResults([]);
      showToast(`已添加「${ingredient.name}」到严格忌口`);
    } catch (err) {
      showToast('添加失败', 'error');
    }
  };

  const handleRemoveDislike = async (ingredientId) => {
    try {
      const newIds = preferences.dislikes
        .filter(d => d.ingredient_id !== ingredientId)
        .map(d => d.ingredient_id);
      const allergyIds = preferences.allergies.map(a => a.ingredient_id);
      await api.updatePreferences({
        dislikes: newIds,
        allergies: allergyIds,
      });
      setPreferences(prev => ({
        ...prev,
        dislikes: prev.dislikes.filter(d => d.ingredient_id !== ingredientId),
      }));
      showToast('已移除');
    } catch (err) {
      showToast('移除失败', 'error');
    }
  };

  const handleRemoveAllergy = async (ingredientId) => {
    try {
      const newIds = preferences.allergies
        .filter(a => a.ingredient_id !== ingredientId)
        .map(a => a.ingredient_id);
      const dislikeIds = preferences.dislikes.map(d => d.ingredient_id);
      await api.updatePreferences({
        dislikes: dislikeIds,
        allergies: newIds,
      });
      setPreferences(prev => ({
        ...prev,
        allergies: prev.allergies.filter(a => a.ingredient_id !== ingredientId),
      }));
      showToast('已移除');
    } catch (err) {
      showToast('移除失败', 'error');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <Header title="口味偏好" showBack />
        <Loading />
        <BottomBar />
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header title="口味偏好" showBack />

      <div className="section">
        <div className="search-bar" style={{ padding: 0, marginBottom: 16 }}>
          <span className="search-icon" style={{ left: 16 }}>🔍</span>
          <input
            type="text"
            placeholder="搜索食材添加至口味偏好..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {searchResults.length > 0 && (
          <div className="preference-search-results">
            {searchResults.map(ingredient => (
              <div key={ingredient.id} className="preference-search-item">
                <span style={{ flex: 1, fontSize: '0.9rem' }}>{ingredient.name}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--warn-light)', color: 'var(--warn)', border: 'none' }}
                    onClick={() => handleAddDislike(ingredient)}
                  >
                    不爱吃
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: 'none' }}
                    onClick={() => handleAddAllergy(ingredient)}
                  >
                    忌口
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="preference-section">
          <div className="preference-section-header">
            <span className="preference-section-icon" style={{ background: 'var(--warn-light)' }}>💛</span>
            <div>
              <div style={{ fontWeight: 600 }}>不爱吃的食材</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                点菜时会以黄色标签提醒
              </div>
            </div>
          </div>
          {preferences.dislikes.length === 0 ? (
            <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
              暂无设置，搜索食材添加
            </div>
          ) : (
            <div className="preference-tags">
              {preferences.dislikes.map(item => (
                <span key={item.ingredient_id} className="preference-tag dislike-tag">
                  {item.ingredient_name}
                  <button onClick={() => handleRemoveDislike(item.ingredient_id)}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="preference-section">
          <div className="preference-section-header">
            <span className="preference-section-icon" style={{ background: 'var(--danger-light)' }}>🔴</span>
            <div>
              <div style={{ fontWeight: 600 }}>严格忌口的食材</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                点菜时会以红色标签警告
              </div>
            </div>
          </div>
          {preferences.allergies.length === 0 ? (
            <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
              暂无设置，搜索食材添加
            </div>
          ) : (
            <div className="preference-tags">
              {preferences.allergies.map(item => (
                <span key={item.ingredient_id} className="preference-tag allergy-tag">
                  {item.ingredient_name}
                  <button onClick={() => handleRemoveAllergy(item.ingredient_id)}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomBar />
    </div>
  );
}
