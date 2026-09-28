'use client'

import { useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { haptic } from '@/lib/appMode'
import { RateHero, Tiles, nf0 } from './RateKit'
import { localeDate } from '@/lib/date'
import '@/styles/app.css'

/**
 * /app/gold · the app's gold screen: one karat in the hero (21 by default,
 * the one Iraqis buy), mithqal or gram, a weight calculator, every karat
 * below. The website's /gold keeps the explanations.
 */
export const MITHQAL_G = 4.608

export interface GoldScreenData {
  date: string | null
  fetchedAt: string | null
  grams: { karat: number; iqd: number }[]
  ounceUsd: number | null
  ounceIqd: number | null
}

export function AppGold({ d }: { d: GoldScreenData }) {
  const { t, locale } = useLocale()
  const G = t.app.gold
  const karats = d.grams.map((g) => g.karat).filter((k) => [24, 22, 21, 18].includes(k))
  const [k, setK] = useState(karats.includes(21) ? 21 : karats[0] ?? 21)
  const [unit, setUnit] = useState<'mithqal' | 'gram'>('mithqal')
  const [w, setW] = useState('1')
  const gram = d.grams.find((g) => g.karat === k)?.iqd ?? null
  const per = unit === 'mithqal' ? MITHQAL_G : 1
  const price = gram == null ? null : gram * per
  const weight = Number(w.replace(/[,٬\s]/g, '').replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660))) || 0
  const uName = unit === 'mithqal' ? G.mithqal : G.gram

  return (
    <main className="rk-screen">
      <RateHero label={G.title} flag="🥇" tone="gold" value={price} unit={G.perUnit(uName, k)} source={G.source} foot={d.date ? t.app.home.asOf(localeDate(d.date.replace(/\//g, '-'), locale)) : undefined} />
      <div className="rk-seg is-4" role="group" aria-label={G.karat(k)}>
        {karats.map((x) => <button key={x} type="button" aria-pressed={x === k} onClick={() => { haptic(); setK(x) }}>{G.karat(x)}</button>)}
      </div>
      <div className="rk-seg" role="group" aria-label={uName}>
        <button type="button" aria-pressed={unit === 'mithqal'} onClick={() => { haptic(); setUnit('mithqal') }}>{G.mithqal}</button>
        <button type="button" aria-pressed={unit === 'gram'} onClick={() => { haptic(); setUnit('gram') }}>{G.gram}</button>
      </div>

      <section className="rk-conv" aria-label={G.calc}>
        <h2 className="rk-h">{G.calc}</h2>
        <label className="rk-conv-field">
          <span className="rk-conv-cur">{G.weight} · {uName} · {G.karat(k)}</span>
          <input id="rk-gold-w" className="rk-conv-in id-num" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} onFocus={(e) => e.target.select()} />
        </label>
        <div className="rk-conv-field is-out">
          <span className="rk-conv-cur"><span aria-hidden="true">🇮🇶</span>{G.value}</span>
          <output className="rk-conv-out id-num" htmlFor="rk-gold-w"><bdi>{price == null ? '—' : nf0.format(weight * price)}</bdi></output>
        </div>
        <div className="rk-quick" role="group" aria-label={G.weight}>
          {[1, 5, 10, 20].map((q) => (
            <button key={q} type="button" className="rk-pill" aria-pressed={weight === q} onClick={() => { haptic(); setW(String(q)) }}><bdi>{q}</bdi> {uName}</button>
          ))}
        </div>
      </section>

      <h2 className="rk-h is-sub">{G.all}</h2>
      <ul className="rk-list">
        {d.grams.map((g) => (
          <li key={g.karat}>
            <button type="button" className="rk-row is-btn" aria-pressed={g.karat === k} onClick={() => { haptic(); if (karats.includes(g.karat)) setK(g.karat) }}>
              <span className="rk-karat id-num">{g.karat}</span>
              <span className="rk-row-name"><b>{G.karat(g.karat)}</b><small>{G.gram} · <bdi>{nf0.format(g.iqd)}</bdi></small></span>
              <span className="rk-row-val id-num"><bdi>{nf0.format(g.iqd * MITHQAL_G)}</bdi><small>{G.mithqal}</small></span>
            </button>
          </li>
        ))}
      </ul>

      <Tiles items={[
        { label: G.ounce, value: d.ounceUsd == null ? '—' : `$${nf0.format(d.ounceUsd)}` },
        { label: G.ounceIqd, value: d.ounceIqd == null ? '—' : nf0.format(d.ounceIqd) },
      ]} />
      <p className="rk-foot">{G.note}</p>
    </main>
  )
}
