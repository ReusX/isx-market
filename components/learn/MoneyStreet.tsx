'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useApp } from '@/context/AppContext'
import { street as S, type DoorId } from '@/lib/moneyStreetCopy'
import type { StreetData } from '@/lib/moneyStreet'
import { Reveal, Scribble, Bubble } from './Ink'
import { LxShell } from './LxShell'
import '@/styles/learn-street.css'

/**
 * «شارع المال» · /learn/invest — Lesson 1 of the Learn platform.
 *
 * One question («a million dinars: where do you keep it?»), four doors, one
 * result. The only control is the span, 5 or 10 years back, and every answer
 * comes from lib/moneyStreet.ts. Kept deliberately short: the owner found the
 * first version (five stops, a year picker, a deposit calculator, karat and
 * ownership maths) too much for a beginner.
 */
const CAST = '/learn/cast'
const MILLION = 1_000_000
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const DOORS: DoorId[] = ['mattress', 'dollar', 'gold', 'shares']
const ART: Record<DoorId, { src: string; w: number; h: number }> = {
  mattress: { src: `${CAST}/abu-salim-mattress.webp`, w: 536, h: 506 },
  dollar: { src: `${CAST}/abu-ali-count.webp`, w: 519, h: 507 },
  gold: { src: `${CAST}/hajji-scale.webp`, w: 592, h: 484 },
  shares: { src: `${CAST}/ahmed-tablet.webp`, w: 360, h: 504 },
}
const FACE: Record<string, { src: string; w: number; h: number }> = {
  sara: { src: `${CAST}/sara-think.webp`, w: 508, h: 519 },
  'abu-ali': { src: `${CAST}/abu-ali-wink.webp`, w: 575, h: 530 },
  'abu-salim': { src: `${CAST}/abu-salim-arms.webp`, w: 321, h: 531 },
}

function Span({ value, onChange, options, since }: { value: number; onChange: (n: number) => void; options: number[]; since: number }) {
  return (
    <div className="lxs-span">
      <span className="lxs-span-k">{S.span.label}</span>
      <div className="lxs-span-row" role="radiogroup" aria-label={S.span.label}>
        {options.map((n) => (
          <button key={n} type="button" role="radio" aria-checked={n === value} className={`lx-chip ${n === value ? 'is-on' : ''}`} onClick={() => onChange(n)}>
            {S.span.years(n)}
          </button>
        ))}
      </div>
      <span className="lxs-span-since">{S.span.since(since)}</span>
    </div>
  )
}

export function MoneyStreet({ data }: { data: StreetData }) {
  const { href: L } = useLocale()
  const { user } = useApp()
  const thisYear = new Date().getFullYear()
  /* Offer a span only when the data reaches back that far. */
  const options = [5, 10].filter((n) => data.years.some((y) => y.year === thisYear - n))
  const [span, setSpan] = useState(options[0] ?? 5)
  const Y = data.years.find((y) => y.year === thisYear - span) ?? data.years[0]
  const n = data.now

  const value = useMemo<Record<DoorId, number | null>>(() => {
    if (!Y) return { mattress: null, dollar: null, gold: null, shares: null }
    const dollars = MILLION / Y.usd
    return {
      mattress: MILLION,
      dollar: n.usdBuy ? dollars * n.usdBuy : null,
      gold: n.usdBuy && n.goldOunceUsd ? (dollars / Y.goldUsd) * n.goldOunceUsd * n.usdBuy : null,
      shares: n.isx60 ? MILLION * (n.isx60 / Y.isx60) : null,
    }
  }, [Y, n])

  const max = Math.max(MILLION, ...DOORS.map((d) => value[d] ?? 0))
  const ranked = [...DOORS].sort((a, b) => (value[b] ?? 0) - (value[a] ?? 0))
  if (!Y) return null

  return (
    <LxShell>
      {/* ── The question ─────────────────────────────────────────── */}
      <Reveal as="section" className="lx-hero lxs-hero" aria-labelledby="lxs-h">
        <div className="lx-hero-txt">
          <p className="lx-kicker">{S.hero.kicker} · {S.hero.minutes}</p>
          <h1 id="lxs-h" className="lx-h1">
            <span>{S.hero.title}</span>
            <span className="lx-mark">{S.hero.mark}<Scribble kind="underline" color="var(--lx-red)" width={4} /></span>
          </h1>
          <p className="lx-lead">{S.hero.lead}</p>
          <Span value={span} onChange={setSpan} options={options} since={Y.year} />
          <a href="#lxs-mattress" className="lx-btn is-ink">{S.hero.start}</a>
        </div>
        <figure className="lxs-hero-art">
          <Bubble className="lx-pop" tail="down-end">{S.hero.bubble}</Bubble>
          <img className="lx-bob" src={`${CAST}/abu-salim-stand.webp`} width={359} height={500} alt="" fetchPriority="high" />
        </figure>
      </Reveal>

      {/* ── Four doors ───────────────────────────────────────────── */}
      <ol className="lxs-doors">
        {DOORS.map((id, i) => {
          const D = S.doors[id]
          const v = value[id]
          const up = v != null && v > MILLION
          return (
            <Reveal as="li" key={id} id={`lxs-${id}`} className={`lx-panel lxs-door is-${id}`}>
              <div className="lxs-door-art">
                <Bubble className="lx-pop" tail="down-end">{D.bubble}</Bubble>
                <img src={ART[id].src} width={ART[id].w} height={ART[id].h} alt="" loading="lazy" />
              </div>
              <div className="lxs-door-txt">
                <p className="lxs-of">{S.door.of(i + 1)} · {D.who}</p>
                <h2 className="lx-h3 lxs-door-h">{D.name}</h2>
                <p className="lx-p">{D.line}</p>
                {id === 'mattress' && n.usdSell ? (
                  <>
                    <p className="lx-stamp is-red lxs-big">{nf0.format(MILLION)} <small>{S.door.dinar}</small></p>
                    <p className="lx-p lxs-result">{S.doors.mattress.result(nf0.format(MILLION / Y.usd), nf0.format(MILLION / n.usdSell))}</p>
                  </>
                ) : v != null ? (
                  <>
                    <p className="lxs-today">{S.door.today}</p>
                    <p className={`lx-stamp lxs-big ${up ? 'is-green' : 'is-red'}`}>{nf0.format(v)} <small>{S.door.dinar}</small></p>
                  </>
                ) : null}
                <p className="lxs-lesson">{D.lesson}</p>
              </div>
            </Reveal>
          )
        })}
      </ol>

      {/* ── The result ───────────────────────────────────────────── */}
      <Reveal as="section" className="lx-sec lxs-result-sec" aria-labelledby="lxs-result-h">
        <div className="lx-sec-head">
          <h2 id="lxs-result-h" className="lx-h2">{S.result.title}<Scribble kind="swoosh" color="var(--lx-green)" /></h2>
          <p className="lx-sub">{S.result.lead(span)}</p>
        </div>
        <Span value={span} onChange={setSpan} options={options} since={Y.year} />
        <ol className="lxs-bars">
          {ranked.map((id) => {
            const v = value[id] ?? 0
            const tone = id === 'mattress' ? 'is-flat' : v >= MILLION ? 'is-up' : 'is-down'
            return (
              <li key={id}>
                <span className="lxs-bar-name">{S.doors[id].name}{id === 'mattress' ? <small>{S.result.flat}</small> : null}</span>
                <span className="lxs-bar-track">
                  <i className={tone} style={{ inlineSize: `${Math.max(3, (v / max) * 100)}%` }} />
                  <em style={{ insetInlineStart: `${(MILLION / max) * 100}%` }} aria-hidden="true" />
                </span>
                <b className="lxs-bar-v">{nf0.format(v)}</b>
              </li>
            )
          })}
        </ol>
        <p className="lxs-key"><em aria-hidden="true" /> {S.result.start}</p>
        <p className="lx-note">{S.result.note}</p>
      </Reveal>

      {/* ── Three ideas, said by the cast ────────────────────────── */}
      <section className="lx-sec" aria-labelledby="lxs-ideas-h">
        <Reveal className="lx-sec-head">
          <h2 id="lxs-ideas-h" className="lx-h2">{S.ideas.title}<Scribble kind="swoosh" color="var(--lx-red)" /></h2>
        </Reveal>
        <ul className="lxs-ideas">
          {S.ideas.items.map((it) => (
            <Reveal as="li" key={it.say}>
              <Bubble className="lx-pop" tail="down-end">{it.say}</Bubble>
              <img src={FACE[it.who].src} width={FACE[it.who].w} height={FACE[it.who].h} alt="" loading="lazy" />
            </Reveal>
          ))}
        </ul>
      </section>

      {/* ── Next lesson ──────────────────────────────────────────── */}
      <Reveal as="section" className="lx-soon lxs-next" aria-labelledby="lxs-next-h">
        <div className="lx-soon-txt">
          <p className="lx-kicker is-light">{S.next.kicker} · {S.next.soon}</p>
          <h2 id="lxs-next-h" className="lx-h2 is-light">{S.next.title}</h2>
          <p className="lx-p">{S.next.body}</p>
          {user ? <p className="lx-signed">{S.next.signed}</p> : <Link href={L('/signup')} className="lx-btn is-paper">{S.next.cta}</Link>}
        </div>
        <div className="lxs-next-back">
          <Link href={L('/learn')} className="lx-btn is-paper">{S.next.back}</Link>
        </div>
      </Reveal>

      <p className="lx-note lxs-how">{S.how}</p>
    </LxShell>
  )
}
