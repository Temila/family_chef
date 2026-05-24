"""访客邀请模型"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class GuestInvitation(Base):
    __tablename__ = "guest_invitations"
    __table_args__ = (
        Index("uq_guest_invitations_token", "token", unique=True),
        Index("ix_guest_invitations_inviter_id", "inviter_id"),
        Index("ix_guest_invitations_expires_at", "expires_at"),
        Index("ix_guest_invitations_status_expires_at", "status", "expires_at"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    token = Column(String(36), nullable=False, unique=True)
    inviter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    chef_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), nullable=False, default="active")
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    inviter = relationship("User", foreign_keys=[inviter_id])
    chef = relationship("User", foreign_keys=[chef_id])
    orders = relationship("Order", back_populates="guest_invitation")
