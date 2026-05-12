"""用户 Schema"""
from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    """创建用户请求"""
    username: str
    password: str
    display_name: Optional[str] = None
    email: Optional[str] = None

class UserUpdate(BaseModel):
    """更新用户请求"""
    display_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserLogin(BaseModel):
    """登录请求"""
    username: str
    password: str

class UserResponse(BaseModel):
    """用户响应"""
    id: int
    username: str
    display_name: Optional[str] = None
    role: str
    is_active: bool
    force_pwd_change: bool = False
    feishu_open_id: Optional[str] = None
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    """Token 响应"""
    access_token: str
    refresh_token: str
    expires_in: int
    user: UserResponse

class RefreshTokenRequest(BaseModel):
    """刷新 Token 请求"""
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    """修改密码请求"""
    old_password: str
    new_password: str
