'use client'

import { useState } from 'react'
import { InfoHead, FamilyRow, Plate } from '@/components/info/InfoChrome'
import {
  EMAIL, PHONE_DISPLAY, PHONE_INTL, REPLY_TIME, SOCIAL, TOPICS, mailto,
} from '@/lib/infoData'
import '@/styles/info.css'

/**
 * /contact — تواصل معنا. A direct transplant of the approved page.
 *
 * ══ NO FORM IS DESIGNED, AND THAT IS THE FINDING ══════════════════════════
 * The live page has no `<form>`, no input, no submit and no endpoint, and
 * there is no contact API route anywhere in this repo. So this is a
 * contact-INFORMATION page. Designing «sent», «send failed» and «validation»
 * would be designing a submission pipeline into a product that has one
 * mailbox; a form needs an endpoint, spam handling and a delivery guarantee
 * first, and that is a build decision rather than a layout.
 *
 * ── The one thing that changes ────────────────────────────────────────────
 * The live page ends with six topic chips that are inert `<div>`s: they look
 * like a routing choice and do nothing. Each becomes a `mailto:` with the
 * subject prefilled. That is the only real mechanism available — one mailbox,
 * no queue, no ticket, no reference number — and it turns six decorative boxes
 * into six working links without promising a support system.
 *
 * ── What is stated, and nothing else ──────────────────────────────────────
 * Email, phone, two social accounts and the reply time, every one of them
 * already on the live page. No address, no legal entity, no office hours, no
 * second mailbox, no SLA beyond the reply time the page already promises.
 *
 * The live page paints the Instagram tile with that brand's magenta-orange
 * gradient and Facebook with #1877F2 — two foreign brand fields on a page with
 * no other colour, pulling the eye to its least important row. Here the
 * channels are typographic; the platform name and the handle carry the
 * recognition.
 */
export function ContactClient() {
  const [copied, setCopied] = useState(false)

  /* The only interaction on the page, and it is entirely client-side. A phone
     opens the mail app from the address; a desktop reader usually wants the
     string itself. */
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* Clipboard access can be refused. The address is visible and selectable
         either way, so there is nothing to recover from and nothing worth
         interrupting the reader about. */
    }
  }

  return (
    <main className="in-page in-contact iq-page">
      <InfoHead
        eyebrow="تواصل معنا"
        title="يسعدنا سماعك"
        standfirst="سؤال، اقتراح، أو بلاغ عن مشكلة — الوصول إلينا بخطوة واحدة."
      />

      {/* A split, not a stack. One column of sections down the middle of a
          wide screen is the least memorable thing a contact page can be; the
          threshold plate takes the second column and gives the page a
          composition. It collapses to a band on tablet and below the primary
          channel on a phone, where a tall panel would push the email address
          off the first screen. */}
      <div className="in-split">
        <div className="in-body">
          {/* ── The primary channel · one, and unmistakable ────────────── */}
          <section className="in-primary" aria-labelledby="in-primary-h">
            <h2 id="in-primary-h">البريد الإلكتروني</h2>
            <a className="in-mail" href={mailto()} dir="ltr">{EMAIL}</a>
            <p className="in-reply">{REPLY_TIME}</p>
            <button type="button" className="in-copy" onClick={copyEmail}>
              {copied ? 'تم النسخ' : 'نسخ العنوان'}
            </button>
            {/* Announced politely so it is not read over the button label. */}
            <span className="sr-only" role="status">{copied ? 'تم نسخ البريد الإلكتروني' : ''}</span>
          </section>

          {/* ── The other channels · stated, not decorated ─────────────── */}
          <section className="in-channels" aria-labelledby="in-channels-h">
            <h2 id="in-channels-h">قنوات أخرى</h2>
            <ul>
              <li>
                <a href={`tel:${PHONE_INTL}`}>
                  <span className="in-ch-name">الهاتف</span>
                  <bdi dir="ltr">{PHONE_DISPLAY}</bdi>
                </a>
              </li>
              {SOCIAL.map((s) => (
                <li key={s.id}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer">
                    <span className="in-ch-name">{s.label}</span>
                    <bdi dir="ltr">{s.handle}</bdi>
                    <i className="in-ch-out" aria-hidden="true">↗</i>
                    <span className="sr-only">يفتح في نافذة جديدة</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {/* ── The six topics · now addressed ─────────────────────────── */}
          <section className="in-topics" aria-labelledby="in-topics-h">
            <h2 id="in-topics-h">بخصوص ماذا؟</h2>
            <p className="in-note">اختر موضوعاً ليُفتح بريد جاهز بالعنوان المناسب.</p>
            <ul>
              {TOPICS.map((t) => (
                <li key={t.id}>
                  <a href={mailto(t.subject)}>
                    <span>{t.label}</span>
                    <i aria-hidden="true">‹</i>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <FamilyRow current="/contact" />
        </div>

        <Plate scene="contact" tier="panel" />
      </div>
    </main>
  )
}
