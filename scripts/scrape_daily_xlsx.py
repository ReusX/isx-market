#!/usr/bin/env python3
"""Scrape the ISX uploaded-files list for DAILY trading-report workbooks.

The portal filter reporttype=40 (يومي) returns daily rows; each session has
an .xlsx (modern) or .xls (legacy) "التقرير اليومي" plus PDF/news twins we
skip. Output: scripts/data/daily_reports.json  [{url, date, title, ext}]

Usage:
  scrape_daily_xlsx.py                    # last 30 days
  scrape_daily_xlsx.py --days 3650        # full history
  scrape_daily_xlsx.py --from 01/06/2026 --to 10/06/2026
"""
from __future__ import annotations

import argparse
import json
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests

from scrape_isx_reports import LIST_URL, HEADERS, DELAY_S, fetch, find_paging

DAILY_TYPE = "40"  # يومي
DATA_DIR = Path(__file__).parent / "data"
OUT_FILE = DATA_DIR / "daily_reports.json"


def parse_daily_rows(html: str) -> list[dict]:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    for tr in soup.find_all("tr"):
        tds = tr.find_all("td")
        if len(tds) < 5:
            continue
        link = tds[0].find("a", href=True)
        if not link:
            continue
        href = link["href"]
        title = tds[2].get_text(" ", strip=True)
        rtype = tds[3].get_text(" ", strip=True)
        date = tds[4].get_text(" ", strip=True)
        if "يومي" not in rtype:
            continue
        if "التقرير اليومي" not in title:
            continue  # skip news bulletins etc.
        ext = href.lower().split("?")[0].rsplit(".", 1)[-1]
        if ext not in ("xls", "xlsx"):
            continue  # each session also has a PDF twin; the workbook is the data source
        url = href if href.startswith("http") else "http://www.isx-iq.net" + href
        rows.append({"url": url, "date": date, "title": title, "ext": ext})
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=30, help="how far back from today")
    ap.add_argument("--from", dest="date_from", default=None, help="dd/MM/yyyy")
    ap.add_argument("--to", dest="date_to", default=None, help="dd/MM/yyyy")
    args = ap.parse_args()

    date_to = args.date_to or time.strftime("%d/%m/%Y")
    date_from = args.date_from or (datetime.now() - timedelta(days=args.days)).strftime("%d/%m/%Y")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    form = {"reporttype": DAILY_TYPE, "date": date_from, "toDate": date_to}
    print(f"Fetching daily reports {date_from} → {date_to} ...")
    html = fetch(session, LIST_URL, data=form)
    all_rows = parse_daily_rows(html)
    page_param, last_page = find_paging(html)

    page = 2
    while page_param and page <= last_page:
        time.sleep(DELAY_S)
        url = (
            f"{LIST_URL}?{page_param}={page}&reporttype={DAILY_TYPE}"
            f"&date={requests.utils.quote(date_from, safe='')}"
            f"&toDate={requests.utils.quote(date_to, safe='')}"
        )
        html = fetch(session, url)
        all_rows.extend(parse_daily_rows(html))
        _, seen = find_paging(html)
        last_page = max(last_page, seen)
        if page % 10 == 0:
            print(f"page {page}/{last_page} — {len(all_rows)} so far")
        page += 1

    seen_urls: set[str] = set()
    unique = [r for r in all_rows if not (r["url"] in seen_urls or seen_urls.add(r["url"]))]
    OUT_FILE.write_text(json.dumps(unique, ensure_ascii=False, indent=1))
    print(f"Done: {len(unique)} daily workbooks → {OUT_FILE}")


if __name__ == "__main__":
    main()
