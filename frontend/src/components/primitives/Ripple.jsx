/**
 * Ripple Component - MD3 涟漪反馈组件（Phase 10 — D-12 / MOTION-01）
 *
 * Phase 10 — 公开 API 保留供 Phase 10 之外 composite (WishCard/Header/Sidebar/DishCard)
 * 继续手动消费；primitive 内部已内置（Button/IconButton/FAB）。
 *
 * 通过 onPointerDown 获取落点坐标 → 创建 CSS 动画 span → 动画结束自动移除。
 * 坐标精确控制满足 MD3 要求（pointer 位置起算、半径覆盖元素最大边）。
 *
 * 双模式 API（Phase 12 — D-BUG-01 Option 3）：
 *   mode="self"  —— 仅 primitive 内部 Button/IconButton/FAB 使用：通过 cloneElement 把
 *                   onPointerDown / position:relative / overflow:hidden 直接注入到子 <button>，
 *                   原生 button 自身承担 ripple 容器，消除 .md-ripple-layer span 堆叠陷阱，
 *                   恢复原生 mouse/touch click 命中（D-BUG-01 根因修复）。
 *   mode="wrap"  —— 默认。保留 span 容器供 Sidebar/BottomBar/Card/ListItem 等非 button 子元素消费。
 *
 * 用法：
 *   <Ripple mode="self" disabled={disabled}><button>...</button></Ripple>  (primitive 内部)
 *   <Ripple style={{ width: '100%' }}><button>...</button></Ripple>        (composite wrap)
 */

import { useRef, useCallback, isValidElement, cloneElement } from 'react';
import './ripple.css';

// 合并多个 ref（消费方 forwardedRef + Ripple 内部 containerRef），
// 保证 cloneElement self 模式不覆盖 Button/IconButton/FAB 已有的 forwardRef。
function composeRefs(...refs) {
  return (node) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(node);
      } else if (typeof ref === 'object') {
        ref.current = node;
      }
    });
  };
}

export default function Ripple({ children, disabled = false, className = '', style, mode = 'wrap' }) {
  const containerRef = useRef(null);
  const ripplesRef = useRef(new Set());

  const handlePointerDown = useCallback((e) => {
    if (disabled || !containerRef.current) return;

    // self 模式下 containerRef 指向原生 button，wrap 模式指向 .md-ripple-layer span
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const diameter = Math.max(rect.width, rect.height) * 2.5;
    const radius = diameter / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-span';

    // D-03: primary 12% opacity，long emphasized scale，short standard fade-out
    // Phase 12 MOTION-05: 原硬编码时长/cubic-bezier 已替换为 motion token
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
      transition: transform var(--md-motion-duration-long) var(--md-motion-easing-emphasized),
                  opacity var(--md-motion-duration-short) var(--md-motion-easing-standard);
    `;

    containerRef.current.appendChild(ripple);
    ripplesRef.current.add(ripple);

    // 下一帧触发 scale 动画（确保初始 scale(0) 先渲染）
    requestAnimationFrame(() => {
      ripple.style.transform = 'scale(1)';
    });

    // 清理：pointerup 后淡出，short duration 后移除 DOM + Set 引用
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

  // mode="self"：原生 button 直接承担 ripple 容器（D-BUG-01 Option 3 cloneElement 路径）
  // 仅用于 primitive 内部 Button/IconButton/FAB。compose 消费方 forwarded ref、
  // 现有 onPointerDown、className、style，不覆盖任何消费方 prop。
  if (mode === 'self' && isValidElement(children)) {
    const childProps = children.props;
    const existingOnPointerDown = childProps.onPointerDown;

    const composedOnPointerDown = (e) => {
      if (typeof existingOnPointerDown === 'function') {
        existingOnPointerDown(e);
      }
      if (e.defaultPrevented) return;
      handlePointerDown(e);
    };

    const composedClassName = [childProps.className, className]
      .filter(Boolean)
      .join(' ');

    const composedStyle = {
      position: 'relative',
      overflow: 'hidden',
      ...childProps.style,
      ...style,
    };

    // cloneElement 必须读取 children.ref 以与消费方 forwardRef 组合——此为 ref 合并的必要模式，
    // react-hooks/refs 规则对此保守告警（不在渲染期间使用 .current，仅合并 ref 引用）。
    /* eslint-disable react-hooks/refs */
    return cloneElement(children, {
      ref: composeRefs(children.ref, containerRef),
      onPointerDown: composedOnPointerDown,
      className: composedClassName,
      style: composedStyle,
    });
    /* eslint-enable react-hooks/refs */
  }

  // 默认 mode="wrap"：保留 span 容器供 Sidebar/BottomBar/Card/ListItem 等非 button 子元素消费
  return (
    <span
      ref={containerRef}
      className={`md-ripple-layer ${className}`}
      style={{ position: 'relative', overflow: 'hidden', display: 'flex', ...style }}
      onPointerDown={handlePointerDown}
    >
      {children}
    </span>
  );
}
