"""菜品模型"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Dish(Base):
    __tablename__ = "dishes"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    pinyin = Column(String(200))
    description = Column(String)
    image_url = Column(String(500))
    status = Column(String(20), nullable=False, default="draft")
    is_popular = Column(Boolean, nullable=False, default=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    ingredients = relationship("DishIngredient", back_populates="dish", cascade="all, delete-orphan")
    categories = relationship("DishCategory", back_populates="dish", cascade="all, delete-orphan")

class DishIngredient(Base):
    __tablename__ = "dish_ingredients"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    dish_id = Column(Integer, ForeignKey("dishes.id", ondelete="CASCADE"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    is_main = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)
    
    dish = relationship("Dish", back_populates="ingredients")

class DishCategory(Base):
    __tablename__ = "dish_categories"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    dish_id = Column(Integer, ForeignKey("dishes.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    
    dish = relationship("Dish", back_populates="categories")
