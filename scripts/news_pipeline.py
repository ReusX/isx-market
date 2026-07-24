#!/usr/bin/env python3
"""
Automated ISX/Iraq finance news pipeline.
Scrapes → filters → rewrites in Arabic with Claude Haiku → posts to WordPress.

Sources:
  - RS.iq      : ISX news (all relevant, via Jina reader)
  - Alsumaria  : Iraq economy news (filtered for market/banking/FX relevance)
  - ISC        : Official commission announcements (clean REST API)

Setup:
    export WP_URL=https://paleturquoise-deer-610016.hostingersite.com
    export WP_USERNAME=your_wp_admin_username      # check WP Dashboard > Users
    export WP_APP_PASSWORD="Xm8D QRNQ 8g01 WDJ7 UfbQ 6cw5"
    export ANTHROPIC_API_KEY=sk-ant-...
    export NEXT_PUBLIC_SUPABASE_URL=...
    export SUPABASE_SERVICE_ROLE_KEY=...

Run:
    python3 scripts/news_pipeline.py             # post new articles
    python3 scripts/news_pipeline.py --dry-run   # rewrite but don't post
    python3 scripts/news_pipeline.py --limit 3   # max 3 articles per run
"""
from __future__ import annotations
import argparse, base64, json, os, re, sys, time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent

# ── env ────────────────────────────────────────────────────────────────────────
def _load_env():
    envf = ROOT / ".env.local"
    if envf.exists():
        for line in envf.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

_load_env()

WP_URL          = os.environ.get("WP_URL", "https://paleturquoise-deer-610016.hostingersite.com").rstrip("/")
WP_USER         = os.environ.get("WP_USERNAME", "")
WP_PASS         = os.environ.get("WP_APP_PASSWORD", "")
ANTH_KEY        = os.environ.get("ANTHROPIC_API_KEY", "")
# Proxy URL: GitHub Actions routes through Vercel to bypass Wordfence IP-block.
# Set PROXY_URL=https://iraqsm.com (or the Vercel deploy URL) in GH secrets.
# When unset, falls back to direct WP calls (works fine from local IPs).
PROXY_URL       = os.environ.get("PROXY_URL", "").rstrip("/")
# No hardcoded fallback: this repo is public, so a literal default would be a
# published shared secret. Must be supplied via env / GH secret.
PIPELINE_SECRET = os.environ.get("PIPELINE_SECRET", "")
SB_URL      = (os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL", ""))
SB_KEY      = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
if not SB_URL.startswith("http") and SB_URL:
    SB_URL = f"https://{SB_URL}.supabase.co"

WP_NEWS_CAT  = 2       # "news" category id in your WordPress
JINA_BASE    = "https://r.jina.ai/"
HOURS_BACK   = 48      # only pick up articles from last 48 hours

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; ISXMarketBot/1.0)"}

# ── Supabase dedup ─────────────────────────────────────────────────────────────
SB_H = lambda: {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}",
                "Content-Type": "application/json"}

def is_posted(source_url: str) -> bool:
    if not SB_URL or not SB_KEY:
        return False
    r = requests.get(f"{SB_URL}/rest/v1/news_pipeline_log",
                     headers=SB_H(), params={"source_url": f"eq.{source_url}", "select": "source_url"},
                     timeout=10)
    return bool(r.ok and r.json())

def mark_posted(source_url: str, wp_id: int, title: str):
    if not SB_URL or not SB_KEY:
        return
    requests.post(f"{SB_URL}/rest/v1/news_pipeline_log",
                  headers={**SB_H(), "Prefer": "resolution=merge-duplicates"},
                  json={"source_url": source_url, "wp_post_id": wp_id, "title": title,
                        "posted_at": datetime.now(timezone.utc).isoformat()},
                  timeout=10)

# ── Claude Haiku rewriter ──────────────────────────────────────────────────────
REWRITE_PROMPT = """\
أنت محرر أخبار متخصص في بورصة العراق للأوراق المالية (ISX Market).

اقرأ المقال/الإعلان التالي ثم أعد كتابته باللغة العربية وفق هذه التعليمات:

🎯 العنوان: جذاب يثير الفضول ويبدأ بالخبر مباشرة، بحد أقصى 65 حرفاً
✍️ الأسلوب: ودّي وواضح كأنك تشرح الموضوع لصديق مستثمر في البورصة، بعيداً عن الرسمية المملة
📊 السياق: اشرح ماذا يعني هذا الخبر للمستثمر العراقي؟ هل هو إيجابي أم سلبي؟ ولماذا؟
🔗 إذا كان هناك رابط PDF رسمي في المقال الأصلي، احتفظ به في نهاية المحتوى هكذا:
   <p>📄 <a href="URL">اطّلع على الوثيقة الرسمية هنا</a></p>
📏 الطول: 350-500 كلمة
🏗️ البنية: مقدمة (أهم معلومة أولاً) ← تفاصيل ← السياق والتأثير ← خلاصة

أعد JSON فقط بدون أي نص خارجه.
⚠️ مهم جداً للـ JSON: في حقل "content" استخدم وسوم HTML بدون attributes تحتوي علامات اقتباس. مثلاً: <p>نص</p> وليس <a href="...">. إذا أردت رابطاً ضعه في آخر الـ content كنص عادي.
{
  "title": "العنوان الجذاب هنا",
  "content": "<p>فقرة أولى.</p><p>فقرة ثانية.</p>",
  "excerpt": "ملخص في جملتين أو ثلاث",
  "seo_title": "العنوان | ISX Market",
  "seo_desc": "وصف 150-160 حرفاً",
  "focus_keyword": "كلمة مفتاحية",
  "image_query": "iraq finance stock market"
}

---
العنوان الأصلي: {title}

المحتوى:
{content}

المصدر: {source_name} ({source_url})
"""

RELEVANCE_PROMPT = """\
هل هذا المقال من Alsumaria ذو صلة مباشرة بأي من هذه الموضوعات:
- بورصة العراق أو أسهم الشركات المدرجة
- المصارف العراقية أو البنك المركزي (سياسات مالية، سعر الفائدة، الاحتياطيات)
- سعر صرف الدينار / الدولار في السوق العراقي
- النفط العراقي (إنتاج، صادرات، أسعار تؤثر على الميزانية)
- الميزانية العامة العراقية والإنفاق الحكومي
- الاستثمار الأجنبي في العراق

أجب فقط بـ YES أو NO.

العنوان: {title}
المقدمة: {excerpt}
"""

def claude_rewrite(article: dict) -> dict | None:
    if not ANTH_KEY:
        print("  ! ANTHROPIC_API_KEY not set — skipping rewrite")
        return None
    import anthropic
    client = anthropic.Anthropic(api_key=ANTH_KEY)

    content_text = article.get("content", "") or article.get("excerpt", "")
    if len(content_text) < 50:
        return None

    prompt = (REWRITE_PROMPT
        .replace("{title}", article["title"])
        .replace("{content}", content_text[:4000])
        .replace("{source_name}", article["source"])
        .replace("{source_url}", article["url"])
    )
    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1800,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        # strip markdown code fences
        raw = re.sub(r"^```json\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw).strip()
        # attempt direct parse
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            # try extracting first {...} block
            m = re.search(r'\{.*\}', raw, re.DOTALL)
            if m:
                try:
                    return json.loads(m.group())
                except json.JSONDecodeError:
                    pass
            # last resort: extract individual fields with regex
            def _grab(key):
                pat = rf'"{key}"\s*:\s*"((?:[^"\\]|\\.)*)"'
                fm = re.search(pat, raw, re.DOTALL)
                return fm.group(1) if fm else ""
            result = {k: _grab(k) for k in
                      ("title","content","excerpt","seo_title","seo_desc","focus_keyword","image_query")}
            if result.get("title"):
                return result
            raise
    except Exception as e:
        print(f"  ! Claude error: {e}")
        return None

def claude_is_relevant(title: str, excerpt: str) -> bool:
    if not ANTH_KEY:
        return True  # no key = accept all
    import anthropic
    client = anthropic.Anthropic(api_key=ANTH_KEY)
    try:
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=10,
            messages=[{"role": "user", "content": RELEVANCE_PROMPT
                .replace("{title}", title)
                .replace("{excerpt}", excerpt[:300])}],
        )
        return "YES" in msg.content[0].text.upper()
    except:
        return True

# ── scrapers ───────────────────────────────────────────────────────────────────
def jina_get(url: str) -> str:
    """Fetch any URL as clean markdown via Jina reader (bypasses Cloudflare/JS)."""
    r = requests.get(f"{JINA_BASE}{url}", headers={"Accept": "text/plain",
                     "User-Agent": HEADERS["User-Agent"]}, timeout=25)
    return r.text if r.ok else ""

def extract_og_image(url: str) -> str | None:
    """Get og:image from a page."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, "lxml")
        og = soup.find("meta", property="og:image")
        if og and og.get("content"):
            return og["content"]
    except:
        pass
    return None

def within_hours(date_str: str, hours: int = HOURS_BACK) -> bool:
    """Check if ISO date string is within the last N hours."""
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) - dt < timedelta(hours=hours)
    except:
        return True  # can't parse → include anyway


def scrape_rs_iq(hours_back: int = HOURS_BACK) -> list[dict]:
    """RS.iq ISX news — via Jina reader (Cloudflare blocks direct access)."""
    print("  [RS.iq] fetching article list…")
    md = jina_get("https://rs.iq/category/isx-news/")
    # extract article URLs from the Jina markdown
    article_urls = list(dict.fromkeys(
        re.findall(r"https://rs\.iq/isx-news/[^\s\)\"]+", md)
    ))
    articles = []
    for url in article_urls[:10]:  # cap at 10 per run
        if is_posted(url):
            continue
        print(f"    fetching {url}")
        body = jina_get(url)
        if len(body) < 200:
            continue
        # extract title from first # heading
        title_m = re.search(r"^#\s+(.+)", body, re.MULTILINE)
        title = title_m.group(1).strip() if title_m else url.split("/")[-2].replace("-", " ")
        # strip markdown to get readable content
        content = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", body)
        content = re.sub(r"[#*`]+", "", content).strip()

        # try to get og:image
        img = extract_og_image(url)

        articles.append({
            "source": "RS.iq",
            "url": url,
            "title": title,
            "content": content[:3000],
            "excerpt": content[:300],
            "image_url": img,
        })
        time.sleep(1)
    print(f"    → {len(articles)} new articles")
    return articles


def scrape_alsumaria(hours_back: int = HOURS_BACK) -> list[dict]:
    """Alsumaria economy news — filtered for ISX/banking/FX relevance."""
    print("  [Alsumaria] fetching article list…")
    md = jina_get("https://www.alsumaria.tv/economy-news")
    # extract article URLs from markdown
    article_urls = list(dict.fromkeys(
        re.findall(r"https://www\.alsumaria\.tv/news/economy/\d+/[^\s\)\"]+", md)
    ))
    articles = []
    for url in article_urls[:15]:
        if is_posted(url):
            continue
        # quick title extract from URL slug
        slug = urlparse(url).path.split("/")[-1]
        title_from_url = requests.utils.unquote(slug).replace("-", " ")

        # fetch article page via Jina for full content
        body = jina_get(url)
        title_m = re.search(r"^#\s+(.+)", body, re.MULTILINE)
        title = title_m.group(1).strip() if title_m else title_from_url

        content = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", body)
        content = re.sub(r"[#*`]+", "", content).strip()
        excerpt = content[:300]

        # relevance filter
        if not claude_is_relevant(title, excerpt):
            print(f"    ✗ skip (not relevant): {title[:60]}")
            continue
        print(f"    ✓ relevant: {title[:60]}")

        img = extract_og_image(url)
        articles.append({
            "source": "Alsumaria",
            "url": url,
            "title": title,
            "content": content[:3000],
            "excerpt": excerpt,
            "image_url": img,
        })
        time.sleep(1.5)
    print(f"    → {len(articles)} relevant new articles")
    return articles


def scrape_isc(hours_back: int = HOURS_BACK) -> list[dict]:
    """ISC official announcements — clean REST API with Arabic content + PDF links."""
    print("  [ISC] fetching announcements…")
    r = requests.get("https://api.isc.gov.iq/api/news?page=1", headers=HEADERS, timeout=15)
    if not r.ok:
        print(f"    ! ISC API error: {r.status_code}")
        return []

    articles = []
    for item in r.json().get("data", []):
        # ISC date format: "2026-06-18"
        if not within_hours(item.get("date", "") + "T00:00:00+00:00", hours_back):
            continue
        url = f"https://www.isc.gov.iq/news/{item['id']}"
        if is_posted(url):
            continue

        title = item.get("title_ar") or item.get("title_en", "")
        descr_ar = item.get("descr_ar", "") or ""
        descr_en = item.get("descr_en", "") or ""

        # extract PDF links from description HTML
        soup = BeautifulSoup(descr_ar or descr_en, "lxml")
        pdf_links = []
        for a in soup.find_all("a", href=True):
            if ".pdf" in a["href"].lower() or "upload" in a["href"].lower():
                pdf_links.append(a["href"])

        # plain text content
        content = soup.get_text(" ", strip=True)
        if pdf_links:
            content += "\n\nPDF_LINKS: " + " | ".join(pdf_links)

        # company name adds context (API returns string or dict)
        company = item.get("company", "")
        company_name = company if isinstance(company, str) else (company or {}).get("name", "")
        if company_name:
            title = f"{company_name}: {title}"

        img_url = item.get("img", "")
        if img_url and "placeholder" in img_url.lower():
            img_url = None

        articles.append({
            "source": "ISC",
            "url": url,
            "title": title,
            "content": content[:3000],
            "excerpt": content[:300],
            "image_url": img_url,
            "pdf_links": pdf_links,
        })

    print(f"    → {len(articles)} new announcements")
    return articles

# ── WordPress publisher ────────────────────────────────────────────────────────
def wp_auth_header() -> dict:
    creds = base64.b64encode(f"{WP_USER}:{WP_PASS}".encode()).decode()
    return {"Authorization": f"Basic {creds}"}

def wp_upload_image(img_bytes: bytes, filename: str, mime: str = "image/jpeg") -> int | None:
    """Upload image to WP media library, return media ID."""
    try:
        r = requests.post(
            f"{WP_URL}/wp-json/wp/v2/media",
            headers={**wp_auth_header(), "Content-Disposition": f'attachment; filename="{filename}"',
                     "Content-Type": mime},
            data=img_bytes, timeout=30,
        )
        if r.ok:
            return r.json().get("id")
        print(f"  ! image upload failed: {r.status_code} {r.text[:100]}")
    except Exception as e:
        print(f"  ! image upload error: {e}")
    return None

def get_image(article: dict, image_query: str) -> tuple[bytes | None, str]:
    """Return (image_bytes, mime_type). Try article image → Unsplash → None."""
    # 1. Article's own image
    img_url = article.get("image_url")
    if img_url:
        try:
            r = requests.get(img_url, headers=HEADERS, timeout=10)
            ct = r.headers.get("content-type", "image/jpeg")
            if r.ok and "image" in ct:
                return r.content, ct.split(";")[0]
        except:
            pass

    # 2. Unsplash random image by query
    if image_query:
        query = image_query.strip().replace(" ", ",")
        try:
            r = requests.get(
                f"https://source.unsplash.com/1200x630/?{query}",
                headers=HEADERS, timeout=15, allow_redirects=True,
            )
            if r.ok and "image" in r.headers.get("content-type", ""):
                return r.content, "image/jpeg"
        except:
            pass

    return None, "image/jpeg"

def wp_post(rewritten: dict, article: dict, dry_run: bool = False) -> int | None:
    """Create a WordPress post with Yoast SEO meta. Returns WP post ID.

    Routes through the Vercel proxy (/api/wp-publish) when PROXY_URL is set,
    so GitHub Actions IPs bypass Wordfence's IP block on the Hostinger server.
    Falls back to direct WP REST calls (works fine from local/trusted IPs).
    """
    if dry_run:
        print(f"  [DRY-RUN] would post: {rewritten['title']}")
        return None

    img_url = article.get("image_url")
    content = rewritten["content"]
    if img_url and "placeholder" not in img_url.lower():
        content = f'<figure class="wp-block-image"><img src="{img_url}" alt="{rewritten["title"]}" /></figure>\n\n' + content

    payload = {
        "title":      rewritten["title"],
        "content":    content,
        "excerpt":    rewritten.get("excerpt", ""),
        "status":     "publish",
        "categories": [WP_NEWS_CAT],
        "meta": {
            "_yoast_wpseo_title":    rewritten.get("seo_title", rewritten["title"]),
            "_yoast_wpseo_metadesc": rewritten.get("seo_desc", ""),
            "_yoast_wpseo_focuskw":  rewritten.get("focus_keyword", ""),
            "_yoast_wpseo_canonical": article["url"],
        },
    }

    if PROXY_URL:
        # Route through Vercel proxy to avoid Wordfence IP-blocking GH Actions.
        # Send WP credentials as X-Wp-Auth (base64 user:pass) so the proxy can
        # forward them to WordPress even without Vercel env vars configured.
        wp_b64 = base64.b64encode(f"{WP_USER}:{WP_PASS}".encode()).decode()
        r = requests.post(
            f"{PROXY_URL}/api/wp-publish",
            headers={
                "Content-Type":      "application/json",
                "X-Pipeline-Secret": PIPELINE_SECRET,
                "X-Wp-Auth":         wp_b64,
            },
            json={"endpoint": "/wp-json/wp/v2/posts", "method": "POST", "payload": payload},
            timeout=40,
        )
    else:
        r = requests.post(
            f"{WP_URL}/wp-json/wp/v2/posts",
            headers={**wp_auth_header(), "Content-Type": "application/json"},
            json=payload, timeout=30,
        )

    if r.ok:
        wp_id = r.json().get("id")
        wp_link = r.json().get("link", "")
        print(f"  ✓ posted → {wp_link} (id={wp_id})")
        return wp_id
    else:
        print(f"  ! WP post failed: {r.status_code} {r.text[:300]}")
        return None

# ── main ───────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run",  action="store_true", help="rewrite but don't post to WP")
    ap.add_argument("--limit",    type=int, default=10, help="max articles per run (default 10)")
    ap.add_argument("--source",   choices=["rs", "alsumaria", "isc", "all"], default="all")
    ap.add_argument("--hours",    type=int, default=HOURS_BACK, help="look back N hours")
    args = ap.parse_args()

    if not ANTH_KEY:
        sys.exit("Set ANTHROPIC_API_KEY")
    if not dry_run_mode(args) and (not WP_USER or not WP_PASS):
        sys.exit("Set WP_USERNAME and WP_APP_PASSWORD")

    print(f"\n{'='*60}")
    print(f"News pipeline — {datetime.now().strftime('%Y-%m-%d %H:%M')} UTC")
    print(f"{'='*60}")

    # collect from all sources
    articles: list[dict] = []
    if args.source in ("rs", "all"):
        articles += scrape_rs_iq(args.hours)
    if args.source in ("alsumaria", "all"):
        articles += scrape_alsumaria(args.hours)
    if args.source in ("isc", "all"):
        articles += scrape_isc(args.hours)

    if not articles:
        print("\nNo new articles found.")
        return

    print(f"\n{len(articles)} total new articles — rewriting with Claude Haiku…\n")
    posted = 0
    for i, article in enumerate(articles[:args.limit]):
        print(f"[{i+1}/{min(len(articles), args.limit)}] {article['source']}: {article['title'][:70]}")
        rewritten = claude_rewrite(article)
        if not rewritten:
            print("  ! rewrite failed — skipping")
            continue

        wp_id = wp_post(rewritten, article, dry_run=args.dry_run)
        if wp_id:
            mark_posted(article["url"], wp_id, rewritten["title"])
            posted += 1
        time.sleep(2)  # be gentle on WP

    print(f"\n{'='*60}")
    print(f"Done. Posted {posted} article(s).")

def dry_run_mode(args) -> bool:
    return args.dry_run

if __name__ == "__main__":
    main()
