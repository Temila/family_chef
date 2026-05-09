"""
家味 · Family Chef - 文件上传模块测试
"""

import pytest
import io
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_upload_image_success(client: AsyncClient, admin_token: str):
    """测试成功上传图片"""
    # 创建一个简单的 PNG 文件内容 (1x1 pixel)
    import struct
    import zlib
    
    # Minimal valid PNG
    def create_minimal_png():
        signature = b'\x89PNG\r\n\x1a\n'
        # IHDR chunk
        ihdr_data = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
        ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
        ihdr = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc & 0xffffffff)
        # IDAT chunk
        raw_data = zlib.compress(b'\x00\x00\x00\x00')
        idat_crc = zlib.crc32(b'IDAT' + raw_data)
        idat = struct.pack('>I', len(raw_data)) + b'IDAT' + raw_data + struct.pack('>I', idat_crc & 0xffffffff)
        # IEND chunk
        iend_crc = zlib.crc32(b'IEND')
        iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc & 0xffffffff)
        return signature + ihdr + idat + iend
    
    png_content = create_minimal_png()
    
    response = await client.post(
        "/api/upload/image",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("test.png", io.BytesIO(png_content), "image/png")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "filename" in data
    assert "url" in data
    assert "size" in data


@pytest.mark.asyncio
async def test_upload_image_invalid_type(client: AsyncClient, admin_token: str):
    """测试上传不支持的文件类型"""
    response = await client.post(
        "/api/upload/image",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_upload_image_unauthorized(client: AsyncClient):
    """测试未认证上传"""
    response = await client.post(
        "/api/upload/image",
        files={"file": ("test.png", io.BytesIO(b"fake"), "image/png")},
    )
    assert response.status_code in [401, 403]
