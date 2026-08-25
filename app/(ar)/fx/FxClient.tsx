'use client'

import { useMemo, useState } from 'react'
import { useApp } from '@/context/AppContext'
import {
  ToolHead, MetaLine, Disclosure, NoHistoryNote, Unavailable, PartialNotice,
} from '@/components/design/ToolChrome'
import { DitherArt } from '@/components/design/DitherArt'
import { SOURCES, nf0, nf2, signed, signedPct, NA, arDate, type Freshness } from '@/lib/marketTools'
import { CBI_OFFICIAL_RATE, CBI_RATE_CONFIRMED } from '@/lib/fxOfficial'
import type { FxData } from '@/lib/rates'
import '@/styles/market-tools.css'
import '@/styles/panels.css'

/**
 * سعر الدولار — a direct port of the approved FX page.
 *
 * One Level-1 number: the parallel-market rate. The official rate is context
 * and is sized as context, the gap rides on its line, buy/sell/spread are one
 * utility line, and the explainers are collapsed.
 *
 * Everything here comes from a real field:
 *
 *   · market buy/sell     `fetchFx` — Alsumaria's daily closing article
 *   · official rate       CBI_OFFICIAL_RATE, a policy constant with its own
 *                         confirmation date in lib/fxCopy.ts
 *   · gap and spread      subtraction of two displayed figures
 *   · freshness           the source's own observation date, and `stale` when
 *                         the scrape fell back to the cached row
 *
 * NOT here, because nothing stores it: a daily change, a high/low, an intraday
 * move, and a trend. The source publishes one closing price per day and this
 * product keeps no previous reading, so there is no yesterday to subtract. The
 * disclosure says exactly that rather than leaving a blank space.
 */

type RateId = 'market' | 'official'

const CONVERT_RATES: { id: RateId; short: string }[] = [
  { id: 'market', short: 'السوق الموازية' },
  { id: 'official', short: 'الرسمي' },
]

/** الفجوة — market minus official, the gap the product's own FAQ names. */
function gap(market: number | null, official: number | null) {
  if (market == null || official == null) return null
  const abs = market - official
  return { abs, pct: (abs / official) * 100 }
}

/** الفرق — what the changers keep on a round trip. */
function spread(sell: number | null, buy: number | null) {
  if (sell == null || buy == null) return null
  const abs = sell - buy
  return { abs, pct: (abs / sell) * 100 }
}

export default function FxClient({ fx }: { fx: FxData | null }) {
  const { theme } = useApp()
  const [convertWith, setConvertWith] = useState<RateId>('market')

  const marketSell = fx?.sell ?? null
  const marketBuy = fx?.buy ?? null
  const marketDown = marketSell == null && marketBuy == null
  // The sell price is the quoted one; fall back to buy rather than showing
  // nothing when only one side parsed.
  const headline = marketSell ?? marketBuy

  const [usd, setUsd] = useState('100')
  const [iqd, setIqd] = useState(() => (headline ? String(Math.round(100 * headline)) : ''))

  const fresh: Freshness = useMemo(() => ({
    observed: fx?.date ?? null,
    stale: Boolean(fx?.stale),
    source: SOURCES.fx,
  }), [fx])

  const theGap = gap(headline, CBI_OFFICIAL_RATE)
  const theSpread = spread(marketSell, marketBuy)

  const activeId: RateId = marketDown ? 'official' : convertWith
  const active = activeId === 'market' ? headline : CBI_OFFICIAL_RATE

  function onUsd(v: string) {
    const c = v.replace(/[^\d.]/g, '')
    setUsd(c)
    setIqd(active && c ? String(Math.round(parseFloat(c) * active)) : '')
  }
  function onIqd(v: string) {
    const c = v.replace(/[^\d.]/g, '')
    setIqd(c)
    setUsd(active && c ? (parseFloat(c) / active).toFixed(2) : '')
  }
  function switchRate(id: RateId) {
    setConvertWith(id)
    const r = id === 'market' ? headline : CBI_OFFICIAL_RATE
    const n = parseFloat(usd)
    if (r && Number.isFinite(n)) setIqd(String(Math.round(n * r)))
  }

  return (
    <main className="mt-page fx-page iq-page">
      <ToolHead
        title="سعر الدولار"
        freshness={fresh}
        unavailable={marketDown}
        actions={null}
      />

      {fx?.stale ? (
        <PartialNotice>
          تعذّرت قراءة سعر اليوم. المعروض آخر سعر معروف
          {fx.date ? <> من <bdi>{arDate(fx.date)}</bdi></> : null}.
        </PartialNotice>
      ) : null}
      {!marketDown && marketBuy == null ? (
        <PartialNotice>
          سعر البيع قُرئ بنجاح، وتعذّر استخراج سعر الشراء من مقال اليوم.
        </PartialNotice>
      ) : null}
      {marketDown ? (
        <PartialNotice>
          تعذّر الوصول إلى سعر السوق. السعر الرسمي ثابت لا يُقرأ من مصدر خارجي، فبقي يعمل.
        </PartialNotice>
      ) : null}

      {/* ═══ Hero · art beside ONE number ═══════════════════════════════════ */}
      <section className="mt-hero" aria-label="سعر الدولار">
        <div className="mt-art"><DitherArt scene="fx" theme={theme === 'dark' ? 'dark' : 'light'} /></div>

        <div className="mt-quote">
          {headline == null ? (
            <Unavailable
              what="سعر السوق غير متاح"
              why="تعذّرت قراءة مقال الإغلاق من المصدر."
              source={SOURCES.fx}
            />
          ) : (
            <>
              <p className="mt-quote-label">سعر السوق الموازية</p>
              <p className="mt-quote-value">
                <bdi>{nf0.format(headline)}</bdi>
                <span>د.ع لكل <bdi>$1</bdi></span>
              </p>

              {/* Utility data, treated as utility data — one line, not a card. */}
              <p className="fx-sides">
                <span>شراء <bdi>{marketBuy == null ? NA : nf2.format(marketBuy)}</bdi></span>
                <i aria-hidden="true">·</i>
                <span>بيع <bdi>{marketSell == null ? NA : nf2.format(marketSell)}</bdi></span>
                <i aria-hidden="true">·</i>
                <span>فرق <bdi>{theSpread ? nf2.format(theSpread.abs) : NA}</bdi></span>
              </p>

              <MetaLine freshness={fresh} />
            </>
          )}

          {/* Context, sized as context. The official rate and its gap ride on
              one line — the relationship is the point, not two headlines. */}
          <div className="fx-official">
            <span className="fx-official-label">السعر الرسمي</span>
            <span className="fx-official-value"><bdi>{nf0.format(CBI_OFFICIAL_RATE)}</bdi> د.ع</span>
            <span className="fx-official-gap">
              الفجوة{' '}
              {theGap
                ? <><bdi>{signed(theGap.abs, 1)}</bdi> د.ع · <bdi>{signedPct(theGap.pct, 1)}</bdi></>
                : <bdi>{NA}</bdi>}
            </span>
          </div>
        </div>
      </section>

      {/* ═══ The converter ══════════════════════════════════════════════════ */}
      <section className="fx-convert" aria-label="محوّل المبالغ">
        <div className="fx-convert-top">
          <h2>حوّل مبلغاً</h2>
          <div className="mt-seg" role="group" aria-label="السعر المستخدم">
            {CONVERT_RATES.map(r => (
              <button key={r.id} type="button"
                className={activeId === r.id ? 'is-on' : ''}
                aria-pressed={activeId === r.id}
                disabled={r.id === 'market' && marketDown}
                onClick={() => switchRate(r.id)}>
                {r.short}
              </button>
            ))}
          </div>
        </div>

        <div className="fx-convert-row">
          <label className="mt-field">
            <span>دولار</span>
            <input value={usd} onChange={e => onUsd(e.target.value)} inputMode="decimal" placeholder="0" />
          </label>
          <i className="fx-eq" aria-hidden="true">=</i>
          <label className="mt-field">
            <span>دينار</span>
            <input value={iqd} onChange={e => onIqd(e.target.value)} inputMode="decimal" placeholder="0" />
          </label>
        </div>

        <p className="fx-convert-rate">
          بسعر <bdi>{active == null ? NA : nf0.format(active)}</bdi> د.ع للدولار
          {marketDown ? ' · سعر السوق غير متاح' : null}
        </p>
      </section>

      <div className="mt-more">
        <Disclosure label="لماذا يوجد سعران؟">
          <p>
            السعر الرسمي <bdi>{nf0.format(CBI_OFFICIAL_RATE)}</bdi> ديناراً يقرّه البنك المركزي
            العراقي — يُستخدم في مزاد العملة والمعاملات الحكومية والمصرفية والاستيراد الرسمي.
          </p>
          <p>
            سعر السوق الموازية هو سعر التداول الفعلي بين الصيارفة والأفراد، ويتحدد بالعرض
            والطلب. يكون أعلى لأن الطلب على الدولار خارج القنوات الرسمية يفوق ما يوفّره
            المزاد، والفارق بينهما هو فجوة سعر الصرف.
          </p>
          <p className="mt-caveat">
            السعر المعروض سعر إغلاق منشور لسوق بغداد ويصلح مرجعاً لا سعرَ تنفيذ: يختلف خلال
            اليوم وبين محافظة وأخرى، ولكل صيرفة فرقها بين البيع والشراء.
          </p>
        </Disclosure>

        <Disclosure label="عن المصدر والتحديث">
          <p>
            سعر السوق من {SOURCES.fx.host} — مقال أسعار الإغلاق اليومي، بسعرَي الشراء والبيع
            لكل 100 دولار. السعر الرسمي ليس مقروءاً من مصدر خارجي: هو سعر سياسي ثابت،
            آخر تأكيد له <bdi>{arDate(CBI_RATE_CONFIRMED)}</bdi>.
          </p>
          <p>
            لا يُعرض تغيّر يومي: المصدر ينشر سعر إغلاق كل يوم دون سعر اليوم السابق، والمنتج
            لا يحفظ القراءات السابقة، فلا يوجد رقم أمس ليُقارَن به.
          </p>
          <NoHistoryNote />
        </Disclosure>
      </div>
    </main>
  )
}
