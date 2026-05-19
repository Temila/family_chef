import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';

export function usePendingOrderCount(intervalMs = 30000) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user || user.role === 'user') {
      setCount(0);
      return;
    }

    const fetchCount = async () => {
      try {
        const res = await api.getOrders({ status: 'pending', page: 1, page_size: 1 });
        setCount(res.total || 0);
      } catch {
        setCount(0);
      }
    };

    fetchCount();
    const timer = setInterval(fetchCount, intervalMs);
    return () => clearInterval(timer);
  }, [user, intervalMs]);

  return count;
}
