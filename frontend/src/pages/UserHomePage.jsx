import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import InvitationsSection from '../components/InvitationsSection';

export default function UserHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const menuEntries = [
    {
      icon: '🍽️',
      title: '开始点菜',
      desc: '浏览全部菜品',
      onClick: () => navigate('/order'),
    },
    {
      icon: '👅',
      title: '口味偏好',
      desc: '管理你的饮食偏好',
      onClick: () => navigate('/preferences'),
    },
  ];

  if (user?.role === 'chef' || user?.role === 'admin') {
    menuEntries.push({
      icon: '👨‍🍳',
      title: '订单管理',
      desc: '查看和处理订单',
      onClick: () => navigate('/chef/orders'),
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
            <div style={{ fontSize: '1.5rem', marginBottom: 'var(--md-spacing-1)'}}>{entry.icon}</div>
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
