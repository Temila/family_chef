/**
 * Loading Component - 加载状态
 */

export default function Loading({ message = '加载中...' }) {
  return (
    <div className="loading">
      <div className="loading-spinner"></div>
      {message}
    </div>
  );
}
