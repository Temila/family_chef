"""用户模型"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(100))
    email = Column(String(100))
    avatar_url = Column(String(500))
    role = Column(String(20), nullable=False, default="user")
    feishu_open_id = Column(String(100))
    is_active = Column(Boolean, nullable=False, default=True)
    force_pwd_change = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<User {self.username}>"
