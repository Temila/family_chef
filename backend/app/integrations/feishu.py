"""
家味 · Family Chef - 飞书集成客户端
"""

import json
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
                params={"receive_id_type": "open_id"},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json; charset=utf-8",
                },
                json={
                    "receive_id": receive_id,
                    "msg_type": msg_type,
                    "content": json.dumps(content),
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
            data: dict,
        ) -> bool:
        """发送订单通知（卡片消息）"""
        order_no = data.get("order_no", "")
        status = data.get("status", "")
        status_text = {
            "pending": "待处理",
            "accepted": "已接单",
            "cooking": "烹饪中",
            "completed": "已完成",
            "cancelled": "已取消",
        }.get(status, status)

        user_name = data.get("user_name", "未知用户")
        items = data.get("items", [])
        ingredients = data.get("ingredients", [])
        meal_date = data.get("meal_date", "")
        meal_type = data.get("meal_type", "")
        dislikes = data.get("dislikes", [])
        allergies = data.get("allergies", [])

        meal_type_map = {
            "breakfast": "早餐",
            "lunch": "午餐",
            "dinner": "晚餐",
            "now": "现在就想吃",
        }
        meal_type_text = meal_type_map.get(meal_type, meal_type)
        meal_time_str = f"{meal_date} {meal_type_text}" if meal_date and meal_type else meal_date or meal_type or "未指定"

        elements = [
            {
                "tag": "div",
                "text": {
                    "tag": "lark_md",
                    "content": f"**订单号：** {order_no}　**状态：** {status_text}\n**点单人：** {user_name}",
                },
            },
            {
                "tag": "div",
                "text": {
                    "tag": "lark_md",
                    "content": f"**预计用餐时间：** {meal_time_str}",
                },
            },
        ]

        if items:
            dish_lines = "\n".join(f"- {item.get('name', '未知菜品')} x{item.get('quantity', 1)}" for item in items)
            elements.append({
                "tag": "div",
                "text": {
                    "tag": "lark_md",
                    "content": f"**菜品清单：**\n{dish_lines}",
                },
            })

        if ingredients:
            ing_lines = "、".join(f"{item.get('name', '')}{item.get('quantity', '')}{item.get('unit', '')}" for item in ingredients)
            elements.append({
                "tag": "div",
                "text": {
                    "tag": "lark_md",
                    "content": f"**食材清单：**\n{ing_lines}",
                },
            })

        if allergies:
            elements.append({
                "tag": "div",
                "text": {
                    "tag": "lark_md",
                    "content": f"🚨 **严格忌口：** {'、'.join(allergies)}",
                },
            })

        if dislikes:
            elements.append({
                "tag": "div",
                "text": {
                    "tag": "lark_md",
                    "content": f"⚠️ **不爱吃：** {'、'.join(dislikes)}",
                },
            })

        card_content = {
            "config": {
                "wide_screen_mode": True,
            },
            "header": {
                "title": {
                    "tag": "plain_text",
                    "content": f"📋 订单 {order_no}",
                },
                "template": "blue",
            },
            "elements": elements,
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