"""口味偏好模型"""
from sqlalchemy import Column, Integer, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base

class TastePreference(Base):
    __tablename__ = "taste_preferences"
    __table_args__ = (
        UniqueConstraint("user_id", "ingredient_id", "preference_type", name="uq_user_ingredient_pref"),
    )
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    preference_type = Column(String(20), nullable=False)  # dislike | allergy
    created_at = Column(DateTime, nullable=False, server_default=func.now())
