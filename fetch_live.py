import requests, json, datetime, os
from concurrent.futures import ThreadPoolExecutor, as_completed

H = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Origin': 'https://rs.iq',
    'Referer': 'https://rs.iq/',
    'rb-lang': '1',
    'Accept': 'application/json, text/plain, */*',
}

stocks = requests.get('https://appapi.rs.iq/api/SiteStock/StocksList', headers=H, timeout=20).json()
print(f"StocksList: {len(stocks)} stocks")

def fetch_detail(s):
    try:
        d = requests.get(
            f'https://appapi.rs.iq/api/SiteStock/StockdetailsById?StockId={s["StockID"]}',
            headers=H, timeout=20
        ).json()
        cp = d.get('ClosingPrice') or 0
        if cp <= 0:
            return None
        return {
            'code': s['StockCode'],
            'close': cp,
            'change': round(d.get('DDChange') or 0, 4),
            'pct': round(s.get('DTDPriceChange') or 0, 4),
            'vol': int(d.get('TradingVolume') or 0),
        }
    except Exception as e:
        print(f"  Skip {s['StockCode']}: {e}")
        return None

live_stocks = []
with ThreadPoolExecutor(max_workers=12) as ex:
    for r in as_completed([ex.submit(fetch_detail, s) for s in stocks]):
        v = r.result()
        if v:
            live_stocks.append(v)

print(f"Prices fetched: {len(live_stocks)}")

rsisx = requests.get('https://appapi.rs.iq/api/SiteStock/GetRSISXList?type=RSISX', headers=H, timeout=20).json()
latest = rsisx[-1] if rsisx else None

os.makedirs('data', exist_ok=True)
out = {
    'updated': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
    'stocks': live_stocks,
    'rsisx': {'value': latest['IQD'], 'date': latest['Date']} if latest else None
}
with open('data/live.json', 'w') as f:
    json.dump(out, f, separators=(',', ':'))
print(f"live.json written — {len(live_stocks)} stocks, RSISX={out['rsisx']}")

# ── Update hist.json with today's closing prices ──
# Timestamp convention: midnight Baghdad (UTC+3) = 21:00 UTC previous day
baghdad = datetime.timezone(datetime.timedelta(hours=3))
now_baghdad = datetime.datetime.now(baghdad)
today_midnight_baghdad = now_baghdad.replace(hour=0, minute=0, second=0, microsecond=0)
today_ts = int(today_midnight_baghdad.astimezone(datetime.timezone.utc).timestamp())

# Skip on weekends (Fri=4, Sat=5 in Baghdad)
weekday = today_midnight_baghdad.weekday()  # Mon=0 … Sun=6
if weekday in (4, 5):  # Friday or Saturday
    print(f"Weekend ({today_midnight_baghdad.strftime('%A')}) — skipping hist update")
else:
    hist_path = 'data/hist.json'
    if os.path.exists(hist_path):
        with open(hist_path) as f:
            hist = json.load(f)
    else:
        hist = {'s': {}, 'l': {}}

    price_map = {s['code']: s['close'] for s in live_stocks}
    updated_count = 0

    for sym, price in price_map.items():
        if price <= 0:
            continue
        for key, max_pts in [('s', 252), ('l', None)]:
            arr = hist[key].get(sym, [])
            # Only append if this timestamp isn't already there
            if not arr or arr[-1][0] != today_ts:
                arr.append([today_ts, round(price, 4)])
                if max_pts and len(arr) > max_pts:
                    arr = arr[-max_pts:]
                hist[key][sym] = arr
                if key == 's':
                    updated_count += 1

    with open(hist_path, 'w') as f:
        json.dump(hist, f, separators=(',', ':'))
    print(f"hist.json updated — {updated_count} symbols appended for {today_midnight_baghdad.date()}")
