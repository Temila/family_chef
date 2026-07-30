"""Phase 12 审计助手：仅用于本地开发环境创建一次性审计材料，不进入产品代码。

运行前置：cd backend && uv sync。
输出：把 JWT 与访客邀请 token 写入 /tmp/opencode/family-chef-audit.json，供后续脚本读取。
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BACKEND = os.environ.get("FAMILY_CHEF_API", "http://127.0.0.1:8000")
OUTPUT = Path(os.environ.get(
    "FAMILY_CHEF_AUDIT_OUT",
    "/tmp/opencode/family-chef-audit.json",
))
CHEF_USERNAME = os.environ.get("FAMILY_CHEF_AUDIT_CHEF", "testchef")
CHEF_PASSWORD = os.environ.get("FAMILY_CHEF_AUDIT_CHEF_PASSWORD", "testchef-pass")
USER_USERNAME = os.environ.get("FAMILY_CHEF_AUDIT_USER", "testuser")
USER_PASSWORD = os.environ.get("FAMILY_CHEF_AUDIT_USER_PASSWORD", "testuser-pass")


def http_post(path: str, payload: dict, token: str | None = None) -> dict:
    import urllib.request

    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(
        BACKEND + path,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=15) as response:  # noqa: S310
        return json.loads(response.read().decode("utf-8") or "{}")


def http_get(path: str, token: str | None = None) -> dict:
    import urllib.request

    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(BACKEND + path, headers=headers, method="GET")
    with urllib.request.urlopen(request, timeout=15) as response:  # noqa: S310
        return json.loads(response.read().decode("utf-8") or "{}")


def register_or_login(username: str, password: str, display_name: str) -> dict:
    import time

    for _ in range(5):
        try:
            return http_post("/api/auth/login", {"username": username, "password": password})
        except urllib.error.HTTPError as error:
            if error.code == 429:
                time.sleep(8)
                continue
            if error.code != 401:
                raise
            break
    try:
        http_post(
            "/api/auth/register",
            {"username": username, "password": password, "display_name": display_name},
        )
    except urllib.error.HTTPError as error:
        if error.code == 429:
            time.sleep(8)
        elif error.code not in (400, 409):
            raise
    for _ in range(5):
        try:
            return http_post("/api/auth/login", {"username": username, "password": password})
        except urllib.error.HTTPError as error:
            if error.code != 429:
                raise
            time.sleep(8)
    raise RuntimeError(f"Login for {username} never succeeded")


def promote_to_chef(admin_token: str, user_id: int) -> None:
    request = urllib.request.Request(  # noqa: S310
        f"{BACKEND}/api/users/{user_id}",
        data=json.dumps({"role": "chef"}).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {admin_token}"},
        method="PUT",
    )
    with urllib.request.urlopen(request, timeout=15) as response:  # noqa: S310
        response.read()


def ensure_chef(token: str) -> int:
    payload = http_get("/api/chefs", token)
    items = payload if isinstance(payload, list) else payload.get("items", [])
    for entry in items:
        if entry.get("username") == CHEF_USERNAME:
            return entry["id"]
    raise RuntimeError("Chef 仍未自动出现在 /api/chefs 列表中；手动检查。")


def main() -> int:
    import time

    import urllib.request  # noqa: F401  (also reused via http_get helpers)

    admin = register_or_login("admin", "admin", "管理员")
    time.sleep(8)
    admin_token = admin["access_token"]
    chef = register_or_login(CHEF_USERNAME, CHEF_PASSWORD, "测试厨师")
    time.sleep(8)
    user = register_or_login(USER_USERNAME, USER_PASSWORD, "测试用户")

    promote_to_chef(admin_token, chef["user"]["id"])
    time.sleep(8)
    chef = http_post("/api/auth/login", {"username": CHEF_USERNAME, "password": CHEF_PASSWORD})

    chef_id = ensure_chef(chef["access_token"])

    invitation = http_post(
        "/api/guest/invitations",
        {"chef_id": chef_id},
        token=user["access_token"],
    )

    payload = {
        "auditDate": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "auth": {
            "admin": {"username": "admin", "password": "admin"},
            "user": {"username": USER_USERNAME, "password": USER_PASSWORD, "token": user["access_token"]},
            "chef": {"username": CHEF_USERNAME, "password": CHEF_PASSWORD, "token": chef["access_token"], "id": chef_id},
        },
        "guest": {
            "invitation": invitation,
        },
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    print(f"Audit payload written to {OUTPUT}")
    print(f"User token expires at sub: {user['access_token'].count('.')}-part JWT")
    print(f"Guest invitation token: {invitation['token']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
