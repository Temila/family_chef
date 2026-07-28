/**
 * DishCard Component - 菜品卡片
 *
 * Phase 10 D-13 重构：薄 slot-based 包装，业务数据通过 props 传入 Card primitive。
 * 旧自包含 .dish-card className 彻底消失；Card primitive 接管所有视觉/状态/动效。
 *
 * 10-02-MIGRATION:START — Card primitive slot 抽象（badge inline className 由 10-03 替换为 <Badge>）
 */

import { useNavigate } from 'react-router-dom';
import { formatPrice } from '../utils';
import Badge from './primitives/Badge';
import Card from './primitives/Card';

export default function DishCard({ dish, simple }) {
  const navigate = useNavigate();

  const handleImageError = (e) => {
    e.target.style.display = 'none';
    const sibling = e.target.nextElementSibling;
    if (sibling) sibling.style.display = 'flex';
  };

  const image = (
    <>
      {dish.image_url ? (
        <>
          <img
            src={dish.image_url}
            alt={dish.name}
            onError={handleImageError}
          />
          <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', background: 'var(--md-color-surface-container)' }}>
            🍽️
          </div>
        </>
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', background: 'var(--md-color-surface-container)' }}>
          🍽️
        </div>
      )}
      {dish.is_featured && (
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Badge tone="tertiary">推荐</Badge>
        </div>
      )}
    </>
  );

  return (
    <Card
      variant="elevated"
      image={image}
      onClick={() => navigate(`/dishes/${dish.id}`)}
      footer={!simple && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Badge tone="info">{dish.category_name || '默认'}</Badge>
          {dish.is_available ? (
            <Badge tone="success">可点</Badge>
          ) : (
            <Badge tone="error">已售罄</Badge>
          )}
        </div>
      )}
    >
      <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 4, fontFamily: 'var(--md-font-display)' }}>
        {dish.name}
      </div>
      {!simple && (
        <div style={{ fontSize: '0.75rem', color: 'var(--md-color-on-surface-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {dish.cuisine_name && `${dish.cuisine_name} · `}
          {dish.base_price !== null && `¥${formatPrice(dish.base_price)}`}
        </div>
      )}
    </Card>
  );
}

/* 10-02-MIGRATION:END */
