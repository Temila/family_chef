"""家味 · Family Chef - Phase 6 愿望通知时间戳迁移往返测试

在全新的临时 SQLite DB 上构造前驱版本（72b56533bb6d）的 wishes 表，
植入一条遗留愿望，然后验证 upgrade → downgrade → upgrade 往返全程
保留行数据、4 个索引、3 个外键，且两个新列的默认值/可空性正确。

参考：
- 06-RESEARCH.md Pattern 2（batch recreate）与 Migration Round-Trip 章节
- SQLite ALTER TABLE 限制（ADD COLUMN 不支持 CURRENT_TIMESTAMP 默认值）
"""

import sqlite3
from pathlib import Path

from alembic import command
from alembic.config import Config


# Alembic 配置文件路径（相对 backend/ 目录）
_ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"

# 已知 wishes 表的 4 个索引（迁移 72b56533bb6d 创建）
_EXPECTED_INDEXES = {
    "ix_wishes_user_id",
    "ix_wishes_status",
    "ix_wishes_claimed_by_chef_id",
    "ix_wishes_status_chef",
}


def _make_alembic_config(db_path: Path) -> Config:
    """构造指向临时 DB 的 Alembic 配置"""
    cfg = Config(str(_ALEMBIC_INI))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_path}")
    return cfg


def _fresh_temp_db(tmp_path: Path) -> Path:
    """构造全新的临时 SQLite DB，创建迁移 72b56533bb6d 时的 wishes 前驱模式，
    植入一条遗留愿望，并在 alembic 版本表中标记为 72b56533bb6d。

    直接用原始 SQL 创建前驱模式（而非跑完整迁移链），因为中间迁移
    f94f55868e87 在 SQLite 上存在 batch 约束 bug（见 deferred-items.md）。
    stamp 后，``upgrade head`` 只会应用本次新增的 Phase 6 迁移。

    返回临时 DB 的文件路径。每次调用都使用 pytest 的 tmp_path，绝不复用。
    """
    db_path = tmp_path / "test_wish_notify.db"

    # 1. 直接用原始 SQL 创建迁移 72b56533bb6d 时的前驱模式
    conn = sqlite3.connect(str(db_path))
    try:
        # users 表（满足 wishes.user_id 和 claimed_by_chef_id 外键）
        conn.execute(
            "CREATE TABLE users ("
            "id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "
            "username VARCHAR(50) NOT NULL UNIQUE, "
            "password_hash VARCHAR(255) NOT NULL, "
            "display_name VARCHAR(100), "
            "email VARCHAR(100), "
            "avatar_url VARCHAR(500), "
            "role VARCHAR(20) NOT NULL, "
            "feishu_open_id VARCHAR(100), "
            "is_active BOOLEAN NOT NULL, "
            "force_pwd_change BOOLEAN NOT NULL, "
            "created_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP), "
            "updated_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP))"
        )
        # dishes 表（满足 wishes.related_dish_id 外键）
        conn.execute(
            "CREATE TABLE dishes ("
            "id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "
            "name VARCHAR(100) NOT NULL)"
        )
        # wishes 表（迁移 72b56533bb6d 的确切前驱模式，11 列 + 3 外键）
        conn.execute(
            "CREATE TABLE wishes ("
            "id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "
            "user_id INTEGER NOT NULL, "
            "dish_name VARCHAR(100) NOT NULL, "
            "reference_url VARCHAR(500), "
            "note TEXT, "
            "status VARCHAR(20) NOT NULL DEFAULT '待处理', "
            "claimed_by_chef_id INTEGER, "
            "related_dish_id INTEGER, "
            "reject_reason TEXT, "
            "created_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP), "
            "updated_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP), "
            "FOREIGN KEY (user_id) REFERENCES users (id), "
            "FOREIGN KEY (claimed_by_chef_id) REFERENCES users (id), "
            "FOREIGN KEY (related_dish_id) REFERENCES dishes (id))"
        )
        # 4 个索引（迁移 72b56533bb6d 创建）
        conn.execute("CREATE INDEX ix_wishes_user_id ON wishes (user_id)")
        conn.execute("CREATE INDEX ix_wishes_status ON wishes (status)")
        conn.execute("CREATE INDEX ix_wishes_claimed_by_chef_id ON wishes (claimed_by_chef_id)")
        conn.execute("CREATE INDEX ix_wishes_status_chef ON wishes (status, claimed_by_chef_id)")

        # 植入遗留数据
        conn.execute(
            "INSERT INTO users (id, username, password_hash, role, is_active, force_pwd_change) "
            "VALUES (1, 'legacy_submitter', 'legacy_hash', 'user', 1, 0)"
        )
        conn.execute(
            "INSERT INTO wishes (id, user_id, dish_name, status, created_at, updated_at) "
            "VALUES (1, 1, 'legacy', '待处理', '2026-01-01 00:00:00', '2026-01-01 00:00:00')"
        )
        conn.commit()
    finally:
        conn.close()

    # 2. 标记 DB 为 72b56533bb6d，使 upgrade head 只应用新迁移
    cfg = _make_alembic_config(db_path)
    command.stamp(cfg, "72b56533bb6d")

    return db_path


def _wishes_row_count(conn: sqlite3.Connection) -> int:
    cur = conn.execute("SELECT COUNT(*) FROM wishes")
    return cur.fetchone()[0]


def _wishes_column_names(conn: sqlite3.Connection) -> set[str]:
    cur = conn.execute("PRAGMA table_info(wishes)")
    return {row[1] for row in cur.fetchall()}


def _wishes_column_info(conn: sqlite3.Connection) -> dict[str, dict]:
    """返回 {column_name: {notnull, dflt_value}}"""
    cur = conn.execute("PRAGMA table_info(wishes)")
    result = {}
    for row in cur.fetchall():
        # row: (cid, name, type, notnull, dflt_value, pk)
        result[row[1]] = {"notnull": row[3], "dflt_value": row[4]}
    return result


def _wishes_index_names(conn: sqlite3.Connection) -> set[str]:
    cur = conn.execute("PRAGMA index_list(wishes)")
    return {row[1] for row in cur.fetchall()}


def _fk_check(conn: sqlite3.Connection) -> list:
    cur = conn.execute("PRAGMA foreign_key_check(wishes)")
    return cur.fetchall()


def _legacy_wish_timestamps(conn: sqlite3.Connection) -> tuple:
    """返回 (last_status_change_at, submitter_last_viewed_at)"""
    cur = conn.execute(
        "SELECT last_status_change_at, submitter_last_viewed_at FROM wishes WHERE id = 1"
    )
    return cur.fetchone()


def test_upgrade_preserves_legacy_wish_and_schema(tmp_path: Path):
    """升级后：遗留愿望保留、两个新列存在（默认值/可空正确）、4 索引 3 外键完好"""
    db_path = _fresh_temp_db(tmp_path)

    # ========== 基线检查（升级前）==========
    conn = sqlite3.connect(str(db_path))
    try:
        cols = _wishes_column_names(conn)
        assert _wishes_row_count(conn) == 1, "基线：wishes 应有 1 行"
        assert "last_status_change_at" not in cols, "基线：不应有 last_status_change_at"
        assert "submitter_last_viewed_at" not in cols, "基线：不应有 submitter_last_viewed_at"
        assert _wishes_index_names(conn) == _EXPECTED_INDEXES, "基线：应有 4 个已知索引"
        assert _fk_check(conn) == [], "基线：外键检查应为空"
    finally:
        conn.close()

    # ========== 升级到 head ==========
    cfg = _make_alembic_config(db_path)
    command.upgrade(cfg, "head")

    # ========== 升级后检查 ==========
    conn = sqlite3.connect(str(db_path))
    try:
        cols = _wishes_column_names(conn)
        info = _wishes_column_info(conn)

        assert _wishes_row_count(conn) == 1, "升级后：wishes 行数仍应为 1"

        # 两个新列存在
        assert "last_status_change_at" in cols, "升级后：应有 last_status_change_at"
        assert "submitter_last_viewed_at" in cols, "升级后：应有 submitter_last_viewed_at"

        # last_status_change_at: nullable, 有非 NULL 默认值（CURRENT_TIMESTAMP）
        assert info["last_status_change_at"]["notnull"] == 0, (
            "last_status_change_at 必须可空"
        )
        assert info["last_status_change_at"]["dflt_value"] is not None, (
            "last_status_change_at 必须有非 NULL 默认值"
        )
        assert "CURRENT_TIMESTAMP" in str(
            info["last_status_change_at"]["dflt_value"]
        ).upper(), "last_status_change_at 默认值应为 CURRENT_TIMESTAMP"

        # submitter_last_viewed_at: nullable, 无默认值
        assert info["submitter_last_viewed_at"]["notnull"] == 0, (
            "submitter_last_viewed_at 必须可空"
        )
        assert info["submitter_last_viewed_at"]["dflt_value"] is None, (
            "submitter_last_viewed_at 不应有默认值"
        )

        # 4 个索引完好
        assert _wishes_index_names(conn) == _EXPECTED_INDEXES, (
            "升级后：4 个索引应完好"
        )

        # 3 个外键完好（无违反）
        assert _fk_check(conn) == [], "升级后：外键检查应为空"

        # 遗留愿望：last_status_change_at 非 NULL（被 server_default 回填），submitter_last_viewed_at 为 NULL
        change_at, viewed_at = _legacy_wish_timestamps(conn)
        assert change_at is not None, "遗留愿望 last_status_change_at 应非 NULL（被回填）"
        assert viewed_at is None, "遗留愿望 submitter_last_viewed_at 应为 NULL"
    finally:
        conn.close()


def test_downgrade_then_upgrade_round_trip(tmp_path: Path):
    """降级 → 升级往返：遗留愿望保留、列/索引/外键在每个检查点正确"""
    db_path = _fresh_temp_db(tmp_path)

    # 先升级到 head
    cfg = _make_alembic_config(db_path)
    command.upgrade(cfg, "head")

    # 确认升级后两个新列存在
    conn = sqlite3.connect(str(db_path))
    assert "last_status_change_at" in _wishes_column_names(conn)
    assert "submitter_last_viewed_at" in _wishes_column_names(conn)
    conn.close()

    # ========== 降级一级 ==========
    command.downgrade(cfg, "-1")

    conn = sqlite3.connect(str(db_path))
    try:
        cols = _wishes_column_names(conn)
        assert _wishes_row_count(conn) == 1, "降级后：行数仍应为 1"
        assert "last_status_change_at" not in cols, "降级后：应移除 last_status_change_at"
        assert "submitter_last_viewed_at" not in cols, "降级后：应移除 submitter_last_viewed_at"
        assert _wishes_index_names(conn) == _EXPECTED_INDEXES, "降级后：4 个索引应完好"
        assert _fk_check(conn) == [], "降级后：外键检查应为空"
    finally:
        conn.close()

    # ========== 再次升级到 head ==========
    command.upgrade(cfg, "head")

    conn = sqlite3.connect(str(db_path))
    try:
        cols = _wishes_column_names(conn)
        info = _wishes_column_info(conn)

        assert _wishes_row_count(conn) == 1, "再升级后：行数仍应为 1"
        assert "last_status_change_at" in cols, "再升级后：应恢复 last_status_change_at"
        assert "submitter_last_viewed_at" in cols, "再升级后：应恢复 submitter_last_viewed_at"
        assert info["last_status_change_at"]["dflt_value"] is not None, (
            "再升级后：last_status_change_at 应有非 NULL 默认值"
        )
        assert info["submitter_last_viewed_at"]["dflt_value"] is None, (
            "再升级后：submitter_last_viewed_at 应无默认值"
        )
        assert _wishes_index_names(conn) == _EXPECTED_INDEXES, "再升级后：4 个索引应完好"
        assert _fk_check(conn) == [], "再升级后：外键检查应为空"

        # 遗留愿望仍保留，last_status_change_at 非 NULL
        change_at, viewed_at = _legacy_wish_timestamps(conn)
        assert change_at is not None, "再升级后：遗留愿望 last_status_change_at 应非 NULL"
        assert viewed_at is None, "再升级后：遗留愿望 submitter_last_viewed_at 应为 NULL"
    finally:
        conn.close()
