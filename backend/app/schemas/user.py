"""用户 Schema"""
import re
from pydantic import BaseModel, field_validator
from typing import Optional

_USERNAME_RE = re.compile(r'^[a-zA-Z0-9_]+$')
_UNSAFE_RE = re.compile(r'[<>"\'&\\/]')


def _sanitize(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    return value.strip()


def _check_unsafe(value: Optional[str], field_name: str) -> Optional[str]:
    if value is not None and _UNSAFE_RE.search(value):
        raise ValueError(f'{field_name}包含不允许的特殊字符')
    return value


class UserCreate(BaseModel):
    """创建用户请求"""
    username: str
    password: str
    display_name: Optional[str] = None
    email: Optional[str] = None

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        v = v.strip()
        if not v:
            raise ValueError('用户名不能为空')
        if not _USERNAME_RE.match(v):
            raise ValueError('用户名只允许大小写字母、数字和下划线')
        if len(v) < 2:
            raise ValueError('用户名至少2个字符')
        if len(v) > 30:
            raise ValueError('用户名最多30个字符')
        return v

    @field_validator('display_name')
    @classmethod
    def validate_display_name(cls, v):
        v = _sanitize(v)
        _check_unsafe(v, '显示名')
        return v

    @field_validator('email')
    @classmethod
    def validate_email_safe(cls, v):
        v = _sanitize(v)
        _check_unsafe(v, '邮箱')
        return v

class UserUpdate(BaseModel):
    """更新用户请求"""
    display_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator('display_name')
    @classmethod
    def validate_display_name(cls, v):
        v = _sanitize(v)
        _check_unsafe(v, '显示名')
        return v

    @field_validator('email')
    @classmethod
    def validate_email_safe(cls, v):
        v = _sanitize(v)
        _check_unsafe(v, '邮箱')
        return v

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
