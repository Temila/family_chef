/**
 * ChefSelectModal Component - 选择厨师 Modal
 * User 角色创建邀请前选择目标厨师
 */

import { useState, useEffect } from 'react';
import api from '../api/client';
import { useToast } from '../contexts/ToastContext';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';

export default function ChefSelectModal({ onSelect, onClose }) {
  const { showToast } = useToast();
  const [chefs, setChefs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChefs = async () => {
      setLoading(true);
      try {
        const res = await api.getChefs();
        const list = Array.isArray(res) ? res : res.items || [];
        setChefs(list);
      } catch {
        showToast('加载厨师列表失败', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadChefs();
  }, [showToast]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>选择厨师</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {loading ? (
            <Loading />
          ) : chefs.length === 0 ? (
            <EmptyState icon="👨‍🍳" text="暂无可用厨师" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {chefs.map((chef) => (
                <div
                  key={chef.id}
                  className="chef-select-item"
                  onClick={() => onSelect(chef)}
                >
                  <div className="avatar avatar-sm">
                    {(chef.display_name || chef.username || '?')[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                      {chef.display_name || chef.username}
                    </div>
                    {chef.display_name && chef.username && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        @{chef.username}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
