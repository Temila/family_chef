"""
家味 · Family Chef - 统一响应格式
"""

from typing import Any, Optional
from pydantic import BaseModel


class ApiResponse(BaseModel):
    """统一响应格式"""
    code: int = 200
    message: str = "success"
    data: Optional[Any] = None


class PaginatedResponse(BaseModel):
    """分页响应"""
    total: int
    page: int
    page_size: int
    items: list


class ErrorResponse(BaseModel):
    """错误响应"""
    code: int = 400
    message: str = "error"
    detail: Optional[str] = None
