#!/usr/bin/env python3
"""Parse the foreign-investor sheet of an ISX daily workbook into per-company,
per-side (buy/sell) flow rows.

The sheet lists, for each session, shares BOUGHT by non-Iraqis (المشتراة /
أوامر الشراء = inflow) and SOLD by non-Iraqis (المباعة / أوامر البيع =
outflow), each broken down by market (نظامي / ثاني / غير مفصحة) and sector.
Layout is identical across eras; only the sheet title and the buy/sell section
labels changed:

  2010–~2017  sheet "نشرة التداول لغير العراقيين"  buy "أوامر الشراء"  sell "أوامر البيع"
  2018–2020   sheet "الاجانب"                        buy "المشتراة"      sell "المباعة"
  2021–today  sheet "اجانب"                          buy "المشتراة"      sell "المباعة"

Every data row is: اسم الشركة | رمز الشركة | الصفقات | الاسهم المتداولة | القيمة المتداولة
(name | TICKER | trades | volume | value). Sector dividers and total rows carry
no ticker, so a ticker-shaped cell is what marks a real company row.

Output: list of {date, ticker, side, trades, volume, value}, summed across
markets/sectors so each (ticker, side) appears once per day.

Usage: parse_foreign_company.py path/to/2026-06-08.xlsx
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import pandas as pd

CODE_RE = re.compile(r"^[A-Z]{3,5}$")

# Section-label keywords. Order matters only for readability; we test both.
_BUY_KW = ("المشتراة", "المشتراه", "الشراء")   # foreign buying  → inflow
_SELL_KW = ("المباعة", "المباعه", "البيع")      # foreign selling → outflow

# Sheet-name keywords across eras.
_SHEET_KW = ("اجانب", "أجانب", "العراقيين")


def _num(v) -> float | None:
    if v is None:
        return None
    s = str(v).strip().replace(",", "").replace("،", "")
    if not s or s in ("nan", "ـــــ", "-"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _find_sheet(xl: pd.ExcelFile) -> str | None:
    for s in xl.sheet_names:
        if any(k in s for k in _SHEET_KW):
            return s
    return None


def parse_foreign_company(path: Path) -> list[dict]:
    m = re.match(r"(\d{4}-\d{2}-\d{2})", path.stem)
    date = m.group(1) if m else None
    if not date:
        return []

    try:
        xl = pd.ExcelFile(path)
    except Exception:
        return []
    sheet = _find_sheet(xl)
    if not sheet:
        return []
    df = xl.parse(sheet, header=None)

    # Aggregate per (ticker, side); a company can recur across markets/sectors.
    agg: dict[tuple[str, str], dict] = {}
    side: str | None = None

    for _, row in df.iterrows():
        cells = [str(v) for v in row.tolist()]
        line = " ".join(c for c in cells if c and c != "nan")
        if not line:
            continue

        # A section header flips the active side. Test sell first because the
        # word البيع never appears in a buy header but الشراء could be matched
        # loosely; the explicit keyword sets are disjoint so order is safe.
        if any(k in line for k in _BUY_KW) and not any(k in line for k in _SELL_KW):
            side = "buy"
            continue
        if any(k in line for k in _SELL_KW) and not any(k in line for k in _BUY_KW):
            side = "sell"
            continue
        if side is None:
            continue

        # Locate the ticker cell; everything else (sector dividers, subtotals,
        # the column-header row) lacks an A–Z code and is skipped naturally.
        tick_i = next((i for i, c in enumerate(cells) if CODE_RE.match(c.strip())), None)
        if tick_i is None:
            continue
        ticker = cells[tick_i].strip()

        rest = [_num(c) for c in cells[tick_i + 1:]]
        rest = [n for n in rest if n is not None]
        if len(rest) < 3:
            continue
        trades, volume, value = rest[0], rest[1], rest[2]

        key = (ticker, side)
        e = agg.get(key)
        if e is None:
            agg[key] = {"date": date, "ticker": ticker, "side": side,
                        "trades": trades, "volume": volume, "value": value}
        else:
            e["trades"] = (e["trades"] or 0) + (trades or 0)
            e["volume"] = (e["volume"] or 0) + (volume or 0)
            e["value"] = (e["value"] or 0) + (value or 0)

    out = list(agg.values())
    for r in out:
        r["trades"] = int(r["trades"]) if r["trades"] is not None else None
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx", type=Path)
    args = ap.parse_args()
    rows = parse_foreign_company(args.xlsx)
    print(json.dumps(rows, ensure_ascii=False, indent=1))
    print(f"\n{args.xlsx.name}: {len(rows)} (ticker,side) rows", file=sys.stderr)


if __name__ == "__main__":
    main()
