/**
 * InvitationsModal Component - 全屏邀请记录 Modal（Phase 11：thin wrapper over <Modal>）
 * 展示所有邀请记录，无创建按钮。
 * focus trap / ESC / 滚动锁定 / 焦点归还 由 <Modal variant="full-screen"> 内建。
 */

import Badge from '../components/primitives/Badge';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Button from './primitives/Button';
import IconButton from './primitives/IconButton';
import Modal from './composites/Modal';
import { formatDate } from '../utils';

export default function InvitationsModal({
  invitations,
  loading,
  onClose,
  onRevoke,
  onCopyLink,
  user,
}) {
  return (
    <Modal
      variant="full-screen"
      open
      onClose={onClose}
      title="邀请记录"
    >
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
                  <IconButton
                    icon="content-copy"
                    ariaLabel="复制链接"
                    onClick={() => onCopyLink(inv.token)}
                  />
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
    </Modal>
  );
}
