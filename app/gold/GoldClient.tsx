'use client'

import { useMemo, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { MarketToolTabs } from '@/components/design/MarketToolTabs'
import { Badge, Card } from '@/components/design/ui'
import { arDate } from '@/lib/date'
import type { GoldData, FxData } from '@/lib/rates'

const fmt = (n: number) => n.toLocaleString('en-US')

// Latin digits, as the design uses and as every price on the page does.
const KARAT_AR: Record<number, string> = { 24: 'عيار 24', 22: 'عيار 22', 21: 'عيار 21', 18: 'عيار 18', 14: 'عيار 14' }
const KARAT_LABEL: Record<number, string> = { 24: 'الأنقى', 22: 'مجوهرات', 21: 'الأكثر تداولاً', 18: 'مرصّع', 14: 'اقتصادي' }

export default function GoldClient({ gold }: { gold: GoldData | null; fx: FxData | null }) {
  const { lang } = useApp()
  const ar = lang === 'ar'

  const byKarat = useMemo(() => {
    const m = new Map<number, { iqd: number; usd: number }>()
    gold?.grams.forEach(g => m.set(g.karat, { iqd: g.iqd, usd: g.usd }))
    return m
  }, [gold])

  const k24 = byKarat.get(24)
  const others = [22, 21, 18, 14].filter(k => byKarat.has(k))

  // ── Calculator ──
  // Opens on one gram so the calculator shows a real figure, not a zero.
  const [grams, setGrams] = useState('1')
  const [karat, setKarat] = useState(21)
  const perGram = byKarat.get(karat)?.iqd ?? 0
  const total = (parseFloat(grams) || 0) * perGram

  if (!gold || !k24) {
    return (
      <main className="terminal-shell app-page market-tool-page">
        <MarketToolTabs active="gold" ar={ar} />
        <div className="empty-state">
          <strong>{ar ? 'تعذّر تحميل أسعار الذهب' : 'Gold prices unavailable'}</strong>
          <span>{ar ? 'حاول مرة أخرى بعد قليل.' : 'Please try again shortly.'}</span>
        </div>
      </main>
    )
  }

  return (
    <main className="terminal-shell app-page market-tool-page">
      <MarketToolTabs active="gold" ar={ar} />

      <Card className="market-tool-card market-tool-hero">
        <div className="market-tool-hero-head">
          <div>
            {/* The page's only h1 now that the duplicate hidden one is gone, so
                it names the page rather than the card. The specific karat moves
                to the subline, where it reads as the qualifier it always was. */}
            <h1>{ar ? 'سعر الذهب اليوم في العراق' : 'Gold price in Iraq today'}</h1>
            <p>{ar ? 'الذهب عيار 24 · سعر الغرام' : 'Gold 24K · per gram'}</p>
          </div>
          <Badge tone="success" dot>{ar ? 'مباشر' : 'LIVE'}</Badge>
        </div>
        <div className="market-tool-headline gold-headline">
          <strong><bdi>{fmt(k24.iqd)}</bdi> <small>{ar ? 'د.ع' : 'IQD'}</small></strong>
          <span><bdi>≈ ${fmt(k24.usd)}</bdi></span>
        </div>
        {gold.date ? (
          <span className="market-tool-updated">{ar ? 'آخر تحديث' : 'Updated'}: {ar ? arDate(gold.date) : gold.date}</span>
        ) : null}
      </Card>

      <section className="tool-section">
        <h2>{ar ? 'عيارات أخرى' : 'Other karats'}</h2>
        <div className="karat-grid">
          {others.map(k => {
            const d = byKarat.get(k)!
            const featured = k === 21
            return (
              <article className={featured ? 'karat-tile featured' : 'karat-tile'} key={k}>
                {ar ? <span className={featured ? 'karat-tag accent' : 'karat-tag'}>{KARAT_LABEL[k]}</span> : null}
                <h3>{ar ? KARAT_AR[k] : `${k}K`}</h3>
                <strong><bdi>{fmt(d.iqd)}</bdi></strong>
                <small><bdi>${fmt(d.usd)}</bdi></small>
              </article>
            )
          })}
        </div>
      </section>

      {gold.ounceBuy || gold.ounceSell ? (
        <div className="ounce-grid">
          {gold.ounceSell ? (
            <article>
              <span>{ar ? 'أونصة · بيع' : 'Ounce · Sell'}</span>
              <strong><bdi>{fmt(gold.ounceSell.iqd)}</bdi></strong>
              <small><bdi>${fmt(gold.ounceSell.usd)}</bdi></small>
            </article>
          ) : null}
          {gold.ounceBuy ? (
            <article>
              <span>{ar ? 'أونصة · شراء' : 'Ounce · Buy'}</span>
              <strong className="positive"><bdi>{fmt(gold.ounceBuy.iqd)}</bdi></strong>
              <small><bdi>${fmt(gold.ounceBuy.usd)}</bdi></small>
            </article>
          ) : null}
        </div>
      ) : null}

      <Card className="market-tool-card calculator-card">
        <h2><span aria-hidden="true">▣</span> {ar ? 'حاسبة قيمة الذهب' : 'Gold value calculator'}</h2>
        <div className="calculator-fields">
          <label className="tool-field">
            <span>{ar ? 'العيار' : 'Karat'}</span>
            <select value={karat} onChange={e => setKarat(+e.target.value)}>
              {[24, 22, 21, 18, 14].filter(k => byKarat.has(k)).map(k => (
                <option key={k} value={k}>{ar ? KARAT_AR[k] : `${k}K`}</option>
              ))}
            </select>
          </label>
          <label className="tool-field">
            <span>{ar ? 'الوزن (غرام)' : 'Weight (grams)'}</span>
            <input
              value={grams}
              onChange={e => setGrams(e.target.value.replace(/[^\d.]/g, ''))}
              inputMode="decimal"
              placeholder="0"
            />
          </label>
        </div>
        <div className="calculator-result">
          <span>{ar ? 'القيمة التقديرية' : 'Estimated value'}</span>
          <strong><bdi>{fmt(Math.round(total))}</bdi> <small>{ar ? 'د.ع' : 'IQD'}</small></strong>
        </div>
      </Card>

      <p className="market-tool-source">
        {ar ? 'المصدر' : 'Source'}:{' '}
        <a href={gold.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">{gold.source}</a>
        {' '}· {ar ? 'يُحدَّث يومياً' : 'updated daily'}
      </p>
    </main>
  )
}
