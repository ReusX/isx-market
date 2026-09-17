'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { PageTitle } from './PageTitle'
import { EMAIL, PHONE_DISPLAY, PHONE_INTL, SOCIAL, TOPIC_IDS, FAMILY, mailto } from '@/lib/infoData'
import type { LegalSection } from '@/lib/legalContent'
import '@/styles/info-page.css'

/**
 * The public-information family — about, contact, privacy, legal — as
 * reading pages. Prose at `.id-read` width, the standfirst behind the «!»,
 * a row of the sibling pages at the foot. The copy is the dictionaries'
 * and `lib/legalContent`'s, untouched; only the chrome is new.
 */
function Family({ current }: { current: string }) {
  const { t, href: L } = useLocale()
  return (
    <nav className="inf-family" aria-label={t.info.familyLabel}>
      {FAMILY.filter((f) => f.href !== current).map((f) => <Link key={f.href} href={L(f.href)}>{t.nav.info[f.id]}</Link>)}
    </nav>
  )
}

function Frame({ current, eyebrow, title, standfirst, children }: { current: string; eyebrow: string; title: string; standfirst?: string; children: React.ReactNode }) {
  return (
    <SiteShell>
      <main className="inf id-full">
        <article className="inf-body id-read">
          <p className="id-eyebrow">{eyebrow}</p>
          <PageTitle title={title} note={standfirst} />
          {children}
          <Family current={current} />
        </article>
      </main>
    </SiteShell>
  )
}

/* ── /about ─────────────────────────────────────────────────────────────── */
export function AboutPage() {
  const { t, href: L } = useLocale()
  const a = t.info.about
  return (
    <Frame current="/about" eyebrow={a.eyebrow} title={a.title} standfirst={a.standfirst}>
      <div className="inf-letter id-body">
        <p>{a.letter1} <strong>{a.letterAuthor}</strong>{a.letter1b}</p>
        <p>{a.letter2}</p>
        <p className="inf-sign">{a.signOff}<br /><strong>{a.signName}</strong></p>
      </div>
      <section className="inf-sec" aria-labelledby="inf-claims">
        <h2 id="inf-claims" className="id-h3">{a.claimsHeading}</h2>
        <dl className="inf-claims">
          <div><dt>{a.claimFreeTerm}</dt><dd>{a.claimFreeDesc}</dd></div>
          <div><dt>{a.claimDailyTerm}</dt><dd>{a.claimDailyDesc}</dd></div>
          <div><dt>{a.claimBuildingTerm}</dt><dd>{a.claimBuildingDesc}</dd></div>
        </dl>
      </section>
      <section className="inf-sec" aria-labelledby="inf-sources">
        <h2 id="inf-sources" className="id-h3">{a.sourcesHeading}</h2>
        <p className="id-body">{a.sourcesNote}</p>
      </section>
      <section className="inf-sec" aria-labelledby="inf-reach">
        <h2 id="inf-reach" className="id-h3">{a.reachHeading}</h2>
        <p className="inf-rows"><a className="id-link" href={mailto()} dir="ltr">{EMAIL}</a><a className="id-link" href={`tel:${PHONE_INTL}`} dir="ltr">{PHONE_DISPLAY}</a></p>
        <p><Link className="id-btn is-sm" href={L('/contact')}>{a.reachGo}</Link></p>
      </section>
    </Frame>
  )
}

/* ── /contact ───────────────────────────────────────────────────────────── */
export function ContactPage() {
  const { t } = useLocale()
  const c = t.info.contact
  const [copied, setCopied] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(EMAIL); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* no clipboard */ } }
  return (
    <Frame current="/contact" eyebrow={c.eyebrow} title={c.title} standfirst={c.standfirst}>
      <section className="inf-sec" aria-labelledby="inf-mail">
        <h2 id="inf-mail" className="id-h3">{c.emailHeading}</h2>
        <p className="inf-rows"><a className="id-link inf-mail" href={mailto()} dir="ltr">{EMAIL}</a><button type="button" className="id-btn is-sm" onClick={copy}>{copied ? c.copied : c.copy}</button></p>
        <p className="id-cap">{c.replyTime}</p>
      </section>
      <section className="inf-sec" aria-labelledby="inf-topics">
        <h2 id="inf-topics" className="id-h3">{c.topicsHeading}</h2>
        <p className="id-cap">{c.topicsNote}</p>
        <div className="id-pills inf-topics">
          {TOPIC_IDS.map((id) => <a key={id} className="id-pill is-sm" href={mailto(c.topics[id].subject)}>{c.topics[id].label}</a>)}
        </div>
      </section>
      <section className="inf-sec" aria-labelledby="inf-channels">
        <h2 id="inf-channels" className="id-h3">{c.channelsHeading}</h2>
        <dl className="inf-claims">
          <div><dt>{c.phone}</dt><dd><a className="id-link" href={`tel:${PHONE_INTL}`}><bdi dir="ltr">{PHONE_DISPLAY}</bdi></a></dd></div>
          {SOCIAL.map((s) => <div key={s.id}><dt>{s.label}</dt><dd><a className="id-link" href={s.href} target="_blank" rel="noopener" aria-label={`${s.label} · ${c.newWindow}`}><bdi dir="ltr">{s.handle}</bdi> ↗</a></dd></div>)}
        </dl>
      </section>
    </Frame>
  )
}

/* ── /legal · /privacy ──────────────────────────────────────────────────── */
export function LegalPage({ route, eyebrow, title, sections, banner, updated }: {
  route: string; eyebrow: string; title: string; sections: LegalSection[]; banner?: string; updated: string
}) {
  const { t } = useLocale()
  const lg = t.info.legal
  return (
    <Frame current={route} eyebrow={eyebrow} title={title}>
      <p className="id-cap">{lg.updated}: {updated}</p>
      {banner ? <p className="id-note inf-banner"><b>{lg.notice}</b> · {banner}</p> : null}
      <nav className="inf-toc" aria-label={lg.onThisPage}>
        <p className="id-cap">{lg.onThisPage}</p>
        <ol>{sections.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}</ol>
      </nav>
      {sections.map((s) => (
        <section key={s.id} id={s.id} className="inf-sec" aria-labelledby={`${s.id}-h`}>
          <h2 id={`${s.id}-h`} className="id-h3">{s.title}</h2>
          {s.blocks.map((b, i) => b.kind === 'p' ? <p key={i} className="id-body">{b.text}</p>
            : b.kind === 'note' ? <p key={i} className="id-note">{b.text}</p>
            : <ul key={i} className="id-body inf-ul">{b.items.map((it, k) => <li key={k}>{it}</li>)}</ul>)}
        </section>
      ))}
    </Frame>
  )
}
