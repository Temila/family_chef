"""
家味 · Family Chef - 飞书集成客户端
"""

import httpx
from typing import Optional
from app.config import settings


class FeishuClient:
    """飞书 API 客户端"""

    BASE_URL = "https://open.feishu.cn/open-apis"

    def __init__(self):
        self.app_id = settings.FEISHU_APP_ID
        self.app_secret = settings.FEISHU_APP_SECRET
        self._tenant_access_token: Optional[str] = None
        self._token_expires_at: float = 0

    async def get_tenant_access_token(self) -> Optional[str]:
        """获取飞书 tenant_access_token"""
        if not self.app_id or not self.app_secret:
            print("⚠️ 飞书应用凭证未配置")
            return None

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/auth/v3/tenant_access_token/internal",
                json={
                    "app_id": self.app_id,
                    "app_secret": self.app_secret,
                },
            )

        if response.status_code == 200:
            data = response.json()
            if data.get("code") == 0:
                self._tenant_access_token = data.get("tenant_access_token")
                self._token_expires_at = data.get("expire", 0)
                return self._tenant_access_token

        print(f"❌ 获取飞书 Token 失败：{response.text}")
        return None

    async def send_message(
        self,
        receive_id: str,
        msg_type: str,
        content: dict,
    ) -> bool:
        """发送飞书消息（卡片消息）"""
        token = await self.get_tenant_access_token()
        if not token:
            return False

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/im/v1/messages",
                headers={
                    "Authorization": f"Bearer {token}",
                },
                json={
                    "receive_id": receive_id,
                    "msg_type": msg_type,
                    "content": str(content),  # 飞书要求 content 为字符串
                },
            )

        if response.status_code == 200:
            data = response.json()
            if data.get("code") == 0:
                print(f"✅ 飞书消息发送成功 to {receive_id}")
                return True

        print(f"❌ 飞书消息发送失败：{response.text}")
        return False

    async def send_order_notification(
        self,
        receive_id: str,
        order_no: str,
        status: str,
        items: list,
    ) -> bool:
        """发送订单通知（卡片消息）"""
        status_text = {
            "pending": "待处理",
            "accepted": "已接受",
            "cooking": "烹饪中",
            "completed": "已完成",
            "cancelled": "已取消",
        }.get(status, status)

        # 构建卡片消息
        card_content = {
            "config": {
                "wide_screen_mode": True,
            },
            "header": {
                "title": {
                    "tag": "plain_text",
                    "content": f"订单 {order_no} - {status_text}",
                },
                "template": "blue",
            },
            "elements": [
                {
                    "tag": "div",
                    "text": {
                        "tag": "lark_md",
                        "content": f"**订单号：** {order_no}\n**状态：** {status_text}",
                    },
                },
                {
                    "tag": "div",
                    "text": {
                        "tag": "lark_md",
                        "content": "**菜品列表：**\n" + "\n".join(
                            f"- {item.get('name', '未知菜品')} x{item.get('quantity', 1)}"
                            for item in items
                        ),
                    },
                },
            ],
        }

        return await self.send_message(
            receive_id,
            "interactive",
            card_content,
        )

    async def bind_user(
        self,
        user_id: int,
        feishu_open_id: str,
    ) -> bool:
        """绑定飞书账号（更新用户表）"""
        # TODO: 实现用户表更新逻辑
        print(f"✅ 用户 {user_id} 绑定飞书账号 {feishu_open_id}")
        return True


# 全局飞书客户端实例
feishu_client = FeishuClient()