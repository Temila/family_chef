"""家味 · Family Chef - Phase 6 时间时钟辅助与配置测试"""

import time

import pytest

from app.utils.datetime_utils import naive_utc_now


# =============================================================================
# naive_utc_now 行为 (Pattern 1: 统一 UTC-naive 时钟)
# =============================================================================

def test_naive_utc_now_returns_naive_datetime():
    """返回值必须无 tzinfo，与 SQLite CURRENT_TIMESTAMP 同一时区语义"""
    result = naive_utc_now()
    assert result.tzinfo is None, "naive_utc_now() 返回值必须无时区信息"


def test_naive_utc_now_non_decreasing_pair():
    """连续两次调用必须返回严格非递减对（保留微秒精度）"""
    first = naive_utc_now()
    # 微小间隔确保不依赖系统时钟精度
    time.sleep(0.001)
    second = naive_utc_now()
    assert second >= first, (
        f"连续两次调用必须非递减: first={first}, second={second}"
    )


def test_naive_utc_now_returns_datetime():
    """返回值是 datetime.datetime 实例"""
    from datetime import datetime

    assert isinstance(naive_utc_now(), datetime)


# =============================================================================
# Settings.APP_URL 配置 (Pitfall 8: 深链基址 URL)
# =============================================================================

def test_app_url_uses_yaml_value_when_present():
    """当 YAML 提供 app.url 时，Settings.APP_URL 必须读取该值"""
    from app.config import Settings

    s = Settings({"app": {"url": "https://x.example"}})
    assert s.APP_URL == "https://x.example"


def test_app_url_defaults_to_placeholder():
    """当 YAML 未提供 app.url 时，默认值必须是占位地址"""
    from app.config import Settings

    s = Settings({})
    assert s.APP_URL == "https://family-chef.app"


# =============================================================================
# Wish 模型新增列 (D-M01)
# =============================================================================

def test_wish_model_exposes_notification_columns():
    """Wish 模型必须暴露 last_status_change_at 和 submitter_last_viewed_at 列"""
    from app.models.wish import Wish

    assert hasattr(Wish, "last_status_change_at"), "Wish 缺少 last_status_change_at 列"
    assert hasattr(Wish, "submitter_last_viewed_at"), "Wish 缺少 submitter_last_viewed_at 列"


def test_wish_last_status_change_at_has_server_default():
    """last_status_change_at 必须带有 server_default=func.now() 以便 D-M01 创建时自动填充"""
    from app.models.wish import Wish

    col = Wish.__table__.columns["last_status_change_at"]
    assert col.nullable is True, "last_status_change_at 必须可空"
    assert col.server_default is not None, (
        "last_status_change_at 必须有 server_default（创建时自动填充）"
    )


def test_wish_submitter_last_viewed_at_nullable_without_default():
    """submitter_last_viewed_at 必须可空且无默认值（初始 NULL）"""
    from app.models.wish import Wish

    col = Wish.__table__.columns["submitter_last_viewed_at"]
    assert col.nullable is True, "submitter_last_viewed_at 必须可空"
    assert col.server_default is None, (
        "submitter_last_viewed_at 不应有 server_default（初始 NULL）"
    )
