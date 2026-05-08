"""通用 Schema"""
from typing import Any, Optional, Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")

class BaseResponse(BaseModel):
    """通用响应"""
    code: int = 200
    message: str = "success"
    data: Optional[Any] = None

class PageParams(BaseModel):
    """分页参数"""
    page: int = 1
    page_size: int = 20

class PageResponse(BaseModel, Generic[T]):
    """分页响应"""
    total: int
    page: int
    page_size: int
    items: list[T]

class ErrorDetail(BaseModel):
    """错误响应"""
    code: int = 400
    message: str = "error"
    detail: Optional[str] = None
