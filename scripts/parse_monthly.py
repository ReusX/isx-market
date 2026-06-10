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
    if s.lower() in ("", "-", "—", "--", "nan", "none", "null"):
        return None
    neg = s.startswith("(") and s.endswith(")")
    s = s.strip("()%")
    try:
        v = float(s)
    except ValueError:
        return None
    return None if v != v else (-v if neg else v)  # reject NaN


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


# ── legacy format (2012–2018: monthly reports are .xls workbooks) ───────────
#
# Sheet map (names vary slightly by year, matched by substring):
#   "نشرة شهرية …"          company bulletin: name_ar, Code, open, high, low,
#                            avg, close, prev_close, change%, trades, volume,
#                            value, trading_days, capital(m IQD), name_en
#   "مؤشرات التداول …"       daily sessions: date, volume, %, value, %, trades,
#                            %, co.traded, co.listed, ISX60
#   "تداول قطاعيا عراقيين"   sector breakdown
#   "القيمة السوقية"         capital + market cap by sector (million IQD)

AR_SECTOR_EN = {
    "المصارف": "Banks", "مصارف": "Banks",
    "الاتصالات": "Telecom", "اتصالات": "Telecom",
    "الصناعة": "Industry", "صناعة": "Industry", "الصناعي": "Industry",
    "الفنادق": "Hotels", "فنادق": "Hotels", "السياحة": "Hotels",
    "الزراعة": "Agriculture", "زراعة": "Agriculture", "الزراعي": "Agriculture",
    "التأمين": "Insurance", "تأمين": "Insurance",
    "الاستثمار": "Investment", "استثمار": "Investment",
    "الخدمات": "Services", "خدمات": "Services",
}


def _sector_en(text: str) -> str:
    for ar, en in AR_SECTOR_EN.items():
        if ar in text:
            return en
    m = re.search(r"[A-Za-z][A-Za-z ]+", text)
    return m.group(0).strip() if m else text.strip()


def parse_legacy_format(path: Path) -> dict:
    """Parse a 2012-2018 era monthly .xls workbook into the same shape as
    parse_pdf()."""
    import pandas as pd

    m = re.match(r"(\d{4})-(\d{2})", path.stem)
    year, month = (int(m.group(1)), int(m.group(2))) if m else (None, None)
    xl = pd.ExcelFile(path)

    def sheet(*needles, exclude="غير"):
        for name in xl.sheet_names:
            if all(n in name for n in needles) and (not exclude or exclude not in name):
                return name
        return None

    # — companies (bulletin) —
    companies: list[dict] = []
    bulletin = sheet("نشرة")
    if bulletin:
        df = xl.parse(bulletin, header=None)
        hdr_i = next((i for i, r in df.iterrows()
                      if any("Code" in str(v) for v in r)), None)
        if hdr_i is not None:
            hdr = [str(v) for v in df.iloc[hdr_i]]
            def col(*needles):
                for i, h in enumerate(hdr):
                    if any(n in h for n in needles):
                        return i
                return None
            c = {
                "code":   col("Code", "رمز"),
                "open":   col("الافتتاح"), "high": col("اعلى"), "low": col("ادنى"),
                "avg":    col("معدل"), "close": col("الاغلاق Clos", "سعر الاغلاق Clos"),
                "prev":   col("السابق"), "chg": col("التغير"),
                "trades": col("الصفقات"), "vol": col("الاسهم المتداولة"),
                "val":    col("القيمة المتداولة"), "days": col("ايام"),
                "name_en": len(hdr) - 1 if "name" in hdr[-1].lower() else col("Company name"),
            }
            sector = None
            for _, row in df.iloc[hdr_i + 1:].iterrows():
                cells = [str(v) if v is not None else "" for v in row]
                code = cells[c["code"]].strip() if c["code"] is not None else ""
                if not CODE_RE.match(code):
                    joined = " ".join(cells)
                    if "قطاع" in joined:
                        sector = _sector_en(joined)
                    continue
                companies.append({
                    "ticker": code,
                    "name_en": cells[c["name_en"]].strip() if c["name_en"] is not None else None,
                    "name_ar": cells[0].strip(),  # logical order in xls — no glyph reversal
                    "sector": sector,
                    "open": num(cells[c["open"]]) if c["open"] is not None else None,
                    "high": num(cells[c["high"]]) if c["high"] is not None else None,
                    "low":  num(cells[c["low"]])  if c["low"]  is not None else None,
                    "avg":  num(cells[c["avg"]])  if c["avg"]  is not None else None,
                    "close": num(cells[c["close"]]) if c["close"] is not None else None,
                    "prev_close": num(cells[c["prev"]]) if c["prev"] is not None else None,
                    "change_pct": num(cells[c["chg"]]) if c["chg"] is not None else None,
                    "trades": num(cells[c["trades"]]) if c["trades"] is not None else None,
                    "volume": num(cells[c["vol"]]) if c["vol"] is not None else None,
                    "value":  num(cells[c["val"]]) if c["val"] is not None else None,
                    "trading_days": num(cells[c["days"]]) if c["days"] is not None else None,
                })

    # — daily sessions —
    daily: list[dict] = []
    sessions = sheet("مؤشرات التداول")
    if sessions:
        df = xl.parse(sessions, header=None)
        hdr_i = next((i for i, r in df.iterrows()
                      if any("الجلسات" in str(v) for v in r)), None)
        if hdr_i is not None:
            hdr = [str(v) for v in df.iloc[hdr_i]]
            def col2(*needles):
                for i, h in enumerate(hdr):
                    if any(n in h for n in needles):
                        return i
                return None
            i60 = col2("ISX", "مؤشر")
            ivol, ival = col2("الاسهم"), col2("القيمة")
            itrd, itc, ilc = col2("الصفقات"), col2("المتداولة الشركات", "الشركات المتداولة"), col2("المدرجة")
            idate = col2("الجلسات") or 0  # 2012 sheets have a leading blank column
            for _, row in df.iloc[hdr_i + 1:].iterrows():
                d = row.iloc[idate]
                date = None
                if hasattr(d, "strftime"):
                    date = d.strftime("%Y-%m-%d")
                elif DATE_RE.match(str(d).strip()):
                    dd, mm, yy = str(d).strip().split("/")
                    date = f"{yy}-{int(mm):02d}-{int(dd):02d}"
                if not date:
                    continue
                daily.append({
                    "date": date,
                    "isx60": num(row.iloc[i60]) if i60 is not None else None,
                    "isx15": None,  # ISX15 doesn't exist in the legacy era
                    "volume": num(row.iloc[ivol]) if ivol is not None else None,
                    "value":  num(row.iloc[ival]) if ival is not None else None,
                    "trades": num(row.iloc[itrd]) if itrd is not None else None,
                    "traded_companies": num(row.iloc[itc]) if itc is not None else None,
                    "listed_companies": num(row.iloc[ilc]) if ilc is not None else None,
                })

    # — sectors —
    sectors: list[dict] = []
    sec_sheet = sheet("قطاعيا")
    if sec_sheet:
        df = xl.parse(sec_sheet, header=None)
        for _, row in df.iterrows():
            cells = [str(v) for v in row]
            name = cells[0].strip()
            vals = [num(v) for v in cells[1:]]
            nums = [v for v in vals if v is not None]
            if not name or name == "nan" or len(nums) < 4 or "المجموع" in name:
                continue
            # layout: volume, %, value, %, trades, %, traded, listed
            sectors.append({
                "sector": _sector_en(name),
                "volume": num(cells[1]), "value": num(cells[3]),
                "trades": num(cells[5]),
                "traded_companies": num(cells[7]) if len(cells) > 7 else None,
                "listed_companies": num(cells[8]) if len(cells) > 8 else None,
            })

    # — market cap by sector (sheet values are in MILLIONS of IQD) —
    mcap: list[dict] = []
    cap_sheet = sheet("القيمة السوقية")
    if cap_sheet:
        df = xl.parse(cap_sheet, header=None)
        for _, row in df.iterrows():
            cells = [str(v) for v in row]
            name_cell = next((v for v in cells if any(a in v for a in AR_SECTOR_EN)), None)
            if not name_cell or "المجموع" in " ".join(cells):
                continue
            nums = [num(v) for v in cells]
            nums = [v for v in nums if v is not None]
            if len(nums) >= 3:
                # columns: capital, %, market cap, % → market cap is the 3rd
                mcap.append({"sector": _sector_en(name_cell), "market_cap": nums[2] * 1e6})

    missing = [k for k, v in (
        ("companies", companies), ("daily_index", daily),
        ("sectors", sectors), ("market_cap_by_sector", mcap),
    ) if not v]
    return {
        "source": path.name, "year": year, "month": month,
        "companies": companies, "daily_index": daily, "sectors": sectors,
        "market_cap_by_sector": mcap, "missing": missing, "format": "legacy-xls",
    }


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


def parse_report(path: Path) -> dict:
    """Route by file format: .xls/.xlsx → legacy workbook parser (2012-2018);
    .pdf → the modern report parser (~2019+)."""
    if path.suffix.lower() in (".xls", ".xlsx"):
        return parse_legacy_format(path)
    return parse_pdf(path)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()

    result = parse_report(args.pdf)
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
