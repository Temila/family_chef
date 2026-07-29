/**
 * GuestDishCard Component - 访客菜品卡片
 *
 * Phase 10 D-13 重构：薄 slot-based 包装，业务数据通过 props 传入 Card primitive。
 * 静态展示（无 onClick → Card 不启用 ripple/state/elevation/cursor，符合 D-08 访客页需求）。
 * 保持现有 prop API 不变：{ dish, quantity, onAdd, onRemove }
 *
 * 10-02-MIGRATION:START — Card primitive slot 抽象（GuestDishCard 无 Badge/Chip 用法，10-03 不编辑此文件）
 */

import Card from './primitives/Card';
import Button from './primitives/Button';
import Icon from './primitives/Icon';

export default function GuestDishCard({ dish, quantity, onAdd, onRemove }) {
  const image = dish.image_url ? (
    <img
      src={dish.image_url}
      alt={dish.name}
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  ) : (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--md-color-surface-container)' }}>
      <Icon name="set-meal" size={48} />
    </div>
  );

  return (
    <Card
      variant="elevated"
      image={image}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span />
          {quantity === 0 ? (
            <Button
              variant="filled"
              size="sm"
              className="guest-add-btn"
              aria-label="加入点菜"
              onClick={() => onAdd(dish)}
            >
              +
            </Button>
          ) : (
            <div className="qty-stepper">
              <button onClick={() => onRemove(dish.id)}>−</button>
              <span className="qty-value">{quantity}</span>
              <button onClick={() => onAdd(dish)}>+</button>
            </div>
          )}
        </div>
      }
    >
      <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--md-spacing-1)', fontFamily: 'var(--md-font-display)' }}>
        {dish.name}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {(dish.categories || []).map(c => c.name).join(' · ')}
      </div>
    </Card>
  );
}

/* 10-02-MIGRATION:END */
