/**
 * ChefSelectModal Component - 选择厨师 Modal（Phase 11：thin wrapper over <Modal>）
 * User 角色创建邀请前选择目标厨师。
 * focus trap / ESC / 滚动锁定 由 <Modal> 内建。
 */

import { useState, useEffect } from 'react';
import api from '../api/client';
import { useToast } from '../contexts/ToastContext';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Modal from './composites/Modal';

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
    <Modal
      open
      onClose={onClose}
      title="选择厨师"
      style={{ maxWidth: 400 }}
    >
      {loading ? (
        <Loading />
      ) : chefs.length === 0 ? (
        <EmptyState icon="👨‍🍳" text="暂无可用厨师" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--md-spacing-2)'}}>
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
                  <div style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)' }}>
                    @{chef.username}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
