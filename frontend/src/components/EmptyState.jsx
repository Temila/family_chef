/**
 * EmptyState Component - 空状态
 */

export default function EmptyState({ icon = '📭', text = '暂无数据', subtext }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-text">{text}</div>
      {subtext && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
