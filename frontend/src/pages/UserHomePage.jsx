import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import InvitationsSection from '../components/InvitationsSection';
import Icon from '../components/primitives/Icon';

export default function UserHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const menuEntries = [
    {
      icon: 'set-meal',
      title: '开始点菜',
      desc: '浏览全部菜品',
      onClick: () => navigate('/order'),
    },
    {
      icon: 'spa',
      title: '口味偏好',
      desc: '管理你的饮食偏好',
      onClick: () => navigate('/preferences'),
    },
  ];

  if (user?.role === 'admin') {
    // D-NAV04-04: admin 看到 5 项（含订单管理）；chef 不在 UserHomePage 看订单管理（走 BottomBar）
    menuEntries.push({
      icon: 'chef',
      title: '订单管理',
      desc: '查看和处理订单',
      onClick: () => navigate('/chef/orders'),
    });
  }

  if (user?.role === 'chef' || user?.role === 'admin') {
    // D-NAV04-01/02: 菜品管理 — chef → /chef/dishes, admin → /admin/dishes
    menuEntries.push({
      icon: 'set-meal',
      title: '菜品管理',
      desc: '管理菜品信息与食谱',
      onClick: () => navigate(user.role === 'admin' ? '/admin/dishes' : '/chef/dishes'),
    });
    // D-NAV04-01: 食材管理 — 两端都路由到 /ingredients
    menuEntries.push({
      icon: 'eco',
      title: '食材管理',
      desc: '管理食材与库存',
      onClick: () => navigate('/ingredients'),
    });
  }

  return (
    <div className="page-container">
      <Header title="家味" />

      <div style={{ padding: '0 var(--md-spacing-4)', display: 'grid', gridTemplateColumns: `repeat(${menuEntries.length}, 1fr)`, gap: 'var(--md-spacing-2)', marginBottom: 'var(--md-spacing-4)'}}>
        {menuEntries.map((entry, i) => (
          <div
            key={i}
            className="quick-action"
            onClick={entry.onClick}
            style={{ flexDirection: 'column', textAlign: 'center', padding: 'var(--md-spacing-3)'}}
          >
            <div style={{ marginBottom: 'var(--md-spacing-1)'}}><Icon name={entry.icon} size={32} /></div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{entry.title}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--md-color-on-surface-variant)' }}>{entry.desc}</div>
          </div>
        ))}
      </div>

      <InvitationsSection />

      <BottomBar />
    </div>
  );
}
