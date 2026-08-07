/**
 * MD3 Sidecar Header Composite (Phase 11 — COMPO-09 / LOGIC-03)
 *
 * PC 端 3 列式 Top App Bar:
 *   左 — logo + 品牌名 + 副标题（或返回按钮）
 *   中 — 页面标题（useLocation 推断 / caller 传入）
 *   右 — 用户头像 + 下拉菜单（display_name + role + 主题切换 + 退出）
 *
 * 仅 PC (≥1024px) 显示；移动端隐藏，由 BottomBar 接管导航。
 *
 * 现有页面 header 行为零回归：title / showBack / actions props 保留。
 * 内部迁移 ThemeToggle 至下拉菜单（独立调用方不受影响）。
 *
 * 公开 API：
 *   <Header title={string} showBack={bool} actions={ReactNode} />
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../utils';
import Icon from '../primitives/Icon';
import IconButton from '../primitives/IconButton';
import Divider from './Divider';
import './Header.css';

// 路径 → 页面标题（useLocation 推断）
const PAGE_TITLES = {
  '/home': '首页',
  '/order': '点菜',
  '/preferences': '口味偏好',
  '/my-wishes': '我的愿望',
  '/profile': '我的',
  '/my-orders': '我的订单',
  '/my-favorites': '我的收藏',
  '/chef/orders': '订单管理',
  '/chef/dishes': '菜品管理',
  '/chef/wishes': '愿望管理',
  '/admin': '管理后台',
  '/admin/dishes': '菜品管理',
  '/admin/wishes': '愿望总览',
  '/admin/users': '用户管理',
  '/admin/categories': '分类管理',
  '/admin/chefs': '厨师管理',
  '/admin/stats': '数据统计',
  '/admin/logs': '系统日志',
  '/ingredients': '食材管理',
  '/theme': '主题',
};

export default function Header({ title, showBack = false, actions }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  // 主题状态：切换后立即重渲染以更新 IconButton 图标（D-NAV03-03 主题切换已迁至 Header 主行）
  const [currentTheme, setCurrentTheme] = useState(() => theme.getTheme());
  const handleToggleTheme = () => {
    setCurrentTheme(theme.toggleTheme());
  };

  // Click-outside 关闭菜单
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const resolvedTitle = title || PAGE_TITLES[location.pathname] || '家味';

  return (
    <>
      <header className="md-header">
        {/* 左：返回按钮 或 logo + 品牌 */}
        <div className="md-header__left">
          {showBack ? (
            <IconButton icon="arrow-back" ariaLabel="返回" onClick={() => navigate(-1)} />
          ) : (
            <div className="md-header__logo">
              <Icon name="restaurant" size={20} />
              <span className="md-header__brand">家味</span>
              <span className="md-header__subtitle">Family Chef</span>
            </div>
          )}
        </div>

        {/* 中：页面标题 */}
        <h1 className="md-header__title">{resolvedTitle}</h1>

        {/* 右：主题切换 IconButton + 用户菜单（actions 已下沉至下方独立 action 区，D-NAV01-01/02） */}
        <div className="md-header__right" ref={menuRef}>
          {/* D-A2: 未登录隐藏 light/dark 主题切换（user guard 防御 AuthProvider 初始加载窗口） */}
          {user && (
            <IconButton
              icon={currentTheme === 'dark' ? 'light-mode' : 'dark-mode'}
              ariaLabel={currentTheme === 'dark' ? '切换浅色' : '切换深色'}
              onClick={handleToggleTheme}
              className="md-header__theme-toggle"
            />
          )}
          {/* D-18/D-A2: Palette IconButton 跳转 /theme，未登录隐藏 */}
          {user && (
            <IconButton
              icon="palette"
              ariaLabel="选择主题"
              onClick={() => navigate('/theme')}
              className="md-header__theme-page"
            />
          )}
          {user && (
            <>
              <button
                type="button"
                className="md-header__avatar"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="用户菜单"
                aria-expanded={menuOpen}
              >
                {(user.display_name || user.username || '?').charAt(0).toUpperCase()}
              </button>
              {menuOpen && (
                <div className="md-header__menu" role="menu">
                  <div className="md-header__menu-info">
                    <div className="md-header__menu-name">
                      {user.display_name || user.username}
                    </div>
                    <div className="md-header__menu-role">
                      {user.role === 'admin'
                        ? '管理员'
                        : user.role === 'chef'
                        ? '厨师'
                        : '用户'}
                    </div>
                  </div>
                  {/* D-NAV02-02: 编辑资料 */}
                  <button
                    type="button"
                    className="md-header__menu-item"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/profile');
                    }}
                  >
                    <Icon name="edit" size={18} />
                    <span>编辑资料</span>
                  </button>
                  {/* D-NAV02-03: 中性动作与危险动作语义分隔 */}
                  <Divider />
                  {/* D-NAV02-01: 退出登录（label 由 退出 扩展为 退出登录） */}
                  <button
                    type="button"
                    className="md-header__menu-item md-header__menu-item--danger"
                    role="menuitem"
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                  >
                    <Icon name="logout" size={18} />
                    <span>退出登录</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </header>
      {/* D-NAV01-01/02: actions 渲染在主行下方；actions 为空时不渲染该 div */}
      {actions && (
        <div className="header-action-bar">
          {actions}
        </div>
      )}
    </>
  );
}
