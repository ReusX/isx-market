'use client'

import { useMemo, useState } from 'react'
import { useApp } from '@/context/AppContext'
import {
  ToolHead, MetaLine, Disclosure, NoHistoryNote, Unavailable, PartialNotice,
} from '@/components/design/ToolChrome'
import { DitherArt } from '@/components/design/DitherArt'
import {
  SOURCES, nf0, nf2, signed, signedPct, NA, agePhrase, today, daysBetween,
  type Freshness,
} from '@/lib/marketTools'
import {
  BLEND_DEFS, REGION_LABEL, HERO_KEY, REFERENCE_KEY, differential, iqdPerBarrel,
  type Region,
} from '@/lib/oilBlends'
import { CBI_OFFICIAL_RATE } from '@/lib/fxOfficial'
import type { OilData, OilBlend, FxData } from '@/lib/rates'
import '@/styles/market-tools.css'
import '@/styles/panels.css'

/**
 * سعر النفط — a direct port of the approved oil page.
 *
 * Iraq leads, and honestly: `Basrah-Heavy` and `Basrah-Medium` are real rows on
 * oilprice.com. Brent sits beside the hero because the differential between
 * them — Basrah minus Brent — is the single most Iraq-relevant fact this data
 * supports, and it is subtraction with both inputs on screen.
 *
 * ── Two defects the old page had ─────────────────────────────────────────
 * It rendered «مباشر» with a green dot in a card that also read «أسعار بتأخير
 * بسيط» — two contradictory claims about the same numbers, six lines apart.
 * And it collapsed every blend to one timestamp taken from `Math.max(...stamps)`,
 * so a four-day-old Iran Heavy quote inherited Brent's freshness. The source
 * stamps EACH blend, and here each row carries its own.
 *
 * ── Not built ────────────────────────────────────────────────────────────
 * No comparison against the Iraqi budget oil assumption, no export price, no
 * volume, no revenue: none of those exist anywhere in the product, and a
 * comparison without a real second number is not a comparison. No history —
 * nothing stores yesterday's table. The daily change and percent ARE shown,
 * because the source publishes them per blend.
 */

type RateId = 'market' | 'official'

/** The row as rendered: the source's numbers plus this page's presentation. */
type Row = OilBlend & { ar: string; region: Region; flag: string }

/** The source stamps each blend; that stamp is the observation, not our fetch. */
function freshnessFor(b: Row, stale = false): Freshness {
  const iso = b.stamp ? new Date(b.stamp * 1000).toISOString() : null
  return {
    observed: iso ? iso.slice(0, 10) : null,
    clock: iso ? iso.slice(11, 16) : null,
    stale,
    source: SOURCES.oil,
  }
}

function Age({ b }: { b: Row }) {
  if (!b.stamp) return <span className="mv-dash">{NA}</span>
  const iso = new Date(b.stamp * 1000).toISOString().slice(0, 10)
  const age = daysBetween(iso, today())
  return <span title={iso}>{age <= 0 ? 'اليوم' : agePhrase(age)}</span>
}

export default function OilClient({ oil, fx }: { oil: OilData | null; fx: FxData | null }) {
  const { theme } = useApp()
  const [barrels, setBarrels] = useState('1000')
  const [iqdRate, setIqdRate] = useState<RateId>('market')

  const rows: Row[] = useMemo(() => {
    const bySlug = new Map((oil?.blends ?? []).map(b => [b.key, b]))
    return BLEND_DEFS
      .map(d => {
        const b = bySlug.get(d.key)
        return b && b.usd > 0 ? { ...b, ar: d.ar, region: d.region, flag: d.flag } : null
      })
      .filter(Boolean) as Row[]
  }, [oil])

  const hero = rows.find(b => b.key === HERO_KEY) ?? rows.find(b => b.region === 'iraq') ?? rows[0]
  const brent = rows.find(b => b.key === REFERENCE_KEY) ?? null
  const down = !oil || !rows.length

  const marketRate = fx?.sell ?? fx?.buy ?? null
  const fxDown = marketRate == null
  const rate = fxDown ? null : iqdRate === 'market' ? marketRate : CBI_OFFICIAL_RATE
  const rateLabel = iqdRate === 'market' ? 'السوق الموازية' : 'الرسمي'

  const n = parseFloat(barrels)
  const usdTotal = hero && Number.isFinite(n) ? hero.usd * n : 0
  const iqdTotal = iqdPerBarrel(usdTotal, rate)

  // The bars start above zero so dollar-level differences between crudes are
  // visible; a zero-based bar makes eleven near-identical blends look identical.
  const scale = useMemo(() => {
    const vals = rows.map(b => b.usd)
    if (!vals.length) return { floor: 0, span: 1 }
    const lo = Math.min(...vals), hi = Math.max(...vals)
    const floor = Math.max(0, Math.floor((lo - (hi - lo) * 0.35) / 5) * 5)
    return { floor, span: Math.max(hi - floor, 1) }
  }, [rows])
  const pctOf = (usd: number) => Math.max(2, ((usd - scale.floor) / scale.span) * 100)

  const strip = useMemo(
    () => rows.filter(b => b.region === 'iraq' || b.key === REFERENCE_KEY || b.key === 'WTI-Crude' || b.key === 'Opec-Basket'),
    [rows])

  const diff = hero && brent ? differential(hero, brent) : null

  return (
    <main className="mt-page ol-page iq-page">
      <ToolHead
        title="سعر النفط"
        freshness={hero ? freshnessFor(hero) : { observed: null, stale: true, source: SOURCES.oil }}
        unavailable={down}
        actions={null}
      />

      {!down && fxDown ? (
        <PartialNotice>
          أسعار الدولار سليمة، وتعذّر جلب سعر الصرف — حُذفت أرقام الدينار وحدها.
        </PartialNotice>
      ) : null}

      {down || !hero ? (
        <Unavailable
          what="أسعار النفط غير متاحة"
          why="تعذّرت قراءة جدول الأسعار، ولا يحتفظ المنتج بجدول سابق يعرضه بدلاً منه."
          source={SOURCES.oil}
        />
      ) : (
        <>
          {/* ═══ Hero · Basrah, with Brent as immediate context ═════════════ */}
          <section className="mt-hero" aria-label="سعر خام البصرة">
            <div className="mt-art"><DitherArt scene="oil" theme={theme === 'dark' ? 'dark' : 'light'} /></div>

            <div className="mt-quote">
              <p className="mt-quote-label">
                <span className="ol-flag" aria-hidden="true">{hero.flag}</span>
                {hero.ar}
              </p>
              <p className="mt-quote-value">
                <bdi>${nf2.format(hero.usd)}</bdi>
                <span>للبرميل</span>
              </p>
              <p className={`ol-change ${hero.pct > 0 ? 'is-up' : hero.pct < 0 ? 'is-down' : ''}`}>
                <bdi>{signed(hero.change)}</bdi>
                <bdi>{signedPct(hero.pct)}</bdi>
              </p>
              <MetaLine freshness={freshnessFor(hero)} extra="تقييم منشور، لا سعر بيع رسمي" />

              {brent ? (
                <div className="ol-vs-brent">
                  <span>برنت <bdi>${nf2.format(brent.usd)}</bdi></span>
                  <span className="ol-vs-gap">
                    الفارق <bdi className={diff && diff.abs < 0 ? 'is-down' : 'is-up'}>
                      ${diff ? signed(diff.abs) : NA}
                    </bdi>
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          {/* ═══ The comparison, as bars ═══════════════════════════════════ */}
          <section className="ol-strip" aria-label="مقارنة الخامات">
            <div className="ol-strip-head">
              <h2>أين يقف الخام العراقي</h2>
              <span>دولار للبرميل</span>
            </div>
            <ul>
              {strip.map(b => (
                <li key={b.key} className={b.region === 'iraq' ? 'is-iraq' : ''}>
                  <span className="ol-bar-name">
                    <span className="ol-flag" aria-hidden="true">{b.flag}</span>
                    {b.ar}
                  </span>
                  <span className="ol-bar-track">
                    <span className="ol-bar-fill" style={{ inlineSize: `${pctOf(b.usd)}%` }} />
                  </span>
                  <bdi className="ol-bar-val">{nf2.format(b.usd)}</bdi>
                </li>
              ))}
            </ul>
            <p className="ol-strip-note">
              الأعمدة تبدأ من <bdi>${nf0.format(scale.floor)}</bdi> لا من الصفر، لتظهر الفروق
              بين الخامات — وهي فروق دولارات لا عشرات.
            </p>
          </section>

          {/* ═══ Calculator · secondary, one line ══════════════════════════ */}
          <section className="ol-calc" aria-label="حاسبة قيمة الشحنة">
            <div className="ol-calc-row">
              <label className="mt-field is-inline">
                <span>براميل من {hero.ar}</span>
                <input value={barrels} inputMode="decimal" placeholder="0"
                  onChange={e => setBarrels(e.target.value.replace(/[^\d.]/g, ''))} />
              </label>
              <p className="ol-calc-value"><bdi>${nf2.format(usdTotal)}</bdi></p>
            </div>
            <p className="ol-calc-note">
              {iqdTotal == null || rate == null
                ? 'قيمة الدينار غير محسوبة: سعر الصرف غير متاح.'
                : <>≈ <bdi>{nf0.format(iqdTotal)}</bdi> د.ع بسعر {rateLabel}{' '}
                   <bdi>{nf0.format(rate)}</bdi> — دون شحن أو تأمين أو فرق تعاقدي.</>}
            </p>
          </section>

          {/* ═══ Reference data, behind a tap ══════════════════════════════ */}
          <div className="mt-more">
            <Disclosure label="عرض جميع الخامات">
              <div className="ol-rate-row" role="group" aria-label="سعر الصرف المستخدم">
                <span>الدينار بسعر</span>
                <div className="mt-seg">
                  {([['market', 'السوق الموازية'], ['official', 'الرسمي']] as const).map(([id, label]) => (
                    <button key={id} type="button" disabled={fxDown}
                      className={!fxDown && iqdRate === id ? 'is-on' : ''}
                      aria-pressed={!fxDown && iqdRate === id}
                      onClick={() => setIqdRate(id)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mv-board-scroll ol-scroll">
                <table className="mv-table ol-table">
                  <thead>
                    <tr>
                      <th scope="col" className="ol-col-blend">الخام</th>
                      <th scope="col" className="mv-col-num">$/برميل</th>
                      <th scope="col" className="mv-col-num">%</th>
                      <th scope="col" className="mv-col-num">عن برنت</th>
                      <th scope="col" className="mv-col-num ol-col-iqd">د.ع/برميل</th>
                      <th scope="col" className="ol-col-when">الرصد</th>
                    </tr>
                  </thead>
                  {(['iraq', 'benchmark', 'regional'] as const).map(region => (
                    rows.some(b => b.region === region) ? (
                      <tbody key={region}>
                        <tr className="ol-group">
                          <th scope="colgroup" colSpan={6}>{REGION_LABEL[region]}</th>
                        </tr>
                        {rows.filter(b => b.region === region).map(b => {
                          const d = brent ? differential(b, brent) : null
                          const iqd = iqdPerBarrel(b.usd, rate)
                          return (
                            <tr key={b.key} className="ol-row">
                              <td className="mv-col-company ol-col-blend">
                                <span className="ol-blend-id">
                                  <span className="ol-flag" aria-hidden="true">{b.flag}</span>
                                  <strong>{b.ar}</strong>
                                </span>
                              </td>
                              <td className="mv-col-num ol-price"><bdi>{nf2.format(b.usd)}</bdi></td>
                              <td className={`mv-col-num ${b.pct > 0 ? 'is-up' : b.pct < 0 ? 'is-down' : ''}`}>
                                <bdi>{signedPct(b.pct)}</bdi>
                              </td>
                              <td className="mv-col-num ol-vs">
                                {b.key === REFERENCE_KEY
                                  ? <span className="ol-ref">المرجع</span>
                                  : d ? <bdi className={d.abs < 0 ? 'is-down' : 'is-up'}>{signed(d.abs)}</bdi>
                                      : <span className="mv-dash">{NA}</span>}
                              </td>
                              <td className="mv-col-num ol-col-iqd">
                                <bdi>{iqd == null ? NA : nf0.format(iqd)}</bdi>
                              </td>
                              <td className="ol-col-when"><Age b={b} /></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    ) : null
                  ))}
                </table>
              </div>
              <p className="mt-caveat">
                لكل خام وقت رصده الخاص — بعض خامات المنطقة تُقيَّم كل بضعة أيام لا كل ساعة،
                فلا يوجد وقت تحديث واحد للجدول كله.
              </p>
            </Disclosure>

            <Disclosure label="عن المصدر والسياق العراقي">
              <p>
                {SOURCES.oil.host} · {SOURCES.oil.note}. خاما البصرة الثقيل والمتوسط صفّان
                حقيقيان على المصدر، وهما تقييمات سعرية لا أسعار بيع رسمية.
              </p>
              <p>
                لا تُقارَن هذه الأسعار بافتراض سعر النفط في الموازنة العراقية: المنتج لا
                يخزّن رقم الموازنة ولا أسعار التصدير الرسمية ولا كميات التصدير أو الإنتاج،
                ومقارنةٌ بلا رقمٍ حقيقي ليست مقارنة.
              </p>
              <NoHistoryNote />
            </Disclosure>
          </div>
        </>
      )}
    </main>
  )
}
