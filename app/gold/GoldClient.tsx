'use client'

import { useMemo, useState } from 'react'
import { useApp } from '@/context/AppContext'
import {
  ToolHead, MetaLine, Disclosure, NoHistoryNote, Unavailable, PartialNotice,
} from '@/components/design/ToolChrome'
import { DitherArt } from '@/components/design/DitherArt'
import { SOURCES, nf0, nf2, NA, type Freshness } from '@/lib/marketTools'
import { CBI_OFFICIAL_RATE } from '@/lib/fxOfficial'
import type { GoldData, FxData } from '@/lib/rates'
import '@/styles/market-tools.css'
import '@/styles/panels.css'

/**
 * سعر الذهب — a direct port of the approved gold page.
 *
 * ── What this page is, and what the old copy claimed it was ──────────────
 * iraqgoldprice.com publishes an Iraqi price list: a per-gram price for each
 * karat, in BOTH dinars and dollars, plus an ounce buy and sell. That is a
 * LOCAL QUOTE. The product has no spot feed — no XAU source, no metals API,
 * nothing — so a page describing itself as the international spot converted at
 * the exchange rate would be describing a pipeline that does not exist. This
 * one says what is true.
 *
 * ── The units, and the arithmetic behind them ────────────────────────────
 *   gram    the source's own published figure, untouched
 *   mithqal gram × 4.608     — the traditional Iraqi unit
 *   ounce   gram × 31.1035   — the troy ounce
 * Both are a multiplication of a published number, shown with the factor
 * printed. No making charge, no jeweller margin, no local premium.
 *
 * ── The dollar column is the source's, not ours ──────────────────────────
 * Dividing the source's IQD figures by its own USD figures implies a rate near
 * the OFFICIAL 1,320 rather than the parallel market. A reader holding dollars
 * converts at the rate they can actually get, so the implied rate is printed
 * and the market-rate equivalent is shown beside it.
 *
 * ── Not built ────────────────────────────────────────────────────────────
 * No jeweller spread from the ounce buy/sell: they differ by about 0.03% and
 * the source does not document whose side is whose. Both are shown as
 * published. And no history — nothing stores yesterday's list.
 */

const MITHQAL_G = 4.608
const OUNCE_G = 31.1035
const LEAD_KARAT = 21

type UnitId = 'gram' | 'mithqal' | 'ounce'
const UNITS: { id: UnitId; label: string }[] = [
  { id: 'gram', label: 'غرام' },
  { id: 'mithqal', label: 'مثقال' },
  { id: 'ounce', label: 'أونصة' },
]
const unitGrams = (u: UnitId) => (u === 'gram' ? 1 : u === 'mithqal' ? MITHQAL_G : OUNCE_G)

/** What each karat is used for locally. Descriptive, not a rating. */
const USE: Record<number, string> = {
  24: 'سبائك وادخار', 22: 'مجوهرات',
  21: 'الأكثر تداولاً في الأسواق العراقية', 18: 'مجوهرات', 14: 'مجوهرات',
}

export default function GoldClient({ gold, fx }: { gold: GoldData | null; fx: FxData | null }) {
  const { theme } = useApp()
  const karats = useMemo(
    () => (gold?.grams ?? []).filter(g => g.iqd > 0).sort((a, b) => b.karat - a.karat),
    [gold])

  const [karat, setKarat] = useState<number>(() =>
    karats.some(k => k.karat === LEAD_KARAT) ? LEAD_KARAT : (karats[0]?.karat ?? LEAD_KARAT))
  const [unit, setUnit] = useState<UnitId>('gram')
  const [qty, setQty] = useState('1')

  const down = !gold || !karats.length
  const marketRate = fx?.sell ?? fx?.buy ?? null
  const fxDown = marketRate == null

  const fresh: Freshness = useMemo(() => ({
    observed: gold?.date ?? null, stale: false, source: SOURCES.gold,
  }), [gold])

  const sel = karats.find(k => k.karat === karat) ?? karats[0]
  const unitMeta = UNITS.find(u => u.id === unit)!
  const unitPrice = (k: { iqd: number }) => k.iqd * unitGrams(unit)

  const n = parseFloat(qty)
  const calcTotal = sel && Number.isFinite(n) ? unitPrice(sel) * n : null

  /** The rate the source's own two columns imply. Division, both inputs real. */
  const impliedRate = useMemo(() => {
    const usable = karats.filter(k => k.usd > 0 && k.iqd > 0)
    if (!usable.length) return null
    const rates = usable.map(k => k.iqd / k.usd).sort((a, b) => a - b)
    return rates[Math.floor(rates.length / 2)]
  }, [karats])

  return (
    <main className="mt-page gd-page iq-page">
      <ToolHead title="سعر الذهب" freshness={fresh} unavailable={down} actions={null} />

      {!down && fxDown ? (
        <PartialNotice>
          الأسعار بالدينار سليمة، وتعذّر جلب سعر الصرف — حُذف المقابل بالدولار وحده.
        </PartialNotice>
      ) : null}

      {down ? (
        <Unavailable
          what="أسعار الذهب غير متاحة"
          why="تعذّرت قراءة قائمة الأسعار، ولا يحتفظ المنتج بقائمة سابقة يعرضها بدلاً منها."
          source={SOURCES.gold}
        />
      ) : (
        <>
          {/* ═══ Hero · one karat, one unit, one number ═════════════════════ */}
          <section className="mt-hero" aria-label="سعر الذهب">
            <div className="mt-art"><DitherArt scene="gold" theme={theme === 'dark' ? 'dark' : 'light'} /></div>

            <div className="mt-quote">
              <p className="mt-quote-label">
                عيار <bdi>{sel.karat}</bdi>
                {sel.karat === LEAD_KARAT ? <em> · الأكثر تداولاً</em> : null}
              </p>
              <p className="mt-quote-value">
                <bdi>{nf0.format(unitPrice(sel))}</bdi>
                <span>د.ع لل{unitMeta.label}</span>
              </p>

              {/* The unit switch sits directly under the number it changes. */}
              <div className="mt-seg gd-units" role="group" aria-label="الوحدة">
                {UNITS.map(u => (
                  <button key={u.id} type="button"
                    className={unit === u.id ? 'is-on' : ''}
                    aria-pressed={unit === u.id}
                    onClick={() => setUnit(u.id)}>
                    {u.label}
                  </button>
                ))}
              </div>

              <MetaLine
                freshness={fresh}
                extra={
                  <span className="gd-kind" title="سعر منشور في السوق المحلية، وليس سعراً عالمياً محوَّلاً">
                    سعر محلي منشور
                  </span>
                }
              />
            </div>
          </section>

          {/* ═══ Karat strip · a list, not a table ══════════════════════════ */}
          <section className="gd-strip" aria-label="الأسعار حسب العيار">
            <div className="gd-strip-head">
              <h2>حسب العيار</h2>
              <span>بال{unitMeta.label} · د.ع</span>
            </div>
            <ul>
              {karats.map(k => (
                <li key={k.karat} className={k.karat === sel.karat ? 'is-on' : ''}>
                  <button type="button" onClick={() => setKarat(k.karat)}
                    aria-pressed={k.karat === sel.karat}>
                    <span className="gd-strip-k">
                      عيار <bdi>{k.karat}</bdi>
                      {k.karat === LEAD_KARAT ? <em>{USE[k.karat] ?? ''}</em> : null}
                    </span>
                    <bdi className="gd-strip-v">{nf0.format(unitPrice(k))}</bdi>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* ═══ Calculator ════════════════════════════════════════════════ */}
          <section className="gd-calc" aria-label="حاسبة قيمة الذهب">
            <div className="gd-calc-top">
              <h2>احسب قيمة وزن</h2>
              <label className="mt-field is-inline">
                <span>الكمية بال{unitMeta.label}</span>
                <input value={qty} inputMode="decimal" placeholder="0"
                  onChange={e => setQty(e.target.value.replace(/[^\d.]/g, ''))} />
              </label>
            </div>
            <p className="gd-calc-value">
              <bdi>{calcTotal == null ? NA : nf0.format(Math.round(calcTotal))}</bdi>
              <span>د.ع</span>
            </p>
            <p className="gd-calc-note">
              عيار <bdi>{sel.karat}</bdi> · بال{unitMeta.label}
              {!fxDown && calcTotal != null && marketRate
                ? <> · ≈ <bdi>${nf2.format(calcTotal / marketRate)}</bdi> بسعر السوق الموازية</>
                : null}
              {' '}— قيمة معدنية من سعر القائمة، دون أجور صياغة.
            </p>
          </section>

          <div className="mt-more">
            <Disclosure label="معلومات السعر">
              <p>
                هذه قائمة أسعار محلية عراقية تُنشر يومياً، وليست سعراً عالمياً للأونصة
                محوَّلاً إلى الدينار. المصدر ينشر سعر الغرام لكل عيار؛ المثقال يساوي{' '}
                <bdi>{MITHQAL_G}</bdi> غراماً والأونصة <bdi>{OUNCE_G}</bdi> غراماً، وسعراهما
                هنا ضربٌ مباشر لسعر الغرام — لا رسوم مصنعية ولا هامش صائغ.
              </p>
              {impliedRate ? (
                <p>
                  أرقام الدولار في القائمة من المصدر نفسه. نسبتها إلى أسعار الدينار تعني أنه
                  يحوّل بسعر قريب من <bdi>{nf0.format(impliedRate)}</bdi> ديناراً للدولار —
                  أي قرب السعر الرسمي <bdi>{nf0.format(CBI_OFFICIAL_RATE)}</bdi>
                  {marketRate ? <>، لا سعر السوق الموازية <bdi>{nf0.format(marketRate)}</bdi></> : null}.
                  من يحمل دولارات ويشتري محلياً يدفع فعلياً أكثر مما يوحي به ذلك العمود.
                </p>
              ) : null}
              <p className="gd-usd-row">
                سعر عيار <bdi>{sel.karat}</bdi> بال{unitMeta.label} ={' '}
                <bdi>{nf0.format(unitPrice(sel))}</bdi> د.ع
                {sel.usd > 0 ? <> · رقم المصدر <bdi>${nf0.format(sel.usd * unitGrams(unit))}</bdi></> : null}
                {marketRate ? <> · بسعر السوق <bdi>${nf0.format(unitPrice(sel) / marketRate)}</bdi></> : null}
              </p>
            </Disclosure>

            {gold?.ounceSell || gold?.ounceBuy ? (
              <Disclosure label="سعر الأونصة كما ينشره المصدر">
                {/* Neither side coloured. The old page painted شراء green, which
                    reads as "up" everywhere else — this is a price, not a change. */}
                <p className="gd-ounce">
                  <span>بيع <bdi>{gold.ounceSell ? nf0.format(gold.ounceSell.iqd) : NA}</bdi> د.ع</span>
                  <i aria-hidden="true">·</i>
                  <span>شراء <bdi>{gold.ounceBuy ? nf0.format(gold.ounceBuy.iqd) : NA}</bdi> د.ع</span>
                </p>
                <p>
                  المصدر لا يوضّح من أي طرف يقرأ «البيع» و«الشراء»، والفرق بين الرقمين ضئيل.
                  لذلك يُعرض الرقمان كما نُشرا ولا يُحسب منهما هامش صيرفة أو صياغة.
                </p>
              </Disclosure>
            ) : null}

            <Disclosure label="عن المصدر والتحديث">
              <p>
                {SOURCES.gold.host} · {SOURCES.gold.note}.
                {!fxDown ? <> سعر الصرف المستخدم في المقابل بالدولار من {SOURCES.fx.host}.</> : null}
              </p>
              <NoHistoryNote />
            </Disclosure>
          </div>
        </>
      )}
    </main>
  )
}
