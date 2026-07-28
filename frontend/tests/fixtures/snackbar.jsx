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

  return (
    <main>
      <button type="button" onClick={() => showToast('成功消息', 'success')}>显示成功</button>
      <button type="button" onClick={() => showToast('警告消息', 'warn')}>显示警告</button>
      <button type="button" onClick={() => showToast('错误消息', 'error')}>显示错误</button>
      <button type="button" onClick={() => showToast('信息消息', 'info')}>显示信息</button>
      <button type="button" onClick={showFive}>连续显示五条</button>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <SnackbarProvider>
    <SnackbarHarness />
  </SnackbarProvider>,
);
