'use client'

import Link from 'next/link'
import { InfoHead, FamilyRow, Plate } from '@/components/info/InfoChrome'
import { EMAIL, PHONE_DISPLAY, PHONE_INTL, mailto } from '@/lib/infoData'
import { useLocale } from '@/context/LocaleContext'
import '@/styles/info.css'

/**
 * /about — من نحن. A direct transplant of the approved page.
 *
 * ── What the page is, and what it must not become ─────────────────────────
 * What is IQWealth, what does it do, why does it exist — concisely. Not a
 * founder story, not a pitch deck, not an SEO wall.
 *
 * The live page is a personal welcome LETTER signed أحمد بلحة, and the letter
 * is KEPT, verbatim. It is the most credible thing on the site: a named person
 * saying this is free, it is for you, and it is not finished yet. The
 * reference file replaces the body with «فقرة تجريبية» placeholders because
 * the design app had no right to the owner's words — this repo does, so the
 * real letter goes back in and the placeholders do not ship.
 *
 * ── Three claims, and only three ──────────────────────────────────────────
 * The letter's three real statements — FREE, DAILY DATA, STILL IN DEVELOPMENT
 * — become a stated strip instead of being buried mid-paragraph. Nothing is
 * added to them: no accuracy guarantee, no real-time claim, no regulatory
 * status, no coverage number, no user count, no founding year, no team.
 *
 * ── The empty slot, deliberately empty ────────────────────────────────────
 * The approved design carries a «من أين تأتي البيانات» section for the data
 * sources and the update methodology. THE PRODUCT HAS NO PUBLISHED
 * METHODOLOGY — no page states where a price comes from, when it updates, or
 * what a figure is derived from. So the section ships as a labelled slot with
 * an honest note and NOTHING under it. The reference's three
 * «عنوان فرعي / نص تجريبي» rows are removed rather than shipped: an empty slot
 * is a question, and three placeholder rows on a live page are a lie about
 * having answered it.
 */
export function AboutPage() {
  const { t, href: L } = useLocale()
  const a = t.info.about

  return (
    <main className="in-page in-about iq-page">
      <InfoHead
        eyebrow={a.eyebrow}
        title={a.title}
        standfirst={a.standfirst}
      />

      {/* The one place in the product that gets to say what it is, so it
          carries the largest drawing in the system — but it stays a PLATE:
          framed, and above the text rather than behind it, so the reading is
          never set on texture. */}
      <Plate scene="about" tier="hero" />

      <div className="in-about-grid">
        <article className="in-body">
          {/* ── The letter · the live page's own words ─────────────────── */}
          <div className="in-letter">
            <p>{a.letter1} <strong>{a.letterAuthor}</strong>{a.letter1b}</p>
            <p>{a.letter2}</p>
            <p className="in-sign">
              {a.signOff}<br />
              <strong>{a.signName}</strong>
            </p>
          </div>

          {/* ── The three real claims ──────────────────────────────────── */}
          <section className="in-claims" aria-labelledby="in-claims-h">
            <h2 id="in-claims-h">{a.claimsHeading}</h2>
            <dl>
              <div><dt>{a.claimFreeTerm}</dt><dd>{a.claimFreeDesc}</dd></div>
              <div><dt>{a.claimDailyTerm}</dt><dd>{a.claimDailyDesc}</dd></div>
              <div><dt>{a.claimBuildingTerm}</dt><dd>{a.claimBuildingDesc}</dd></div>
            </dl>
          </section>

          {/* ── The slot the product has not filled ────────────────────── */}
          <section className="in-principles" aria-labelledby="in-principles-h">
            <h2 id="in-principles-h">{a.sourcesHeading}</h2>
            <p className="in-note">{a.sourcesNote}</p>
          </section>

          {/* ── One way onward ─────────────────────────────────────────── */}
          <section className="in-reach" aria-labelledby="in-reach-h">
            <h2 id="in-reach-h">{a.reachHeading}</h2>
            <p className="in-reach-rows">
              <a href={mailto()} dir="ltr">{EMAIL}</a>
              <a href={`tel:${PHONE_INTL}`} dir="ltr">{PHONE_DISPLAY}</a>
            </p>
            <Link className="in-reach-go" href={L('/contact')}>
              {a.reachGo} <i className="dir-go" aria-hidden="true">‹</i>
            </Link>
          </section>

          <FamilyRow current="/about" />
        </article>
      </div>
    </main>
  )
}
