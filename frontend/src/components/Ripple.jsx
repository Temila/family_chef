/**
 * Ripple Component - MD3 涟漪反馈组件（Phase 9 — MOTION-01）
 *
 * 通过 onPointerDown 获取落点坐标 → 创建 CSS 动画 span → 动画结束自动移除。
 * 坐标精确控制满足 MD3 要求（pointer 位置起算、半径覆盖元素最大边）。
 *
 * 用法：<Ripple><button className="btn">...</button></Ripple>
 * 对 block-level 子元素（卡片等）需传 style={{ width: '100%' }} 防止布局收缩。
 */

import { useRef, useCallback } from 'react';
import '../css/ripple.css';

export default function Ripple({ children, disabled = false, className = '', style }) {
  const containerRef = useRef(null);
  const ripplesRef = useRef(new Set());

  const handlePointerDown = useCallback((e) => {
    if (disabled || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const diameter = Math.max(rect.width, rect.height) * 2.5;
    const radius = diameter / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-span';

    // D-03: primary 12% opacity，500ms emphasized scale，150ms standard fade-out
    ripple.style.cssText = `
      position: absolute;
      pointer-events: none;
      border-radius: 50%;
      width: ${diameter}px;
      height: ${diameter}px;
      left: ${x - radius}px;
      top: ${y - radius}px;
      background: var(--md-color-primary);
      opacity: 0.12;
      transform: scale(0);
      transition: transform 500ms cubic-bezier(0.2, 0, 0, 1),
                  opacity 150ms cubic-bezier(0.2, 0, 0, 1);
    `;

    containerRef.current.appendChild(ripple);
    ripplesRef.current.add(ripple);

    // 下一帧触发 scale 动画（确保初始 scale(0) 先渲染）
    requestAnimationFrame(() => {
      ripple.style.transform = 'scale(1)';
    });

    // 清理：pointerup 后淡出，150ms 后移除 DOM + Set 引用
    const cleanup = () => {
      ripple.style.opacity = '0';
      setTimeout(() => {
        ripplesRef.current.delete(ripple);
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      }, 150);
    };

    // pointerup 在 window 上监听一次（覆盖鼠标移出元素后释放的场景）
    window.addEventListener('pointerup', cleanup, { once: true });
    // 兜底：动画结束后也触发清理（防止 pointerup 未到达）
    ripple.addEventListener('animationend', cleanup, { once: true });
  }, [disabled]);

  return (
    <span
      ref={containerRef}
      className={`ripple-container ${className}`}
      style={{ position: 'relative', overflow: 'hidden', display: 'inline-flex', ...style }}
      onPointerDown={handlePointerDown}
    >
      {children}
    </span>
  );
}
