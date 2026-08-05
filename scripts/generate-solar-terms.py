#!/usr/bin/env python3
"""
生成 2020–2099 节气时刻表（立春/立夏/立秋/立冬） -> frontend/src/theme/solar-terms.js
====================================================================

仅供开发期运行（dev-time generator）。运行时绝不在前端 import Skyfield，
生成的常量以 ES module 形式直接嵌入前端。

执行方式（需要本机已安装 uv）::

    uv run --with skyfield python scripts/generate-solar-terms.py

数据来源
--------
- Skyfield 1.54 (brandon-rhodes/python-skyfield, MIT)
- 模块 ``skyfield.almanac_east_asia`` 的 ``solar_terms(ephemeris)`` 函数：
  基于太阳视黄经每 15° 一个节气，返回 0..23 整数。
- 节气中文名常量 ``almanac_east_asia.SOLAR_TERMS_ZHS``（24 项）：
  - 3  = 立夏
  - 9  = 立秋
  - 15 = 立冬
  - 21 = 立春
- JPL 星历 ``de440s.bsp``（2020-2099 全覆盖；skyfield 首次调用 load() 时自动下载）。

覆盖率
------
- 输入区间：2019-12-15 ~ 2099-12-31 UTC
- 输出：80 年 × 4 节气 = 320 条 ISO 8601 (UTC) 时间戳
- 节气时间以 UTC ISO 字符串存储；前端解析时按用户本地时区计算本地日期，
  从而保证"立春"在该用户所在时区的实际日期与节气定义一致（避免 UTC 字符串比较
  导致跨时区错日）。

确定性
------
- 数据按年升序、节气索引升序（lichun → lixia → liqiu → lidong）写出。
- ``json.dumps(..., sort_keys=False, indent=2)`` 配合 Python 3.7+ dict 有序保证
  每次输出字节稳定。文件末尾保留一个换行。
"""

from __future__ import annotations

import sys
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path

from skyfield.api import Loader, load
from skyfield import almanac
from skyfield import almanac_east_asia as almanac_ea

# ---- 常量 ----------------------------------------------------------------

# 仅抽取四立：立春 / 立夏 / 立秋 / 立冬（中文节气索引）
TARGET_TERMS: "OrderedDict[str, int]" = OrderedDict([
    ("lichun", 21),  # 立春
    ("lixia", 3),   # 立夏
    ("liqiu", 9),   # 立秋
    ("lidong", 15), # 立冬
])

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "frontend" / "src" / "theme" / "solar-terms.js"
TARGET_YEARS = range(2020, 2100)  # 2020..2099 inclusive, exactly 80 years
SEARCH_START_UTC = (2019, 12, 15, 0, 0, 0)
SEARCH_END_UTC = (2099, 12, 31, 23, 59, 59)


# ---- 主流程 --------------------------------------------------------------

def main() -> int:
    ts = load.timescale()
    loader = Loader("./skyfield-data", verbose=False)
    ephemeris = loader("de440s.bsp")  # JPL DE440S, 1849-12-25..2150-01-21
    solar_term_at = almanac_ea.solar_terms(ephemeris)

    t0 = ts.utc(*SEARCH_START_UTC)
    t1 = ts.utc(*SEARCH_END_UTC)
    times, indices = almanac.find_discrete(t0, t1, solar_term_at)

    target_indices = set(TARGET_TERMS.values())
    # key: year(int) -> OrderedDict(term -> ISO UTC string)
    by_year: "dict[int, OrderedDict[str, str]]" = {}
    for ti, idx in zip(times, indices):
        idx = int(idx)
        if idx not in target_indices:
            continue
        utc_dt: datetime = ti.utc_datetime()
        if utc_dt.tzinfo is None:
            utc_dt = utc_dt.replace(tzinfo=timezone.utc)
        else:
            utc_dt = utc_dt.astimezone(timezone.utc)
        # 仅保留 2020..2099
        if utc_dt.year < 2020 or utc_dt.year > 2099:
            continue
        # 反查 term 名字
        term_key = next(name for name, value in TARGET_TERMS.items() if value == idx)
        year_bucket = by_year.setdefault(utc_dt.year, OrderedDict())
        # 同一节气同年不应该出现两次；防御性检查
        if term_key in year_bucket:
            raise RuntimeError(
                f"Duplicate {term_key} for year {utc_dt.year}: "
                f"existing={year_bucket[term_key]} new={utc_dt.isoformat()}"
            )
        year_bucket[term_key] = utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    # 完整性校验：80 年 × 4 = 320
    missing: list[tuple[int, str]] = []
    for year in TARGET_YEARS:
        bucket = by_year.get(year, OrderedDict())
        for term in TARGET_TERMS:
            if term not in bucket:
                missing.append((year, term))
    if missing:
        sys.stderr.write(
            f"ERROR: missing {len(missing)} term entries; first 5: {missing[:5]}\n"
        )
        return 1

    # 写出 ES module —— JavaScript 字面量（数值 year 键不引号），确定性 2-space 缩进
    lines = ["export const SOLAR_TERMS = {"]
    for year in TARGET_YEARS:
        bucket = by_year[year]
        lines.append(f"  {year}: {{")
        for term in TARGET_TERMS:
            lines.append(f"    {term}: '{bucket[term]}',")
        lines[-1] = lines[-1].rstrip(",")  # 末项去尾逗号
        lines.append("  },")
    lines[-1] = lines[-1].rstrip(",")  # 末年去尾逗号
    lines.append("};")
    body = "\n".join(lines) + "\n"

    header = (
        "/**\n"
        " * 节气时刻表（自动生成，请勿手工修改）。\n"
        " *\n"
        " * 数据源：太阳视黄经每 15° 一节气（开发期脚本基于 Python 3.11 + JPL DE440S 星历生成）\n"
        " * 星历：JPL DE440S (de440s.bsp, 1849-12-25 ~ 2150-01-21)\n"
        " * 覆盖范围：2020–2099 年，每年的 立春/立夏/立秋/立冬 四个节气\n"
        " * 时间戳格式：UTC ISO 8601（前端按用户本地时区换算成 Y/M/D 比较）\n"
        " *\n"
        " * 重新生成指令见 scripts/generate-solar-terms.py 文件头注释。\n"
        " */\n\n"
    )
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(header + body, encoding="utf-8", newline="\n")

    total = sum(len(b) for b in by_year.values())
    print(
        f"wrote {OUTPUT_PATH.relative_to(Path.cwd())} "
        f"with {len(by_year)} years x {len(TARGET_TERMS)} terms = {total} timestamps"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())