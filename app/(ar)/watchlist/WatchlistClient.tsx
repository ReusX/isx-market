'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { useMarketData, usePortfolio } from '@/lib/portfolio'
import { sectorLabel, SECTOR_LABELS } from '@/lib/screener'
import { iqd, nf0 } from '@/lib/statistics'
import TickerPicker from '@/components/TickerPicker'
import '@/styles/panels.css'
import '@/styles/data-table.css'
import '@/styles/portfolio.css'
import './watchlist.css'

/**
 * قائمة المتابعة — a direct port of the approved watchlist page.
 *
 * The store is `profiles.watchlist` plus `isx_watchlist`: A FLAT ARRAY OF
 * TICKERS. That single fact settles the feature set — one list, no names, no
 * create/rename/delete, no notes, no tags, no date-added. What the array does
 * preserve is INSERTION ORDER, which is a real default sort and is used as one.
 * Membership is a toggle, so adding a company already on the list is
 * impossible by construction; the picker still shows that state, because
 * someone searching for a company they already watch needs to know.
 *
 * The defect this corrects: the old page filtered on `c.close > 0`, so a
 * watched company with no current price DISAPPEARED — not marked unavailable,
 * gone — leaving the user believing they had removed it while the header count
 * silently disagreed. The row stays, the quote is marked unavailable, and the
 * tally says how many.
 */

const FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'up', label: 'رابحة' },
  { id: 'down', label: 'خاسرة' },
] as const
type FilterId = (typeof FILTERS)[number]['id']
type SortId = 'order' | 'price' | 'pct' | 'mcap'

type Row = {
  sym: string; name: string; sector: string | null
  price: number | null; pct: number | null
  mcap: number | null; staleDays: number | null
  owned: boolean
}

const pctFmt = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}%`

export default function WatchlistClient() {
  const { user, watchlist, toggleWatchlist } = useApp()
  const { meta, metaBy, quotes, loading } = useMarketData()
  const { lots } = usePortfolio()

  const [filter, setFilter] = useState<FilterId>('all')
  const [sort, setSort] = useState<SortId>('order')
  const [dir, setDir] = useState<'desc' | 'asc'>('desc')
  const [query, setQuery] = useState('')
  const [sector, setSector] = useState('ALL')
  const [adding, setAdding] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)

  const ownedSyms = useMemo(() => new Set(lots.map(l => l.sym)), [lots])

  const rows: Row[] = useMemo(() => watchlist.map((sym, i) => {
    const m = metaBy.get(sym)
    const q = quotes[sym] ?? null
    const price = q?.price ?? null
    const pct = q && q.prev != null && q.prev > 0 ? ((q.price - q.prev) / q.prev) * 100 : null
    return {
      sym,
      name: m?.ar || m?.en || sym,
      sector: m?.sec ? String(m.sec) : null,
      price, pct,
      // Market cap from the live price where we have one; the static figure in
      // companies.json is a stale snapshot and is not substituted for it.
      mcap: price != null && m?.shares ? price * m.shares : null,
      staleDays: q?.staleDays ?? null,
      owned: ownedSyms.has(sym),
      _order: i,
    } as Row & { _order: number }
  }), [watchlist, metaBy, quotes, ownedSyms])

  const tally = useMemo(() => ({
    total: rows.length,
    up: rows.filter(r => r.pct != null && r.pct > 0).length,
    down: rows.filter(r => r.pct != null && r.pct < 0).length,
    flat: rows.filter(r => r.pct === 0).length,
    noQuote: rows.filter(r => r.price == null).length,
  }), [rows])

  const sectors = useMemo(() => {
    const ids = Array.from(new Set(rows.map(r => r.sector).filter(Boolean) as string[]))
    return ids.filter(id => SECTOR_LABELS[id]).map(id => ({ id, label: sectorLabel(id, 'ar') }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ar'))
  }, [rows])

  const filtering = filter !== 'all' || sector !== 'ALL' || query.trim() !== ''

  const view = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = rows.filter(r => {
      if (filter === 'up' && !(r.pct != null && r.pct > 0)) return false
      if (filter === 'down' && !(r.pct != null && r.pct < 0)) return false
      if (sector !== 'ALL' && r.sector !== sector) return false
      if (!q) return true
      return r.sym.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    })
    if (sort === 'order') return out
    const key = (r: Row) =>
      sort === 'price' ? (r.price ?? -Infinity)
      : sort === 'pct' ? (r.pct ?? -Infinity)
      : (r.mcap ?? -Infinity)
    return [...out].sort((a, b) => (dir === 'desc' ? key(b) - key(a) : key(a) - key(b)))
  }, [rows, filter, sector, query, sort, dir])

  const signedOut = !user

  return (
    <main className="wl-page iq-page" onClick={() => setMenu(null)}>
      <header className="pf-head">
        <div className="st-title">
          <h1>قائمة المتابعة</h1>
          <p>
            <span className="pf-private" title="بيانات خاصة بك"><i aria-hidden="true">◆</i> خاصة بك</span>
            <span className="pf-dot" aria-hidden="true">·</span>
            {signedOut ? 'محفوظة على هذا الجهاز' : 'مُزامنة مع حسابك'}
            <span className="pf-dot" aria-hidden="true">·</span>
            قائمة واحدة، بترتيب الإضافة
          </p>
        </div>
        <div className="st-head-actions">
          <button type="button" className="pf-add" onClick={() => setAdding(a => !a)}
            aria-expanded={adding}>
            <i aria-hidden="true">+</i> إضافة شركة
          </button>
        </div>
      </header>

      {adding ? (
        <div className="wl-add" onClick={e => e.stopPropagation()}>
          <label className="pf-field">
            <span>ابحث عن شركة لإضافتها</span>
            <TickerPicker meta={meta} value=""
              onChange={sym => { if (sym) { if (!watchlist.includes(sym)) toggleWatchlist(sym); setAdding(false) } }} />
          </label>
          <p className="pf-hint">
            المتابعة تبديل: الشركة الموجودة في قائمتك بالفعل لا تُضاف مرتين.
          </p>
        </div>
      ) : null}

      {signedOut ? (
        <div className="pf-signin">
          <div>
            <strong>قائمتك محفوظة على هذا الجهاز</strong>
            <p>سجّل الدخول لمزامنتها عبر أجهزتك. تبقى بياناتك خاصة بك في الحالتين.</p>
          </div>
          <Link className="pf-signin-go" href="/login">تسجيل الدخول</Link>
        </div>
      ) : null}

      {loading ? (
        <div className="pf-panel"><span className="pl-skel" style={{ blockSize: 360, borderRadius: 16 }} /></div>
      ) : !rows.length ? (
        <section className="pf-empty">
          <strong>لا شركات في قائمتك بعد</strong>
          <p>أضف شركات لمتابعة أسعارها وتغيّرها في مكان واحد، أو استخدم نجمة المتابعة في صفحة أي شركة.</p>
          <button type="button" className="pf-add pf-add-lg" onClick={() => setAdding(true)}>
            <i aria-hidden="true">+</i> إضافة أول شركة
          </button>
          <span className="pf-empty-note">تُحفظ قائمتك على جهازك، وتُزامَن عند تسجيل الدخول.</span>
        </section>
      ) : (
        <section className="pf-panel wl-panel">
          <div className="wl-tally">
            <span className="wl-count"><bdi>{tally.total}</bdi> شركة</span>
            <span className="wl-sep" aria-hidden="true">·</span>
            <span className="wl-up"><bdi>{tally.up}</bdi> رابحة</span>
            <span className="wl-down"><bdi>{tally.down}</bdi> خاسرة</span>
            <span className="wl-flat"><bdi>{tally.flat}</bdi> ثابتة</span>
            {tally.noQuote ? (
              <span className="wl-noquote"><bdi>{tally.noQuote}</bdi> بلا سعر حالي</span>
            ) : null}
          </div>

          <div className="wl-controls">
            <div className="st-switch wl-filters" role="group" aria-label="تصفية">
              {FILTERS.map(f => (
                <button key={f.id} type="button" className={filter === f.id ? 'active' : ''}
                  aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
              ))}
            </div>
            <label className="wl-mv-search wl-search">
              <span className="sr-only">ابحث في قائمتك</span>
              <input type="search" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="ابحث في قائمتك" aria-label="ابحث في قائمتك" />
            </label>
            {sectors.length > 1 ? (
              <label className="wl-mv-select wl-sector">
                <span className="sr-only">القطاع</span>
                <select value={sector} onChange={e => setSector(e.target.value)} aria-label="تصفية حسب القطاع">
                  <option value="ALL">كل القطاعات</option>
                  {sectors.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
            ) : null}
          </div>

          {filtering ? (
            <p className="wl-filtered">
              <bdi>{view.length}</bdi> من <bdi>{rows.length}</bdi> مطابقة
              <button type="button" className="pf-cancel"
                onClick={() => { setFilter('all'); setSector('ALL'); setQuery('') }}>إعادة التعيين</button>
            </p>
          ) : null}

          {!view.length ? (
            <div className="cd-nodata">
              <strong>لا شركات مطابقة</strong>
              <p>غيّر التصفية أو امسح البحث — الشركات ما زالت في قائمتك.</p>
            </div>
          ) : (
            <div className="mv-board-scroll wl-scroll">
              <table className="mv-table wl-table">
                <thead>
                  <tr>
                    <th scope="col" className="mv-col-company wl-col-co">الشركة</th>
                    <Th id="price" label="السعر" sort={sort} dir={dir} setSort={setSort} setDir={setDir} />
                    <Th id="pct" label="التغيّر" sort={sort} dir={dir} setSort={setSort} setDir={setDir} />
                    <Th id="mcap" label="القيمة السوقية" sort={sort} dir={dir} setSort={setSort} setDir={setDir} />
                    <th scope="col" className="wl-col-sec">القطاع</th>
                    <th scope="col" className="pf-col-act"><span className="sr-only">إجراءات</span></th>
                  </tr>
                </thead>
                <tbody>
                  {view.map(r => (
                    <tr key={r.sym} className={`wl-row${r.price == null ? ' is-noquote' : ''}`}>
                      <td className="mv-col-company wl-col-co">
                        {/* Arabic name leads, ticker beneath. */}
                        <Link className="mv-identity wl-identity" href={`/c/${r.sym.toLowerCase()}`}>
                          <span className="mv-identity-name" title={r.name}>{r.name}</span>
                          <span className="wl-co-sub">
                            <bdi className="mv-ticker">{r.sym}</bdi>
                            {r.owned ? <span className="wl-badge is-owned">في المحفظة</span> : null}
                          </span>
                        </Link>
                      </td>
                      <td className="mv-col-num">
                        {r.price == null ? (
                          <span className="pf-nodata" title="لم يصل سعر حالي لهذه الشركة">
                            <span className="mv-dash">—</span><small>لا سعر</small>
                          </span>
                        ) : (
                          <span className="pf-price">
                            <bdi>{r.price.toFixed(2)}</bdi>
                            {r.staleDays != null && r.staleDays > 1
                              ? <small className="pf-stale">مُرحّل · <bdi>{r.staleDays}</bdi> جلسة</small>
                              : null}
                          </span>
                        )}
                      </td>
                      <td className="mv-col-num">
                        {r.pct == null ? <span className="mv-dash">—</span> : (
                          <span className={`mv-pct ${r.pct > 0 ? 'positive' : r.pct < 0 ? 'negative' : ''}`}>
                            {/* A caret as well as the colour: direction must
                                survive a reader who cannot separate red from green. */}
                            <i className="mv-caret" aria-hidden="true">{r.pct > 0 ? '▲' : r.pct < 0 ? '▼' : '■'}</i>
                            <bdi>{pctFmt(r.pct)}</bdi>
                          </span>
                        )}
                      </td>
                      <td className="mv-col-num">
                        {r.mcap == null ? <span className="mv-dash">—</span> : <bdi>{iqd(r.mcap)}</bdi>}
                      </td>
                      <td className="wl-col-sec">{r.sector ? sectorLabel(r.sector, 'ar') : <span className="mv-dash">—</span>}</td>
                      <td className="pf-col-act">
                        <button type="button" className="pf-menu-btn"
                          onClick={e => { e.stopPropagation(); setMenu(m => (m === r.sym ? null : r.sym)) }}
                          aria-haspopup="menu" aria-expanded={menu === r.sym}
                          aria-label={`إجراءات ${r.name}`}>⋯</button>
                        {menu === r.sym ? (
                          <div className="pf-menu" role="menu" onClick={e => e.stopPropagation()}>
                            <Link role="menuitem" href={`/c/${r.sym.toLowerCase()}`}>صفحة الشركة</Link>
                            <button type="button" role="menuitem" className="pf-menu-danger"
                              onClick={() => { toggleWatchlist(r.sym); setMenu(null) }}>
                              إزالة من المتابعة
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="st-foot">
            القائمة واحدة ومخزّنة كمصفوفة رموز، ولذلك لا توجد قوائم متعددة ولا ملاحظات ولا تاريخ إضافة.
            {tally.noQuote ? ' الشركات بلا سعر حالي تبقى معروضة بدل أن تختفي من القائمة.' : ''}
          </p>
        </section>
      )}
    </main>
  )
}

function Th({ id, label, sort, dir, setSort, setDir }: {
  id: SortId; label: string; sort: SortId; dir: 'desc' | 'asc'
  setSort: (s: SortId) => void; setDir: (d: 'desc' | 'asc') => void
}) {
  const on = sort === id
  return (
    <th scope="col" className="mv-col-num"
      aria-sort={on ? (dir === 'desc' ? 'descending' : 'ascending') : 'none'}>
      <button type="button" className={on ? 'st-sort is-active' : 'st-sort'}
        onClick={() => { if (on) setDir(dir === 'desc' ? 'asc' : 'desc'); else { setSort(id); setDir('desc') } }}>
        {label}<i aria-hidden="true">{on ? (dir === 'desc' ? '▾' : '▴') : '·'}</i>
      </button>
    </th>
  )
}
