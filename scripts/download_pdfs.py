#!/usr/bin/env python3
"""Download monthly-report PDFs listed in monthly_reports.json.

Files are named YYYY-MM.pdf from the report's list date. The monthly list
contains several files per month (main report, regular-market, second-market,
non-Iraqi bulletins…). The MAIN monthly report is the one whose title starts
with "التقرير الشهري لسوق العراق" — we prefer it; other titles for the same
month get a suffix so nothing is overwritten or lost.
"""
from __future__ import annotations
import json
import re
import sys
import time
from pathlib import Path

import requests

HEADERS = {"User-Agent": "Mozilla/5.0 (iraqsm.com data pipeline)"}
DELAY_S = 1.5
RETRIES = 4

DATA_DIR = Path(__file__).parent / "data"
PDF_DIR = DATA_DIR / "pdfs"
LIST_FILE = DATA_DIR / "monthly_reports.json"

MAIN_TITLE = "التقرير الشهري لسوق العراق"

AR_MONTHS = {
    "الثاني كانون": 1, "كانون الثاني": 1, "شباط": 2, "آذار": 3, "اذار": 3,
    "نيسان": 4, "آيار": 5, "ايار": 5, "أيار": 5, "حزيران": 6, "تموز": 7,
    "آب": 8, "اب": 8, "أيلول": 9, "ايلول": 9, "الاول تشرين": 10,
    "تشرين الاول": 10, "تشرين الأول": 10, "تشرين الثاني": 11,
    "الثاني تشرين": 11, "كانون الاول": 12, "كانون الأول": 12,
}


def report_month(title: str, list_date: str) -> str:
    """YYYY-MM the report COVERS (list date is ~first days of the next month)."""
    year_m = re.search(r"(20\d\d)", title)
    month = None
    for name, num in AR_MONTHS.items():
        if name in title:
            month = num
            break
    if year_m and month:
        return f"{year_m.group(1)}-{month:02d}"
    # fallback: previous month relative to the list date (dd/mm/yyyy)
    d, m, y = (int(x) for x in list_date.split("/"))
    m -= 1
    if m == 0:
        m, y = 12, y - 1
    return f"{y}-{m:02d}"


def slug(text: str, n: int = 28) -> str:
    return re.sub(r"[^\w؀-ۿ]+", "-", text).strip("-")[:n]


def download(session: requests.Session, url: str, dest: Path) -> bool:
    for attempt in range(1, RETRIES + 1):
        try:
            r = session.get(url, headers=HEADERS, timeout=120)
            r.raise_for_status()
            if not r.content.startswith(b"%PDF"):
                print(f"  WARNING: {url} is not a PDF — skipped", file=sys.stderr)
                return False
            dest.write_bytes(r.content)
            return True
        except requests.RequestException as e:
            wait = 3 * attempt
            print(f"  download failed ({e}); retry {attempt}/{RETRIES} in {wait}s", file=sys.stderr)
            time.sleep(wait)
    print(f"  ERROR: giving up on {url}", file=sys.stderr)
    return False


def main() -> None:
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    reports = json.loads(LIST_FILE.read_text())
    session = requests.Session()

    done = skipped = failed = 0
    for i, rep in enumerate(reports, 1):
        ym = report_month(rep["title"], rep["date"])
        if rep["title"].strip().startswith(MAIN_TITLE):
            dest = PDF_DIR / f"{ym}.pdf"
        else:
            dest = PDF_DIR / f"{ym}_{slug(rep['title'])}.pdf"

        if dest.exists() and dest.stat().st_size > 0:
            skipped += 1
            continue

        if download(session, rep["url"], dest):
            done += 1
        else:
            failed += 1
        if i % 10 == 0 or i == len(reports):
            print(f"[{i}/{len(reports)}] downloaded={done} skipped={skipped} failed={failed}")
        time.sleep(DELAY_S)

    print(f"Finished: downloaded={done} skipped={skipped} failed={failed} → {PDF_DIR}")


if __name__ == "__main__":
    main()
