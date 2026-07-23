/**
 * WishCard Component - 愿望卡片（跨角色共享展示组件）
 * 纯展示组件：所有 API 调用由父页面处理，通过回调触发动作。
 * 依据 UI-SPEC §6.1 锁定的卡片解剖与 D-07 行动按钮矩阵。
 */

import { Link } from 'react-router-dom';
import Badge from './Badge';
import { formatDate } from '../utils';

// 危险操作按钮（撤销/拒绝）的红色描边样式 — 与 ConfirmModal danger 模式一致
const DANGER_BTN_STYLE = { borderColor: 'var(--danger)', color: 'var(--danger)' };

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
  const isChefLikeView = !isUserView; // chef 或 admin 的生命周期视图
  const isOwnClaim =
    wish.claimed_by_chef_id != null && wish.claimed_by_chef_id === currentUser?.id;

  // D-07 行动按钮矩阵：按 角色 × 状态 × 认领人 决定渲染哪些按钮
  const renderActions = () => {
    // 用户视图：仅在 待处理 / 准备中 可编辑/撤销自己的愿望
    if (isUserView) {
      if (
        currentUser?.id === wish.user_id &&
        (wish.status === '待处理' || wish.status === '准备中')
      ) {
        return (
          <>
            <button
              type="button"
              className="btn btn-primary btn-sm flex-1"
              onClick={() => onEdit?.(wish)}
            >
              编辑愿望
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm flex-1"
              style={DANGER_BTN_STYLE}
              onClick={() => onCancel?.(wish)}
            >
              撤销愿望
            </button>
          </>
        );
      }
      return null;
    }

    // 厨师/管理员生命周期视图
    if (wish.status === '待处理' && !wish.claimed_by_chef_id) {
      return (
        <button
          type="button"
          className="btn btn-primary btn-sm flex-1"
          onClick={() => onClaim?.(wish)}
        >
          认领愿望
        </button>
      );
    }
    if (wish.status === '准备中' && (viewAsAdmin || isOwnClaim)) {
      return (
        <>
          <button
            type="button"
            className="btn btn-primary btn-sm flex-1"
            onClick={() => onAdvance?.(wish)}
          >
            推进愿望
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm flex-1"
            style={DANGER_BTN_STYLE}
            onClick={() => onReject?.(wish)}
          >
            拒绝愿望
          </button>
        </>
      );
    }
    return null;
  };

  const actions = renderActions();
  const hasActions = actions != null;
  // 仅当提交者本人且 has_unread 为真时，卡片本体可点击以清除红点（NOTIF-04）
  const canTap = currentUser?.id === wish.user_id && wish.has_unread === true;

  const rootClass = [
    'wish-card',
    !hasActions ? 'wish-card-readonly' : '',
    highlight ? 'wish-card-highlight' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTap?.(wish);
    }
  };

  // reference_url 安全渲染：http/https → 新标签链接（noopener noreferrer），其余为纯文本
  const renderReferenceUrl = () => {
    if (!wish.reference_url) return null;
    const url = String(wish.reference_url);
    if (HTTP_URL_RE.test(url)) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer">
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

  return (
    <div
      className={rootClass}
      data-wish-id={wish.id}
      onClick={canTap ? () => onTap?.(wish) : undefined}
      onKeyDown={canTap ? handleKeyDown : undefined}
      role={canTap ? 'button' : undefined}
      tabIndex={canTap ? 0 : undefined}
    >
      {/* 顶行：菜名（大号）+ 未读红点 + 状态徽章 */}
      <div className="wish-card-top">
        <div className="wish-card-name">{wish.dish_name}</div>
        <div className="wish-card-badge-slot">
          {wish.has_unread === true && (
            <>
              <span className="wish-card-unread-dot" aria-hidden="true" />
              <span className="sr-only">未读</span>
            </>
          )}
          <Badge status={wish.status} />
        </div>
      </div>

      {/* 元信息行：提交时间 + 身份 */}
      <div className="wish-card-meta">
        <span className="wish-card-meta-item">提交于 {formatDate(wish.created_at)}</span>
        {isChefLikeView && wish.submitter_name && (
          <span className="wish-card-meta-item">提交人：{wish.submitter_name}</span>
        )}
        {isUserView &&
          wish.claimed_by_chef_name &&
          (wish.status === '准备中' || wish.status === '已上架' || wish.status === '已拒绝') && (
            <span className="wish-card-meta-item">认领厨师：{wish.claimed_by_chef_name}</span>
          )}
      </div>

      {/* 次要信息：仅当字段存在时渲染，无占位文本 */}
      {hasSecondary && (
        <div className="wish-card-secondary">
          {renderReferenceUrl()}
          {wish.note && <div>{wish.note}</div>}
          {wish.related_dish_id && relatedDishName && (
            <Link to={'/dishes/' + wish.related_dish_id}>关联菜品：{relatedDishName}</Link>
          )}
          {wish.status === '已拒绝' && wish.reject_reason && (
            <div className="wish-card-reject-reason">拒绝原因：{wish.reject_reason}</div>
          )}
        </div>
      )}

      {/* 行动按钮行（阻止冒泡以避免触发卡片点击） */}
      {hasActions && (
        <div className="wish-card-actions" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
}
