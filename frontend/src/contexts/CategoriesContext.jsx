import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const CategoriesContext = createContext(null);

const TYPE_META = {
  region: { label: '种类', icon: '📂' },
  cuisine: { label: '菜系', icon: '🍜' },
  taste: { label: '口味', icon: '👅' },
  season: { label: '季节', icon: '🌤️' },
  ingredient: { label: '食材分类', icon: '🥬' },
};

export const CategoriesProvider = ({ children }) => {
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.getCategories();
      setAllCategories(res.items || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const getByType = useCallback((type) => {
    return allCategories.filter(c => c.type === type);
  }, [allCategories]);

  const getTypeMeta = useCallback((type) => {
    return TYPE_META[type] || { label: type, icon: '📂' };
  }, []);

  const categoryTypes = useCallback(() => {
    const seen = new Map();
    for (const c of allCategories) {
      if (!seen.has(c.type)) {
        seen.set(c.type, TYPE_META[c.type] || { label: c.type, icon: '📂' });
      }
    }
    return Array.from(seen.entries()).map(([key, meta]) => ({ key, ...meta }));
  }, [allCategories]);

  const value = {
    allCategories,
    loading,
    getByType,
    getTypeMeta,
    categoryTypes,
    reload: loadCategories,
  };

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
};

export const useCategories = () => {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoriesProvider');
  }
  return context;
};

export default CategoriesContext;
