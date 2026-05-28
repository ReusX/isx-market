import { NextRequest, NextResponse } from 'next/server'

const RS_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Origin': 'https://rs.iq',
  'Referer': 'https://rs.iq/',
  'rb-lang': '1',
}

// Module-level cache: { stockId, fetchedAt, data[] }
const cache = new Map<string, { fetchedAt: number; data: { date: string; close: number }[] }>()
let stockListCache: { fetchedAt: number; map: Record<string, number> } | null = null

const TTL = 15 * 60 * 1000  // 15 min

async function getStockId(sym: string): Promise<number | null> {
  if (!stockListCache || Date.now() - stockListCache.fetchedAt > TTL * 4) {
    const res = await fetch('https://appapi.rs.iq/api/SiteStock/StocksList', { headers: RS_HEADERS })
    if (!res.ok) return null
    const list: { StockID: number; StockCode: string }[] = await res.json()
    const map: Record<string, number> = {}
    for (const s of list) map[s.StockCode] = s.StockID
    stockListCache = { fetchedAt: Date.now(), map }
  }
  return stockListCache.map[sym] ?? null
}

export async function GET(req: NextRequest, { params }: { params: { sym: string } }) {
  const sym = params.sym.toUpperCase()

  // Return cached data if fresh
  const cached = cache.get(sym)
  if (cached && Date.now() - cached.fetchedAt < TTL) {
    return NextResponse.json(cached.data, {
      headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300' },
    })
  }

  try {
    const stockId = await getStockId(sym)
    if (!stockId) {
      return NextResponse.json([], { status: 200 })
    }

    const res = await fetch(
      `https://appapi.rs.iq/api/SiteStock/StockdetailsById?StockId=${stockId}`,
      { headers: RS_HEADERS }
    )
    if (!res.ok) return NextResponse.json([], { status: 200 })

    const detail = await res.json()
    const list: { ISXCode: string; ISXDate: string; ClosingPrice: number | null }[] =
      detail.SiteRsIndexList ?? []

    const data = list
      .filter(e => e.ClosingPrice != null && e.ClosingPrice > 0)
      .map(e => ({
        date:  e.ISXDate.slice(0, 10),   // "YYYY-MM-DD"
        close: e.ClosingPrice as number,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    cache.set(sym, { fetchedAt: Date.now(), data })

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300' },
    })
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
