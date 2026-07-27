/**
 * CreateLinkModal Component - 邀请链接创建成功 Modal
 * 显示链接、复制按钮、分享按钮、2小时提示
 */

import { useToast } from '../contexts/ToastContext';

export default function CreateLinkModal({ linkUrl, onClose }) {
  const { showToast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(linkUrl);
      showToast('链接已复制到剪贴板');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = linkUrl;
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

  const handleShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: '家味 · Family Chef',
          text: '来点菜吧！',
          url: linkUrl,
        });
      } catch {
        // User cancelled — no feedback
      }
    } else {
      showToast('当前浏览器不支持分享功能，请使用复制链接', 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>邀请链接已创建</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              wordBreak: 'break-all',
              background: 'var(--md-color-surface-container)',
              padding: 12,
              borderRadius: 'var(--md-radius-sm)',
              color: 'var(--md-color-on-surface-variant)',
              marginBottom: 12,
            }}
          >
            {linkUrl}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--md-color-on-surface-variant)',
              marginBottom: 16,
            }}
          >
            2小时内有效
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleCopy}
            >
              📋 复制链接
            </button>
            <button
              className="btn btn-outline"
              style={{ flex: 1 }}
              onClick={handleShare}
            >
              🚀 分享
            </button>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
