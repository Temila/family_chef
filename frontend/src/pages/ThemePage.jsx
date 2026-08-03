/**
 * ThemePage — Phase 17 (TPAGE-02 ~ TPAGE-07)
 *
 * 用户主题管理页（只读展示；编辑/创建在 Phase 18 交付）：
 *   - 顶栏：标题 `主题` + 副标题 + 单击重置按钮（无确认对话框）
 *   - 卡片网格：预设（presets.js 数组顺序） + 自定义主题（API 顺序）
 *     —— DETERMINISTIC 总顺序，禁止客户端再排序（BLOCKER B4）
 *   - 自定义主题为空横幅（不影响网格本身渲染）
 *   - BottomBar：复用全局底部导航
 *
 * 唯一写入路径：单击 ThemeCard → setActiveTheme（ThemeContext 处理 localStorage + fc-dynamic-theme）。
 * 当前 plan 17-05 不实现 edit/create（Phase 18 任务）。
 */

import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import EmptyState from '../components/EmptyState';
import IconButton from '../components/primitives/IconButton';
import ThemeCard from '../components/theme/ThemeCard';
import { useToast } from '../contexts/ToastContext';
import { PRESETS, useTheme } from '../theme';

export default function ThemePage() {
  const { activeTheme, setActiveTheme, customThemes, resetToDefault } = useTheme();
  const { showToast } = useToast();

  // D-25 + BLOCKER B4: 总顺序 = 预设 (presets.js 数组顺序) + 自定义 (API 返回顺序，已 updated_at DESC)
  // 禁止任何客户端排序；此顺序保证相同主题在不同用户/不同刷新次数下渲染位置一致。
  const allThemes = [...PRESETS, ...customThemes];

  const handleReset = () => {
    resetToDefault();
    showToast('已还原默认主题', 'success');
  };

  return (
    <div className="page-container">
      <Header title="主题" />

      <div className="theme-page__topbar">
        <div className="theme-page__title-block">
          <h1 className="theme-page__title">主题</h1>
          <div className="theme-page__subtitle">选择一个喜欢的色调，应用即生效</div>
        </div>
        <IconButton
          icon="restart-alt"
          ariaLabel="还原默认主题"
          title="重置默认"
          onClick={handleReset}
        />
      </div>

      {customThemes.length === 0 && (
        <div className="theme-page__empty">
          <EmptyState icon="palette" text="还没有自定义主题" />
          <div className="theme-page__empty-sub">
            从 5 个预设中选一个开始，或保存你喜欢的颜色搭配
          </div>
        </div>
      )}

      <div className="theme-card-grid">
        {allThemes.map(theme => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={activeTheme.id === theme.id}
            onClick={() => setActiveTheme(theme)}
          />
        ))}
      </div>

      <BottomBar />
    </div>
  );
}
