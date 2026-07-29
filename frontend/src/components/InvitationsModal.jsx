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
import ListItem from './composites/ListItem';
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
        <EmptyState icon="mail" text="还没有邀请记录" />
      ) : (
        invitations.map((inv) => (
          <ListItem key={inv.id} variant="3-line">
            <ListItem.Leading>
              <Badge
                text={inv.status === 'active' ? '活跃' : undefined}
                status={inv.status === 'active' ? undefined : inv.status}
                type={inv.status === 'active' ? 'success' : undefined}
              />
            </ListItem.Leading>
            <ListItem.Content>
              <ListItem.Headline>
                {formatDate(inv.created_at)}
              </ListItem.Headline>
              <ListItem.Supporting>
                {user?.role !== 'chef' && inv.chef_name ? inv.chef_name : ''}
              </ListItem.Supporting>
            </ListItem.Content>
            <ListItem.Trailing>
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
            </ListItem.Trailing>
          </ListItem>
        ))
      )}
    </Modal>
  );
}
