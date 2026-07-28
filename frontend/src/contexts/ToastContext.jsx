/**
 * Snackbar Context - 全局 MD3 消息提示
 */

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
    gap: 8px;
    width: min(calc(100% - 32px), 480px);
    pointer-events: none;
  }

  .md-snackbar {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 48px;
    padding: 0;
    overflow: hidden;
    border-radius: var(--md-radius-sm);
    background: var(--md-color-inverse-surface);
    color: var(--md-color-inverse-on-surface);
    box-shadow: var(--md-elevation-3);
    pointer-events: auto;
    animation: md-snackbar-in 0.3s var(--md-motion-easing-standard);
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
    padding: 12px 0;
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
    margin-right: 4px;
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

  const showToast = useCallback((message, type = 'success') => {
    const tone = Object.hasOwn(DURATION_BY_TYPE, type) ? type : 'success';
    const item = {
      id: ++nextId,
      message,
      type: tone,
      createdAt: Date.now(),
    };

    setItems((previous) => [...previous, item].slice(-MAX_VISIBLE));
    startTimer(item.id, DURATION_BY_TYPE[tone]);
  }, [startTimer]);

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
