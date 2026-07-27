/**
 * DishCard Component - 菜品卡片
 */

import { useNavigate } from 'react-router-dom';
import { formatPrice } from '../utils';
import Ripple from './Ripple';

export default function DishCard({ dish, simple }) {
  const navigate = useNavigate();

  const handleImageError = (e) => {
    e.target.style.display = 'none';
    e.target.nextElementSibling.style.display = 'flex';
  };

  return (
    <Ripple style={{ width: '100%' }}>
      <div
        className="dish-card"
        onClick={() => navigate(`/dishes/${dish.id}`)}
      >
      <div className="dish-card-image">
        {dish.image_url ? (
          <>
            <img
              src={dish.image_url}
              alt={dish.name}
              onError={handleImageError}
            />
            <div className="placeholder-img" style={{ display: 'none' }}>
              🍽️
            </div>
          </>
        ) : (
          <div className="placeholder-img">
            🍽️
          </div>
        )}
        {dish.is_featured && (
          <div className="dish-card-badges">
            <span className="badge badge-gold">推荐</span>
          </div>
        )}
      </div>

      <div className="dish-card-body">
        <div className="dish-card-name">{dish.name}</div>
        {!simple && (
          <div className="dish-card-meta">
            {dish.cuisine_name && `${dish.cuisine_name} · `}
            {dish.base_price !== null && `¥${formatPrice(dish.base_price)}`}
          </div>
        )}
        {!simple && (
          <div className="dish-card-footer">
            <span className="badge badge-info">{dish.category_name || '默认'}</span>
            {dish.is_available ? (
              <span className="badge badge-success">可点</span>
            ) : (
              <span className="badge badge-danger">已售罄</span>
            )}
          </div>
        )}
      </div>
      </div>
    </Ripple>
  );
}
