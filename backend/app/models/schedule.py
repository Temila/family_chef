"""厨师排班模型"""
from sqlalchemy import Column, Integer, Date, String, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import date
from app.database import Base

class ChefSchedule(Base):
    __tablename__ = "chef_schedules"
    __table_args__ = (
        UniqueConstraint("chef_id", "schedule_date", "meal_type", name="uq_chef_date_meal"),
    )
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    chef_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    schedule_date = Column(Date, nullable=False, default=date.today)
    meal_type = Column(String(20), nullable=False)  # breakfast | lunch | dinner
    status = Column(String(20), nullable=False, default="scheduled")  # scheduled | confirmed | completed
    notes = Column(String)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    chef = relationship("User", foreign_keys=[chef_id])
