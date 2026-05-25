/**
 * GuestDishCard Component - 访客菜品卡片
 */

export default function GuestDishCard({ dish, quantity, onAdd, onRemove }) {
  return (
    <div className="dish-card">
      <div className="dish-card-image">
        {dish.image_url ? (
          <img
            src={dish.image_url}
            alt={dish.name}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="placeholder-img">🍽️</div>
        )}
      </div>
      <div className="dish-card-body">
        <div className="dish-card-name">{dish.name}</div>
        <div className="dish-card-meta">
          {(dish.categories || []).map(c => c.name).join(' · ')}
        </div>
        <div className="dish-card-footer">
          <span />
          {quantity === 0 ? (
            <button
              className="btn btn-primary btn-sm guest-add-btn"
              onClick={() => onAdd(dish)}
            >
              +
            </button>
          ) : (
            <div className="qty-stepper">
              <button onClick={() => onRemove(dish.id)}>−</button>
              <span className="qty-value">{quantity}</span>
              <button onClick={() => onAdd(dish)}>+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
