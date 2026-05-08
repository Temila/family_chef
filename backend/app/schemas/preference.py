"""口味偏好 Schema"""
from pydantic import BaseModel
from typing import List

class PreferenceUpdate(BaseModel):
    """更新偏好请求"""
    dislikes: List[int] = []
    allergies: List[int] = []

class PreferenceResponse(BaseModel):
    """偏好响应"""
    dislikes: List[dict] = []
    allergies: List[dict] = []
