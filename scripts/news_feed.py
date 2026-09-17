#!/usr/bin/env python3
"""
The aggregator feed · headlines from Iraq's economy sources into `news_feed`.

No rewriting, no AI, no bodies: each source's own headline and summary, the
link out, and when it was published (or first seen). Runs from GitHub Actions
every 30 minutes (.github/workflows/news-feed.yml) with the service role.

    python3 scripts/news_feed.py            # ingest
    python3 scripts/news_feed.py --dry-run  # print what would be written
"""
from __future__ import annotations
import argparse, html, json, os, re, sys
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import unquote, urljoin
import requests

ROOT = Path(__file__).resolve().parent.parent
if (ROOT / ".env.local").exists():
    for line in (ROOT / ".env.local").read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
SB_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SB_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36 (+iraqsm.com feed)"}
NOW = datetime.now(timezone.utc)

# A general-news source only contributes economy stories. Matched on the
# headline after folding the alef; the list is deliberately broad.
ECON = re.compile(r"(بورص|سهم|اسهم|مصرف|مصارف|بنك|البنك المركزي|دولار|دينار|نفط|برميل|اوبك|موازن|تضخم|اقتصاد|استثمار|ضريب|جمارك|تجار|صادرات|استيراد|رواتب|قرض|قروض|فائد|ذهب|كهرباء|غاز|عقار|سوق|شرك)")
def fold(s: str) -> str: return re.sub(r"[أإآٱ]", "ا", s)
def clean(s: str) -> str: return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()

def get(url: str, timeout: int = 20) -> str | None:
    try:
        r = requests.get(url, headers=UA, timeout=timeout)
        return r.text if r.ok else None
    except requests.RequestException:
        return None

Item = dict  # {url, source, title, summary, lang, ticker, published_at}

def isc() -> list[Item]:
    out: list[Item] = []
    try:
        cos = {}
        page, last = 1, 1
        while page <= last and page <= 40:
            r = requests.get(f"https://api.isc.gov.iq/api/companies?page={page}", headers=UA, timeout=20).json()
            for c in r.get("data", []): cos[str(c["id"])] = c
            last = int(r.get("last_page") or 1); page += 1
        for page in (1, 2):
            data = requests.get(f"https://api.isc.gov.iq/api/news?page={page}", headers=UA, timeout=20).json().get("data", [])
            for it in data:
                raw = it.get("company")
                co = cos.get(str(raw or ""), {}) if isinstance(raw, (int, str)) and str(raw).isdigit() else {}
                name = co.get("title_ar") or (raw if isinstance(raw, str) and not raw.isdigit() else "") or ""
                title = clean(it.get("title_ar") or it.get("title_en") or "").strip(" .–-")
                if len(title) < 12: continue  # «شنو يعني» and other test posts
                if name and name not in title: title = f"{name}: {title}".strip(" :–-")
                out.append({
                    "url": f"https://www.isc.gov.iq/news/{it['id']}", "source": "isc", "title": title[:300],
                    "summary": (clean(it.get("descr_ar") or "")[:280] or None), "lang": "ar",
                    "ticker": (co.get("code") or co.get("symbol") or None),
                    "published_at": f"{it.get('date') or NOW.date().isoformat()}T09:00:00+03:00",
                })
    except Exception as e:
        print("isc failed:", e, file=sys.stderr)
    return out

def alsumaria() -> list[Item]:
    s = get("https://www.alsumaria.tv/economy-news")
    if not s: return []
    m = re.search(r'"mainEntity":\{"@type":"ItemList".*?"itemListElement":\[(.*?)\]\}', s, re.S)
    if not m: return []
    out = []
    for u, name in re.findall(r'"url":"(https://www\.alsumaria\.tv/news/economy/\d+/[^"]+)","name":"([^"]+)"', m.group(1)):
        out.append({"url": u, "source": "alsumaria", "title": clean(name)[:300], "summary": None, "lang": "ar", "ticker": None, "published_at": NOW.isoformat()})
    return out

def rs() -> list[Item]:
    # Rabee's site is WordPress; its market notes are a `news` post type.
    try:
        rows = requests.get("https://rs.iq/wp-json/wp/v2/news?per_page=20&_fields=link,title,date,excerpt", headers=UA, timeout=20).json()
    except Exception as e:
        print("rs failed:", e, file=sys.stderr); return []
    out = []
    for x in rows if isinstance(rows, list) else []:
        title = clean(x.get("title", {}).get("rendered", "")); link = x.get("link", "")
        if not title or not link: continue
        out.append({"url": link, "source": "rs", "title": title[:300], "summary": (clean(x.get("excerpt", {}).get("rendered", ""))[:280] or None),
                    "lang": "ar" if re.search(r"[\u0600-\u06FF]", title) else "en", "ticker": None, "published_at": f"{x.get('date', NOW.isoformat())[:19]}+03:00"})
    return out

def cbi() -> list[Item]:
    s = get("https://cbi.iq/news")
    if not s: return []
    out, seen = [], set()
    for href, t in re.findall(r'<a[^>]+href="([^"]*/news/view/\d+)"[^>]*>(.*?)</a>', s, re.S):
        u = urljoin("https://cbi.iq/", href); title = clean(t)
        if u in seen or len(title) < 12: continue
        seen.add(u)
        out.append({"url": u, "source": "cbi", "title": title[:300], "summary": None, "lang": "ar" if re.search(r"[؀-ۿ]", title) else "en", "ticker": None, "published_at": NOW.isoformat()})
    return out

def rss(url: str, source: str, econ_only: bool) -> list[Item]:
    s = get(url)
    if not s: return []
    out = []
    for it in re.findall(r"<item>(.*?)</item>", s, re.S):
        g = lambda tag: (re.search(rf"<{tag}[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</{tag}>", it, re.S) or [None, ""])[1]
        title, link, desc, date = clean(g("title")), clean(g("link")), clean(g("description")), g("pubDate").strip()
        if not title or not link: continue
        if econ_only and not ECON.search(fold(title)): continue
        try: when = parsedate_to_datetime(date).astimezone(timezone.utc).isoformat()
        except Exception: when = NOW.isoformat()
        out.append({"url": link, "source": source, "title": title[:300], "summary": (desc[:280] or None), "lang": "ar", "ticker": None, "published_at": when})
    return out

SOURCES = [isc, alsumaria, rs, cbi, lambda: rss("https://almadapaper.net/?cat=economy&feed=rss2", "almada", True)]

def existing(urls: list[str]) -> set[str]:
    if not urls: return set()
    have = set()
    for i in range(0, len(urls), 100):
        chunk = ",".join(f'"{u}"' for u in urls[i:i + 100])
        r = requests.get(f"{SB_URL}/rest/v1/news_feed?select=url&url=in.({chunk})",
                         headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"}, timeout=30)
        if r.ok: have |= {x["url"] for x in r.json()}
    return have

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--dry-run", action="store_true"); args = ap.parse_args()
    items: list[Item] = []
    for fn in SOURCES:
        got = fn(); print(f"{fn.__name__ if hasattr(fn, '__name__') else 'rss'}: {len(got)}")
        items += got
    by_url = {it["url"]: it for it in items}
    if args.dry_run:
        for it in list(by_url.values())[:40]: print(" ", it["source"], "|", it["title"][:80], "|", it["published_at"][:10])
        return
    if not SB_URL or not SB_KEY: sys.exit("missing Supabase env")
    have = existing(list(by_url))
    # A story keeps the time it was first seen: an upsert would move every
    # listing-scraped item to "now" on every run. Only new URLs are written.
    new = [it for u, it in by_url.items() if u not in have]
    if new:
        r = requests.post(f"{SB_URL}/rest/v1/news_feed", json=new,
                          headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}", "Prefer": "resolution=ignore-duplicates,return=minimal", "Content-Type": "application/json"}, timeout=60)
        if not r.ok: sys.exit(f"insert failed: {r.status_code} {r.text[:200]}")
    cutoff = (NOW - timedelta(days=60)).isoformat()
    requests.delete(f"{SB_URL}/rest/v1/news_feed?published_at=lt.{cutoff}", headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"}, timeout=30)
    print(f"{len(new)} new of {len(by_url)}")

if __name__ == "__main__":
    main()
