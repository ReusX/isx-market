'use client'

import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { AboutSection } from './AboutSection'
import { PageTitle } from './PageTitle'
import {
  TIMEFRAMES, verdict, BROAD, WEAK, SKEW,
  upShare, upVolumeShare, participation, concentration, netBreadth,
  type TimeframeId,
} from '@/lib/pulse'
import type { PulseInitial } from '@/lib/marketServer'
import { sectorLabel } from '@/lib/screener'
import { localeDate } from '@/lib/date'
import '@/styles/statistics-page.css'
import '@/styles/pulse-page.css'

/**
 * /pulse · نبض السوق — is the move real?
 *
 * The index is one number and it can rise while most of the market falls.
 * This page takes that apart. Built fresh for this identity; the MODEL
 * (lib/pulse.ts) and the verdict copy are reused because they are the
 * product's own thinking, not design.
 *
 * ── The two rules the model carries, restated so they survive ─────────────
 *   1. Every reading is TWO NUMBERS COMPARED, never one number displayed.
 *      «Eight companies rose» means nothing; «eight rose against thirty that
 *      fell» means a weak session. That is why the four readings are one
 *      table — each was already a comparison, which is what «one row, one
 *      fact» is for.
 *   2. There is NO index-contribution module, anywhere. It needs the ISX60
 *      constituent weights and this product does not hold them. A number
 *      that cannot be computed is neither shown nor implied.
 *
 * ── noPrior is a fourth state, not a rounding of flat ─────────────────────
 * A company that traded today but not in the previous session has no
 * measurable direction. It is never folded into «flat», and it is excluded
 * from every denominator here. For history it is `null` — "this source
 * cannot say" — because `breadth_daily` has nowhere to put it.
 */
const RAIL = [
  { key: 'market', route: '/' }, { key: 'board', route: '/market' }, { key: 'companies', route: '/companies' },
  { key: 'screener', route: '/screener' }, { key: 'heatmap', route: '/heatmap' }, { key: 'statistics', route: '/statistics' }, { key: 'pulse', route: '/pulse' },
] as const

const int = new Intl.NumberFormat('en-US')
const pct = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(0)}%`)

type Units = { tn: string; bn: string; mn: string; k: string }
function compact(v: number | null | undefined, u: Units): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const a = Math.abs(v)
  if (a >= 1e12) return `${(a / 1e12).toFixed(1)} ${u.tn}`
  if (a >= 1e9) return `${(a / 1e9).toFixed(1)} ${u.bn}`
  if (a >= 1e6) return `${(a / 1e6).toFixed(1)} ${u.mn}`
  if (a >= 1e3) return `${(a / 1e3).toFixed(0)} ${u.k}`
  return int.format(a)
}

export function PulsePage({ initial }: { initial: PulseInitial }) {
  const { t, locale } = useLocale()
  const P = t.pulse.page
  const V = t.pulse.verdict
  const u = t.site.units
  const [tf, setTf] = useState<TimeframeId>('3M')
  const [hover, setHover] = useState<number | null>(null)

  const live = initial.live
  const v = live ? verdict(live) : null
  const n = TIMEFRAMES.find((x) => x.id === tf)!.n
  const history = useMemo(() => initial.history.slice(-n), [initial.history, n])

  /* Value carried by the five busiest companies — stated as a figure, not as
     a bare label, so the concentration row obeys the page's own rule. */
  const top5 = initial.byValue.slice(0, 5).reduce((a, r) => a + r.value, 0)

  /* The four readings. Each is two numbers compared — never one alone. */
  const readings = live ? [
    {
      key: 'breadth',
      name: P.breadth,
      a: P.breadthA(int.format(live.advancers)),
      b: P.breadthB(int.format(live.decliners)),
      sub: [P.flatNote(int.format(live.unchanged)), live.noPrior != null ? P.noPriorNote(int.format(live.noPrior)) : null].filter(Boolean).join(' · '),
      share: upShare(live),
      tone: (upShare(live) ?? 0) >= 0.5 ? 'is-up' : 'is-down',
    },
    {
      key: 'liquidity',
      name: P.liquidity,
      a: P.liquidityA(compact(live.upVolume, u)),
      b: P.liquidityB(compact(live.downVolume, u)),
      sub: '',
      share: upVolumeShare(live),
      tone: (upVolumeShare(live) ?? 0) >= 0.5 ? 'is-up' : 'is-down',
    },
    {
      key: 'participation',
      name: P.participation,
      a: P.participationA(int.format(live.traded)),
      b: P.participationB(live.listed == null ? '—' : int.format(live.listed)),
      sub: '',
      share: participation(live),
      tone: 'is-neutral',
    },
    {
      key: 'concentration',
      name: P.concentration,
      a: P.concentrationA(compact(top5, u)),
      b: P.concentrationB(compact(live.totalValue, u)),
      sub: '',
      share: concentration(initial.byValue.map((r) => ({ symbol: r.symbol, name: r.ar ?? r.symbol, value: r.value, pct: r.pct })), 5, live.totalValue),
      tone: 'is-neutral',
    },
  ] : []

  /* Net breadth, drawn to scale about a zero line. */
  const W = 900, H = 220, PB = 22, PR = 48
  const nets = history.map(netBreadth)
  const maxAbs = Math.max(1, ...nets.map(Math.abs))
  const bw = (W - PR) / Math.max(1, history.length)
  const y0 = (H - PB) / 2
  const half = (H - PB) / 2 - 8
  const cum = nets.reduce<number[]>((acc, v) => { acc.push((acc[acc.length - 1] ?? 0) + v); return acc }, [])
  const cumMax = Math.max(1, ...cum.map(Math.abs))
  const yCum = (v: number) => y0 - (v / cumMax) * half
  const cumPath = cum.map((v, i) => `${i ? 'L' : 'M'}${(i + 0.5) * bw},${yCum(v)}`).join(' ')
  const shownSession = hover != null ? history[hover] : history[history.length - 1] ?? null
  const shownNet = shownSession ? netBreadth(shownSession) : 0

  return (
    <SiteShell>
      <main className="plz id-full iq-door">
        <DoorRail door="markets" items={RAIL.map((r) => ({ label: t.market.page.rail[r.key], route: r.route }))} />
        <div className="plz-body">
          <header className="stx-head">
            <p className="id-eyebrow">{P.eyebrow}</p>
            <PageTitle title={t.pulse.title} note={P.lede} />
          </header>

          {!live || !v ? (
            <p className="id-note">{P.noSession}</p>
          ) : (
            <>
              {/* The reading. The page's thesis, not a strip above a grid. */}
              <section className={`id-panel plz-lead is-${v.tone}`} aria-label={t.pulse.verdictLabel}>
                <p className="id-cap">{P.session(localeDate(live.date, locale))}</p>
                <h2 className="plz-verdict">{V[v.id].headline}</h2>
                <p className="plz-qual">{V[v.id].qualifier}</p>
                <p className="plz-because id-num">{P.because(pct(upShare(live)), pct(upVolumeShare(live)))}</p>
                {/* The rule that produced it, behind a click — and built from
                    the same constants the branch tested, so copy and
                    calculation cannot drift apart. */}
                <details className="plz-rule">
                  <summary>{P.showRule}</summary>
                  <p>{V[v.id].rule(pct(BROAD), pct(WEAK), `${(SKEW * 100).toFixed(0)}`)}</p>
                </details>
              </section>

              {/* The evidence: one row, one reading, two numbers each. */}
              <section className="id-panel plz-panel" aria-label={P.readings}>
                <h2 className="id-h3">{P.readings}</h2>
                <div className="plz-scroll id-table-scroll">
                  <table className="id-table plz-table id-num">
                    <thead>
                      <tr>
                        <th scope="col" className="plz-col-name">{P.cols.reading}</th>
                        <th scope="col" colSpan={2}>{P.cols.pair}</th>
                        <th scope="col" className="is-end plz-col-share">{P.cols.share}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readings.map((r) => (
                        <tr key={r.key}>
                          <td className="plz-col-name"><span className="id-name">{r.name}</span></td>
                          <td><span className="plz-side"><b>{r.a}</b></span>{r.sub ? <span className="id-sub">{r.sub}</span> : null}</td>
                          <td><span className="plz-side"><b>{r.b}</b></span></td>
                          <td className="is-end plz-col-share">
                            <div className="plz-share">
                              <bdi>{pct(r.share)}</bdi>
                              <span className="plz-track" aria-hidden="true"><i className={r.tone} style={{ inlineSize: `${Math.max(0, Math.min(100, (r.share ?? 0) * 100))}%` }} /></span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {live.noPrior ? <p className="id-cap plz-note">{P.noPriorWhy}</p> : null}
                {initial.tradedGap ? <p className="id-cap plz-note">{P.gap(int.format(initial.tradedGap.index), int.format(initial.tradedGap.rows))}</p> : null}
              </section>

              {/* History. */}
              {history.length > 1 ? (
                <section className="id-panel plz-panel" aria-label={P.history}>
                  <div className="plz-head">
                    <PageTitle as="h2" className="id-h3" title={P.history} note={P.historyNote} />
                    <div className="id-pills" role="group" aria-label={P.timeframe}>
                      {TIMEFRAMES.map((x) => (
                        <button key={x.id} type="button" className="id-pill is-sm" aria-pressed={tf === x.id} onClick={() => { setTf(x.id); setHover(null) }}>{locale === 'ar' ? x.ar : x.en}</button>
                      ))}
                    </div>
                  </div>
                  {/* Reads the hovered session, or the latest when nothing is
                      hovered — so the panel says something before you touch it. */}
                  <p className="plz-readout id-num">
                    <strong className={shownNet > 0 ? 'id-up' : shownNet < 0 ? 'id-down' : ''}>
                      <bdi>{shownNet > 0 ? '+' : ''}{int.format(shownNet)}</bdi>
                    </strong>
                    <span className="id-cap">
                      {shownSession ? `${localeDate(shownSession.date, locale)} · ${P.breadthA(int.format(shownSession.advancers))} · ${P.breadthB(int.format(shownSession.decliners))}` : P.latest}
                    </span>
                  </p>
                  <svg viewBox={`0 0 ${W} ${H}`} className="plz-chart id-num" role="img" aria-label={P.history}
                    onPointerLeave={() => setHover(null)}>
                    <line x1={0} x2={W - PR} y1={y0} y2={y0} className="plz-zero" />
                    <text x={W - PR + 8} y={y0 - half} className="plz-tick">+{int.format(maxAbs)}</text>
                    <text x={W - PR + 8} y={y0 + half} className="plz-tick">−{int.format(maxAbs)}</text>
                    {history.map((row, i) => {
                      const val = netBreadth(row)
                      const h = Math.max(1, (Math.abs(val) / maxAbs) * half)
                      return (
                        <g key={row.date} onPointerEnter={() => setHover(i)}>
                          <rect x={i * bw} y={0} width={bw} height={H - PB} fill="transparent" />
                          {hover === i ? <rect x={i * bw} y={0} width={bw} height={H - PB} className="plz-hl" /> : null}
                          <rect x={i * bw + bw * 0.15} y={val >= 0 ? y0 - h : y0} width={Math.max(1, bw * 0.7)} height={h}
                            className={`plz-bar ${val >= 0 ? 'is-up' : 'is-down'} ${hover === i ? 'is-on' : ''}`.trim()} />
                        </g>
                      )
                    })}
                    {/* The advance–decline line: net breadth accumulated over the
                        period. It rises while the market broadens and falls while
                        it narrows, which is the question the bars alone cannot
                        answer. Its own scale, so it never pretends to share the
                        bars' axis. */}
                    <path d={cumPath} className="plz-cum" />
                    {hover != null ? <circle cx={(hover + 0.5) * bw} cy={yCum(cum[hover])} r="3.5" className="plz-cum-dot" /> : null}
                  </svg>
                  <p className="id-cap plz-legend"><i className="plz-swatch" aria-hidden="true" />{P.adLine} · {P.adLineNote}</p>
                </section>
              ) : null}

              {/* Sectors. */}
              {initial.sectors.length ? (
                <section className="id-panel plz-panel" aria-label={P.sectors}>
                  <PageTitle as="h2" className="id-h3" title={P.sectors} note={P.sectorsNote} />
                  <div className="plz-scroll id-table-scroll">
                    <table className="id-table plz-sec-table id-num">
                      <thead>
                        <tr>
                          <th scope="col">{P.sectorCols.sector}</th>
                          <th scope="col" className="is-end">{P.sectorCols.up}</th>
                          <th scope="col" className="is-end">{P.sectorCols.down}</th>
                          <th scope="col" className="is-end">{P.sectorCols.flat}</th>
                          <th scope="col" className="is-end">{P.sectorCols.none}</th>
                          <th scope="col" className="is-end">{P.sectorCols.traded}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {initial.sectors.map((s) => (
                          <tr key={s.id}>
                            <td>
                              <span className="id-name">{sectorLabel(s.id, locale)}</span>
                              <span className="plz-sec-bar" aria-hidden="true">
                                {(['up', 'down', 'flat', 'none'] as const).map((k) => {
                                  const val = k === 'up' ? s.up : k === 'down' ? s.down : k === 'flat' ? s.flat : s.noPrior
                                  return val ? <i key={k} className={`is-${k}`} style={{ flexGrow: val }} /> : null
                                })}
                              </span>
                            </td>
                            <td className="is-end id-up">{int.format(s.up)}</td>
                            <td className="is-end id-down">{int.format(s.down)}</td>
                            <td className="is-end">{int.format(s.flat)}</td>
                            <td className="is-end">{s.noPrior ? int.format(s.noPrior) : '—'}</td>
                            <td className="is-end">{int.format(s.traded)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </>
          )}

          <AboutSection title={P.about.title} body={P.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
