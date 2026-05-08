"""
家味 · Family Chef - 飞书集成
"""

import httpx
from typing import Optional
from app.config import settings


class FeishuClient:
    """飞书 API 客户端"""
    
    def __init__(self):
        self.app_id = settings.FEISHU_APP_ID
        self.app_secret = settings.FEISHU_APP_SECRET
        self.base_url = "https://open.feishu.cn/open-apis"
        self._token: Optional[str] = None
        self._token_expire: float = 0
    
    async def get_tenant_access_token(self) -> str:
        """获取 tenant_access_token"""
        if not self.app_id or not self.app_secret:
            raise ValueError("飞书配置未设置")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/auth/v3/tenant_access_token/internal",
                json={
                    "app_id": self.app_id,
                    "app_secret": self.app_secret,
                }
            )
            response.raise_for_status()
            data = response.json()
            if data.get("code") != 0:
                raise Exception(f"获取飞书 Token 失败: {data.get('msg')}")
            return data.get("tenant_access_token")
    
    async def send_message(
        self,
        user_open_id: str,
        title: str,
        content: str,
        order_no: Optional[str] = None,
    ) -> dict:
        """发送飞书消息（卡片消息）"""
        token = await self.get_tenant_access_token()
        
        # 构建卡片消息
        card_content = {
            "config": {"wide_screen_mode": True},
            "header": {
                "title": {"tag": "plain_text", "content": title},
                "template": "orange",
            },
            "elements": [
                {
                    "tag": "div",
                    "text": {"tag": "lark_md", "content": content},
                }
            ]
        }
        
        if order_no:
            card_content["elements"].append({
                "tag": "note",
                "elements": [
                    {
                        "tag": "plain_text",
                        "content": f"订单号：{order_no}",
                    }
                ],
            })
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/im/v1/messages",
                headers={"Authorization": f"Bearer {token}"},
                params={"receive_id_type": "open_id"},
                json={
                    "receive_id": user_open_id,
                    "msg_type": "interactive",
                    "content": str(card_content).replace("'", '"'),
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def bind_user(self, feishu_open_id: str, user_id: int) -> bool:
        """绑定飞书账号（需要调用用户服务更新）"""
        # 这里只是占位，实际绑定逻辑在 user_service 中
        return True


# 全局飞书客户端实例
feishu_client = FeishuClient()
