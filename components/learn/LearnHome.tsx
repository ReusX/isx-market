'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useApp } from '@/context/AppContext'
import { existsIn } from '@/lib/i18n/routes'
import { Reveal, Scribble, Bubble } from './Ink'
import { LxShell } from './LxShell'
import '@/styles/learn-home.css'

/**
 * /learn · the home of the Learn platform, a world of its own: ink on
 * newsprint, a recurring cast (public/learn/cast), Ruqaa lettering, and lines
 * that draw themselves in. It keeps the site's routes and data, not its look —
 * no site nav, no door rail; a slim header of its own with a way back.
 *
 * Paper only, in both themes, on purpose: the cast is black ink drawn for
 * cream paper and would vanish on a dark ground.
 */
const CAST = '/learn/cast'
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export type LearnHomeData = { then: { year: number; usd: number }; nowUsd: number } | null

type Level = { id: string; name: string; tag: string; blurb: string; lessons: { label: string; href: string | null }[] }
const LEVEL_ART: Record<string, { src: string; w: number; h: number }> = {
  start: { src: `${CAST}/sara-think.webp`, w: 508, h: 519 },
  ready: { src: `${CAST}/abu-ali-count.webp`, w: 519, h: 507 },
  investor: { src: `${CAST}/abu-ali-board.webp`, w: 656, h: 513 },
}

function Hero() {
  const { t, locale, href: L } = useLocale()
  const H = t.learn.home.hero
  const street = '/learn/invest'
  return (
    <Reveal as="section" className="lx-hero" aria-labelledby="lx-hero-h">
      <div className="lx-hero-txt">
        <p className="lx-kicker">{H.kicker}</p>
        <h1 id="lx-hero-h" className="lx-h1">
          <span>{H.title}</span>
          <span>{H.title2} <span className="lx-mark">{H.mark}<Scribble kind="underline" color="var(--lx-red)" width={4} /></span></span>
        </h1>
        <p className="lx-lead">{H.lead}</p>
        <div className="lx-acts">
          <a href="#lx-levels" className="lx-btn is-ink">{H.start}</a>
          {existsIn(street, locale) ? <Link href={L(street)} className="lx-btn">{H.street}</Link> : null}
          <Scribble kind="arrow" className="lx-hero-arrow" color="var(--lx-green)" />
        </div>
      </div>
      <figure className="lx-panel lx-hero-panel">
        <img src={`${CAST}/scene-mattress.webp`} width={1672} height={941} alt={H.alt} fetchPriority="high" />
        <Bubble className="lx-pop lx-hero-sara" tail="down-start">{H.sara}</Bubble>
        <Bubble className="lx-pop lx-hero-salim" tail="down-end">{H.salim}</Bubble>
      </figure>
    </Reveal>
  )
}

function Levels() {
  const { t, locale, href: L } = useLocale()
  const V = t.learn.home.levels
  return (
    <section id="lx-levels" className="lx-sec" aria-labelledby="lx-levels-h">
      <Reveal className="lx-sec-head">
        <h2 id="lx-levels-h" className="lx-h2">{V.title}<Scribble kind="swoosh" color="var(--lx-green)" /></h2>
        <p className="lx-sub">{V.sub}</p>
      </Reveal>
      <ol className="lx-levels">
        {(V.items as Level[]).map((lv, i) => {
          const art = LEVEL_ART[lv.id]
          return (
            <Reveal as="li" key={lv.id} className={`lx-level is-${lv.id}`}>
              <span className="lx-level-n">{i + 1}</span>
              <span className="lx-tag">{lv.tag}</span>
              <h3 className="lx-h3">{lv.name}</h3>
              <p className="lx-p">{lv.blurb}</p>
              <ul className="lx-lessons">
                {lv.lessons.map((l) => {
                  const live = l.href && existsIn(l.href, locale)
                  return (
                    <li key={l.label}>
                      {live ? <Link href={L(l.href!)}>{l.label} <span aria-hidden="true">←</span></Link>
                        : <span className="is-soon">{l.label} <em>{V.soon}</em></span>}
                    </li>
                  )
                })}
              </ul>
              {art ? <img className="lx-level-art lx-bob" src={art.src} width={art.w} height={art.h} alt="" loading="lazy" /> : null}
            </Reveal>
          )
        })}
      </ol>
    </section>
  )
}

function Strip({ data }: { data: LearnHomeData }) {
  const { t, locale, href: L } = useLocale()
  const S = t.learn.home.strip
  const street = '/learn/invest'
  if (!data) return null
  const then = MILLION / data.then.usd, now = MILLION / data.nowUsd
  return (
    <section className="lx-sec" aria-labelledby="lx-strip-h">
      <Reveal className="lx-sec-head">
        <h2 id="lx-strip-h" className="lx-h2">{S.title}<Scribble kind="swoosh" color="var(--lx-red)" /></h2>
        <p className="lx-sub">{S.sub}</p>
      </Reveal>
      <div className="lx-strip">
        <Reveal as="figure" className="lx-panel lx-frame">
          <figcaption className="lx-cap">{S.c1(data.then.year)}</figcaption>
          <Bubble className="lx-pop" tail="down-end">{S.s1}</Bubble>
          <img src={`${CAST}/abu-salim-mattress.webp`} width={536} height={506} alt="" loading="lazy" />
          <p className="lx-stamp is-green">{S.n1(nf0.format(then))}</p>
        </Reveal>
        <Reveal as="figure" className="lx-panel lx-frame">
          <figcaption className="lx-cap">{S.c2}</figcaption>
          <Bubble className="lx-pop" tail="down-start">{S.s2}</Bubble>
          <img src={`${CAST}/abu-salim-shock.webp`} width={460} height={503} alt="" loading="lazy" />
          <p className="lx-stamp is-red">{S.n2(nf0.format(now))}</p>
        </Reveal>
        <Reveal as="figure" className="lx-panel lx-frame">
          <figcaption className="lx-cap">{S.c3}</figcaption>
          <Bubble className="lx-pop" tail="down-end">{S.s3}</Bubble>
          <img src={`${CAST}/sara-phone.webp`} width={412} height={516} alt="" loading="lazy" />
          {existsIn(street, locale) ? <Link href={L(street)} className="lx-btn is-ink lx-strip-cta">{S.cta}</Link> : null}
        </Reveal>
      </div>
      <p className="lx-note">{S.source}</p>
    </section>
  )
}
const MILLION = 1_000_000

function Terms() {
  const { t } = useLocale()
  const T = t.learn.home.terms
  const [on, setOn] = useState(0)
  const term = T.items[on]
  return (
    <section id="lx-terms" className="lx-sec" aria-labelledby="lx-terms-h">
      <Reveal className="lx-sec-head">
        <h2 id="lx-terms-h" className="lx-h2">{T.title}<Scribble kind="swoosh" color="var(--lx-green)" /></h2>
        <p className="lx-sub">{T.sub}</p>
      </Reveal>
      <div className="lx-terms">
        <div className="lx-chips" role="tablist" aria-label={T.title}>
          {T.items.map((it, i) => (
            <button key={it.t} type="button" role="tab" id={`lx-term-${i}`} aria-selected={i === on} aria-controls="lx-term-card"
              className={`lx-chip ${i === on ? 'is-on' : ''}`} onClick={() => setOn(i)}>{it.t}</button>
          ))}
        </div>
        <div className="lx-card-wrap">
          <article id="lx-term-card" role="tabpanel" aria-labelledby={`lx-term-${on}`} className="lx-card" key={on}>
            <h3 className="lx-card-t">{term.t}</h3>
            <p className="lx-p">{term.d}</p>
            <p className="lx-card-ex"><b>{T.example}:</b> {term.ex}</p>
          </article>
          <img className="lx-terms-art" src={`${CAST}/abu-ali-wink.webp`} width={575} height={530} alt="" loading="lazy" />
        </div>
      </div>
    </section>
  )
}

function Faq() {
  const { t } = useLocale()
  const F = t.learn.home.faq
  return (
    <section id="lx-faq" className="lx-sec lx-faq-sec" aria-labelledby="lx-faq-h">
      <Reveal className="lx-sec-head">
        <h2 id="lx-faq-h" className="lx-h2">{F.title}<Scribble kind="swoosh" color="var(--lx-red)" /></h2>
      </Reveal>
      <div className="lx-faq">
        {F.items.map((it) => (
          <details key={it.q} className="lx-q">
            <summary><span>{it.q}</span><i aria-hidden="true" /></summary>
            <p className="lx-p">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function Soon() {
  const { t, href: L } = useLocale()
  const { user } = useApp()
  const S = t.learn.home.soon
  return (
    <Reveal as="section" className="lx-soon" aria-labelledby="lx-soon-h">
      <div className="lx-soon-txt">
        <p className="lx-kicker is-light">{S.kicker}</p>
        <h2 id="lx-soon-h" className="lx-h2 is-light">{S.title}</h2>
        <p className="lx-p">{S.body}</p>
        {user ? <p className="lx-signed">{S.signed}</p> : <Link href={L('/signup')} className="lx-btn is-paper">{S.cta}</Link>}
      </div>
      <ol className="lx-film">
        {S.videos.map((v, i) => (
          <li key={v}>
            <span className="lx-film-n">{i + 1}</span>
            <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M10 8l6 4-6 4z" fill="currentColor" /></svg>
            <span>{v}</span>
          </li>
        ))}
      </ol>
      <div className="lx-soon-peek">
        <Bubble className="lx-pop" tail="down-end">{S.abuAli}</Bubble>
        <img src={`${CAST}/abu-ali-counter.webp`} width={607} height={513} alt="" loading="lazy" />
      </div>
    </Reveal>
  )
}

export function LearnHome({ data }: { data: LearnHomeData }) {
  return (
    <LxShell>
      <Hero />
      <Levels />
      <Strip data={data} />
      <Terms />
      <Faq />
      <Soon />
    </LxShell>
  )
}
