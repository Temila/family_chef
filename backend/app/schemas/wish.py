"""愿望单 Schema"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class WishBase(BaseModel):
    """愿望单基础字段"""
    dish_name: str = Field(..., min_length=1, max_length=100, description="菜名（必填）")
    reference_url: Optional[str] = Field(None, max_length=500, description="参考链接（可选）")
    note: Optional[str] = Field(None, description="备注（可选）")


class WishCreate(WishBase):
    """提交愿望请求"""
    pass


class WishUpdate(BaseModel):
    """编辑愿望请求（D-06：仅在待处理/准备中状态下允许）"""
    dish_name: Optional[str] = Field(None, min_length=1, max_length=100)
    reference_url: Optional[str] = Field(None, max_length=500)
    note: Optional[str] = None


class WishAdvance(BaseModel):
    """推进愿望到已上架（FLOW-03，D-09）"""
    related_dish_id: int = Field(..., description="关联的已上架菜品 ID")


class WishReject(BaseModel):
    """拒绝愿望（FLOW-04 — 拒绝原因必填）"""
    reject_reason: str = Field(..., min_length=1, max_length=500, description="拒绝原因（必填）")


class WishResponse(BaseModel):
    """愿望响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    dish_name: str
    reference_url: Optional[str]
    note: Optional[str]
    status: str
    claimed_by_chef_id: Optional[int]
    related_dish_id: Optional[int]
    reject_reason: Optional[str]
    created_at: datetime
    updated_at: datetime


class WishListResponse(WishResponse):
    """愿望列表项（路由层注入扁平化 name 字段）"""
    model_config = ConfigDict(from_attributes=True)

    submitter_name: Optional[str] = None
    claimed_by_chef_name: Optional[str] = None


class WishDetailResponse(WishResponse):
    """愿望详情（含 related_dish_name）"""
    model_config = ConfigDict(from_attributes=True)

    submitter_name: Optional[str] = None
    claimed_by_chef_name: Optional[str] = None
    related_dish_name: Optional[str] = None
