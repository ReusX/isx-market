import { NextResponse } from 'next/server'

/**
 * RSISX · Rabee Securities' Iraq index, in IQD and USD.
 *
 * Rabee's endpoint answers only to browser-shaped requests from rs.iq, so
 * the page cannot call it directly; this route calls it from the server and
 * hands back one clean, sorted, ISO-dated series. The upstream list is
 * unsorted and dated M/D/YYYY.
 *
 * `force-dynamic` keeps Next's Data Cache from freezing the upstream fetch
 * (the same trap that froze the company charts); the Cache-Control header
 * lets the CDN hold it for an hour, which is plenty for a once-a-day index.
 */
/* Cached: the index moves once a session, and a live upstream fetch per
   homepage visit was a function invocation and a Rabee request each time. */
export const revalidate = 3600

const UPSTREAM = 'https://appapi.rs.iq/api/SiteStock/GetRSISXList?type=RSISX'

export async function GET() {
  try {
    const res = await fetch(UPSTREAM, {
      next: { revalidate: 3600 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Origin: 'https://rs.iq',
        Referer: 'https://rs.iq/',
        'rb-lang': '1',
        Accept: 'application/json, text/plain, */*',
      },
    })
    if (!res.ok) return NextResponse.json({ error: `upstream ${res.status}` }, { status: 502 })
    const raw = (await res.json()) as { Date: string; IQD: string; USD: string }[]
    const rows = raw
      .map((r) => {
        const [m, d, y] = r.Date.split('/')
        return { date: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`, iqd: Number(r.IQD), usd: Number(r.USD) }
      })
      .filter((r) => r.iqd > 0 && r.usd > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
    return NextResponse.json(rows, {
      headers: { 'Cache-Control': 'public, max-age=0, must-revalidate, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 502 })
  }
}
