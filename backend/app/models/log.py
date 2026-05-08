"""系统日志模型"""
from sqlalchemy import Column, Integer, DateTime, ForeignKey, String, Text, Index
from sqlalchemy.sql import func
from app.database import Base

class SystemLog(Base):
    __tablename__ = "system_logs"
    __table_args__ = (
        Index("ix_system_logs_user_id", "user_id"),
        Index("ix_system_logs_action", "action"),
        Index("ix_system_logs_created_at", "created_at"),
    )
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(50), nullable=False)
    target_type = Column(String(50))
    target_id = Column(Integer)
    detail = Column(Text)
    ip_address = Column(String(45))
    created_at = Column(DateTime, nullable=False, server_default=func.now())