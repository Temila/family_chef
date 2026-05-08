"""厨师排班模型"""
from sqlalchemy import Column, Integer, Date, DateTime, ForeignKey, String, Boolean, Text
from sqlalchemy.sql import func
from app.database import Base

class ChefSchedule(Base):
    __tablename__ = "chef_schedules"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    chef_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    schedule_date = Column(Date, nullable=False)
    meal_type = Column(String(20), nullable=False)
    is_available = Column(Boolean, nullable=False, default=True)
    notes = Column(Text)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
