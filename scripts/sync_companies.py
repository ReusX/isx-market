#!/usr/bin/env python3
"""Refresh companies.json against the Iraq Securities Commission register.

Two fields come from the same ISC records:

* `logo` — ISC is the only public source that publishes ISX company logos (the
  exchange's own portal has none, and rs.iq's API doesn't expose one). Their CDN
  is slow and individual upload URLs have expired on us before, so we mirror the
  images into public/logos/ and point companies.json at the local copy.
  Companies ISC has no logo for keep logo unset — the UI draws an initial chip.

* `shares` — ISX shares carry a par value of 1 IQD, so paid-in capital *is* the
  share count. Every market cap on the site is close x shares, and so are the
  P/E, P/S and P/B ratios on a company page, so a missing or stale share count
  silently falls back to a frozen snapshot rather than failing visibly.

It also refreshes `mcap`, the static market cap in millions. Every page that
can prices a company live (close x shares); `mcap` is the fallback for names
with no quote at all, plus the server-rendered profile text on /c/[sym], so it
is re-snapshotted here against the latest session rather than left to drift.

    python3 scripts/sync_companies.py [--dry-run]
"""
from __future__ import annotations

import json
import pathlib
import re
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
COMPANIES = ROOT / 'public' / 'data' / 'companies.json'
LOGO_DIR = ROOT / 'public' / 'logos'
ENV = ROOT / '.env.local'
UA = {'User-Agent': 'Mozilla/5.0 (compatible; iraqsm-company-sync)'}
ISC_BASE = 'https://isc.gov.iq'


def get(url: str, headers: dict | None = None) -> bytes:
    return urllib.request.urlopen(
        urllib.request.Request(url, headers={**UA, **(headers or {})}), timeout=30).read()


def latest_closes() -> dict[str, float]:
    """ticker -> last traded close, from our own daily_prices."""
    try:
        env = dict(re.findall(r'^(\w+)=(.*)$', ENV.read_text(encoding='utf-8'), re.M))
        base = env['NEXT_PUBLIC_SUPABASE_URL'].strip()
        key = (env.get('SUPABASE_SERVICE_ROLE_KEY') or env['NEXT_PUBLIC_SUPABASE_ANON_KEY']).strip()
    except (OSError, KeyError):
        print('no .env.local — skipping the market-cap snapshot')
        return {}
    auth = {'apikey': key, 'Authorization': f'Bearer {key}'}
    rows = json.loads(get(f'{base}/rest/v1/latest_trade?select=ticker,close', auth))
    return {r['ticker']: r['close'] for r in rows if r.get('close')}


def isc_companies() -> dict[str, dict]:
    """code -> ISC record. Markets 4 and 5 hold the suspended and non-listed
    names — skipping them left a fifth of the board without a share count."""
    out: dict[str, dict] = {}
    for market in (1, 2, 3, 4, 5):
        page = 1
        while True:
            body = json.loads(get(f'https://api.isc.gov.iq/api/companies?market={market}&page={page}'))
            data = body.get('data', body)
            rows = data['data'] if isinstance(data, dict) and 'data' in data else data
            for row in rows:
                # A few codes are stored with padding ("NGAT ").
                out[str(row['code']).strip()] = row
            last = (data.get('last_page') if isinstance(data, dict) else None) or body.get('last_page')
            if not last or page >= last:
                break
            page += 1
    return out


def logo_url(record: dict) -> str | None:
    img = record.get('img')
    if not img or 'placeholder' in str(img):
        return None
    return img if str(img).startswith('http') else ISC_BASE + str(img)


def shrink(blob: bytes, box: int = 128) -> bytes:
    """Normalise to a small PNG. ISC uploads raw scans — some are 3500px and
    800KB — and most sit inside a wide field of white, which would render as a
    hairline once contained in a 28px chip. So trim the surrounding blank
    margin first, then downscale."""
    try:
        import io

        from PIL import Image, ImageChops
    except ImportError:
        return blob
    img = Image.open(io.BytesIO(blob))
    img = img.convert('RGBA') if img.mode in ('RGBA', 'LA', 'P') else img.convert('RGB')

    if img.mode == 'RGBA':
        bbox = img.getchannel('A').getbbox()
    else:
        # Anything within ~4% of the corner pixel counts as background.
        bg = Image.new('RGB', img.size, img.getpixel((0, 0)))
        bbox = ImageChops.difference(img, bg).convert('L').point(lambda p: 255 if p > 10 else 0).getbbox()
    if bbox:
        pad = max(2, min(img.size) // 100)
        img = img.crop((
            max(0, bbox[0] - pad), max(0, bbox[1] - pad),
            min(img.width, bbox[2] + pad), min(img.height, bbox[3] + pad),
        ))

    img.thumbnail((box, box), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, format='PNG', optimize=True)
    return out.getvalue()


def paid_capital(record: dict) -> int | None:
    """Share count = paid-in capital, since ISX par value is 1 IQD."""
    try:
        value = float(record.get('capital'))
    except (TypeError, ValueError):
        return None
    # A capital under a million dinars is a parse artefact, not a listed company.
    return int(value) if value >= 1_000_000 else None


def main() -> int:
    dry = '--dry-run' in sys.argv
    companies = json.loads(COMPANIES.read_text(encoding='utf-8'))
    isc = isc_companies()
    LOGO_DIR.mkdir(parents=True, exist_ok=True)

    closes = latest_closes()

    added, kept, dropped, failed, capital, caps = [], [], [], [], [], 0
    for company in companies:
        sym = company['sym']

        shares = paid_capital(isc.get(sym, {}))
        if shares and shares != company.get('shares'):
            capital.append(f'{sym}: {company.get("shares") or "—"} → {shares:,}')
            company['shares'] = shares

        close = closes.get(sym)
        if close and company.get('shares'):
            company['mcap'] = round(close * company['shares'] / 1e6)
            caps += 1

        url = logo_url(isc.get(sym, {}))
        if not url:
            # ISC occasionally drops the img field on a record whose upload URL
            # still resolves. Keep mirroring the last URL we knew rather than
            # regressing a company back to a letter chip.
            previous = company.get('logo')
            url = previous if previous and previous.startswith('http') else None
        if not url:
            if company.get('logo') and not company['logo'].startswith('/logos/'):
                dropped.append(sym)
                company.pop('logo', None)
            continue
        ext = '.svg' if url.split('?')[0].lower().endswith('.svg') else '.png'
        rel = f'/logos/{sym}{ext}'
        try:
            if not dry:
                blob = get(url)
                if len(blob) < 200:
                    raise ValueError(f'suspiciously small ({len(blob)} bytes)')
                (LOGO_DIR / f'{sym}{ext}').write_bytes(blob if ext == '.svg' else shrink(blob))
        except Exception as exc:  # noqa: BLE001 - report and keep going
            failed.append(f'{sym}: {exc}')
            continue
        (added if company.get('logo') != rel else kept).append(sym)
        company['logo'] = rel

    if not dry:
        # Keep the file's existing single-line shape so the diff stays readable.
        COMPANIES.write_text(json.dumps(companies, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    if caps:
        print(f're-snapshotted the static market cap for {caps} companies')
    if capital:
        print(f'share count updated for {len(capital)}:')
        for line in capital:
            print(f'  {line}')
    missing_shares = [c['sym'] for c in companies if not c.get('shares')]
    if missing_shares:
        print(f'{len(missing_shares)} companies still have no share count '
              f'(market cap falls back to the static snapshot): {", ".join(missing_shares)}')

    print(f'mirrored {len(added) + len(kept)} logos ({len(added)} new/changed, {len(kept)} unchanged)')
    if dropped:
        print(f'no logo at ISC any more, cleared: {", ".join(dropped)}')
    if failed:
        print('failed:\n  ' + '\n  '.join(failed))
    no_logo = [c['sym'] for c in companies if not c.get('logo')]
    print(f'{len(no_logo)} companies have no ISC logo (initial chip): {", ".join(no_logo)}')
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
