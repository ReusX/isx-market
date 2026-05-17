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
print(f"Done — {len(live_stocks)} stocks, RSISX={out['rsisx']}")
