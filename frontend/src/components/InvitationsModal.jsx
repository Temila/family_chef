/**
 * InvitationsModal Component - 全屏邀请记录 Modal
 * 展示所有邀请记录，无创建按钮
 */

import { useEffect } from 'react';
import Badge from '../components/Badge';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Button from './primitives/Button';
import { formatDate } from '../utils';

export default function InvitationsModal({
  invitations,
  loading,
  onClose,
  onRevoke,
  onCopyLink,
  user,
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ alignItems: 'flex-start', paddingTop: 0 }}
    >
      <div
        className="modal-content"
        style={{ maxWidth: '100%', height: '100vh', borderRadius: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>邀请记录</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body" style={{ padding: 0 }}>
          {loading ? (
            <Loading />
          ) : invitations.length === 0 ? (
            <EmptyState icon="📭" text="还没有邀请记录" />
          ) : (
            invitations.map((inv) => (
              <div
                key={inv.id}
                className="list-item"
                style={{ cursor: 'default' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <Badge
                    text={inv.status === 'active' ? '活跃' : undefined}
                    status={inv.status === 'active' ? undefined : inv.status}
                    type={inv.status === 'active' ? 'success' : undefined}
                  />
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--md-color-on-surface-variant)',
                    }}
                  >
                    {formatDate(inv.created_at)}
                  </div>
                  {user?.role !== 'chef' && inv.chef_name && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--md-color-on-surface-variant)',
                      }}
                    >
                      {inv.chef_name}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    flexShrink: 0,
                  }}
                >
                  {inv.status === 'active' && (
                    <>
                      <button
                        className="btn-icon"
                        onClick={() => onCopyLink(inv.token)}
                        title="复制链接"
                        style={{ cursor: 'pointer' }}
                      >
                        📋
                      </button>
                      <Button
                        variant="outlined"
                        size="sm"
                        style={{
                          borderColor: 'var(--md-color-error)',
                          color: 'var(--md-color-error)',
                        }}
                        onClick={() => {
                          onRevoke(inv);
                          onClose();
                        }}
                      >
                        撤销
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
