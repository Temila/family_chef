/**
 * Snackbar Context - 全局 MD3 消息提示
 */

/* eslint-disable react-refresh/only-export-components -- Context Provider 与 useToast 同文件导出是 React Context 标准范式；拆分 Hook 需改动所有消费方导入（架构变更，超出 lint 清理范围） */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import Icon from '../components/primitives/Icon';

const SnackbarContext = createContext(null);

const DURATION_BY_TYPE = {
  success: 4000,
  info: 4000,
  warn: 6000,
  error: 6000,
};

const ICON_BY_TYPE = {
  success: 'check',
  info: 'info',
  warn: 'warning',
  error: 'error',
};

const MAX_VISIBLE = 3;

let nextId = 0;

const SNACKBAR_STYLES = `
  .md-snackbar-stack {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 80px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: var(--md-spacing-2);
    width: min(calc(100% - 32px), 480px);
    pointer-events: none;
  }

  .md-snackbar {
    display: flex;
    align-items: center;
    gap: var(--md-spacing-3);
    width: 100%;
    min-height: 48px;
    padding: 0;
    overflow: hidden;
    border-radius: var(--md-radius-sm);
    background: var(--md-color-inverse-surface);
    color: var(--md-color-inverse-on-surface);
    box-shadow: var(--md-elevation-3);
    pointer-events: auto;
    /* Phase 12 MOTION-05: 0.3s → MD3 medium（250ms ≈ MD3 enter spec） */
    animation: md-snackbar-in var(--md-motion-duration-medium) var(--md-motion-easing-standard);
  }

  .md-snackbar__bar {
    width: 4px;
    align-self: stretch;
    flex-shrink: 0;
  }

  .md-snackbar__bar--success,
  .md-snackbar--success .md-snackbar__icon {
    color: var(--md-color-primary);
    background: var(--md-color-primary);
  }

  .md-snackbar__bar--warn,
  .md-snackbar--warn .md-snackbar__icon {
    color: var(--md-color-tertiary);
    background: var(--md-color-tertiary);
  }

  .md-snackbar__bar--error,
  .md-snackbar--error .md-snackbar__icon {
    color: var(--md-color-error);
    background: var(--md-color-error);
  }

  .md-snackbar__bar--info,
  .md-snackbar--info .md-snackbar__icon {
    color: var(--md-color-secondary);
    background: var(--md-color-secondary);
  }

  .md-snackbar__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    border-radius: var(--md-radius-full);
  }

  .md-snackbar__icon svg {
    color: var(--md-color-inverse-surface) !important;
  }

  .md-snackbar__message {
    flex: 1;
    padding: var(--md-spacing-3) 0;
    font-size: 0.875rem;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .md-snackbar__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    min-width: 48px;
    min-height: 48px;
    margin-right: var(--md-spacing-1);
    padding: 0;
    flex-shrink: 0;
    border: none;
    border-radius: var(--md-radius-full);
    background: transparent;
    color: var(--md-color-inverse-on-surface);
    cursor: pointer;
  }

  .md-snackbar__close:hover {
    background: color-mix(
      in srgb,
      var(--md-color-inverse-on-surface) 16%,
      transparent
    );
  }

  .md-snackbar__close:focus-visible {
    outline: var(--md-focus-ring-inner);
    outline-offset: -4px;
  }

  /* Phase 12 D-SNACK-01: action Button（text variant 语义，inverse-primary 在 inverse-surface 上） */
  .md-snackbar__action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-block-size: 48px;
    min-inline-size: 48px;
    padding: 0 var(--md-spacing-2);
    margin-right: var(--md-spacing-1);
    flex-shrink: 0;
    border: none;
    border-radius: var(--md-radius-full);
    background: transparent;
    color: var(--md-color-inverse-primary);
    font-family: var(--md-font-body);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background var(--md-motion-duration-short) var(--md-motion-easing-standard);
  }

  .md-snackbar__action:hover {
    background: color-mix(in srgb, var(--md-color-inverse-primary) 12%, transparent);
  }

  .md-snackbar__action:focus-visible {
    outline: var(--md-focus-ring-inner);
    outline-offset: -4px;
  }

  @keyframes md-snackbar-in {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 639px) {
    .md-snackbar-stack {
      top: calc(env(safe-area-inset-top, 0px) + 16px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .md-snackbar {
      animation: none;
    }
  }
`;

export const SnackbarProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer?.timeoutId) {
      clearTimeout(timer.timeoutId);
    }
    timersRef.current.delete(id);
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const startTimer = useCallback((id, duration) => {
    const timeoutId = setTimeout(() => dismiss(id), duration);
    timersRef.current.set(id, {
      timeoutId,
      remaining: duration,
      startedAt: Date.now(),
    });
  }, [dismiss]);

  const pauseTimer = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (!timer?.timeoutId) return;

    clearTimeout(timer.timeoutId);
    timersRef.current.set(id, {
      timeoutId: null,
      remaining: Math.max(0, timer.remaining - (Date.now() - timer.startedAt)),
      startedAt: null,
    });
  }, []);

  const resumeTimer = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (!timer || timer.timeoutId) return;
    if (timer.remaining <= 0) {
      dismiss(id);
      return;
    }

    const timeoutId = setTimeout(() => dismiss(id), timer.remaining);
    timersRef.current.set(id, {
      ...timer,
      timeoutId,
      startedAt: Date.now(),
    });
  }, [dismiss]);

  // Phase 12 D-SNACK-01: 向后兼容重载
  //   showToast(message, 'success'|'warn'|'error'|'info')                  —— 旧版 string tone
  //   showToast(message, { type?, duration?, action: { label, onClick } }) —— 新版对象式
  // 未知 tone 经现有 tone 表归一化为 'success'；duration 用 nullish 语义，显式 0 也被采纳。
  const showToast = useCallback((message, options = 'success') => {
    const isLegacyString = typeof options === 'string';
    const tone = isLegacyString
      ? (Object.hasOwn(DURATION_BY_TYPE, options) ? options : 'success')
      : (Object.hasOwn(DURATION_BY_TYPE, options.type) ? options.type : 'success');
    // nullish 合并：仅当对象式且未提供 duration 时回落到 tone 默认值
    const duration = isLegacyString || options.duration == null
      ? DURATION_BY_TYPE[tone]
      : options.duration;
    const action = isLegacyString ? undefined : options.action;

    const item = {
      id: ++nextId,
      message,
      type: tone,
      action,
      createdAt: Date.now(),
    };

    setItems((previous) => [...previous, item].slice(-MAX_VISIBLE));
    startTimer(item.id, duration);
  }, [startTimer]);

  // Phase 12 D-SNACK-01: action 回调包装 —— 恰好触发一次、抛错被吞（不变成未处理 rejection）、
  // 随后 dismiss 仅该条；兄弟计时器由 dismiss(id) 的精确 Map 删除保持不变。
  const triggerAction = useCallback((item) => {
    if (!item.action) return;
    try {
      item.action.onClick?.();
    } catch (err) {
      // 调用方提供的回调失败不应破坏 Snackbar 队列或冒泡为未处理 rejection
      console.error('[Snackbar] action onClick threw:', err);
    }
    dismiss(item.id);
  }, [dismiss]);

  useEffect(() => {
    const visibleIds = new Set(items.map((item) => item.id));
    timersRef.current.forEach((timer, id) => {
      if (!visibleIds.has(id)) {
        if (timer.timeoutId) clearTimeout(timer.timeoutId);
        timersRef.current.delete(id);
      }
    });
  }, [items]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => {
        if (timer.timeoutId) clearTimeout(timer.timeoutId);
      });
      timers.clear();
    };
  }, []);

  const value = { showToast, dismiss };

  return (
    <SnackbarContext.Provider value={value}>
      <style>{SNACKBAR_STYLES}</style>
      {children}
      {items.length > 0 && (
        <div className="md-snackbar-stack" role="status" aria-live="polite">
          {[...items].reverse().map((item) => (
            <div
              key={item.id}
              className={`md-snackbar md-snackbar--${item.type}`}
              onMouseEnter={() => pauseTimer(item.id)}
              onMouseLeave={() => resumeTimer(item.id)}
            >
              <span
                className={`md-snackbar__bar md-snackbar__bar--${item.type}`}
                aria-hidden="true"
              />
              <span className="md-snackbar__icon" aria-hidden="true">
                <Icon name={ICON_BY_TYPE[item.type]} size={18} weight={600} />
              </span>
              <span className="md-snackbar__message">{item.message}</span>
              {item.action && (
                <button
                  type="button"
                  className="md-snackbar__action md-interactive"
                  onClick={() => triggerAction(item)}
                >
                  {item.action.label}
                </button>
              )}
              <button
                type="button"
                className="md-snackbar__close md-interactive"
                onClick={() => dismiss(item.id)}
                aria-label="关闭通知"
              >
                <Icon name="close" size={18} weight={600} />
              </button>
            </div>
          ))}
        </div>
      )}
    </SnackbarContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useToast must be used within a SnackbarProvider');
  }
  return context;
};

export default SnackbarContext;
