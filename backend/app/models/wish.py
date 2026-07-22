"""愿望单模型"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Wish(Base):
    """愿望单模型"""
    __tablename__ = "wishes"
    __table_args__ = (
        Index("ix_wishes_user_id", "user_id"),
        Index("ix_wishes_status", "status"),
        Index("ix_wishes_claimed_by_chef_id", "claimed_by_chef_id"),
        Index("ix_wishes_status_chef", "status", "claimed_by_chef_id"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dish_name = Column(String(100), nullable=False)
    reference_url = Column(String(500))
    note = Column(Text)
    status = Column(String(20), nullable=False, default="待处理")
    claimed_by_chef_id = Column(Integer, ForeignKey("users.id"))
    related_dish_id = Column(Integer, ForeignKey("dishes.id"))
    reject_reason = Column(Text)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    # Phase 6 通知状态时间戳（D-M01）
    # last_status_change_at: 创建时由 server_default 自动填充；
    #   仅 claim/advance/reject/cancel 成功的状态变更可推进（D-H01）
    # submitter_last_viewed_at: 提交者查看愿望详情时更新，初始为 NULL
    last_status_change_at = Column(DateTime, nullable=True, server_default=func.now())
    submitter_last_viewed_at = Column(DateTime, nullable=True)

    submitter = relationship("User", foreign_keys=[user_id])
    claimer = relationship("User", foreign_keys=[claimed_by_chef_id])
    related_dish = relationship("Dish", foreign_keys=[related_dish_id])
