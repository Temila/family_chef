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

      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: `repeat(${menuEntries.length}, 1fr)`, gap: 10, marginBottom: 16 }}>
        {menuEntries.map((entry, i) => (
          <div
            key={i}
            className="quick-action"
            onClick={entry.onClick}
            style={{ flexDirection: 'column', textAlign: 'center', padding: 12 }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{entry.icon}</div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{entry.title}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{entry.desc}</div>
          </div>
        ))}
      </div>

      <InvitationsSection />

      <BottomBar />
    </div>
  );
}
