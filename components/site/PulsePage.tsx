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
import '@/styles/markets.css'
import '@/styles/econ-page.css'
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
      <main className="plz id-full iq-door" data-world="lapis" data-level="calm">
        <DoorRail door="markets" />
        <div className="plz-body">
          {!live || !v ? (
            <>
              <header className="stx-head"><PageTitle title={t.pulse.title} note={P.lede} /></header>
              <p className="id-note">{P.noSession}</p>
            </>
          ) : (
            <>
              {/* Identity v3, as /fx and /statistics: the session's verdict is
                  the figure (a word, as /cbi-window), its history the chart,
                  and the four readings behind it the key card. */}
              <div className="fx-frame plz-frame">
                <div className="fx-board">
                  <div className="fx-lead">
                    <header className="eco-head fx-head">
                      <PageTitle title={t.pulse.title} note={P.lede} className="fx-title" />
                    </header>
                    <p className={`fx-huge win-status plz-word is-${v.tone}`} aria-label={t.pulse.verdictLabel}>
                      <span className="fx-huge-num">
                        <bdi>{V[v.id].headline}</bdi>
                        <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                          <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                        </svg>
                      </span>
                    </p>
                    <p className="fx-line"><span>{V[v.id].qualifier} · {P.session(localeDate(live.date, locale))}</span></p>

                    {history.length > 1 ? (
                      <section className="plz-hist" aria-label={P.history}>
                        <div className="plz-hist-head">
                          <p className="plz-readout id-num">
                            <strong className={shownNet > 0 ? 'id-up' : shownNet < 0 ? 'id-down' : ''}>
                              <bdi dir="ltr">{shownNet > 0 ? '+' : ''}{int.format(shownNet)}</bdi>
                            </strong>
                            <span className="id-cap">
                              {shownSession ? `${localeDate(shownSession.date, locale)} · ${P.breadthA(int.format(shownSession.advancers))} · ${P.breadthB(int.format(shownSession.decliners))}` : P.latest}
                            </span>
                          </p>
                          <div className="fx-quick" role="group" aria-label={P.timeframe}>
                            {TIMEFRAMES.map((x) => (
                              <button key={x.id} type="button" className="fx-qbtn" aria-pressed={tf === x.id} onClick={() => { setTf(x.id); setHover(null) }}>{locale === 'ar' ? x.ar : x.en}</button>
                            ))}
                          </div>
                        </div>
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
                          {/* The advance–decline line: net breadth accumulated
                              over the period, on its own scale. */}
                          <path d={cumPath} className="plz-cum" />
                          {hover != null ? <circle cx={(hover + 0.5) * bw} cy={yCum(cum[hover])} r="3.5" className="plz-cum-dot" /> : null}
                        </svg>
                        <p className="fx-chart-note plz-legend"><i className="plz-swatch" aria-hidden="true" />{P.history} · {P.adLine} · {P.adLineNote}</p>
                      </section>
                    ) : null}
                  </div>

                  {/* The evidence: four readings, each two numbers compared. */}
                  <section className="id-print is-key fx-calc plz-key" aria-label={P.readings}>
                    <h2 className="fx-calc-title">{P.readings}</h2>
                    <p className="fx-calc-note id-num">{P.because(pct(upShare(live)), pct(upVolumeShare(live)))}</p>
                    <ul className="plz-reads id-num">
                      {readings.map((r) => (
                        <li key={r.key}>
                          <div className="plz-read-top"><b>{r.name}</b><bdi className={r.tone === 'is-up' ? 'id-up' : r.tone === 'is-down' ? 'id-down' : ''}>{pct(r.share)}</bdi></div>
                          <span className="plz-track" aria-hidden="true"><i className={r.tone} style={{ inlineSize: `${Math.max(0, Math.min(100, (r.share ?? 0) * 100))}%` }} /></span>
                          <p className="plz-read-pair">{r.a} · {r.b}{r.sub ? <small>{r.sub}</small> : null}</p>
                        </li>
                      ))}
                    </ul>
                    {/* The rule that produced the verdict, from the same
                        constants the branch tested, so copy and calculation
                        cannot drift apart. */}
                    <details className="plz-rule">
                      <summary>{P.showRule}</summary>
                      <p>{V[v.id].rule(pct(BROAD), pct(WEAK), `${(SKEW * 100).toFixed(0)}`)}</p>
                    </details>
                  </section>
                </div>
              </div>
              <div className="fx-captions">
                {live.noPrior ? <p className="id-cap">{P.noPriorWhy}</p> : null}
                {initial.tradedGap ? <p className="id-cap">{P.gap(int.format(initial.tradedGap.index), int.format(initial.tradedGap.rows))}</p> : null}
              </div>

              {/* Sectors, as a board table. */}
              {initial.sectors.length ? (
                <section className="cur-all plz-secs" aria-label={P.sectors}>
                  <PageTitle as="h2" className="id-h3" title={P.sectors} note={P.sectorsNote} />
                  <div className="mb-scroll id-table-scroll">
                    <table className="mb-table plz-sec-table id-num">
                      <thead>
                        <tr>
                          <th scope="col">{P.sectorCols.sector}</th>
                          <th scope="col" className="plz-sec-col" aria-hidden="true"></th>
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
                            <td><b>{sectorLabel(s.id, locale)}</b></td>
                            <td className="plz-sec-col">
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
