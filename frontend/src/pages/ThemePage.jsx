/**
 * ThemePage — Phase 18 (TPAGE-02 ~ TPAGE-07 + D-08/D-09/D-10/D-12/D-15/D-17)
 *
 * 用户主题管理页：
 *   - 顶栏：标题 `主题` + 副标题 + 重置按钮（无确认对话框）
 *   - 操作区：`新建` + `主题设置` 入口按钮
 *   - 卡片网格：预设（presets.js 数组顺序） + 自定义主题（API 顺序）
 *     —— DETERMINISTIC 总顺序，禁止客户端再排序（BLOCKER B4）
 *   - 自定义主题为空横幅（不影响网格本身渲染）
 *   - BottomBar：复用全局底部导航
 *
 * 季节自动切换互斥（D-09 + D-10 + D-11）：
 *   - 手动模式：单击预设/自定义 → setActiveTheme(theme)
 *   - 自动模式 + 预设：单击 → no-op（不应用、不提示）
 *   - 自动模式 + 自定义：单击 → no-op（不应用、不跳转；编辑通过卡片「编辑」按钮）
 *
 * 编辑/删除：
 *   - 自定义编辑：永远可达
 *   - 预设 fork：手动模式可达；自动模式 no-op
 *   - 自定义删除：仅自定义，硬删除，window.confirm 确认
 *   - 预设永远没有删除入口
 */

import { useNavigate } from 'react-router-dom';

import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import EmptyState from '../components/EmptyState';
import IconButton from '../components/primitives/IconButton';
import Button from '../components/primitives/Button';
import ThemeCard from '../components/theme/ThemeCard';
import { useToast } from '../contexts/ToastContext';
import { PRESETS, useTheme } from '../theme';
import { api } from '../api/client.js';

export default function ThemePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    activeTheme,
    setActiveTheme,
    customThemes,
    refreshCustomThemes,
    resetToDefault,
    seasonEnabled,
  } = useTheme();

  // D-25 + BLOCKER B4: 总顺序 = 预设 (presets.js 数组顺序) + 自定义 (API 返回顺序，已 updated_at DESC)
  // 禁止任何客户端排序；此顺序保证相同主题在不同用户/不同刷新次数下渲染位置一致。
  const allThemes = [...PRESETS, ...customThemes];

  const handleReset = () => {
    if (seasonEnabled) {
      showToast('季节自动切换已开启，无法手动重置', 'warn');
      return;
    }
    resetToDefault();
    showToast('已还原默认主题', 'success');
  };

  const handleNew = () => {
    navigate('/theme/editor');
  };

  const handleOpenSettings = () => {
    navigate('/theme/settings');
  };

  // D-10 / D-09：单击行为
  const handleThemeClick = (theme) => {
    if (seasonEnabled) {
      // 自动模式下：所有卡片单击均为 no-op（不应用、不跳转）。
      // 自定义卡片的编辑入口始终通过卡片上的「编辑」按钮（onEdit）。
      return;
    }
    setActiveTheme(theme);
  };

  // D-15：编辑入口（presetId vs themeId 二选一，mutually exclusive query）
  const handleEdit = (theme) => {
    if (theme.kind === 'custom') {
      navigate(`/theme/editor?themeId=${encodeURIComponent(theme.id)}`);
      return;
    }
    // preset fork
    if (seasonEnabled) {
      // 自动模式下预设 fork 不可达（D-09 互斥 + 提示）
      showToast('季节自动切换已开启，无法派生预设', 'warn');
      return;
    }
    navigate(`/theme/editor?preset=${encodeURIComponent(theme.id)}`);
  };

  // D-17：自定义硬删除（仅自定义；预设永远无此入口）
  const handleDelete = async (theme) => {
    if (theme.kind !== 'custom') return;
    const confirmed = window.confirm(
      `确定删除自定义主题「${theme.name}」？此操作不可恢复。`,
    );
    if (!confirmed) return;

    try {
      await api.deleteTheme(theme.id);
      await refreshCustomThemes();
      // D-09 互斥下不动 activeTheme；manual 模式下若删的是当前活动，则回退默认
      if (!seasonEnabled && activeTheme && activeTheme.id === theme.id) {
        resetToDefault();
      }
      showToast('已删除自定义主题', 'success');
    } catch (err) {
      const message = String(err?.message || '删除失败');
      showToast(message, 'error');
    }
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

      <div className="theme-page__actions">
        <Button
          variant="filled"
          icon="add"
          onClick={handleNew}
        >
          新建
        </Button>
        <Button
          variant="outlined"
          icon="settings"
          onClick={handleOpenSettings}
        >
          主题设置
        </Button>
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
            onClick={() => handleThemeClick(theme)}
            onEdit={theme.kind === 'custom' || !seasonEnabled ? () => handleEdit(theme) : undefined}
            onDelete={theme.kind === 'custom' ? () => handleDelete(theme) : undefined}
          />
        ))}
      </div>

      <BottomBar />
    </div>
  );
}
