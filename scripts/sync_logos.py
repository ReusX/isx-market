#!/usr/bin/env python3
"""Pull company logos from the Iraq Securities Commission and serve them locally.

ISC is the only public source that publishes ISX company logos (the exchange's
own portal has none, and rs.iq's API doesn't expose one). Their CDN is slow and
individual upload URLs have expired on us before, so we mirror the images into
public/logos/ and point companies.json at the local copy. Companies ISC has no
logo for keep logo unset — the UI draws an initial chip for those.

    python3 scripts/sync_logos.py [--dry-run]
"""
from __future__ import annotations

import json
import pathlib
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
COMPANIES = ROOT / 'public' / 'data' / 'companies.json'
LOGO_DIR = ROOT / 'public' / 'logos'
UA = {'User-Agent': 'Mozilla/5.0 (compatible; iraqsm-logo-sync)'}
ISC_BASE = 'https://isc.gov.iq'


def get(url: str) -> bytes:
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()


def isc_companies() -> dict[str, dict]:
    """code -> ISC record, across all three markets."""
    out: dict[str, dict] = {}
    for market in (1, 2, 3):
        page = 1
        while True:
            body = json.loads(get(f'https://api.isc.gov.iq/api/companies?market={market}&page={page}'))
            data = body.get('data', body)
            rows = data['data'] if isinstance(data, dict) and 'data' in data else data
            for row in rows:
                out[row['code']] = row
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


def main() -> int:
    dry = '--dry-run' in sys.argv
    companies = json.loads(COMPANIES.read_text(encoding='utf-8'))
    isc = isc_companies()
    LOGO_DIR.mkdir(parents=True, exist_ok=True)

    added, kept, dropped, failed = [], [], [], []
    for company in companies:
        sym = company['sym']
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
