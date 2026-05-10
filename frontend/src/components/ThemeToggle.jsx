/**
 * ThemeToggle Component - 主题切换按钮
 */

import { theme } from '../utils';
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState(theme.getTheme());

  useEffect(() => {
    theme.initTheme();
    setCurrentTheme(theme.getTheme());
  }, []);

  const handleToggle = () => {
    const newTheme = theme.toggleTheme();
    setCurrentTheme(newTheme);
  };

  return (
    <button
      className="theme-toggle"
      onClick={handleToggle}
      title={currentTheme === 'dark' ? '切换浅色' : '切换深色'}
    >
      {theme.getThemeIcon()}
    </button>
  );
}
