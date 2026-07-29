import { createRoot } from 'react-dom/client';

import { SnackbarProvider, useToast } from '../../src/contexts/ToastContext';
import '../../src/index.css';

function SnackbarHarness() {
  const { showToast } = useToast();

  const showFive = () => {
    for (let index = 1; index <= 5; index += 1) {
      showToast(`消息 ${index}`, 'info');
    }
  };

  // D-SNACK-01 对象式调用样例：window.__actionCalls 供 Playwright 断言回调触发次数。
  const bumpAction = () => {
    window.__actionCalls = (window.__actionCalls || 0) + 1;
  };

  return (
    <main>
      {/* 旧版 string-tone 调用（必须保持兼容） */}
      <button type="button" onClick={() => showToast('成功消息', 'success')}>显示成功</button>
      <button type="button" onClick={() => showToast('警告消息', 'warn')}>显示警告</button>
      <button type="button" onClick={() => showToast('错误消息', 'error')}>显示错误</button>
      <button type="button" onClick={() => showToast('信息消息', 'info')}>显示信息</button>
      <button type="button" onClick={showFive}>连续显示五条</button>

      {/* D-SNACK-01 对象式调用样例 */}
      <button type="button" onClick={() => showToast('自定义时长', { type: 'info', duration: 2000 })}>显示自定义时长</button>
      <button
        type="button"
        onClick={() => showToast('带操作消息', {
          type: 'info',
          action: { label: '撤销', onClick: bumpAction },
        })}
      >
        显示带操作
      </button>
      <button
        type="button"
        onClick={() => {
          showToast('兄弟计时一', 'success');
          showToast('兄弟计时二', {
            type: 'info',
            action: { label: '动作', onClick: bumpAction },
          });
        }}
      >
        显示兄弟计时
      </button>
      <button
        type="button"
        onClick={() => showToast('失败操作', {
          type: 'info',
          action: { label: '出错', onClick: () => { throw new Error('callback boom'); } },
        })}
      >
        显示失败操作
      </button>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <SnackbarProvider>
    <SnackbarHarness />
  </SnackbarProvider>,
);
