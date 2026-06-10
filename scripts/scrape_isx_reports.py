#!/usr/bin/env python3
"""Scrape the ISX uploaded-files list for monthly reports.

The ISX portal (uploadedFilesList.html) exposes a server-side filter:
POSTing reporttype=39 returns only monthly (شهري) rows, paginated by a
displaytag parameter (d-NNNNN-p=N) — ~87 pages instead of crawling all 876.

Output: scripts/data/monthly_reports.json  [{url, date, title}]
"""
from __future__ import annotations
import json
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE = "http://www.isx-iq.net"
LIST_URL = f"{BASE}/isxportal/portal/uploadedFilesList.html"
HEADERS = {"User-Agent": "Mozilla/5.0 (iraqsm.com data pipeline)"}
MONTHLY_TYPE = "39"  # شهري in the reporttype <select>
DATE_FROM = "01/01/2009"
DATE_TO = time.strftime("%d/%m/%Y")
DELAY_S = 1.5
RETRIES = 4

DATA_DIR = Path(__file__).parent / "data"
OUT_FILE = DATA_DIR / "monthly_reports.json"


def fetch(session: requests.Session, url: str, *, data=None) -> str:
    last_err = None
    for attempt in range(1, RETRIES + 1):
        try:
            if data is not None:
                r = session.post(url, data=data, headers=HEADERS, timeout=60)
            else:
                r = session.get(url, headers=HEADERS, timeout=60)
            r.raise_for_status()
            return r.text
        except requests.RequestException as e:
            last_err = e
            wait = 3 * attempt
            print(f"  request failed ({e}); retry {attempt}/{RETRIES} in {wait}s", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError(f"giving up on {url}: {last_err}")


def parse_rows(html: str) -> list[dict]:
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
        if "شهري" not in rtype and "monthly" not in rtype.lower():
            continue
        ext = href.lower().split("?")[0].rsplit(".", 1)[-1]
        if ext not in ("pdf", "xls", "xlsx"):
            continue
        # 2012-2018 main monthly reports are .xls; PDFs take over ~2019+,
        # so both formats must be kept for a full backfill.
        url = href if href.startswith("http") else BASE + href
        rows.append({"url": url, "date": date, "title": title, "ext": ext})
    return rows


def find_paging(html: str) -> tuple[str | None, int]:
    """Return (paging param name e.g. 'd-447146-p', max page seen)."""
    params = re.findall(r"(d-\d+-p)=(\d+)", html)
    if not params:
        return None, 1
    name = params[0][0]
    return name, max(int(n) for _, n in params)


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    session = requests.Session()

    form = {"reporttype": MONTHLY_TYPE, "date": DATE_FROM, "toDate": DATE_TO}
    print(f"Fetching page 1 (monthly filter, {DATE_FROM} → {DATE_TO}) ...")
    html = fetch(session, LIST_URL, data=form)
    all_rows = parse_rows(html)
    page_param, last_page = find_paging(html)
    print(f"Pagination param: {page_param}, last page seen: {last_page}")

    page = 2
    while page_param and page <= last_page:
        time.sleep(DELAY_S)
        url = (
            f"{LIST_URL}?{page_param}={page}"
            f"&reporttype={MONTHLY_TYPE}"
            f"&date={requests.utils.quote(DATE_FROM, safe='')}"
            f"&toDate={requests.utils.quote(DATE_TO, safe='')}"
        )
        html = fetch(session, url)
        rows = parse_rows(html)
        # NOTE: don't stop on an empty page — a page can legitimately yield
        # zero rows after filtering (e.g. only .doc attachments). The loop
        # ends when `page` passes `last_page`, which find_paging() keeps
        # extending as displaytag's sliding window reveals more pages.
        all_rows.extend(rows)
        # displaytag shows a sliding window of page links; extend if more appear
        _, seen = find_paging(html)
        last_page = max(last_page, seen)
        if page % 10 == 0:
            print(f"page {page}/{last_page} — {len(all_rows)} reports so far")
        page += 1

    # de-dupe on URL, keep order
    seen_urls: set[str] = set()
    unique = []
    for r in all_rows:
        if r["url"] in seen_urls:
            continue
        seen_urls.add(r["url"])
        unique.append(r)

    OUT_FILE.write_text(json.dumps(unique, ensure_ascii=False, indent=1))
    print(f"Done: {len(unique)} monthly report files → {OUT_FILE}")


if __name__ == "__main__":
    main()
