/**
 * ThemeEditorPage — Phase 18 (EDIT-01/03/04/05 + D-12~D-16)
 *
 * 独立的 /theme/editor 路由页：
 *   - 新建 / 编辑现有自定义主题 / 预设 fork（预填 "我的春/夏/秋/冬"）
 *   - 三色种子 (primary/secondary/tertiary) 实时 HexColorPicker + HexColorInput
 *   - 9 种 MD3 变体横向滚动 Chip 选择
 *   - 作用域预览：<div data-fc-theme-scope="editor-preview"> 内 buildCssSync +
 *     重写 :root/[data-theme="dark"] → scope 限定选择器，textContent 直写。
 *     拖拽过程不调用 setActiveTheme / injectThemeCss，整 app 不重渲染。
 *   - 保存：根据是否有 themeId 决定 POST/PUT；trim+校验名称；duplicate 错误中文化。
 *
 * 公开路由：
 *   /theme/editor                            → 从 DEFAULT_PRESET 新建
 *   /theme/editor?themeId=<id>               → 编辑现有自定义主题
 *   /theme/editor?preset=<spring|summer|autumn|winter> → fork 预设
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HexColorInput, HexColorPicker } from 'react-colorful';

import { api } from '../api/client.js';
import { useTheme } from '../theme/theme-context.jsx';
import { buildCssSync } from '../theme/theme-engine.js';
import { DEFAULT_PRESET, PRESETS } from '../theme/presets.js';
import { useToast } from '../contexts/ToastContext.jsx';

import Button from '../components/primitives/Button';
import Card from '../components/primitives/Card';
import Chip from '../components/primitives/Chip';
import BottomBar from '../components/BottomBar';
import Header from '../components/Header';
import Input from '../components/primitives/Input';
import Loading from '../components/Loading';
import ThemePreview from '../components/theme/ThemePreview';

import '../css/theme-editor.css';

const SCOPE_ID = 'editor-preview';
const SCOPE_SELECTOR = `[data-fc-theme-scope="${SCOPE_ID}"]`;
const SCOPE_DARK_SELECTOR = `[data-fc-theme-scope="${SCOPE_ID}"][data-theme="dark"]`;

const PRESET_FORK_NAMES = {
  spring: '我的春',
  summer: '我的夏',
  autumn: '我的秋',
  winter: '我的冬',
};

const VARIANT_OPTIONS = [
  'TonalSpot',
  'Vibrant',
  'Expressive',
  'Content',
  'Mono',
  'Neutral',
  'Fidelity',
  'Rainbow',
  'FruitSalad',
];

const SEED_KEYS = [
  { key: 'primary', label: '主色 (Primary)' },
  { key: 'secondary', label: '次色 (Secondary)' },
  { key: 'tertiary', label: '第三色 (Tertiary)' },
];

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function buildScopedCss(sourceColors, variant) {
  const css = buildCssSync(sourceColors, variant);
  return css
    .replace(/:root\s*\{/g, `${SCOPE_SELECTOR} {`)
    .replace(/\[data-theme="dark"\]\s*\{/g, `${SCOPE_DARK_SELECTOR} {`);
}

function normalizeApiTheme(theme) {
  const { source_colors, ...rest } = theme;
  return { ...rest, sourceColors: source_colors };
}

function isBlank(value) {
  return value == null || String(value).trim().length === 0;
}

function createInitialDraft({ presetParam }) {
  if (presetParam && PRESET_FORK_NAMES[presetParam]) {
    const source = PRESETS.find(p => p.id === presetParam) || DEFAULT_PRESET;
    return {
      mode: 'fork',
      name: PRESET_FORK_NAMES[presetParam],
      sourceColors: { ...source.sourceColors },
      variant: source.variant || 'TonalSpot',
    };
  }
  return {
    mode: 'new',
    name: '',
    sourceColors: { ...DEFAULT_PRESET.sourceColors },
    variant: DEFAULT_PRESET.variant || 'TonalSpot',
  };
}

function resolveHeading(mode) {
  if (mode === 'edit') return '编辑自定义主题';
  if (mode === 'fork') return '从预设派生新主题';
  return '新建自定义主题';
}

function resolveSubtitle(draft) {
  if (draft.mode === 'edit') return '拖动调整仅作用于下方预览，保存后才会应用到整 app';
  if (draft.mode === 'fork') return '预填名称已按预设季节命名，可继续修改后再保存';
  return '从默认种子色开始；保存后将创建为新的自定义主题';
}

function SeedColorControl({ label, value, onChange }) {
  return (
    <div className="theme-editor__seed">
      <div className="theme-editor__seed-label">{label}</div>
      <div className="theme-editor__seed-picker">
        <HexColorPicker color={value} onChange={onChange} />
      </div>
      <div className="theme-editor__seed-input">
        <HexColorInput
          color={value}
          onChange={onChange}
          prefixed
          aria-label={label}
        />
      </div>
    </div>
  );
}

export default function ThemeEditorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  // Plan 18-04 会在 useTheme() 上追加 seasonEnabled；当前阶段用默认值 false，
  // 保证该字段缺失时仍能安全运行（D-09 互斥模型）。
  const { setActiveTheme, refreshCustomThemes, seasonEnabled = false } = useTheme();

  const themeIdParam = searchParams.get('themeId');
  const presetParam = searchParams.get('preset');

  const [loadingCustom, setLoadingCustom] = useState(Boolean(themeIdParam));
  const [draft, setDraft] = useState(() => createInitialDraft({ presetParam }));
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const scopedStyleRef = useRef(null);

  // 从后端拉取现有自定义主题（themeId 路径），填充 draft
  useEffect(() => {
    if (!themeIdParam) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const all = await api.getThemes();
        if (cancelled) return;
        const match = all.find(theme => String(theme.id) === String(themeIdParam));
        if (!match) {
          showToast('未找到该自定义主题', 'error');
          navigate('/theme', { replace: true });
          return;
        }
        setDraft({
          mode: 'edit',
          name: match.name,
          sourceColors: { ...match.sourceColors },
          variant: match.variant || 'TonalSpot',
          originalId: match.id,
        });
      } catch {
        if (!cancelled) showToast('加载自定义主题失败', 'error');
      } finally {
        if (!cancelled) setLoadingCustom(false);
      }
    })();
    return () => { cancelled = true; };
  }, [themeIdParam, showToast, navigate]);

  // 拖拽阶段：每次 draft.sourceColors / draft.variant 变化，
  // 直写 scoped style.textContent，不触发 setActiveTheme。
  const scopedCss = useMemo(
    () => buildScopedCss(draft.sourceColors, draft.variant),
    [draft.sourceColors, draft.variant],
  );

  useEffect(() => {
    if (!scopedStyleRef.current) return;
    scopedStyleRef.current.textContent = scopedCss;
  }, [scopedCss]);

  const updateColor = (key) => (value) => {
    if (!HEX_COLOR_RE.test(value)) return;
    setDraft(previous => ({
      ...previous,
      sourceColors: { ...previous.sourceColors, [key]: value },
    }));
  };

  const updateVariant = (variant) => {
    setDraft(previous => ({ ...previous, variant }));
  };

  const updateName = (event) => {
    const value = event.target.value;
    setDraft(previous => ({ ...previous, name: value }));
    if (nameError) setNameError('');
  };

  const handleCancel = () => {
    navigate('/theme');
  };

  const validateName = () => {
    const trimmed = (draft.name || '').trim();
    if (!trimmed) {
      setNameError('主题名称不能为空');
      return null;
    }
    if (trimmed.length > 100) {
      setNameError('主题名称不能超过 100 个字符');
      return null;
    }
    return trimmed;
  };

  const handleSave = async () => {
    const finalName = validateName();
    if (!finalName) return;

    setSaving(true);
    try {
      const payload = {
        name: finalName,
        sourceColors: draft.sourceColors,
        variant: draft.variant,
      };
      let saved;
      if (draft.mode === 'edit' && draft.originalId) {
        saved = await api.updateTheme(draft.originalId, payload);
        saved = normalizeApiTheme(saved);
      } else {
        const created = await api.createTheme(payload);
        saved = normalizeApiTheme(created);
      }

      await refreshCustomThemes();

      // D-09：季节自动开启时禁止手动应用（Plan 18-04 添加 seasonEnabled）
      if (!seasonEnabled) {
        setActiveTheme(saved);
      }

      showToast(
        seasonEnabled ? '主题已保存（季节自动切换已开启）' : '主题已保存并应用',
        'success',
      );
      navigate('/theme');
    } catch (err) {
      const message = String(err?.message || '保存失败');
      if (/同名|已存在|duplicate/i.test(message)) {
        setNameError(`已存在同名主题：${finalName}`);
        showToast(`已存在同名主题：${finalName}`, 'error');
      } else if (message.includes('主题名称不能为空') || message.includes('不能为空')) {
        setNameError('主题名称不能为空');
      } else if (message.includes('颜色值')) {
        showToast('颜色值不合法', 'error');
      } else {
        showToast(message, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadingCustom) {
    return (
      <div className="page-container">
        <Header title="主题编辑器" showBack />
        <Loading message="加载自定义主题..." />
        <BottomBar />
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header title="主题编辑器" showBack />

      <div className="theme-editor">
        <div className="theme-editor__topbar">
          <div className="theme-editor__title-block">
            <h1 className="theme-editor__title">{resolveHeading(draft.mode)}</h1>
            <div className="theme-editor__subtitle">{resolveSubtitle(draft)}</div>
          </div>
        </div>

        <section className="theme-editor__section theme-editor__section--name">
          <Input
            label="主题名称"
            value={draft.name}
            onChange={updateName}
            placeholder="请输入主题名称"
            maxLength={120}
            error={nameError || undefined}
            supportingText={nameError ? undefined : `${(draft.name || '').trim().length} / 100`}
          />
        </section>

        <section className="theme-editor__section theme-editor__section--variants">
          <div className="theme-editor__section-title">变体</div>
          <div className="theme-editor__chip-row">
            {VARIANT_OPTIONS.map(variantName => (
              <Chip
                key={variantName}
                variant="filter"
                selected={draft.variant === variantName}
                onClick={() => updateVariant(variantName)}
              >
                {variantName}
              </Chip>
            ))}
          </div>
        </section>

        <section className="theme-editor__section theme-editor__section--seeds">
          <div className="theme-editor__section-title">种子色</div>
          <div className="theme-editor__seed-grid">
            {SEED_KEYS.map(seed => (
              <SeedColorControl
                key={seed.key}
                label={seed.label}
                value={draft.sourceColors[seed.key]}
                onChange={updateColor(seed.key)}
              />
            ))}
          </div>
        </section>

        <section className="theme-editor__section theme-editor__section--preview">
          <div className="theme-editor__section-title">预览</div>
          <Card variant="outlined" className="theme-editor__preview-card">
            {/* T-18-08：scoped style.id 固定 "editor-preview-style"，
                buildCssSync 输出经重写限定到 [data-fc-theme-scope="editor-preview"]。
                拖拽阶段 useEffect 直写 textContent，不触发整 app fc-dynamic-theme 重写。 */}
            <style id="editor-preview-style" ref={scopedStyleRef} />
            <div
              data-fc-theme-scope={SCOPE_ID}
              className="theme-editor__preview-scope"
              aria-hidden="true"
            >
              <ThemePreview />
            </div>
          </Card>
        </section>

        <div className="theme-editor__actions">
          <Button variant="outlined" onClick={handleCancel} disabled={saving}>
            取消
          </Button>
          <Button
            variant="filled"
            onClick={handleSave}
            loading={saving}
            disabled={saving || isBlank(draft.name)}
          >
            保存
          </Button>
        </div>
      </div>

      <BottomBar />
    </div>
  );
}