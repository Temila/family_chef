/**
 * WishCard Component - 愿望卡片（跨角色共享展示组件）
 * 纯展示组件：所有 API 调用由父页面处理，通过回调触发动作。
 * 依据 UI-SPEC §6.1 锁定的卡片解剖与 D-07 行动按钮矩阵。
 *
 * Phase 10 D-13 重构：薄 slot-based 包装，业务数据通过 props 传入 Card primitive。
 * 旧自包含 .wish-card className 彻底消失；Card primitive 接管所有视觉/状态/动效。
 *
 * 10-02-MIGRATION:START — Card primitive slot 抽象（Badge 由 10-03 替换为 primitives/Badge）
 */

import { Link } from 'react-router-dom';
import Badge from './primitives/Badge';
import { formatDate } from '../utils';
import Card from './primitives/Card';
import Button from './primitives/Button';

// 危险操作按钮（撤销/拒绝）的红色描边样式 — 与 ConfirmModal danger 模式一致
const DANGER_BTN_STYLE = { borderColor: 'var(--md-color-error)', color: 'var(--md-color-error)' };

// reference_url 仅在以 http:// 或 https:// 开头时渲染为链接（T-07-T02 反向 tabnabbing 缓解）
const HTTP_URL_RE = /^https?:\/\//i;

export default function WishCard({
  wish,
  currentUser,
  viewAsAdmin = false,
  currentRole,
  relatedDishName,
  highlight = false,
  onEdit,
  onCancel,
  onClaim,
  onAdvance,
  onReject,
  onTap,
}) {
  if (!wish) return null;

  const isUserView = currentRole === 'user' && !viewAsAdmin;
  const isAdminView = currentRole === 'admin' || viewAsAdmin;
  const isChefLikeView = !isUserView; // chef 或 admin 的只读/生命周期视图
  const isOwnClaim =
    wish.claimed_by_chef_id != null && wish.claimed_by_chef_id === currentUser?.id;

  // D-07 行动按钮矩阵：管理员仅查看，用户/厨师按角色、状态和认领人显示动作
  const renderActions = () => {
    if (isAdminView) return null;

    // 用户视图：仅在 待处理 / 准备中 可编辑/撤销自己的愿望
    if (isUserView) {
      if (
        currentUser?.id === wish.user_id &&
        (wish.status === '待处理' || wish.status === '准备中')
      ) {
        return (
          <>
            <Button
              variant="filled"
              size="sm"
              className="flex-1"
              onClick={() => onEdit?.(wish)}
            >
              编辑愿望
            </Button>
            <Button
              variant="outlined"
              size="sm"
              className="flex-1"
              style={DANGER_BTN_STYLE}
              onClick={() => onCancel?.(wish)}
            >
              撤销愿望
            </Button>
          </>
        );
      }
      return null;
    }

    // 厨师生命周期视图
    if (wish.status === '待处理' && !wish.claimed_by_chef_id) {
      return (
        <Button
          variant="filled"
          size="sm"
          className="flex-1"
          onClick={() => onClaim?.(wish)}
        >
          认领愿望
        </Button>
      );
    }
    if (wish.status === '准备中' && isOwnClaim) {
      return (
        <>
          <Button
            variant="filled"
            size="sm"
            className="flex-1"
            onClick={() => onAdvance?.(wish)}
          >
            推进愿望
          </Button>
          <Button
            variant="outlined"
            size="sm"
            className="flex-1"
            style={DANGER_BTN_STYLE}
            onClick={() => onReject?.(wish)}
          >
            拒绝愿望
          </Button>
        </>
      );
    }
    return null;
  };

  const actions = renderActions();
  const hasActions = actions != null;
  // 仅当提交者本人且 has_unread 为真时，卡片本体可点击以清除红点（NOTIF-04）
  const canTap = currentUser?.id === wish.user_id && wish.has_unread === true;

  // reference_url 安全渲染：http/https → 新标签链接（noopener noreferrer），其余为纯文本
  const renderReferenceUrl = () => {
    if (!wish.reference_url) return null;
    const url = String(wish.reference_url);
    if (HTTP_URL_RE.test(url)) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer"
           style={{ wordBreak: 'break-all', display: 'block', maxWidth: '100%' }}>
          {url}
        </a>
      );
    }
    return <span>{url}</span>;
  };

  const hasSecondary =
    wish.reference_url ||
    wish.note ||
    (wish.related_dish_id && relatedDishName) ||
    (wish.status === '已拒绝' && wish.reject_reason);

  // Card 高亮 + readonly 样式（替换旧 .wish-card-highlight / .wish-card-readonly className）
  // BUG-03/D-06: flex 列布局让 grid stretch 后 footer 能 margin-top:auto 钉到底部
  const cardStyle = {
    width: '100%',
    minHeight: '120px',
    marginBottom: 'var(--md-spacing-4)',
    ...(highlight ? {
      outline: '3px solid var(--md-color-primary)',
      outlineOffset: 2,
      boxShadow: '0 0 0 4px var(--md-color-primary-container)',
    } : {}),
    ...(!hasActions ? { opacity: 0.7 } : {}),
    display: 'flex',
    flexDirection: 'column',
  };

  // 未读红点（替换旧 .wish-card-unread-dot）
  const unreadDotStyle = {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--md-color-error)',
    zIndex: 3,
  };

  // 次要信息区样式（替换旧 .wish-card-secondary）
  const secondaryStyle = {
    fontSize: '0.875rem',
    color: 'var(--md-color-on-surface-variant)',
    lineHeight: 1.5,
    wordBreak: 'break-word',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--md-spacing-2)',
  };

  // 拒绝原因样式（替换旧 .wish-card-reject-reason）
  const rejectReasonStyle = {
    color: 'var(--md-color-error)',
    background: 'var(--md-color-error-container)',
    borderRadius: 'var(--md-radius-xs)',
    padding: 'var(--md-spacing-2) var(--md-spacing-4)',
    fontSize: '0.875rem',
  };

  return (
    <Card
      variant="elevated"
      style={cardStyle}
      onClick={canTap ? () => onTap?.(wish) : undefined}
      data-wish-id={wish.id}
      footer={hasActions ? (
        <div
          style={{
            display: 'flex',
            gap: 'var(--md-spacing-2)',
            flexWrap: 'wrap',
            paddingTop: 'var(--md-spacing-2)',
            borderTop: '1px dashed var(--md-color-outline-variant)',
            marginTop: 'auto',
            justifyContent: 'flex-end'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      ) : undefined}
    >
      {/* 顶行：菜名（大号）+ 未读红点 + 状态徽章 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--md-spacing-2)', position: 'relative' }}>
        <div style={{ fontFamily: 'var(--md-font-display)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--md-color-on-surface)', lineHeight: 1.3, flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
          {wish.dish_name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--md-spacing-2)', flexShrink: 0 }}>
          {wish.has_unread === true && (
            <>
              <span style={unreadDotStyle} aria-hidden="true" />
              <span className="sr-only">未读</span>
            </>
          )}
          <Badge status={wish.status} />
        </div>
      </div>

      {/* 元信息行：提交时间 + 身份 */}
      <div style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)', lineHeight: 1.4, display: 'flex', flexWrap: 'wrap', gap: 'var(--md-spacing-2) var(--md-spacing-4)', marginTop: 'var(--md-spacing-1)'}}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--md-spacing-1)'}}>提交于 {formatDate(wish.created_at)}</span>
        {isChefLikeView && wish.submitter_name && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--md-spacing-1)'}}>提交人：{wish.submitter_name}</span>
        )}
        {isUserView &&
          wish.claimed_by_chef_name &&
          (wish.status === '准备中' || wish.status === '已上架' || wish.status === '已拒绝') && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--md-spacing-1)'}}>认领厨师：{wish.claimed_by_chef_name}</span>
          )}
      </div>

      {/* 次要信息：有数据时显示内容，无数据时保持占位高度（规则4 缺失字段占位） */}
      <div style={{ ...secondaryStyle, minHeight: (hasSecondary ? 'auto' : '2rem') }}>
        {hasSecondary ? (
          <>
            {renderReferenceUrl()}
            {wish.note && <div style={{ wordBreak: 'break-word' }}>{wish.note}</div>}
            {wish.related_dish_id && relatedDishName && (
              <Link to={'/dishes/' + wish.related_dish_id}>关联菜品：{relatedDishName}</Link>
            )}
            {wish.status === '已拒绝' && wish.reject_reason && (
              <div style={rejectReasonStyle}>拒绝原因：{wish.reject_reason}</div>
            )}
          </>
        ) : null}
      </div>
    </Card>
  );
}

/* 10-02-MIGRATION:END */
