/**
 * Icon Component - Material Symbols 骨架组件（Phase 9 — D-11）
 *
 * Phase 9 使用 font-based material-symbols 渲染（已在 devDependencies）。
 * Phase 10-12 将渐进迁移到 SVG tree-shaking 按需加载。
 *
 * 用法：<Icon name="home" size={24} fill={0} weight={400} grade={0} />
 */

export default function Icon({
  name,
  size = 24,
  fill = 0,
  weight = 400,
  grade = 0,
  className = '',
}) {
  // Material Symbols 要求 ligature 名称用下划线连接
  const iconName = String(name || '').replace(/\s+/g, '_');

  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grade}`,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-hidden="true"
    >
      {iconName}
    </span>
  );
}
