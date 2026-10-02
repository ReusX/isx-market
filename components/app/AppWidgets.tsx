'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { CURRENCY_CODES, CURRENCY_FLAGS, type CurrencyCode } from '@/lib/currencies'
import { haptic } from '@/lib/appMode'
import companiesData from '@/public/data/companies.json'
import { unitOf, POPULAR } from './AppRates'
import { nf0, nf2, fmtAny } from './RateKit'
import '@/styles/app.css'

/**
 * /app/widgets · customise the home-screen widgets: for each placed widget,
 * its colour and what each slot shows (the dollar, any currency, a gold karat,
 * any listed company, ISX60). Settings go to the native side through the
 * IQWidget plugin (android/…/IQWidgetPlugin.java) and the widget redraws at
 * once. The preview here mirrors the widget's own layout and colours.
 */
type Kind = 'fx' | 'cur' | 'gold' | 'stock' | 'isx'
interface Item { k: Kind; c?: string; l?: string; m?: number; u?: string }
interface Config { theme: string; items: Item[] }
interface Placed { id: number; size: 'small' | 'wide'; config: Config }
type Plugin = { list: () => Promise<{ widgets: { id: number; size: 'small' | 'wide'; config: string }[] }>; save: (o: { id: number; config: string }) => Promise<void> }

const THEMES = ['navy', 'blue', 'black', 'light', 'gold'] as const
const KINDS: Kind[] = ['fx', 'cur', 'gold', 'stock', 'isx']
const KARATS = ['24', '22', '21', '18']
const COS = companiesData as { sym: string; ar: string; en: string }[]

function plugin(): Plugin | null {
  const C = (window as unknown as { Capacitor?: { isPluginAvailable?: (n: string) => boolean; registerPlugin?: (n: string) => unknown; Plugins?: Record<string, unknown> } }).Capacitor
  if (!C?.isPluginAvailable?.('IQWidget')) return null
  return (C.Plugins?.IQWidget ?? C.registerPlugin?.('IQWidget')) as Plugin
}

interface Feeds {
  fx?: { asOf: string; parallel: { sell: number | null; buy: number | null } }
  cur?: { parallelUsd: number | null; perUsd: Record<string, number> }
  hist?: { parallel: { rows: { date: string; close: number | null }[] } }
  gold?: { gramByCarat: { karat: number; mithqalIqd: number }[]; previous?: { gramByCarat: { karat: number; mithqalIqd: number }[] } | null }
  idx?: { sessions: { isx60: number }[] }
  q?: { companies: { ticker: string; close: number | null; changePct: number | null; traded: boolean }[] }
}

export function AppWidgets() {
  const { t, locale } = useLocale()
  const W = t.app.widgets
  const curNames = t.rates.page.currencies.names as Record<string, string>
  const [state, setState] = useState<'loading' | 'web' | 'old' | 'ready'>('loading')
  const [list, setList] = useState<Placed[]>([])
  const [feeds, setFeeds] = useState<Feeds>({})
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    const p = plugin()
    const native = !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
    if (!p) {
      if (process.env.NODE_ENV === 'development') {
        // Browser preview only: two sample widgets so the screen can be designed.
        setList([
          { id: 1, size: 'small', config: { theme: 'navy', items: [{ k: 'fx' }] } },
          { id: 2, size: 'wide', config: { theme: 'navy', items: [{ k: 'fx' }, { k: 'gold', c: '21' }, { k: 'isx' }] } },
        ])
        setState('ready')
      } else setState(native ? 'old' : 'web')
      return
    }
    const r = await p.list()
    setList(r.widgets.map((w) => ({ id: w.id, size: w.size, config: JSON.parse(w.config) as Config })))
    setState('ready')
  }, [])

  useEffect(() => {
    load()
    const get = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    Promise.all([get('/data/fx.json'), get('/data/currencies.json'), get('/data/gold.json'), get('/data/index.json'), get('/data/quotes.json'), get('/data/fx-history.json')])
      .then(([fx, cur, gold, idx, q, hist]) => setFeeds({ fx, cur, gold, idx, q, hist }))
  }, [load])

  const name = (c: { ar: string; en: string; sym: string }) => (locale === 'ar' ? c.ar || c.en : c.en || c.ar) || c.sym

  /** The dollar's day move as the widget computes it (PriceWidget.fxPct): mid vs the previous close. */
  const fxPct = useMemo(() => {
    const p = feeds.fx?.parallel, rows = feeds.hist?.parallel.rows
    if (!p || !rows || !feeds.fx) return null
    const now = p.buy != null && p.sell != null ? (p.buy + p.sell) / 2 : p.sell ?? p.buy
    const prev = rows.filter((r) => r.close != null && r.date < feeds.fx!.asOf).pop()?.close
    return now != null && prev ? ((now - prev) / prev) * 100 : null
  }, [feeds.fx, feeds.hist])

  /** What a slot shows, as the widget will show it (PriceWidget.cell). */
  const cell = (it: Item): { label: string; value: string; unit: string; pct: number | null; world: 'dinar' | 'ochre' | 'lapis' } => {
    switch (it.k) {
      case 'fx': {
        const s = feeds.fx?.parallel.sell ?? feeds.fx?.parallel.buy
        return { label: t.app.tabs.fx, value: s ? nf0.format(s) : '—', unit: t.app.home.fx.perDollar, pct: fxPct, world: 'dinar' }
      }
      case 'cur': {
        const per = feeds.cur?.perUsd[it.c ?? ''], usd = feeds.cur?.parallelUsd
        const v = per && usd ? (usd / per) * (it.m ?? 1) : null
        return { label: it.l ?? it.c ?? '', value: v == null ? '—' : fmtAny(v), unit: it.u ?? '', pct: fxPct, world: 'dinar' }
      }
      case 'gold': {
        const k = Number(it.c ?? 21)
        const g = feeds.gold?.gramByCarat.find((x) => x.karat === k)
        const was = feeds.gold?.previous?.gramByCarat.find((x) => x.karat === k)
        return { label: t.app.tabs.gold, value: g ? nf0.format(g.mithqalIqd) : '—', unit: t.app.gold.karat(k), pct: g && was ? ((g.mithqalIqd - was.mithqalIqd) / was.mithqalIqd) * 100 : null, world: 'ochre' }
      }
      case 'isx': {
        const [a, b] = feeds.idx?.sessions ?? []
        return { label: t.app.tabs.market, value: a ? nf2.format(a.isx60) : '—', unit: 'ISX60', pct: a && b ? ((a.isx60 - b.isx60) / b.isx60) * 100 : null, world: 'lapis' }
      }
      case 'stock': {
        const q = feeds.q?.companies.find((x) => x.ticker === it.c)
        return { label: it.l ?? it.c ?? '', value: q?.close == null ? '—' : q.close >= 100 ? nf0.format(q.close) : nf2.format(q.close), unit: it.c ?? '', pct: q?.traded ? q.changePct : null, world: 'lapis' }
      }
    }
  }
  const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Baghdad', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
  const chip = (v: number | null) => v == null ? null : (
    <span className={`wg-chg ${Math.abs(v) < 0.005 ? 'is-flat' : v > 0 ? 'is-up' : 'is-down'}`}><bdi dir="ltr">{Math.abs(v) < 0.005 ? '' : v > 0 ? '+' : '−'}{nf2.format(Math.abs(v))}%</bdi></span>
  )

  const setItem = (w: Placed, i: number, it: Item) => {
    const items = [...w.config.items]
    items[i] = it
    setList((l) => l.map((x) => (x.id === w.id ? { ...x, config: { ...x.config, items } } : x)))
  }
  const itemFor = (k: Kind, prev?: Item): Item => {
    if (k === 'cur') { const c = (prev?.k === 'cur' && prev.c) || 'EUR'; return curItem(c as CurrencyCode) }
    if (k === 'gold') return { k, c: '21' }
    if (k === 'stock') { const c = (prev?.k === 'stock' && prev.c) || 'BBOB'; const co = COS.find((x) => x.sym === c)!; return { k, c, l: name(co) } }
    return { k }
  }
  const curItem = (c: CurrencyCode): Item => {
    const u = unitOf(c)
    const unitLabel = c === 'IRR' ? t.app.rate.toman : u.mult > 1 ? t.app.rate.thousand(curNames[c] ?? c) : curNames[c] ?? c
    return { k: 'cur', c, l: curNames[c] ?? c, m: u.mult, u: t.app.rate.perUnit(unitLabel) }
  }
  const save = async (w: Placed) => {
    haptic()
    const p = plugin()
    if (p) await p.save({ id: w.id, config: JSON.stringify(w.config) })
    setToast(W.saved)
    setTimeout(() => setToast(null), 2000)
  }

  const curOrder = useMemo(() => [...POPULAR, ...CURRENCY_CODES.filter((c) => !POPULAR.includes(c))], [])

  return (
    <main className="rk-screen wg3">
      <p className="rk-lead">{W.lead}</p>

      {state === 'web' || state === 'old' ? <p className="rk-note">{state === 'web' ? W.webOnly : W.update}</p> : null}

      {state === 'ready' && !list.length ? (
        <section className="rk-conv">
          <h2 className="rk-h">{W.none}</h2>
          <p className="rk-h is-sub">{W.howTitle}</p>
          <ol className="wg-how">{W.how.map((s) => <li key={s}>{s}</li>)}</ol>
          <button type="button" className="id-btn" onClick={() => { haptic(); load() }}>{W.refresh}</button>
        </section>
      ) : null}

      {list.map((w) => (
        <section key={w.id} className="rk-conv wg-edit id-print is-calm" aria-label={w.size === 'wide' ? W.wide : W.small}>
          <h2 className="rk-h">{w.size === 'wide' ? W.wide : W.small}</h2>

          {/* Preview, in the widget's own layout and colours. */}
          <div className={`wg-prev is-${w.size} th-${w.config.theme}`} aria-hidden="true">
            {w.size === 'small' ? (() => {
              const c = cell(w.config.items[0] ?? { k: 'fx' })
              return (
                <>
                  <b className="wg-l" data-world={c.world}><i />{c.label}</b>
                  <span className="wg-v id-num" data-world={c.world}><span>{c.value}<svg viewBox="0 0 200 28" preserveAspectRatio="none"><path d="M6 22 C50 8 110 2 194 14" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" /></svg></span></span>
                  <small className="wg-s">{c.unit}</small>
                  <span className="wg-foot">{chip(c.pct)}<small className="wg-s">{W.now(clock)}</small></span>
                </>
              )
            })() : (
              <>
                <div className="wg-head"><b>IQWealth</b><small className="wg-s">{W.now(clock)}</small></div>
                <div className="wg-cells">
                  {[0, 1, 2].map((i) => {
                    const c = cell(w.config.items[i] ?? { k: 'fx' })
                    return <div key={i} className="wg-cell"><b className="wg-l" data-world={c.world}><i />{c.label}</b><span className="wg-v id-num">{c.value}</span>{chip(c.pct) ?? <small className="wg-s">{c.unit}</small>}</div>
                  })}
                </div>
              </>
            )}
          </div>

          <p className="rk-h is-sub">{W.color}</p>
          <div className="wg-themes" role="radiogroup" aria-label={W.color}>
            {THEMES.map((th) => (
              <button key={th} type="button" role="radio" aria-checked={w.config.theme === th} className={`wg-swatch th-${th}`}
                onClick={() => { haptic(); setList((l) => l.map((x) => (x.id === w.id ? { ...x, config: { ...x.config, theme: th } } : x))) }}>
                <span>{W.themes[th]}</span>
              </button>
            ))}
          </div>

          {(w.size === 'wide' ? [0, 1, 2] : [0]).map((i) => {
            const it = w.config.items[i] ?? { k: 'fx' as Kind }
            return (
              <fieldset key={i} className="wg-slot">
                <legend className="rk-h is-sub">{w.size === 'wide' ? W.slot(i + 1) : W.show}</legend>
                <div className="rk-seg is-5" role="group">
                  {KINDS.map((k) => (
                    <button key={k} type="button" aria-pressed={it.k === k} onClick={() => { haptic(); setItem(w, i, itemFor(k, it)) }}>{W.kinds[k]}</button>
                  ))}
                </div>
                {it.k === 'cur' ? (
                  <select id={`wg-cur-${w.id}-${i}`} className="wg-select" aria-label={W.currency} value={it.c} onChange={(e) => setItem(w, i, curItem(e.target.value as CurrencyCode))}>
                    {curOrder.map((c) => <option key={c} value={c}>{CURRENCY_FLAGS[c]} {curNames[c] ?? c}</option>)}
                  </select>
                ) : null}
                {it.k === 'gold' ? (
                  <div className="rk-seg is-4" role="group" aria-label={W.karat}>
                    {KARATS.map((k) => <button key={k} type="button" aria-pressed={it.c === k} onClick={() => setItem(w, i, { k: 'gold', c: k })}>{t.app.gold.karat(Number(k))}</button>)}
                  </div>
                ) : null}
                {it.k === 'stock' ? (
                  <select id={`wg-stock-${w.id}-${i}`} className="wg-select" aria-label={W.stock} value={it.c} onChange={(e) => { const co = COS.find((x) => x.sym === e.target.value)!; setItem(w, i, { k: 'stock', c: co.sym, l: name(co) }) }}>
                    {[...COS].sort((a, b) => name(a).localeCompare(name(b), locale)).map((co) => <option key={co.sym} value={co.sym}>{name(co)} · {co.sym}</option>)}
                  </select>
                ) : null}
              </fieldset>
            )
          })}

          <button type="button" className="id-btn is-primary rk-wide wg-save" onClick={() => save(w)}>{W.save}</button>
        </section>
      ))}
      {toast ? <p className="app-toast" role="status">{toast}</p> : null}
    </main>
  )
}
