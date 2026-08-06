/**
 * ThemeSettingsPage — Phase 18 (SEAS-02 / SEAS-03 / D-08 / D-09 / D-11 / EDIT-05)
 *
 * 主题设置子页：
 *   - 季节自动切换开关（D-09 互斥提醒，醒目展示）
 *   - 北/南半球二选一（D-05/D-06）
 *   - 返回主题 入口
 *
 * 该子页不通过 JWT 之外的鉴权；按 D-05 不读取 timezone/IP/browser 半球 API。
 * 开关即时调用 setSeasonEnabled(Boolean(event.target.checked))，
 * 半球选择即时调用 setHemisphere('north' | 'south')。
 * 互斥模型提醒文本由 theme-context 控制实际行为，此处只承担用户教育（说明）。
 */

import { useNavigate } from 'react-router-dom';

import Header from '../components/Header';
import BottomBar from '../components/BottomBar';
import Button from '../components/primitives/Button';
import Chip from '../components/primitives/Chip';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../theme/theme-context.jsx';

import '../css/theme-settings.css';

const SEASON_TOGGLE_ID = 'theme-settings-season-toggle';
const HEMISPHERE_NORTH_ID = 'theme-settings-hemisphere-north';
const HEMISPHERE_SOUTH_ID = 'theme-settings-hemisphere-south';

// Quick 260807-121: 季节主题选择器常量
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const SEASON_LABELS = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

export default function ThemeSettingsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    seasonEnabled,
    hemisphere,
    setSeasonEnabled,
    setHemisphere,
    seasonThemeMap,
    setSeasonTheme,
    customThemes,
    PRESETS,
  } = useTheme();

  const handleSeasonToggle = (event) => {
    const next = Boolean(event.target.checked);
    setSeasonEnabled(next);
    showToast(
      next ? '已开启季节自动切换' : '已关闭季节自动切换',
      'success',
    );
  };

  const handleHemisphereChange = (next) => {
    setHemisphere(next);
    showToast(next === 'south' ? '已切换到南半球' : '已切换到北半球', 'success');
  };

  // Quick 260807-121: 更改某季节对应的主题（预设或自定义）
  const handleSeasonThemeChange = (season, event) => {
    const selectedId = event.target.value;
    const pool = [...PRESETS, ...customThemes];
    const matched = pool.find(t => t.id === selectedId);
    if (!matched) return;
    setSeasonTheme(season, matched);
    showToast(`已更新${SEASON_LABELS[season]}主题：${matched.name}`, 'success');
  };

  const handleBack = () => {
    navigate('/theme');
  };

  return (
    <div className="page-container">
      <Header title="主题设置" showBack />

      <div className="theme-settings">
        <div className="theme-settings__topbar">
          <div className="theme-settings__title-block">
            <h1 className="theme-settings__title">主题设置</h1>
            <div className="theme-settings__subtitle">控制自动切换与半球偏好</div>
          </div>
        </div>

        {/* D-09 互斥醒目提醒 —— 独立显著 DOM 区域（非 tooltip，非代码注释）。
            aria-describedby 把提醒与开关控件显式关联，无障碍读屏会念出。 */}
        <aside
          className="theme-settings__mutex-warning"
          role="note"
          aria-live="polite"
          aria-describedby={SEASON_TOGGLE_ID}
        >
          <span className="theme-settings__mutex-warning-icon" aria-hidden="true">⚠</span>
          <span className="theme-settings__mutex-warning-text">
            开启后按所选季节主题自动切换，手动应用失效
          </span>
        </aside>

        <section className="theme-settings__section">
          <div className="theme-settings__section-title">季节自动切换</div>
          <label
            htmlFor={SEASON_TOGGLE_ID}
            className="theme-settings__toggle-row"
          >
            <span className="theme-settings__toggle-label">季节自动切换</span>
            <span className="theme-settings__toggle-control">
              <input
                id={SEASON_TOGGLE_ID}
                type="checkbox"
                role="switch"
                className="theme-settings__toggle-input"
                checked={seasonEnabled}
                onChange={handleSeasonToggle}
                aria-describedby={SEASON_TOGGLE_ID}
              />
              <span className="theme-settings__toggle-track" aria-hidden="true">
                <span className="theme-settings__toggle-thumb" />
              </span>
            </span>
          </label>
          <div className="theme-settings__section-hint">
            开启后将按本地时区与所选半球匹配当前季节，并自动应用对应预设。
          </div>
        </section>

        <section className="theme-settings__section">
          <div className="theme-settings__section-title">半球</div>
          <div
            className="theme-settings__hemisphere-row"
            role="radiogroup"
            aria-label="半球"
          >
            <label
              htmlFor={HEMISPHERE_NORTH_ID}
              className={`theme-settings__hemisphere-option${
                hemisphere === 'north' ? ' theme-settings__hemisphere-option--selected' : ''
              }`}
            >
              <input
                id={HEMISPHERE_NORTH_ID}
                type="radio"
                name="hemisphere"
                value="north"
                className="theme-settings__hemisphere-input"
                checked={hemisphere === 'north'}
                onChange={() => handleHemisphereChange('north')}
              />
              <Chip
                variant="filter"
                selected={hemisphere === 'north'}
                onClick={() => handleHemisphereChange('north')}
                role="presentation"
              >
                北半球
              </Chip>
            </label>
            <label
              htmlFor={HEMISPHERE_SOUTH_ID}
              className={`theme-settings__hemisphere-option${
                hemisphere === 'south' ? ' theme-settings__hemisphere-option--selected' : ''
              }`}
            >
              <input
                id={HEMISPHERE_SOUTH_ID}
                type="radio"
                name="hemisphere"
                value="south"
                className="theme-settings__hemisphere-input"
                checked={hemisphere === 'south'}
                onChange={() => handleHemisphereChange('south')}
              />
              <Chip
                variant="filter"
                selected={hemisphere === 'south'}
                onClick={() => handleHemisphereChange('south')}
                role="presentation"
              >
                南半球
              </Chip>
            </label>
          </div>
          <div className="theme-settings__section-hint">
            南半球与北半球的季节相反：北半球的春对应南半球的秋。
          </div>
        </section>

        {/* Quick 260807-121: 季节主题选择器 —— 仅当季节自动切换开启时渲染。
            每个季节可选所有预设 + 当前用户自定义主题；默认值为 seasonThemeMap 中的当前映射。 */}
        {seasonEnabled && (
          <section className="theme-settings__section">
            <div className="theme-settings__section-title">季节主题</div>
            {SEASONS.map(season => (
              <div key={season} className="theme-settings__season-row">
                <label
                  className="theme-settings__season-label"
                  htmlFor={`${season}-season-select`}
                >
                  {SEASON_LABELS[season]}
                </label>
                <select
                  id={`${season}-season-select`}
                  className="theme-settings__season-select"
                  value={seasonThemeMap[season]?.id ?? ''}
                  onChange={(e) => handleSeasonThemeChange(season, e)}
                >
                  {[...PRESETS, ...customThemes].map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            ))}
            <div className="theme-settings__section-hint">
              为每个季节选择主题；更改当前季节的主题会立即生效。
            </div>
          </section>
        )}

        <div className="theme-settings__actions">
          <Button variant="filled" onClick={handleBack}>
            返回主题
          </Button>
        </div>
      </div>

      <BottomBar />
    </div>
  );
}
