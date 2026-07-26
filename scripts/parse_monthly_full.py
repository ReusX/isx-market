#!/usr/bin/env python3
"""Extended ISX monthly-report parser — extracts all tables.

Usage:
    parse_monthly_full.py path/to/2026-04.pdf [--out out.json]

Extends parse_monthly.py with:
  foreign_flow_daily   – non-Iraqi buy/sell per session
  foreign_flow_sector  – non-Iraqi buy/sell by sector
  company_caps         – per-company capital, price, market cap (Table 14)
  ownership            – Iraqi vs foreign ownership per company (Table 38)
  major_shareholders   – top shareholders per company (Table 39)
  depository           – deposited shares + depositor counts (Table 26)
  capital_events       – capital increases, pledges, transfers (Table 28/34)

Data availability by era:
  2004-2019: companies, daily_index, sectors, market_cap_by_sector only
  2020+:     + foreign_flow_daily, foreign_flow_sector
  2021+:     + depository
  2025+:     + major_shareholders, ownership, capital_events
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import warnings
from pathlib import Path

import pdfplumber

# Re-use all helpers from parse_monthly
sys.path.insert(0, str(Path(__file__).parent))
from parse_monthly import (
    CODE_RE, DATE_RE, SECTOR_EN_RE, AR_SECTOR_EN,
    num, clean, fix_arabic, header_index,
    parse_companies, parse_daily_index, parse_market_cap, aggregate_sectors,
    parse_legacy_format, _sector_en,
)

warnings.filterwarnings("ignore")

# ── helpers ───────────────────────────────────────────────────────────────────

SECTOR_KEYWORDS_AR = {
    "فراصملا": "Banks", "فرصملا": "Banks",
    "تلاصتلاا": "Telecom", "تلاصتلاا": "Telecom",
    "نيمأتلا": "Insurance",
    "رامثتسلاا": "Investment",
    "تامدخلا": "Services",
    "ةعانصلا": "Industry",
    "ةعارزلا": "Agriculture",
    "قدانفلا": "Hotels",
}

def _sector_from_row(text: str) -> str | None:
    t = text.strip()
    for ar, en in SECTOR_KEYWORDS_AR.items():
        if ar in t:
            return en
    m = SECTOR_EN_RE.search(t)
    return m.group(1).strip() if m else None


def _date_col(table, min_dates: int = 3) -> int | None:
    """Find the column index that contains DD/MM/YYYY date strings."""
    n = len(table[0]) if table else 0
    for ci in range(min(n, 12)):
        hits = sum(
            1 for row in table[1:]
            if ci < len(row) and DATE_RE.match(clean(row[ci] or ""))
        )
        if hits >= min_dates:
            return ci
    return None


def _session_row(row, date_col, vol_col, val_col, trd_col, co_col) -> dict | None:
    d = clean(row[date_col]) if date_col < len(row) else ""
    if not DATE_RE.match(d):
        return None
    dd, mm, yy = d.split("/")
    def g(ci):
        return num(row[ci]) if ci is not None and ci < len(row) else None
    return {
        "date":      f"{yy}-{int(mm):02d}-{int(dd):02d}",
        "volume":    g(vol_col),
        "value":     g(val_col),
        "trades":    g(trd_col),
        "companies": g(co_col),
    }


def _sector_row(row, sector_col, vol_col, val_col, trd_col, co_col, lst_col) -> dict | None:
    """Extract one sector trading row."""
    sc = clean(row[sector_col]) if sector_col is not None and sector_col < len(row) else ""
    name = _sector_from_row(sc) or _sector_en(sc)
    if not name or any(kw in sc for kw in ("TOTAL", "عومجملا", "Total")):
        return None
    def g(ci):
        return num(row[ci]) if ci is not None and ci < len(row) else None
    return {
        "sector":    name,
        "volume":    g(vol_col),
        "value":     g(val_col),
        "trades":    g(trd_col),
        "companies": g(co_col),
        "listed":    g(lst_col),
    }


# ── foreign flow — per session ────────────────────────────────────────────────

def parse_foreign_daily(pdf) -> dict:
    """Non-Iraqi buy and sell per trading session (Tables 6 and 7).
    Returns {'buy': [...], 'sell': [...]}
    """
    buy: list[dict] = []
    sell: list[dict] = []

    # Collect all candidates, then select the best (most rows wins, but canonical
    # table numbers take priority)
    buy_candidates:  list[tuple[int, list[dict]]] = []  # (priority, rows)
    sell_candidates: list[tuple[int, list[dict]]] = []

    for page in pdf.pages:
        raw = page.extract_text() or ""
        if "non-iraqi" not in raw.lower():  # buy pages use "non-Iraqi", sell "Non-Iraqi"
            continue

        for tbl in page.extract_tables():
            if not tbl or len(tbl) < 3:
                continue
            dc = _date_col(tbl)
            if dc is None:
                continue

            # Skip merged title row; use row 1 as header
            hdr0 = tbl[0]
            is_merged_title = sum(1 for c in hdr0 if c is not None) <= 1
            hdr = tbl[1] if is_merged_title else hdr0
            data_start = 2 if is_merged_title else 1

            vc = header_index(hdr, "Traded Volume", "Volume", "مهسلاا")
            lc = header_index(hdr, "Traded Value",  "Value",  "ةميقلا")
            if vc is None:
                vc = max(0, len(hdr) - 2)
            if lc is None:
                lc = min(4, len(hdr) - 1)
            tc = header_index(hdr, "Trans", "Trades", "تاقفصلا")
            cc = header_index(hdr, "Co.Traded", "Traded Co", "تاكشرلا")

            rows = []
            for row in tbl[data_start:]:
                r = _session_row(row, dc, vc, lc, tc, cc)
                if r:
                    rows.append(r)

            if not rows:
                continue

            # Side is keyed off the "Purchase"/"Sales" page heading, NOT the
            # table number — the table numbering shifts between report formats
            # (buy is Table 6 in some years, 7 or 21 in others). A dedicated buy
            # page says Purchase and not Sales; a sell page vice-versa. Pages
            # with both (summaries / combined sector tables) are ambiguous for
            # side attribution and are skipped. The daily per-session table is
            # then the candidate with the most date rows (sector/company
            # breakdowns have no date column and were dropped above).
            is_sell = "Sales" in raw
            is_buy  = "Purchase" in raw
            if is_buy and not is_sell:
                buy_candidates.append((1, rows))
            elif is_sell and not is_buy:
                sell_candidates.append((1, rows))

    # Most date rows wins (the daily session table)
    if buy_candidates:
        buy = max(buy_candidates, key=lambda x: len(x[1]))[1]
    if sell_candidates:
        sell = max(sell_candidates, key=lambda x: len(x[1]))[1]

    return {"buy": buy, "sell": sell}


# ── foreign flow — by sector ──────────────────────────────────────────────────

# Foreign tables list companies grouped under "<Sector> Sector" headers with a
# "Total <Sector> sector" subtotal row. Aggregate off those subtotal rows — the
# sector names are clean English regardless of report format. Normalise the
# singular labels to the plural forms the frontend keys on.
_SECTOR_TOTAL = re.compile(r"Total\s+([A-Za-z][A-Za-z &-]*?)\s+sector", re.I)
_SECTOR_CANON = {
    "Bank": "Banks", "Banking": "Banks", "Hotel": "Hotels",
    "Service": "Services", "Tourism": "Hotels", "Agricultural": "Agriculture",
}


def parse_foreign_sector(pdf) -> dict:
    """Non-Iraqi buy and sell by sector, read from the "Total <Sector> sector"
    subtotal rows (clean English sector names in every report format).

    Two layouts occur: newer reports put buy and sell on separate Purchase /
    Sales pages; older ones stack a buy block above a sell block on one combined
    page. In both, a "Grand Total" row terminates each block, so we flatten the
    page's rows in reading order and split on Grand Total: on a combined page the
    first block is buy and the second sell; on a single-side page every block
    goes to that side. First numeric per row is value, then volume, then trades.
    """
    buy: dict[str, dict] = {}
    sell: dict[str, dict] = {}

    def add(target: dict, block: list[tuple[str, list[float]]]):
        for sec, nums in block:
            target.setdefault(sec, {
                "sector": sec, "value": nums[0],
                "volume": nums[1] if len(nums) > 1 else None,
                "trades": nums[2] if len(nums) > 2 else None,
                "companies": None, "listed": None,
            })

    for page in pdf.pages:
        raw = page.extract_text() or ""
        if "non-iraqi" not in raw.lower():
            continue
        page_buy, page_sell = "Purchase" in raw, "Sales" in raw
        if not (page_buy or page_sell):
            continue

        # flatten rows across the page's tables, splitting blocks on "Grand Total"
        blocks: list[list[tuple[str, list[float]]]] = []
        cur: list[tuple[str, list[float]]] = []
        for tbl in page.extract_tables():
            for row in (tbl or []):
                c0 = clean(row[0] or "") if row and row[0] else ""
                if c0.startswith("Grand Total"):
                    if cur:
                        blocks.append(cur); cur = []
                    continue
                m = _SECTOR_TOTAL.match(c0)
                if not m:
                    continue
                nums = [num(c) for c in row[1:] if num(c) is not None]
                if nums:
                    sec = m.group(1).strip()
                    cur.append((_SECTOR_CANON.get(sec, sec), nums))
        if cur:
            blocks.append(cur)
        if not blocks:
            continue

        if page_buy and page_sell:          # combined page: block 0 buy, block 1 sell
            add(buy, blocks[0])
            if len(blocks) > 1:
                add(sell, blocks[1])
        else:
            tgt = buy if page_buy else sell
            for b in blocks:
                add(tgt, b)

    return {"buy": list(buy.values()), "sell": list(sell.values())}


# ── company caps (Table 14) ───────────────────────────────────────────────────

def parse_company_caps(pdf) -> list[dict]:
    """Per-company: capital (listed shares), closing price, market cap.
    Returns [{ticker, name_en, capital, price, market_cap}]

    Table 14 has a merged-title row 0, real column headers in row 1:
      Col 0: Company Name (English)
      Col 1: Market Cap (million IQD)
      Col 2: Closing Price
      Col 3: Listed Shares
      Col 4: Code (ticker)
      Col 5: Arabic company name
    """
    out: dict[str, dict] = {}

    for page in pdf.pages:
        raw = page.extract_text() or ""
        # Table 14 keyword appears in the merged title row text
        if "Table No.(14)" not in raw and "14(" not in raw:
            continue

        for tbl in page.extract_tables():
            if not tbl or len(tbl) < 4:
                continue

            # Skip the merged title row; use row 1 as header
            title_row = " ".join(clean(c or "") for c in tbl[0])
            if "14" not in title_row and "Table No.(14)" not in title_row:
                continue

            # Row 1 = real column headers
            hdr = tbl[1] if len(tbl) > 1 else tbl[0]

            code_col = header_index(hdr, "Code", "رمز") or 4
            name_col = header_index(hdr, "Company Name", "ةكرشلا") or 0
            cap_col  = header_index(hdr, "Listed Shares", "ةجردملا مهسلاا") or 3
            prc_col  = header_index(hdr, "Closing Price", "Closing", "قلاغلاا") or 2
            mkt_col  = header_index(hdr, "Market Capitalization", "Market Cap", "ةيقوسلا ةميقلا") or 1

            # Data rows start at index 2 (skip title + header)
            for row in tbl[2:]:
                if len(row) <= max(code_col, mkt_col):
                    continue
                code = clean(row[code_col]) if code_col < len(row) else ""
                if not CODE_RE.match(code):
                    continue
                def g(ci):
                    return num(row[ci]) if ci is not None and ci < len(row) else None
                rec = {
                    "ticker":     code,
                    "name_en":    clean(row[name_col]) if name_col is not None and name_col < len(row) else None,
                    "capital":    g(cap_col),
                    "price":      g(prc_col),
                    "market_cap": g(mkt_col),
                }
                if code not in out or (rec["market_cap"] or 0) > (out[code].get("market_cap") or 0):
                    out[code] = rec

    return list(out.values())


# ── ownership — Iraqis vs foreigners (Table 38) ───────────────────────────────

AR_CELL = re.compile(r"[ء-ي]")


def _is_company_row(name_ar: str, capital) -> bool:
    """Reject page furniture that reads like a company row.

    The report's own title — "ملكية الأسهم المودعة للمساهمين العراقيين وغير
    العراقيين لغاية …" — reaches the text reader as a long run of single
    letters, and picks up page numbers as its figures. One such row per report
    was landing in ownership_monthly and, with capital=8 and foreign=6, sorting
    to the top of the ownership page at 100% foreign-owned.
    """
    tokens = name_ar.split()
    if len(tokens) >= 8 and sum(1 for t in tokens if len(t) == 1) / len(tokens) > 0.6:
        return False
    # A listed company's capital is in the billions of dinars; single digits are
    # page furniture. (None is left alone — some reports omit the column.)
    if capital is not None and capital < 1_000_000:
        return False
    return True


def _name_col(table) -> int | None:
    """Find the company-name column: the column with the most *distinct* Arabic,
    non-numeric values. Distinct-count (not raw frequency) is the key — company
    names are unique per row, whereas operation-type/sector codes repeat, so this
    reliably picks the name column over neighbouring text columns. RTL layout
    shifts absolute indices (10- vs 11-col variants), so callers anchor every
    other field relative to this column.
    """
    if not table:
        return None
    ncol = max(len(r) for r in table)
    vals: list[set] = [set() for _ in range(ncol)]
    for row in table[2:]:
        for ci in range(min(len(row), ncol)):
            c = clean(row[ci] or "")
            if c and AR_CELL.search(c) and not re.fullmatch(r"[\d,.\-%()/]+", c):
                vals[ci].add(c)
    distinct = [len(v) for v in vals]
    best = max(range(ncol), key=lambda i: distinct[i])
    return best if distinct[best] >= 3 else None


def parse_ownership(pdf) -> list[dict]:
    """Per-company Iraqi vs foreign share ownership (Table 38, sometimes
    renumbered 29 in newer reports). Returns [{name_ar, sector, capital,
    deposited_capital, deposit_ratio, iraqi_shares, foreign_shares,
    iraqi_count, foreign_count}].

    Columns are mapped RELATIVE to the company-name column (RTL-stable):
      name+1 row number   name-1 capital      name-2 deposited capital
      name-3 deposit %    name-4 iraqi shares name-5 foreign shares
      name-6 total count  name-7 iraqi count  name-8 foreign count
    """
    out: list[dict] = []
    seen: set[str] = set()

    for page in pdf.pages:
        for tbl in page.extract_tables():
            if not tbl or len(tbl) < 4 or len(tbl[0]) < 9:
                continue

            # Identify the ownership table by its distinctive header: the
            # deposit-ratio column (عاديا) plus a company-name column.
            hdr_text = " ".join(clean(c or "") for c in (tbl[0] or []) + (tbl[1] or []))
            if "عاديا" not in hdr_text or "مسأ" not in hdr_text:
                continue

            name_i = _name_col(tbl)
            if name_i is None:
                continue

            # Field offsets relative to the name column
            CAPITAL, DEP_CAP, RATIO   = name_i - 1, name_i - 2, name_i - 3
            IRAQI_SHARE, FOREIGN_SHARE = name_i - 4, name_i - 5
            TOTAL_CNT, IRAQI_COUNT, FOREIGN_COUNT = name_i - 6, name_i - 7, name_i - 8

            sector = None
            for row in tbl[2:]:
                joined = " ".join(clean(c or "") for c in row)

                # Sector header row: only col 0 populated
                if name_i - 1 >= 0 and not clean(row[name_i] if name_i < len(row) else ""):
                    s = _sector_from_row(joined)
                    if s:
                        sector = s
                    continue

                if "عومجملا" in joined or "Total" in joined:
                    continue

                name_ar = fix_arabic(clean(row[name_i])) if name_i < len(row) else ""
                if not name_ar or AR_CELL.search(name_ar) is None or name_ar in seen:
                    continue
                if not any(num(c) for c in row if c):
                    continue

                def g(ci):
                    return num(row[ci]) if 0 <= ci < len(row) else None

                if not _is_company_row(name_ar, g(CAPITAL)):
                    continue
                seen.add(name_ar)

                fc, ic = g(FOREIGN_COUNT), g(IRAQI_COUNT)
                out.append({
                    "name_ar":           name_ar,
                    "sector":            sector,
                    "capital":           g(CAPITAL),
                    "deposited_capital": g(DEP_CAP),
                    "deposit_ratio":     g(RATIO),
                    "iraqi_shares":      g(IRAQI_SHARE),
                    "foreign_shares":    g(FOREIGN_SHARE),
                    "iraqi_count":       int(ic) if ic is not None else None,
                    "foreign_count":     int(fc) if fc is not None else None,
                })

    # Many reports (e.g. 2025-06/07/08, 2026-01/02/03) render the ownership
    # table with no ruling lines — pdfplumber finds no grid, so the loop above
    # yields nothing. Fall back to a line-based reader over the raw text.
    if not out:
        out = _parse_ownership_text(pdf)
    return out


# pdfplumber emits Arabic in visual (reversed) order, so we reverse the readable
# needles to match. These mark sector-header / subtotal lines to skip.
_OWN_SKIP = tuple(w[::-1] for w in ("قطاع", "المجموع", "الكلي", "الشهر", "السنة"))
_OWN_NUM  = re.compile(r"^\(?-?[\d,]+(?:\.\d+)?\)?%?$")


def _parse_ownership_text(pdf) -> list[dict]:
    """Line-based ownership reader for reports with no table grid.

    Whether the table is text-only or rotated, the raw text lays each company
    out as the same fixed record: 8 numeric fields, then the Arabic name (one
    word per line), then a rank number. Field order matches the grid layout:
      foreign_count, iraqi_count, total_count, foreign_shares, iraqi_shares,
      deposit_ratio, deposited_capital, capital
    """
    out: list[dict] = []
    seen: set[str] = set()

    for page in pdf.pages:
        raw = page.extract_text() or ""
        # ownership page signal: "non-Iraqi" plus the ratio or capital heading
        if "نييقارع" not in raw or ("عاديا" not in raw and fix_arabic("رأس المال") not in raw):
            continue

        nums: list[float] = []
        name: list[str] = []
        for line in (clean(l) for l in raw.split("\n")):
            if not line:
                continue
            if AR_CELL.search(line) and any(m in line for m in _OWN_SKIP):
                nums, name = [], []           # sector/total divider — reset
                continue
            if _OWN_NUM.match(line):
                v = num(line)
                if name:                      # name complete → this number is the rank
                    if len(nums) >= 8 and v is not None:
                        f = nums[:8]
                        name_ar = fix_arabic(" ".join(name))
                        cap = f[7]
                        ishr, fshr = f[4], f[3]
                        # guard against mis-grouped rows: shares can't exceed capital
                        if (name_ar not in seen and _is_company_row(name_ar, cap)
                                and not (cap and ishr + fshr > cap * 1.05)):
                            seen.add(name_ar)
                            out.append({
                                "name_ar":           name_ar,
                                "sector":            None,
                                "capital":           cap,
                                "deposited_capital": f[6],
                                "deposit_ratio":     f[5],
                                "iraqi_shares":      ishr,
                                "foreign_shares":    fshr,
                                "iraqi_count":       int(f[1]) if f[1] is not None else None,
                                "foreign_count":     int(f[0]) if f[0] is not None else None,
                            })
                    nums, name = [], []
                elif v is not None:
                    nums.append(v)
            elif AR_CELL.search(line):
                if len(nums) >= 8:
                    name.append(line)         # part of the company name
                else:
                    nums, name = [], []       # stray Arabic before fields complete

    return out


# ── major shareholders (Table 39) ────────────────────────────────────────────

def parse_major_shareholders(pdf) -> list[dict]:
    """Top shareholders per company.
    Returns [{company_name_ar, sector, rank, name_ar, nationality,
              prev_shares, prev_pct, curr_shares, curr_pct, change_pct}]
    """
    out: list[dict] = []

    for page in pdf.pages:
        raw = page.extract_text() or ""
        if "Table No.(39)" not in raw and "nationality" not in raw.lower() and "ةيسنجلا" not in raw:
            continue

        for tbl in page.extract_tables():
            if not tbl or len(tbl) < 3:
                continue
            hdr = tbl[0]
            hdr_text = " ".join(clean(c or "") for c in hdr).lower()
            if "nationality" not in hdr_text and "ةيسنجلا" not in hdr_text:
                continue

            # Table 39 columns (RTL order as extracted):
            # 0=change%, 1=curr_pct, 2=curr_shares, 3=curr_capital,
            # 4=prev_pct, 5=prev_shares, 6=prev_capital, 7=nationality, 8=name, 9=rank
            nat_col   = header_index(hdr, "nationality", "ةيسنجلا")
            name_col  = header_index(hdr, "Name", "مسلاا", "مسأ")
            chg_col   = header_index(hdr, "Change", "رييغتلا")
            rank_col  = header_index(hdr, "#", "ت")

            # Try to auto-detect current/prev shares from column headers
            # Look for the pattern: two columns named similarly (curr vs prev)
            curr_shr_col = None
            prev_shr_col = None
            curr_pct_col = None
            prev_pct_col = None
            for ci, cell in enumerate(hdr):
                ct = clean(cell or "").lower()
                if ("current" in ct or "يلاحلا" in ct) and "share" in ct:
                    curr_shr_col = ci
                elif ("previous" in ct or "قباسلا" in ct) and "share" in ct:
                    prev_shr_col = ci
                elif ("current" in ct or "يلاحلا" in ct) and ("%" in ct or "pct" in ct or "نسبة" in ct):
                    curr_pct_col = ci
                elif ("previous" in ct or "قباسلا" in ct) and ("%" in ct or "pct" in ct):
                    prev_pct_col = ci

            # Fallback: use fixed positional mapping from Table 39 structure
            if curr_shr_col is None and nat_col is not None:
                # Based on observed table: nat_col=7, name_col=8, rank_col=9
                chg_col      = 0
                curr_pct_col = 1
                curr_shr_col = 2
                prev_pct_col = 4
                prev_shr_col = 5

            if nat_col is None:
                continue

            company_name_ar = None
            sector = None
            rank = 0

            for row in tbl[1:]:
                if len(row) < 5:
                    continue
                joined = " ".join(clean(c or "") for c in row)

                # Detect sector header
                s = _sector_from_row(joined)
                if s and not any(num(c) for c in row if c):
                    sector = s
                    continue

                # Detect company name row (non-data row)
                nat_val = clean(row[nat_col]) if nat_col < len(row) else ""
                if not nat_val and all(num(c) is None for c in row if c):
                    # This row is a company header
                    possible_name = max((clean(c or "") for c in row), key=len)
                    if possible_name and len(possible_name) > 3:
                        company_name_ar = fix_arabic(possible_name)
                        rank = 0
                    continue

                # Skip total/subtotal rows
                if "عومجملا" in joined or "Total" in joined:
                    continue

                if nat_val not in ("يقارع", "يقارع ريغ", "Iraqi", "Foreign", "Non-Iraqi"):
                    if not any(c in nat_val for c in ("يقار", "يبنج", "Ira", "For")):
                        continue

                if company_name_ar is None:
                    continue

                rank += 1
                def g(ci):
                    return num(row[ci]) if ci is not None and ci < len(row) else None

                nationality = "Foreign" if ("ريغ" in nat_val or "Foreign" in nat_val or "Non" in nat_val) else "Iraqi"
                name_ar = fix_arabic(clean(row[name_col])) if name_col is not None and name_col < len(row) else ""

                out.append({
                    "company_name_ar": company_name_ar,
                    "sector":          sector,
                    "rank":            rank,
                    "name_ar":         name_ar,
                    "nationality":     nationality,
                    "curr_shares":     g(curr_shr_col),
                    "curr_pct":        g(curr_pct_col),
                    "prev_shares":     g(prev_shr_col),
                    "prev_pct":        g(prev_pct_col),
                    "change_pct":      g(chg_col),
                })

    return out


# ── depository center (Table 26) ─────────────────────────────────────────────

def parse_depository(pdf) -> list[dict]:
    """Deposited shares + depositor counts per company (Table 26).

    Real Table 26 layout (RTL, ~17 cols, name-anchored):
      name col      company name (ةكرشلا مسأ)
      left of name  capital, deposited shares (large values)
                    individuals count (دارفا), entities count (شركات) (small)

    The source splits depositors by individual/entity — NOT by nationality.
    The Iraqi-vs-foreign split per company lives in the ownership table.
    We store individual/entity totals in the *_iraqi columns (count is exact;
    nationality split comes from ownership). Returns
    [{name_ar, sector, capital, deposited_shares,
      individual_iraqi, individual_foreign, entity_iraqi, entity_foreign}].
    """
    out: list[dict] = []
    seen: set[str] = set()

    for page in pdf.pages:
        for tbl in page.extract_tables():
            if not tbl or len(tbl) < 4 or len(tbl[0]) < 10:
                continue

            # Table 26: header mentions depositors (نيعدوملا) split into
            # individuals (دارفا) and companies (تاكرش), plus a name column.
            hdr_text = " ".join(clean(c or "") for c in (tbl[0] or []) + (tbl[1] or []) + (tbl[2] or []))
            if "نيعدوملا" not in hdr_text or ("دارفا" not in hdr_text and "تاكرش" not in hdr_text):
                continue

            name_i = _name_col(tbl)
            if name_i is None:
                continue

            # The merged-cell grid places real data columns on a fixed stride
            # (e.g. {0,3,6,9} when name is col 12); values bleeding into adjacent
            # columns create lower-frequency noise on other residues. Detect the
            # stride from the high-frequency columns, then keep only name-aligned
            # columns. Roles assigned from the name column outward (RTL):
            #   capital, deposited shares, individual count, entity count
            freq: dict[int, int] = {}
            for row in tbl[3:]:
                for ci in range(min(name_i, len(row))):
                    if num(row[ci]) is not None:
                        freq[ci] = freq.get(ci, 0) + 1
            if not freq:
                continue
            fmax = max(freq.values())
            strong = sorted(ci for ci, n in freq.items() if n >= fmax * 0.5)
            diffs = [b - a for a, b in zip(strong, strong[1:]) if b - a > 0]
            stride = min(diffs) if diffs else 3
            data_cols = sorted(
                ci for ci in range(name_i)
                if (name_i - ci) % stride == 0 and freq.get(ci, 0) >= 2
            )
            if len(data_cols) < 3:
                continue
            # from the name column outward (closest first): cap, shares, ind, ent
            CAP = data_cols[-1]
            SHR = data_cols[-2] if len(data_cols) >= 2 else None
            IND = data_cols[-3] if len(data_cols) >= 3 else None
            ENT = data_cols[-4] if len(data_cols) >= 4 else None

            sector = None
            for row in tbl[3:]:
                joined = " ".join(clean(c or "") for c in row)
                name_cell = clean(row[name_i]) if name_i < len(row) else ""

                if not name_cell:
                    s = _sector_from_row(joined)
                    if s:
                        sector = s
                    continue
                if "عومجملا" in joined or "Total" in joined:
                    continue

                name_ar = fix_arabic(name_cell)
                if AR_CELL.search(name_ar) is None or name_ar in seen:
                    continue

                def g(ci):
                    return num(row[ci]) if ci is not None and ci < len(row) else None

                ind, ent = g(IND), g(ENT)
                if g(SHR) is None and g(CAP) is None and ind is None:
                    continue

                seen.add(name_ar)
                out.append({
                    "name_ar":            name_ar,
                    "sector":             sector,
                    "capital":            g(CAP),
                    "deposited_shares":   g(SHR),
                    "individual_iraqi":   int(ind) if ind is not None else None,
                    "individual_foreign": None,
                    "entity_iraqi":       int(ent) if ent is not None else None,
                    "entity_foreign":     None,
                })

    return out


# ── capital events (Tables 28 / 34) ──────────────────────────────────────────

def _data_slots(tbl, name_i, start=2):
    """Return name-aligned data column indices (same stride trick as depository)."""
    freq: dict[int, int] = {}
    for row in tbl[start:]:
        for ci in range(min(name_i, len(row))):
            if num(row[ci]) is not None:
                freq[ci] = freq.get(ci, 0) + 1
    if not freq:
        return []
    fmax = max(freq.values())
    strong = sorted(ci for ci, n in freq.items() if n >= fmax * 0.5)
    diffs = [b - a for a, b in zip(strong, strong[1:]) if b - a > 0]
    stride = min(diffs) if diffs else 3
    return sorted(ci for ci in range(name_i)
                  if (name_i - ci) % stride == 0 and freq.get(ci, 0) >= 1)


def parse_capital_events(pdf) -> list[dict]:
    """Capital increases (per company) + pledges / inheritance / family
    transfers (aggregate by operation type).
    Returns [{name_ar, event_type, old_capital, new_shares, new_capital, count}].
    """
    out: list[dict] = []
    seen: set[tuple] = set()

    for page in pdf.pages:
        for tbl in page.extract_tables():
            if not tbl or len(tbl) < 3:
                continue
            hdr = " ".join(clean(c or "") for c in (tbl[0] or []) + (tbl[1] or []))

            # ── Per-company capital increases: header has new (ديدجلا) + old (ميدقلا) capital
            if "ديدجلا" in hdr and "ميدقلا" in hdr:
                name_i = _name_col(tbl)
                if name_i is None:
                    continue
                cols = _data_slots(tbl, name_i, start=1)
                if len(cols) < 3:
                    continue
                # op-type column is non-numeric (skipped by _data_slots); the 3
                # numeric slots from the name outward are: old, new-shares, new-cap
                OLD, NEWSH, NEWCAP = cols[-1], cols[-2], cols[-3]
                for row in tbl[1:]:
                    name_cell = clean(row[name_i]) if name_i < len(row) else ""
                    if not name_cell or AR_CELL.search(name_cell) is None:
                        continue
                    if "عومجملا" in " ".join(clean(c or "") for c in row):
                        continue
                    name_ar = fix_arabic(name_cell)
                    def g(ci):
                        return num(row[ci]) if ci is not None and ci < len(row) else None
                    if g(NEWCAP) is None and g(OLD) is None:
                        continue
                    key = (name_ar, "capital_increase")
                    if key in seen:
                        continue
                    seen.add(key)
                    out.append({
                        "name_ar":     name_ar,
                        "event_type":  "capital_increase",
                        "old_capital": g(OLD),
                        "new_shares":  g(NEWSH),
                        "new_capital": g(NEWCAP),
                        "count":       None,
                    })

            # ── Aggregate events: header has shares count (مهسلاا ددع) + operation type (عون)
            elif "مهسلاا ددع" in hdr and "ةيلمعلا" in hdr:
                # find operation-type column (Arabic words: رهن/حجز/تجميد/مصادرة/ارثية/تنازل)
                type_i = _name_col(tbl)
                if type_i is None:
                    continue
                cols = _data_slots(tbl, type_i, start=1)
                if len(cols) < 2:
                    continue
                # from the type column outward: transactions (closest), shares
                TRADES, SHARES = cols[-1], cols[-2]
                for row in tbl[1:]:
                    tcell = clean(row[type_i]) if type_i < len(row) else ""
                    if not tcell or AR_CELL.search(tcell) is None:
                        continue
                    evt = fix_arabic(tcell)
                    def g(ci):
                        return num(row[ci]) if ci is not None and ci < len(row) else None
                    sh, tr = g(SHARES), g(TRADES)
                    if sh is None and tr is None:
                        continue
                    key = (evt, "market_event")
                    if key in seen:
                        continue
                    seen.add(key)
                    out.append({
                        "name_ar":     evt,           # operation type as the label
                        "event_type":  evt,
                        "old_capital": None,
                        "new_shares":  sh,
                        "new_capital": None,
                        "count":       int(tr) if tr is not None else None,
                    })

    return out


# ── main parse_pdf_full ───────────────────────────────────────────────────────

def parse_pdf_full(path: Path) -> dict:
    m = re.match(r"(\d{4})-(\d{2})", path.stem)
    year, month = (int(m.group(1)), int(m.group(2))) if m else (None, None)

    with pdfplumber.open(path) as pdf:
        # Existing tables
        companies = parse_companies(pdf)
        daily     = parse_daily_index(pdf)
        code_sector = {c["ticker"]: c["sector"] for c in companies if c.get("sector")}
        mcap      = parse_market_cap(pdf, code_sector)

        # New tables
        foreign_daily  = parse_foreign_daily(pdf)
        foreign_sector = parse_foreign_sector(pdf)
        company_caps   = parse_company_caps(pdf)
        ownership      = parse_ownership(pdf)
        major_sh       = parse_major_shareholders(pdf)
        depository     = parse_depository(pdf)
        capital_events = parse_capital_events(pdf)

    sectors = aggregate_sectors(companies) if companies else []

    # Merge sector data from Table 8 if available (more accurate than aggregated)
    # (foreign_sector buy side is total market if no Non-Iraqi filter → keep separate)

    missing = [k for k, v in [
        ("companies",         companies),
        ("daily_index",       daily),
        ("sectors",           sectors),
        ("market_cap_by_sector", mcap),
        ("foreign_flow_daily",   foreign_daily["buy"] or foreign_daily["sell"]),
        ("company_caps",      company_caps),
    ] if not v]

    return {
        "source":               path.name,
        "year":                 year,
        "month":                month,
        "companies":            companies,
        "daily_index":          daily,
        "sectors":              sectors,
        "market_cap_by_sector": mcap,
        "foreign_flow_daily":   foreign_daily,
        "foreign_flow_sector":  foreign_sector,
        "company_caps":         company_caps,
        "ownership":            ownership,
        "major_shareholders":   major_sh,
        "depository":           depository,
        "capital_events":       capital_events,
        "missing":              missing,
    }


def parse_report_full(path: Path) -> dict:
    """Route by format: legacy XLS → existing parser; PDF → full parser."""
    if path.suffix.lower() in (".xls", ".xlsx"):
        base = parse_legacy_format(path)
        # Legacy XLS files don't have the new tables — return base + empty new fields
        base.update({
            "foreign_flow_daily":  {"buy": [], "sell": []},
            "foreign_flow_sector": {"buy": [], "sell": []},
            "company_caps":        [],
            "ownership":           [],
            "major_shareholders":  [],
            "depository":          [],
            "capital_events":      [],
        })
        return base
    return parse_pdf_full(path)


def main() -> None:
    ap = argparse.ArgumentParser(description="Parse ISX monthly report — all tables")
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()

    result = parse_report_full(args.pdf)
    text = json.dumps(result, ensure_ascii=False, indent=1)
    if args.out:
        args.out.write_text(text)
        print(
            f"{args.pdf.name}: "
            f"co={len(result['companies'])} "
            f"daily={len(result['daily_index'])} "
            f"caps={len(result['company_caps'])} "
            f"ownership={len(result['ownership'])} "
            f"major_sh={len(result['major_shareholders'])} "
            f"depository={len(result['depository'])} "
            f"foreign_buy={len(result['foreign_flow_daily']['buy'])} "
            f"foreign_sell={len(result['foreign_flow_daily']['sell'])} "
            f"missing={result['missing']} → {args.out}"
        )
    else:
        print(text)


if __name__ == "__main__":
    main()
