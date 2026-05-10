/**
 * Header Component - 页面头部
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../utils';

export default function Header({ title, showBack = false, actions }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <header className="header">
      <div className="header-left">
        {showBack && (
          <button
            className="header-back"
            onClick={() => navigate(-1)}
            title="返回"
          >
            ←
          </button>
        )}
      </div>

      <h1 className="header-title">{title}</h1>

      <div className="header-actions">
        {actions}
        {user && (
          <div className="avatar avatar-sm">
            {user.display_name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}
