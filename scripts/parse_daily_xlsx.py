#!/usr/bin/env python3
"""Parse one ISX daily-report workbook into per-company rows.

Usage: parse_daily_xlsx.py path/to/2026-06-10.xlsx [--out out.json]

The session date comes from the filename (YYYY-MM-DD.{xls,xlsx}, as written
by the daily download step). The trading bulletin is the sheet whose header
row contains "رمز الشركة"; columns are matched by header keyword so older
workbooks with shifted layouts still parse.

Output JSON: {date, rows: [{ticker, date, open, high, low, close,
                            volume, value, trades}], missing: [...]}
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import pandas as pd

from parse_monthly import CODE_RE, num


def _value_right_of(row: list, label_idx: int):
    """First parseable number to the right of a labeled cell."""
    for v in row[label_idx + 1:]:
        n = num(v)
        if n is not None:
            return n
    return None


def extract_index(xl: pd.ExcelFile, date: str | None) -> dict | None:
    """Pull ISX60/ISX15 and session totals from the المؤشرات الكلية sheet."""
    sheet = next((s for s in xl.sheet_names if "المؤشرات" in s), None)
    if not sheet:
        return None
    df = xl.parse(sheet, header=None)
    out: dict = {"date": date, "isx60": None, "isx15": None, "volume": None,
                 "value": None, "trades": None, "traded_companies": None,
                 "listed_companies": None}
    for _, row in df.iterrows():
        cells = [str(v) for v in row.tolist()]
        for i, cell in enumerate(cells):
            if "المؤشر" in cell and "60" in cell and "السابق" not in cell:
                out["isx60"] = out["isx60"] or _value_right_of(cells, i)
            elif "المؤشر" in cell and "15" in cell and "السابق" not in cell:
                out["isx15"] = out["isx15"] or _value_right_of(cells, i)
            elif "الاسهم المتداولة" in cell:
                out["volume"] = out["volume"] or _value_right_of(cells, i)
            elif "قيمة الأسهم" in cell or "قيمة الاسهم" in cell:
                out["value"] = out["value"] or _value_right_of(cells, i)
            elif cell.strip().startswith("صفقات"):
                out["trades"] = out["trades"] or _value_right_of(cells, i)
            elif cell.strip().startswith("الشركات المتداولة"):
                out["traded_companies"] = out["traded_companies"] or _value_right_of(cells, i)
            elif cell.strip().startswith("الشركات المدرجة"):
                out["listed_companies"] = out["listed_companies"] or _value_right_of(cells, i)
    return out if out["isx60"] is not None else None


def parse_daily(path: Path) -> dict:
    m = re.match(r"(\d{4}-\d{2}-\d{2})", path.stem)
    date = m.group(1) if m else None

    xl = pd.ExcelFile(path)
    rows: list[dict] = []
    for sheet in xl.sheet_names:
        df = xl.parse(sheet, header=None)
        hdr_i = next((i for i, r in df.iterrows()
                      if any("رمز الشركة" in str(v) for v in r)), None)
        if hdr_i is None:
            continue
        hdr = [str(v) for v in df.iloc[hdr_i]]

        def col(*needles):
            for i, h in enumerate(hdr):
                if any(n in h for n in needles):
                    return i
            return None

        c = {
            "code":   col("رمز"),
            "open":   col("افتتاح"),
            "high":   col("اعلى"),
            "low":    col("ادنى"),
            "close":  col("سعر الاغلاق", "الاغلاق"),
            "trades": col("الصفقات"),
            "volume": col("الاسهم المتداولة"),
            "value":  col("القيمة المتداولة"),
        }
        if c["code"] is None or c["close"] is None:
            continue
        for _, row in df.iloc[hdr_i + 1:].iterrows():
            cells = [str(v) for v in row]
            code = cells[c["code"]].strip() if c["code"] < len(cells) else ""
            if not CODE_RE.match(code):
                continue
            rec = {"ticker": code, "date": date}
            for key in ("open", "high", "low", "close", "trades", "volume", "value"):
                rec[key] = num(cells[c[key]]) if c[key] is not None else None
            rows.append(rec)
        if rows:
            break  # the first bulletin sheet is the regular-market one we want

    index = extract_index(xl, date)
    return {
        "date": date,
        "rows": rows,
        "index": index,
        "missing": ([] if rows else ["bulletin"])
                 + ([] if date else ["date"])
                 + ([] if index else ["index"]),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx", type=Path)
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()

    result = parse_daily(args.xlsx)
    text = json.dumps(result, ensure_ascii=False, indent=1)
    if args.out:
        args.out.write_text(text)
        print(f"{args.xlsx.name}: rows={len(result['rows'])} missing={result['missing']}")
    else:
        print(text)


if __name__ == "__main__":
    main()
