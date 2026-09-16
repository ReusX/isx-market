#!/usr/bin/env python3
"""SEO regression audit: old build (3400) vs new build (3300), route by route."""
import re, sys, json, html, urllib.request, collections

OLD = 'http://localhost:3400'
NEW = 'http://localhost:3300'
ROUTES = [
    '/', '/market', '/companies', '/screener', '/heatmap', '/statistics',
    '/statistics/foreign-flow', '/statistics/ownership', '/statistics/shareholders',
    '/pulse', '/c/TASC', '/c/BBOB', '/c/TASC/financials', '/banks', '/banks/mansour',
    '/fx', '/gold', '/oil',
    '/en', '/en/market', '/en/companies', '/en/c/TASC', '/en/banks', '/en/fx', '/en/gold',
]

def get(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (audit)'})
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', 'replace')
    except Exception as e:
        return 0, ''

def head_attr(head, pat):
    m = re.search(pat, head, re.I)
    return html.unescape(m.group(1)).strip() if m else None

def extract(h):
    head = re.search(r'<head>([\s\S]*?)</head>', h)
    head = head.group(1) if head else ''
    # strip scripts/styles/svg from body text
    body = re.sub(r'<(script|style|svg|noscript)[\s\S]*?</\1>', ' ', h)
    # details content counts (it is in the HTML)
    text = html.unescape(re.sub(r'<[^>]+>', ' ', body))
    text = re.sub(r'\s+', ' ', text).strip()
    h1 = [re.sub(r'<[^>]+>', '', x).strip() for x in re.findall(r'<h1[^>]*>([\s\S]*?)</h1>', body)]
    h2 = [re.sub(r'<[^>]+>', '', x).strip() for x in re.findall(r'<h2[^>]*>([\s\S]*?)</h2>', body)]
    lds = []
    for l in re.findall(r'<script type="application/ld\+json">([\s\S]*?)</script>', h):
        try:
            d = json.loads(html.unescape(l))
            nodes = d.get('@graph', [d]) if isinstance(d, dict) else d
            for n in nodes:
                if isinstance(n, dict): lds.append(n.get('@type'))
        except Exception:
            lds.append('INVALID')
    links = set(re.findall(r'<a [^>]*href="(/[^"#?]*)', body))
    return {
        'title': head_attr(head, r'<title>(.*?)</title>'),
        'description': head_attr(head, r'<meta name="description" content="([^"]*)"'),
        'canonical': head_attr(head, r'<link rel="canonical" href="([^"]*)"'),
        'robots': head_attr(head, r'<meta name="robots" content="([^"]*)"'),
        'hreflang': sorted(re.findall(r'hrefLang="([^"]*)"', head, re.I)),
        'og:title': head_attr(head, r'property="og:title" content="([^"]*)"'),
        'og:description': head_attr(head, r'property="og:description" content="([^"]*)"'),
        'h1': h1, 'h2': h2, 'ld': sorted(set(x for x in lds if x)),
        'words': len(text.split()), 'links': links, 'text': text,
    }

def grams(text, n=3):
    w = [x for x in text.split() if re.search(r'[؀-ۿA-Za-z]', x) and not re.search(r'\d', x)]
    return set(' '.join(w[i:i+n]) for i in range(len(w)-n+1))

report = []
for r in ROUTES:
    so, ho = get(OLD + r); sn, hn = get(NEW + r)
    if so != 200 or sn != 200:
        report.append((r, [f'STATUS old={so} new={sn}'])); continue
    o, n = extract(ho), extract(hn)
    issues = []
    for k in ['title', 'description', 'canonical', 'robots', 'og:title', 'og:description']:
        if o[k] != n[k]: issues.append(f'{k}: OLD «{o[k]}» → NEW «{n[k]}»')
    if o['hreflang'] != n['hreflang']: issues.append(f'hreflang: {o["hreflang"]} → {n["hreflang"]}')
    if o['h1'] != n['h1']: issues.append(f'h1: {o["h1"]} → {n["h1"]}')
    if len(n['h1']) != 1: issues.append(f'h1 count = {len(n["h1"])}')
    lost_h2 = [x for x in o['h2'] if x and x not in n['text']]
    if lost_h2: issues.append(f'old h2 text no longer on page: {lost_h2}')
    lost_ld = [x for x in o['ld'] if x not in n['ld']]
    if lost_ld: issues.append(f'JSON-LD types lost: {lost_ld} (new has {n["ld"]})')
    if 'INVALID' in n['ld']: issues.append('invalid JSON-LD')
    go, gn = grams(o['text']), grams(n['text'])
    cov = len(go & gn) / max(1, len(go))
    if cov < 0.6: issues.append(f'old copy coverage {cov:.0%} (old {o["words"]} words → new {n["words"]})')
    if n['words'] < o['words'] * 0.5: issues.append(f'word count {o["words"]} → {n["words"]}')
    lost_links = sorted(l for l in o['links'] if l not in n['links'] and not l.startswith('/_next'))
    if len(lost_links) > 5: issues.append(f'{len(lost_links)} internal links no longer on page, e.g. {lost_links[:8]}')
    report.append((r, issues, cov, o['words'], n['words']))

for item in report:
    r, issues = item[0], item[1]
    extra = f'  (copy coverage {item[2]:.0%}, words {item[3]}→{item[4]})' if len(item) > 2 else ''
    print(('✓' if not issues else '✗'), r, extra)
    for i in issues: print('    ·', i)
