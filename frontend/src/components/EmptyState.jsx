/**
 * EmptyState Component - 空状态
 */

export default function EmptyState({ icon = '📭', text = '暂无数据' }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-text">{text}</div>
    </div>
  );
}
