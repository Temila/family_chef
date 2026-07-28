/**
 * Phase 12 Bugfix 回归测试夹具（D-BUG-01 / D-BUG-02）
 *
 * 挂载真实生产组件 Button / IconButton / FAB / Ripple(wrap) / Sidebar / Header，
 * 通过预置 localStorage 让真实 AuthProvider 提供 user（role=user），
 * 无需后端 / JWT —— usePendingOrderCount 对 user 角色直接返回 0 不触达 API。
 */

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

import Button from '../../src/components/primitives/Button';
import IconButton from '../../src/components/primitives/IconButton';
import FAB from '../../src/components/primitives/FAB';
import Ripple from '../../src/components/primitives/Ripple';
import Header from '../../src/components/composites/Header';
import Sidebar from '../../src/components/composites/Sidebar';
import { AuthProvider } from '../../src/contexts/AuthContext';
import '../../src/index.css';

// 预置 localStorage：让真实 AuthProvider 在 mount 时读取到 user，
// 从而让真实 Sidebar / Header 渲染（不依赖后端或真实 JWT）。
localStorage.setItem('fc_access_token', 'stub-token');
localStorage.setItem('fc_refresh_token', 'stub-refresh');
localStorage.setItem('fc_user', JSON.stringify({
  id: 1,
  username: 'tester',
  display_name: '测试用户',
  role: 'user',
}));

// ── Primitives 区：D-BUG-01 命中验证 ──
function PrimitivesHarness() {
  const [btnClicks, setBtnClicks] = useState(0);
  const [iconClicks, setIconClicks] = useState(0);
  const [fabClicks, setFabClicks] = useState(0);
  const [wrapClicks, setWrapClicks] = useState(0);

  return (
    <section data-testid="primitives" style={{ padding: 16, marginLeft: 90 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button onClick={() => setBtnClicks((c) => c + 1)}>按钮</Button>
        <IconButton icon="edit" ariaLabel="图标按钮" onClick={() => setIconClicks((c) => c + 1)} />
        <FAB icon="add" ariaLabel="浮动按钮" onClick={() => setFabClicks((c) => c + 1)} />
        <Ripple style={{ width: 'auto' }}>
          <button type="button" onClick={() => setWrapClicks((c) => c + 1)}>wrap 子按钮</button>
        </Ripple>
      </div>
      <output aria-label="按钮点击次数">{btnClicks}</output>
      <output aria-label="图标按钮点击次数">{iconClicks}</output>
      <output aria-label="浮动按钮点击次数">{fabClicks}</output>
      <output aria-label="wrap 点击次数">{wrapClicks}</output>
    </section>
  );
}

// ── Shell 区：D-BUG-02 单 Header + Sidebar footer 验证 ──
// 镜像修复后的 PcLayout：Sidebar + main(含页面级 Header)，无 Sidecar Header。
function ShellHarness() {
  return (
    <section data-testid="shell">
      <Sidebar />
      <main className="pc-main">
        <Header title="测试页" />
      </main>
    </section>
  );
}

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <MemoryRouter initialEntries={['/home']}>
      <PrimitivesHarness />
      <ShellHarness />
    </MemoryRouter>
  </AuthProvider>,
);
