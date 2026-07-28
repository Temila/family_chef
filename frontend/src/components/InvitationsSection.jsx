/**
 * InvitationsSection Component - 邀请访客区块
 * 显示最近5条邀请记录，提供创建/撤销/复制链接功能
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/client';
import Badge from '../components/primitives/Badge';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { formatDate } from '../utils';
import InvitationsModal from './InvitationsModal';
import ChefSelectModal from './ChefSelectModal';
import CreateLinkModal from './CreateLinkModal';
import ConfirmModal from './ConfirmModal';
import Button from './primitives/Button';
import IconButton from './primitives/IconButton';
import ListItem from './composites/ListItem';

export default function InvitationsSection() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFullList, setShowFullList] = useState(false);
  const [showChefSelect, setShowChefSelect] = useState(false);
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [newLink, setNewLink] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const res = await api.getInvitations({ page: 1, page_size: 50 });
      setInvitations(res.items || []);
    } catch {
      showToast('加载邀请列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateClick = () => {
    if (user?.role === 'chef') {
      handleCreateInvitation();
    } else {
      setShowChefSelect(true);
    }
  };

  const handleCreateInvitation = async (chefId) => {
    try {
      const res = await api.createInvitation(chefId);
      const url = window.location.origin + '/guest/' + res.token;
      setNewLink(url);
      setShowChefSelect(false);
      setShowCreateLink(true);
      showToast('邀请链接已创建');
      await loadInvitations();
    } catch {
      showToast('创建邀请失败，请稍后重试', 'error');
    }
  };

  const handleCopyLink = async (token) => {
    const url = window.location.origin + '/guest/' + token;
    try {
      await navigator.clipboard.writeText(url);
      showToast('链接已复制到剪贴板');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showToast('链接已复制到剪贴板');
      } catch {
        showToast('复制失败，请手动复制', 'error');
      }
      document.body.removeChild(ta);
    }
  };

  const handleRevoke = async (invitationId) => {
    const prevInvitations = [...invitations]; // Save for rollback on error
    // optimistic update: immediately show revoked state
    setInvitations((prev) =>
      prev.map((inv) =>
        inv.id === invitationId ? { ...inv, status: 'revoked' } : inv
      )
    );
    setRevokeTarget(null); // Close modal
    try {
      await api.revokeInvitation(invitationId);
      showToast('邀请已撤销');
    } catch {
      setInvitations(prevInvitations);
      showToast('撤销失败，请稍后重试', 'error');
    }
  };

  const handleCloseCreateLink = () => {
    setShowCreateLink(false);
    setNewLink(null);
    loadInvitations();
  };

  return (
    <section className="section">
      <div
        className="section-title"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>邀请访客</span>
        <div style={{ display: 'flex', gap: 'var(--md-spacing-2)', alignItems: 'center' }}>
          <Button variant="filled" size="sm" onClick={handleCreateClick}>
            创建邀请
          </Button>
          {invitations.length > 0 && (
            <button
              onClick={() => setShowFullList(true)}
              style={{
                fontSize: '0.85rem',
                color: 'var(--md-color-primary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              查看全部 ›
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : invitations.length === 0 ? (
        <EmptyState
          icon="📭"
          text="还没有邀请记录"
          subtext="创建邀请链接，让来做客的朋友提前点好想吃的菜"
        />
      ) : (
        invitations.slice(0, 5).map((inv) => (
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
                    onClick={() => handleCopyLink(inv.token)}
                  />
                  <Button
                    variant="outlined"
                    size="sm"
                    style={{
                      borderColor: 'var(--md-color-error)',
                      color: 'var(--md-color-error)',
                    }}
                    onClick={() => setRevokeTarget(inv)}
                  >
                    撤销
                  </Button>
                </>
              )}
            </ListItem.Trailing>
          </ListItem>
        ))
      )}

      {/* Modals */}
      {showFullList && (
        <InvitationsModal
          invitations={invitations}
          loading={loading}
          onClose={() => setShowFullList(false)}
          onRevoke={(inv) => setRevokeTarget(inv)}
          onCopyLink={handleCopyLink}
          user={user}
        />
      )}
      {showChefSelect && (
        <ChefSelectModal
          onSelect={(chef) => handleCreateInvitation(chef.id)}
          onClose={() => setShowChefSelect(false)}
        />
      )}
      {showCreateLink && newLink && (
        <CreateLinkModal linkUrl={newLink} onClose={handleCloseCreateLink} />
      )}
      {revokeTarget && (
        <ConfirmModal
          title="撤销邀请"
          message="确定要撤销这条邀请链接吗？撤销后邀请将立即失效，访客无法继续使用此链接点菜。"
          confirmText="确定撤销"
          danger
          onConfirm={() => handleRevoke(revokeTarget.id)}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </section>
  );
}
