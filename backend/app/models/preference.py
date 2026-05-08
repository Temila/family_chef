"""口味偏好模型"""
from sqlalchemy import Column, Integer, DateTime, ForeignKey, String
from sqlalchemy.sql import func
from app.database import Base

class TastePreference(Base):
    __tablename__ = "taste_preferences"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    preference_type = Column(String(20), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
