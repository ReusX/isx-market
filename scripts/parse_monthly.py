#!/usr/bin/env python3
"""Parse one ISX monthly-report PDF into structured JSON.

Usage: parse_monthly.py path/to/2026-05.pdf [--out out.json]

The reports are bilingual but layout varies across years, so detection is
content-based rather than page-number based:

- companies   : the trading-bulletin tables — any table whose header row
                contains a "Code" column (English) plus company-name columns.
                Sector headers appear as "<Name> Sector" rows between groups.
- daily_index : the sessions table — a table with many dd/mm/yyyy rows and
                ISX60/ISX15 header columns.
- sectors     : aggregated from company rows per sector (robust across years,
                where the dedicated sector table layout changes).
- market_cap  : per-company market-value table (rows with a ticker code and a
                market-value column), aggregated by sector.

Whatever can't be found is reported in the "missing" list instead of failing —
older PDFs (2009-2015) won't have everything.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import warnings
from pathlib import Path

import pdfplumber

warnings.filterwarnings("ignore")

CODE_RE = re.compile(r"^[A-Z]{3,5}$")
DATE_RE = re.compile(r"^\d{1,2}/\d{1,2}/\d{4}$")
SECTOR_EN_RE = re.compile(r"([A-Za-z &]+?)\s*Sector", re.I)


def num(cell) -> float | None:
    """Parse a bulletin number: '6,397,067,985', '-18.73', '(1.5)', '-'."""
    if cell is None:
        return None
    s = str(cell).strip().replace(",", "").replace("\n", "")
    if s in ("", "-", "—", "--"):
        return None
    neg = s.startswith("(") and s.endswith(")")
    s = s.strip("()%")
    try:
        v = float(s)
    except ValueError:
        return None
    return -v if neg else v


def clean(cell) -> str:
    return re.sub(r"\s+", " ", str(cell or "")).strip()


AR_CHARS = re.compile(r"[؀-ۿ]")


def fix_arabic(text: str) -> str:
    """pdfplumber extracts Arabic glyphs in visual (reversed) order. Reversing
    recovers logical order well enough for matching/display; ligature-heavy
    words may still differ slightly, so the loader treats PDF Arabic names as
    a fallback, never overwriting curated names."""
    if not text or not AR_CHARS.search(text):
        return text
    return text[::-1]


def header_index(header: list, *needles: str) -> int | None:
    """Find the column whose header contains any needle (case-insensitive)."""
    for i, cell in enumerate(header):
        text = clean(cell).lower()
        if any(n.lower() in text for n in needles):
            return i
    return None


# ── companies (trading bulletin) ────────────────────────────────────────────

def parse_companies(pdf) -> list[dict]:
    out: dict[str, dict] = {}
    for page in pdf.pages:
        for table in page.extract_tables():
            if not table or len(table) < 3:
                continue
            hdr = table[0] if any("code" in clean(c).lower() for c in table[0]) else (
                table[1] if len(table) > 1 and any("code" in clean(c).lower() for c in table[1]) else None)
            if hdr is None:
                continue
            cols = {
                "name_en":  header_index(hdr, "company name"),
                "days":     header_index(hdr, "trading", "day"),
                "value":    header_index(hdr, "traded valu"),
                "volume":   header_index(hdr, "traded shares", "no. of shares", "مهسلاا ددع"),
                "trades":   header_index(hdr, "no. of", "trades"),
                "change":   header_index(hdr, "change"),
                "prev":     header_index(hdr, "previous"),
                "close":    header_index(hdr, "closing"),
                "avg":      header_index(hdr, "average"),
                "low":      header_index(hdr, "low"),
                "high":     header_index(hdr, "high"),
                "open":     header_index(hdr, "opening"),
                "code":     header_index(hdr, "code"),
            }
            if cols["code"] is None or cols["name_en"] is None:
                continue
            # the Arabic name is conventionally the last column
            ar_col = len(hdr) - 1
            sector = None
            for row in table:
                if row is hdr:
                    continue
                joined = " ".join(clean(c) for c in row)
                m = SECTOR_EN_RE.search(joined)
                if m and not CODE_RE.match(clean(row[cols["code"]])):
                    sector = m.group(1).strip()
                    continue
                code = clean(row[cols["code"]])
                if not CODE_RE.match(code):
                    continue
                rec = {
                    "ticker": code,
                    "name_en": clean(row[cols["name_en"]]),
                    "name_ar": fix_arabic(clean(row[ar_col])) if ar_col != cols["code"] else None,
                    "sector": sector,
                    "open":   num(row[cols["open"]])  if cols["open"]  is not None else None,
                    "high":   num(row[cols["high"]])  if cols["high"]  is not None else None,
                    "low":    num(row[cols["low"]])   if cols["low"]   is not None else None,
                    "avg":    num(row[cols["avg"]])   if cols["avg"]   is not None else None,
                    "close":  num(row[cols["close"]]) if cols["close"] is not None else None,
                    "prev_close": num(row[cols["prev"]]) if cols["prev"] is not None else None,
                    "change_pct": num(row[cols["change"]]) if cols["change"] is not None else None,
                    "trades": num(row[cols["trades"]]) if cols["trades"] is not None else None,
                    "volume": num(row[cols["volume"]]) if cols["volume"] is not None else None,
                    "value":  num(row[cols["value"]])  if cols["value"]  is not None else None,
                    "trading_days": num(row[cols["days"]]) if cols["days"] is not None else None,
                }
                # several bulletins repeat tickers (regular + second market);
                # keep the row with the most trading activity
                old = out.get(code)
                if old is None or (rec["volume"] or 0) > (old["volume"] or 0):
                    out[code] = rec
    return list(out.values())


# ── daily index (sessions table) ────────────────────────────────────────────

def parse_daily_index(pdf) -> list[dict]:
    best: list[dict] = []
    for page in pdf.pages[:20]:
        for table in page.extract_tables():
            if not table or len(table) < 5:
                continue
            hdr = table[0]
            i60 = header_index(hdr, "isx60", "isx 60")
            i15 = header_index(hdr, "isx15", "isx 15")
            # date column: detect from data rows
            date_col = None
            for ci in range(len(hdr)):
                if sum(1 for r in table[1:] if ci < len(r) and DATE_RE.match(clean(r[ci]))) >= 3:
                    date_col = ci
                    break
            if date_col is None or i60 is None:
                continue
            ivol  = header_index(hdr, "مهسلاا", "shares", "volume")
            ival  = header_index(hdr, "ةميقلا", "value")
            itrd  = header_index(hdr, "تاقفصلا", "trades")
            itrdc = header_index(hdr, "ةلوادتملا\nتاكرشلا", "traded com") or header_index(hdr, "ةلوادتملا")
            ilstc = header_index(hdr, "ةجردملا", "listed")
            rows = []
            for r in table[1:]:
                d = clean(r[date_col]) if date_col < len(r) else ""
                if not DATE_RE.match(d):
                    continue
                dd, mm, yy = d.split("/")
                rows.append({
                    "date": f"{yy}-{int(mm):02d}-{int(dd):02d}",
                    "isx60": num(r[i60]) if i60 is not None else None,
                    "isx15": num(r[i15]) if i15 is not None else None,
                    "volume": num(r[ivol]) if ivol is not None else None,
                    "value":  num(r[ival]) if ival is not None else None,
                    "trades": num(r[itrd]) if itrd is not None else None,
                    "traded_companies": num(r[itrdc]) if itrdc is not None else None,
                    "listed_companies": num(r[ilstc]) if ilstc is not None else None,
                })
            if len(rows) > len(best):
                best = rows
    return best


# ── market cap (per company → by sector) ────────────────────────────────────

def parse_market_cap(pdf, code_sector: dict[str, str]) -> list[dict]:
    caps: dict[str, float] = {}
    for page in pdf.pages:
        text = page.extract_text() or ""
        if "ةيقوسلا ةميقلا" not in text and "market value" not in text.lower():
            continue
        for table in page.extract_tables():
            if not table or len(table) < 3:
                continue
            # find the code column from data rows
            code_col = None
            for ci in range(len(table[1])):
                if sum(1 for r in table[1:] if ci < len(r) and CODE_RE.match(clean(r[ci]))) >= 3:
                    code_col = ci
                    break
            if code_col is None:
                continue
            for r in table[1:]:
                code = clean(r[code_col]) if code_col < len(r) else ""
                if not CODE_RE.match(code):
                    continue
                # market value = the largest numeric cell in the row
                nums = [num(c) for c in r]
                nums = [n for n in nums if n is not None]
                if nums:
                    caps[code] = max(nums)
    by_sector: dict[str, float] = {}
    for code, cap in caps.items():
        sector = code_sector.get(code) or "Unknown"
        by_sector[sector] = by_sector.get(sector, 0) + cap
    return [{"sector": s, "market_cap": v} for s, v in sorted(by_sector.items())]


# ── sectors (aggregated from company rows) ──────────────────────────────────

def aggregate_sectors(companies: list[dict]) -> list[dict]:
    agg: dict[str, dict] = {}
    for c in companies:
        s = c.get("sector") or "Unknown"
        a = agg.setdefault(s, {"sector": s, "volume": 0, "value": 0, "trades": 0, "traded_companies": 0})
        a["volume"] += c.get("volume") or 0
        a["value"] += c.get("value") or 0
        a["trades"] += c.get("trades") or 0
        if (c.get("volume") or 0) > 0:
            a["traded_companies"] += 1
    return sorted(agg.values(), key=lambda x: x["sector"])


def parse_pdf(path: Path) -> dict:
    m = re.match(r"(\d{4})-(\d{2})", path.stem)
    year, month = (int(m.group(1)), int(m.group(2))) if m else (None, None)

    with pdfplumber.open(path) as pdf:
        companies = parse_companies(pdf)
        daily = parse_daily_index(pdf)
        code_sector = {c["ticker"]: c["sector"] for c in companies if c.get("sector")}
        mcap = parse_market_cap(pdf, code_sector)

    sectors = aggregate_sectors(companies) if companies else []
    missing = [k for k, v in (
        ("companies", companies), ("daily_index", daily),
        ("sectors", sectors), ("market_cap_by_sector", mcap),
    ) if not v]

    return {
        "source": path.name,
        "year": year,
        "month": month,
        "companies": companies,
        "daily_index": daily,
        "sectors": sectors,
        "market_cap_by_sector": mcap,
        "missing": missing,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()

    result = parse_pdf(args.pdf)
    text = json.dumps(result, ensure_ascii=False, indent=1)
    if args.out:
        args.out.write_text(text)
        print(f"{args.pdf.name}: companies={len(result['companies'])} "
              f"daily={len(result['daily_index'])} sectors={len(result['sectors'])} "
              f"mcap={len(result['market_cap_by_sector'])} missing={result['missing']} → {args.out}")
    else:
        print(text)


if __name__ == "__main__":
    main()
