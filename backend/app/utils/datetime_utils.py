"""统一的时间时钟辅助（Phase 6）

本模块提供唯一的 UTC-naive 时钟辅助 ``naive_utc_now``。
Phase 6 所有通知时间戳写入（``last_status_change_at``、``submitter_last_viewed_at``）
必须通过该函数，与 SQLite ``CURRENT_TIMESTAMP`` 保持同一 UTC 时区语义，
从而避免本地时区（UTC+08）与数据库默认值之间做严格 ``>`` 比较时出现偏差。
"""
from datetime import UTC, datetime


def naive_utc_now() -> datetime:
    """返回与 SQLite CURRENT_TIMESTAMP 同一时区语义的无时区 UTC 时间。

    返回值无 ``tzinfo``，保留微秒精度，便于与数据库默认时间戳做严格比较。
    所有 Phase 6 通知时间戳写入路径必须调用此函数。
    """
    return datetime.now(UTC).replace(tzinfo=None)
