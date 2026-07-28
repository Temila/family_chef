/**
 * CreateLinkModal Component - 邀请链接创建成功 Modal（Phase 11：thin wrapper over <Modal>）
 * 显示链接、复制按钮、分享按钮、2小时提示。
 * focus trap / ESC / 滚动锁定 由 <Modal> 内建。
 */

import { useToast } from '../contexts/ToastContext';
import Modal from './composites/Modal';
import Button from './primitives/Button';

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
    <Modal
      open
      onClose={onClose}
      title="邀请链接已创建"
      style={{ maxWidth: 400 }}
      actions={[
        <Button key="copy" variant="filled" onClick={handleCopy}>
          📋 复制链接
        </Button>,
        <Button key="share" variant="outlined" onClick={handleShare}>
          🚀 分享
        </Button>,
      ]}
    >
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          wordBreak: 'break-all',
          background: 'var(--md-color-surface-container)',
          padding: 'var(--md-spacing-3)',
          borderRadius: 'var(--md-radius-sm)',
          color: 'var(--md-color-on-surface-variant)',
          marginBottom: 'var(--md-spacing-3)',
        }}
      >
        {linkUrl}
      </div>
      <div
        style={{
          fontSize: '0.75rem',
          color: 'var(--md-color-on-surface-variant)',
        }}
      >
        2小时内有效
      </div>
    </Modal>
  );
}
