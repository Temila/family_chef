"""愿望单通知服务 — 封装接收人查询与飞书发送的失败隔离

提供 WishNotificationService 单例，用于愿望生命周期中的飞书推送（NOTIF-05/06）。
- notify_new_wish: 新愿望提交时推送给所有绑定了飞书的厨师（NOTIF-05）
- notify_claimed_wish_change: 已认领愿望被编辑/撤销时推送给认领厨师（NOTIF-06）

设计原则：
- 接收人查询与卡片渲染分离（Pattern 4）
- 每个接收人独立 try/except，单点失败不影响其他厨师（Pitfall 6）
- 惰性导入 feishu_client 避免模块加载时循环依赖
"""
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.wish import Wish


class WishNotificationService:
    """愿望单通知服务

    职责：
    - 解析事件类型并构建通知负载（payload dict）
    - 查询目标接收人并逐一调用飞书客户端发送
    - 发送失败不影响愿望事务（D-H03）
    """

    @staticmethod
    async def notify_new_wish(db: AsyncSession, wish: Wish, submitter: User) -> None:
        """新愿望通知：推送给所有绑定了飞书的厨师（NOTIF-05 / D-F04）。

        查询 User.role == 'chef' 且 feishu_open_id IS NOT NULL 的接收人，
        逐个发送飞书卡片。单个接收人失败不影响其他接收人（Pitfall 6）。
        """
        result = await db.execute(
            select(User.feishu_open_id).where(
                User.role == "chef",
                User.feishu_open_id.is_not(None),
            )
        )
        receive_ids = list(result.scalars().all())
        if not receive_ids:
            return

        payload = {
            "notification_type": "new",
            "wish_id": wish.id,
            "dish_name": wish.dish_name,
            "submitter_name": (
                (submitter.display_name or submitter.username)
                if submitter else "未知用户"
            ),
            "reference_url": wish.reference_url,
            "note": wish.note,
        }

        from app.integrations.feishu import feishu_client

        for receive_id in receive_ids:
            try:
                sent = await feishu_client.send_wish_notification(receive_id, payload)
                if not sent:
                    print(f"⚠️ 愿望飞书通知发送失败: wish_id={wish.id}")
            except Exception as exc:
                print(f"⚠️ 愿望飞书通知发送失败: wish_id={wish.id}, error={exc}")

    @staticmethod
    async def notify_claimed_wish_change(
        db: AsyncSession,
        wish: Wish,
        submitter: User,
        notification_type: str,  # "edit" | "cancel"
        claimed_by_chef_id: int,
        old_note: Optional[str],
    ) -> None:
        """已认领愿望变更通知：推送给认领厨师（NOTIF-06 / D-F04）。

        根据 claimed_by_chef_id 精确查询接收人的 feishu_open_id，
        无角色过滤（A5 admin-claimer 路径兼容）。
        厨师未绑定飞书时静默跳过（Pitfall 6 silent skip）。
        """
        result = await db.execute(
            select(User.feishu_open_id).where(User.id == claimed_by_chef_id)
        )
        receive_id = result.scalar_one_or_none()
        if not receive_id:
            return  # 厨师未绑定飞书 → 静默跳过

        submitter_name = (
            (submitter.display_name or submitter.username)
            if submitter else "未知用户"
        )
        action_verb = "修改了" if notification_type == "edit" else "撤回了"
        payload = {
            "notification_type": notification_type,
            "wish_id": wish.id,
            "dish_name": wish.dish_name,
            "change_description": f"{submitter_name} {action_verb}愿望: {wish.dish_name}",
            "old_note": old_note,
            "note_changed": (old_note != wish.note),
            "new_note": wish.note,
        }

        from app.integrations.feishu import feishu_client

        try:
            sent = await feishu_client.send_wish_notification(receive_id, payload)
            if not sent:
                print(f"⚠️ 愿望飞书通知发送失败: wish_id={wish.id}")
        except Exception as exc:
            print(f"⚠️ 愿望飞书通知发送失败: wish_id={wish.id}, error={exc}")


# 模块级单例（与 wish_service / order_service 模式保持一致）
wish_notification_service = WishNotificationService()
