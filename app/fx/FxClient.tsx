'use client'

import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { MarketToolTabs } from '@/components/design/MarketToolTabs'
import { Badge, Card, DirectionalChange } from '@/components/design/ui'
import { arDate } from '@/lib/date'
import type { FxData } from '@/lib/rates'

const fmt = (n: number, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })

export default function FxClient({ fx }: { fx: FxData | null }) {
  const { lang } = useApp()
  const ar = lang === 'ar'

  // Rate used for conversion: the quoted selling price (سعر البيع) is what
  // Iraqis cite as "سعر الدولار"; fall back to buy.
  const rate = fx?.sell ?? fx?.buy ?? null

  const [usd, setUsd] = useState('100')
  const [iqd, setIqd] = useState(() => (rate ? String(Math.round(100 * rate)) : ''))

  function onUsd(v: string) {
    const c = v.replace(/[^\d.]/g, '')
    setUsd(c)
    setIqd(rate && c ? String(Math.round(parseFloat(c) * rate)) : '')
  }
  function onIqd(v: string) {
    const c = v.replace(/[^\d.]/g, '')
    setIqd(c)
    setUsd(rate && c ? (parseFloat(c) / rate).toFixed(2) : '')
  }

  if (!fx || !rate) {
    return (
      <main className="terminal-shell app-page market-tool-page">
        <MarketToolTabs active="fx" ar={ar} />
        <div className="empty-state">
          <strong>{ar ? 'تعذّر تحميل سعر الصرف' : 'Exchange rate unavailable'}</strong>
          <span>{ar ? 'حاول مرة أخرى بعد قليل.' : 'Please try again shortly.'}</span>
        </div>
      </main>
    )
  }

  return (
    <main className="terminal-shell app-page market-tool-page">
      <MarketToolTabs active="fx" ar={ar} />

      <Card className="market-tool-card market-tool-hero fx-hero">
        <div className="market-tool-hero-head">
          <div>
            <h1>{ar ? 'دولار أمريكي / دينار عراقي' : 'USD / IQD'}</h1>
            <p>{ar ? 'السوق الموازي · السعر العام' : 'Parallel market'}</p>
          </div>
          {/* A cached rate is not a live one — the page said "مباشر" over a
              month-old dollar for as long as the source stayed unreadable. */}
          {fx.stale
            ? <Badge tone="accent">{ar ? 'آخر سعر معروف' : 'Last known'}</Badge>
            : <Badge tone="success" dot>{ar ? 'مباشر' : 'LIVE'}</Badge>}
        </div>
        <div className="market-tool-headline">
          <strong><bdi>{fmt(rate, 0)}</bdi> <small>{ar ? 'د.ع لكل دولار' : 'IQD / $1'}</small></strong>
          {fx.change != null && fx.change !== 0 ? (
            <span>
              <DirectionalChange value={fx.change} suffix="" />
              <small>{ar ? 'مقارنة بسعر أمس' : 'vs. yesterday'}</small>
            </span>
          ) : null}
        </div>
        {fx.date ? (
          <span className="market-tool-updated">
            {ar ? 'آخر تحديث' : 'Updated'}: {ar ? arDate(fx.date) : fx.date}
            {fx.stale ? <> · {ar ? 'تعذّر تحديث السعر من المصدر' : 'could not refresh from source'}</> : null}
          </span>
        ) : null}
      </Card>

      <div className="fx-quote-grid">
        {fx.sell != null ? (
          <Card className="market-tool-card quote-tile">
            <span className="quote-label"><i className="sell" />{ar ? 'بيع' : 'Sell'}</span>
            <strong><bdi>{fmt(fx.sell, 2)}</bdi></strong>
            <small>{ar ? 'سعر بيع الدولار' : 'they sell USD'}</small>
          </Card>
        ) : null}
        {fx.buy != null ? (
          <Card className="market-tool-card quote-tile">
            <span className="quote-label"><i className="buy" />{ar ? 'شراء' : 'Buy'}</span>
            <strong><bdi>{fmt(fx.buy, 2)}</bdi></strong>
            <small>{ar ? 'سعر شراء الدولار' : 'they buy USD'}</small>
          </Card>
        ) : null}
      </div>

      <Card className="market-tool-card calculator-card">
        <h2><span aria-hidden="true">⇄</span> {ar ? 'محوّل العملة' : 'Currency converter'}</h2>
        <div className="converter-grid">
          <label className="tool-field">
            <span>{ar ? 'دينار عراقي' : 'Iraqi Dinar'}</span>
            <input value={iqd} onChange={e => onIqd(e.target.value)} inputMode="decimal" placeholder="0" />
          </label>
          <span className="converter-equals" aria-hidden="true">=</span>
          <label className="tool-field">
            <span>{ar ? 'دولار أمريكي' : 'US Dollar'}</span>
            <input value={usd} onChange={e => onUsd(e.target.value)} inputMode="decimal" placeholder="0" />
          </label>
        </div>
        <p>{ar ? `محسوب على سعر ${fmt(rate, 0)} د.ع للدولار` : `Based on ${fmt(rate, 0)} IQD/$1`}</p>
      </Card>

      <p className="market-tool-source">
        {ar ? 'المصدر' : 'Source'}:{' '}
        <a href={fx.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">{fx.source}</a>
        {' '}· {ar ? 'يُحدَّث يومياً' : 'updated daily'}
      </p>
    </main>
  )
}
