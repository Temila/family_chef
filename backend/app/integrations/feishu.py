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
        is_guest = data.get("is_guest", False)
        status = data.get("status", "")
        status_text = {
            "pending": "待处理",
            "accepted": "已接单",
            "cooking": "烹饪中",
            "completed": "已完成",
            "cancelled": "已取消",
        }.get(status, status)

        user_name = data.get("user_name", "未知用户")
        # 访客订单标注（D-09）
        if is_guest:
            user_name = "访客"
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

        # 访客订单使用橙色标题 + 【访客订单】标签（D-09）
        if is_guest:
            header_content = f"📋 订单 {order_no}【访客订单】"
            header_template = "orange"
        else:
            header_content = f"📋 订单 {order_no}"
            header_template = "blue"

        card_content = {
            "config": {
                "wide_screen_mode": True,
            },
            "header": {
                "title": {
                    "tag": "plain_text",
                    "content": header_content,
                },
                "template": header_template,
            },
            "elements": elements,
        }

        return await self.send_message(
            receive_id,
            "interactive",
            card_content,
        )

    async def send_wish_notification(
        self,
        receive_id: str,
        data: dict,
    ) -> bool:
        """发送愿望通知卡片（D-F01 独立方法 — 不复用订单通知）。

        支持三种通知类型：
        - new: 新愿望通知给厨师（D-F02）
        - edit: 提交者编辑了已认领愿望（D-F03）
        - cancel: 提交者撤销了已认领愿望（D-F03）

        安全设计（Pitfall 9 / Pattern 5）：
        - 所有用户可控字段（dish_name / submitter_name / note / reference_url /
          change_description / old_note / new_note）均使用 plain_text 渲染，
          避免 lark_md 注入链接/@提及/格式化。
        - 仅服务端构造的详情深链接使用 lark_md。
        - 备注超过 1000 字符时截断（A4 卡片容量上限防护）。
        """
        notification_type = data.get("notification_type", "new")
        wish_id = data["wish_id"]
        dish_name = str(data.get("dish_name") or "")
        detail_url = f"{settings.APP_URL.rstrip('/')}/wishes/{wish_id}"

        elements: list[dict] = []

        if notification_type == "new":
            header_content = "新愿望通知"
            # 基础字段（D-F02）
            fields = [
                ("愿望菜品", dish_name),
                ("提交者", str(data.get("submitter_name") or "未知用户")),
            ]
            # 可选字段：参考链接（仅当 truthy 时渲染）
            reference_url = data.get("reference_url")
            if reference_url:
                fields.append(("参考链接", str(reference_url)))
            # 可选字段：备注（仅当 truthy 时渲染）
            note = data.get("note")
            if note:
                fields.append(("备注", _truncate_note(str(note))))
        else:
            # edit / cancel（D-F03 愿望变更通知）
            header_content = "愿望变更通知"
            fields = [
                ("菜品", dish_name),
                ("通知类型", notification_type),
                ("变更说明", str(data.get("change_description") or "")),
            ]
            # 原备注：仅当 truthy 时渲染
            old_note = data.get("old_note")
            if old_note:
                fields.append(("原备注", _truncate_note(str(old_note))))
            # 新备注：仅当 note_changed 为真时渲染（Pitfall 9 已清空标记）
            if data.get("note_changed"):
                new_note = data.get("new_note")
                fields.append(("新备注", _truncate_note(str(new_note)) if new_note else "（已清空）"))

        # 构建元素列表 — 所有用户值用 plain_text（Pattern 5）
        for label, value in fields:
            elements.append({
                "tag": "div",
                "text": {
                    "tag": "plain_text",
                    "content": f"{label}：{value}",
                },
            })

        # 深链接 — 唯一使用 lark_md 的元素（服务端构造的 HTTP(S) 链接）
        elements.append({
            "tag": "div",
            "text": {
                "tag": "lark_md",
                "content": f"[查看详情]({detail_url})",
            },
        })

        card_content = {
            "config": {
                "wide_screen_mode": True,
            },
            "header": {
                "title": {
                    "tag": "plain_text",
                    "content": header_content,
                },
                "template": "blue",
            },
            "elements": elements,
        }

        return await self.send_message(receive_id, "interactive", card_content)

    async def bind_user(
        self,
        user_id: int,
        feishu_open_id: str,
    ) -> bool:
        """绑定飞书账号（更新用户表）"""
        # TODO: 实现用户表更新逻辑
        print(f"✅ 用户 {user_id} 绑定飞书账号 {feishu_open_id}")
        return True


def _truncate_note(text: str, limit: int = 1000) -> str:
    """截断备注文本至指定长度上限（Pitfall 9 A4 卡片容量防护）。

    超过 limit 的文本截断为前 limit 个字符并追加省略号。
    """
    if len(text) <= limit:
        return text
    return text[:limit] + "…"


# 全局飞书客户端实例
feishu_client = FeishuClient()