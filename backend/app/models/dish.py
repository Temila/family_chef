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
    recipe = Column(String)
    image_url = Column(String(500))
    status = Column(String(20), nullable=False, default="draft")
    is_popular = Column(Boolean, nullable=False, default=False)
    is_semifinished = Column(Boolean, nullable=False, default=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    ingredients = relationship("DishIngredient", back_populates="dish", cascade="all, delete-orphan")
    categories = relationship("DishCategory", back_populates="dish", cascade="all, delete-orphan")
    semifinished_ingredients = relationship("DishSemifinishedIngredient", foreign_keys="DishSemifinishedIngredient.dish_id", back_populates="dish", cascade="all, delete-orphan")
    dish_chefs = relationship("DishChef", back_populates="dish", cascade="all, delete-orphan")

    @property
    def chefs(self):
        return self.dish_chefs

class DishIngredient(Base):
    __tablename__ = "dish_ingredients"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    dish_id = Column(Integer, ForeignKey("dishes.id", ondelete="CASCADE"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    is_main = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)
    
    dish = relationship("Dish", back_populates="ingredients")
    ingredient = relationship("Ingredient")

class DishCategory(Base):
    __tablename__ = "dish_categories"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    dish_id = Column(Integer, ForeignKey("dishes.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    
    dish = relationship("Dish", back_populates="categories")
    category = relationship("Category")

class DishSemifinishedIngredient(Base):
    __tablename__ = "dish_semifinished_ingredients"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    dish_id = Column(Integer, ForeignKey("dishes.id", ondelete="CASCADE"), nullable=False)
    semifinished_dish_id = Column(Integer, ForeignKey("dishes.id"), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    
    dish = relationship("Dish", foreign_keys=[dish_id], back_populates="semifinished_ingredients")
    semifinished_dish = relationship("Dish", foreign_keys=[semifinished_dish_id])

class DishChef(Base):
    __tablename__ = "dish_chefs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    dish_id = Column(Integer, ForeignKey("dishes.id", ondelete="CASCADE"), nullable=False)
    chef_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), nullable=False, default="hidden")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    dish = relationship("Dish", back_populates="dish_chefs")
    chef = relationship("User")
