"""食材模型"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Ingredient(Base):
    __tablename__ = "ingredients"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)
    pinyin = Column(String(100))
    category = Column(String(50))
    description = Column(String)
    image_url = Column(String(500))
    unit = Column(String(20))  # 单位：个、斤、克等
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    aliases = relationship("IngredientAlias", back_populates="ingredient", cascade="all, delete-orphan")

class IngredientAlias(Base):
    __tablename__ = "ingredient_aliases"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=False)
    alias = Column(String(50), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    ingredient = relationship("Ingredient", back_populates="aliases")
