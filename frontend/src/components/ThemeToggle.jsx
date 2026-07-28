/**
 * ThemeToggle Component - 主题切换按钮
 */

import { theme } from '../utils';
import { useState, useEffect } from 'react';
import IconButton from './primitives/IconButton';

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

  // dark 主题下显示 light-mode 图标（提示点击切到浅色），反之亦然
  return (
    <IconButton
      icon={currentTheme === 'dark' ? 'light-mode' : 'dark-mode'}
      ariaLabel={currentTheme === 'dark' ? '切换浅色' : '切换深色'}
      onClick={handleToggle}
      className="theme-toggle"
    />
  );
}
