'use client'

import { useMemo, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { arDate } from '@/lib/date'
import { MarketToolTabs } from '@/components/design/MarketToolTabs'
import { Badge, Card, DirectionalChange } from '@/components/design/ui'
import type { OilData, OilBlend, FxData } from '@/lib/rates'

const fmt0 = (n: number) => Math.round(n).toLocaleString('en-US')
const fmt2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const FLAG: Record<string, string> = {
  iraq: '🇮🇶', uk: '🇬🇧', usa: '🇺🇸', uae: '🇦🇪', kuwait: '🇰🇼',
  arab: '🇸🇦', saudi: '🇸🇦', iran: '🇮🇷', russia: '🇷🇺', opec: '🛢️',
  oman: '🇴🇲', qatar: '🇶🇦', mexico: '🇲🇽', canada: '🇨🇦',
}

// Curated, ordered blends with clean Arabic names. Iraq's own crude leads.
const IRAQ = [
  { key: 'Basrah-Heavy',  ar: 'البصرة الثقيل',  en: 'Basrah Heavy' },
  { key: 'Basrah-Medium', ar: 'البصرة المتوسط', en: 'Basrah Medium' },
]
const BENCH = [
  { key: 'Brent-Crude',  ar: 'خام برنت',      en: 'Brent' },
  { key: 'WTI-Crude',    ar: 'غرب تكساس WTI', en: 'WTI' },
  { key: 'Opec-Basket',  ar: 'سلة أوبك',      en: 'OPEC Basket' },
  { key: 'Dubai',        ar: 'دبي/عُمان',     en: 'Dubai' },
  { key: 'Murban-Crude', ar: 'مربان',         en: 'Murban' },
]
const REGION = [
  { key: 'Arab-Light',          ar: 'العربي الخفيف', en: 'Arab Light' },
  { key: 'Kuwait-Export-Blend', ar: 'مزيج الكويت',   en: 'Kuwait Export' },
  { key: 'Iran-Heavy',          ar: 'إيران الثقيل',  en: 'Iran Heavy' },
  { key: 'Iran-Light',          ar: 'إيران الخفيف',  en: 'Iran Light' },
]

type Item = { key: string; ar: string; en: string; b: OilBlend }

function QuoteIdentity({ item, ar, large }: { item: Item; ar: boolean; large?: boolean }) {
  return (
    <span className="oil-quote-identity">
      <span className={large ? 'flag-badge large' : 'flag-badge'} aria-hidden="true">
        {FLAG[item.b.country ?? ''] ?? '🛢️'}
      </span>
      <strong>{ar ? item.ar : item.en}</strong>
    </span>
  )
}

export default function OilClient({ oil, fx }: { oil: OilData | null; fx: FxData | null }) {
  const { lang } = useApp()
  const ar = lang === 'ar'
  const iqdRate = fx?.sell ?? null // IQD per 1 USD

  const map = useMemo(() => {
    const m = new Map<string, OilBlend>()
    oil?.blends.forEach(b => m.set(b.key, b))
    return m
  }, [oil])

  const pick = (keys: { key: string; ar: string; en: string }[]) =>
    keys.map(k => ({ ...k, b: map.get(k.key) })).filter(x => x.b) as Item[]

  const iraq = pick(IRAQ)
  const bench = pick(BENCH)
  const region = pick(REGION)

  // newest source timestamp across the featured blends → "updated" label
  const newest = useMemo(() => {
    const stamps = [...iraq, ...bench, ...region].map(x => x.b.stamp).filter(Boolean) as number[]
    return stamps.length ? Math.max(...stamps) : null
  }, [iraq, bench, region])

  // ── Calculator: barrels → IQD/USD ──
  const [barrels, setBarrels] = useState('')
  const [calcKey, setCalcKey] = useState('Brent-Crude')
  const calcBlend = map.get(calcKey)
  const usdTotal = (parseFloat(barrels) || 0) * (calcBlend?.usd ?? 0)
  const iqdTotal = iqdRate ? usdTotal * iqdRate : null
  const iqdPerBbl = (usd: number) => (iqdRate ? usd * iqdRate : null)

  if (!oil || (!iraq.length && !bench.length)) {
    return (
      <main className="terminal-shell app-page market-tool-page oil-page">
        <MarketToolTabs active="oil" ar={ar} />
        <div className="empty-state">
          <strong>{ar ? 'تعذّر تحميل أسعار النفط' : 'Oil prices unavailable'}</strong>
          <span>{ar ? 'حاول مرة أخرى بعد قليل.' : 'Please try again shortly.'}</span>
        </div>
      </main>
    )
  }

  const hero = iraq[0] // Basrah Heavy
  const heroIqd = hero ? iqdPerBbl(hero.b.usd) : null

  return (
    <main className="terminal-shell app-page market-tool-page oil-page">
      <MarketToolTabs active="oil" ar={ar} />

      {hero ? (
        <Card className="market-tool-card oil-hero">
          <div className="oil-hero-grid">
            <div className="oil-hero-copy">
              <Badge tone="success" dot>{ar ? 'مباشر' : 'LIVE'}</Badge>
              <div className="oil-hero-title">
                <span className="flag-badge large" aria-hidden="true">🇮🇶</span>
                <div>
                  <h1>{ar ? 'نفط البصرة الثقيل' : 'Basrah Heavy Crude'}</h1>
                  <p>{ar ? 'خام التصدير العراقي · للبرميل' : 'Iraqi export crude · per barrel'}</p>
                </div>
              </div>
              <strong className="oil-hero-price"><bdi>${fmt2(hero.b.usd)}</bdi></strong>
              <DirectionalChange value={hero.b.pct} />
              {heroIqd != null ? (
                <span className="oil-iqd"><bdi>{fmt0(heroIqd)}</bdi> {ar ? 'د.ع للبرميل' : 'IQD/bbl'}</span>
              ) : null}
            </div>
          </div>
          {newest ? (
            <span className="market-tool-updated">
              {ar ? 'آخر تحديث' : 'Updated'}:{' '}
              {/* ar-IQ gives Iraqi month names in Arabic-Indic digits; the rest
                  of the site (and the design) writes 25 يوليو with Latin ones. */}
              {ar
                ? `${arDate(new Date(newest * 1000).toISOString().slice(0, 10))} · ${new Date(newest * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                : new Date(newest * 1000).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {' '}· {ar ? 'أسعار بتأخير بسيط' : 'slightly delayed'}
            </span>
          ) : null}
        </Card>
      ) : null}

      {iraq[1] ? (
        <section className="basra-medium-row">
          <QuoteIdentity item={iraq[1]} ar={ar} />
          <div>
            <strong><bdi>${fmt2(iraq[1].b.usd)}</bdi></strong>
            <DirectionalChange value={iraq[1].b.pct} />
            {iqdPerBbl(iraq[1].b.usd) != null ? (
              <small><bdi>{fmt0(iqdPerBbl(iraq[1].b.usd)!)}</bdi> {ar ? 'د.ع' : 'IQD'}</small>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="tool-section">
        <h2>{ar ? 'المؤشرات العالمية' : 'Global benchmarks'}</h2>
        <div className="global-oil-grid">
          {bench.map((item, i) => (
            <article className={i === bench.length - 1 ? 'wide' : ''} key={item.key}>
              <QuoteIdentity item={item} ar={ar} />
              <strong><bdi>${fmt2(item.b.usd)}</bdi></strong>
              <DirectionalChange value={item.b.pct} />
            </article>
          ))}
        </div>
      </section>

      {region.length ? (
        <section className="tool-section">
          <h2>{ar ? 'خامات أوبك والمنطقة' : 'OPEC & regional blends'}</h2>
          <Card className="market-tool-card regional-oil-list">
            {region.map(item => (
              <div className="regional-oil-row" key={item.key}>
                <QuoteIdentity item={item} ar={ar} />
                <div>
                  <strong><bdi>${fmt2(item.b.usd)}</bdi></strong>
                  <DirectionalChange value={item.b.pct} />
                  {iqdPerBbl(item.b.usd) != null ? (
                    <small><bdi>{fmt0(iqdPerBbl(item.b.usd)!)}</bdi> {ar ? 'د.ع' : 'IQD'}</small>
                  ) : null}
                </div>
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      <Card className="market-tool-card calculator-card">
        <h2><span aria-hidden="true">▣</span> {ar ? 'حاسبة قيمة البرميل بالدينار' : 'Barrel value calculator'}</h2>
        <div className="calculator-fields">
          <label className="tool-field">
            <span>{ar ? 'نوع الخام' : 'Blend'}</span>
            <select value={calcKey} onChange={e => setCalcKey(e.target.value)}>
              {[...iraq, ...bench, ...region].map(x => (
                <option key={x.key} value={x.key}>{ar ? x.ar : x.en}</option>
              ))}
            </select>
          </label>
          <label className="tool-field">
            <span>{ar ? 'عدد البراميل' : 'Barrels'}</span>
            <input
              value={barrels}
              onChange={e => setBarrels(e.target.value.replace(/[^\d.]/g, ''))}
              inputMode="decimal"
              placeholder="0"
            />
          </label>
        </div>
        <div className="oil-calculator-result">
          <span>
            <small>{ar ? 'القيمة بالدولار' : 'Value in USD'}</small>
            <strong><bdi>${fmt2(usdTotal)}</bdi></strong>
          </span>
          {iqdTotal != null ? (
            <span>
              <small>{ar ? 'القيمة بالدينار' : 'Value in IQD'}</small>
              <strong><bdi>{fmt0(iqdTotal)}</bdi> {ar ? 'د.ع' : 'IQD'}</strong>
            </span>
          ) : null}
        </div>
        {iqdRate ? (
          <p>{ar ? `محسوب بسعر صرف ${fmt0(iqdRate)} دينار للدولار` : `Using ${fmt0(iqdRate)} IQD/USD`}</p>
        ) : null}
      </Card>

      <p className="market-tool-source">
        {ar ? 'المصدر' : 'Source'}:{' '}
        <a href={oil.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">{oil.source}</a>
        {' '}· {ar ? 'أسعار عالمية بتأخير بسيط · تُحدَّث يومياً' : 'global prices, slightly delayed · updated daily'}
      </p>
    </main>
  )
}
