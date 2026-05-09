"""
家味 · Family Chef - 工具模块单元测试
"""

import pytest
from app.utils.response import ApiResponse, PaginatedResponse, ErrorResponse
from app.utils.pinyin import get_pinyin_initial, get_pinyin_full


# ===== Response 模型测试 =====

def test_api_response_defaults():
    """测试 ApiResponse 默认值"""
    resp = ApiResponse()
    assert resp.code == 200
    assert resp.message == "success"
    assert resp.data is None


def test_api_response_custom():
    """测试 ApiResponse 自定义值"""
    resp = ApiResponse(code=201, message="created", data={"id": 1})
    assert resp.code == 201
    assert resp.message == "created"
    assert resp.data == {"id": 1}


def test_paginated_response():
    """测试 PaginatedResponse"""
    resp = PaginatedResponse(total=100, page=1, page_size=20, items=[1, 2, 3])
    assert resp.total == 100
    assert resp.page == 1
    assert resp.page_size == 20
    assert len(resp.items) == 3


def test_error_response_defaults():
    """测试 ErrorResponse 默认值"""
    resp = ErrorResponse()
    assert resp.code == 400
    assert resp.message == "error"
    assert resp.detail is None


def test_error_response_custom():
    """测试 ErrorResponse 自定义值"""
    resp = ErrorResponse(code=500, message="server error", detail="内部错误")
    assert resp.code == 500
    assert resp.message == "server error"
    assert resp.detail == "内部错误"


# ===== Pinyin 工具测试 =====

def test_get_pinyin_initial_chinese():
    """测试中文拼音首字母"""
    result = get_pinyin_initial("麻婆豆腐")
    assert result == "MPDF"


def test_get_pinyin_initial_another():
    """测试另一个中文拼音首字母"""
    result = get_pinyin_initial("红烧肉")
    assert result == "HSR"


def test_get_pinyin_initial_mixed():
    """测试混合字符拼音首字母"""
    result = get_pinyin_initial("宫保鸡丁G")
    # 每个中文字取首字母，英文直接大写
    assert "G" in result
    assert len(result) > 0


def test_get_pinyin_initial_empty():
    """测试空字符串"""
    result = get_pinyin_initial("")
    assert result == ""


def test_get_pinyin_full_chinese():
    """测试完整拼音"""
    result = get_pinyin_full("麻婆豆腐")
    assert "ma" in result
    assert "po" in result
