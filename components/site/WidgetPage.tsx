'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import '@/styles/econ-page.css'

/**
 * /widget · configure the embeddable card and copy one line.
 *
 * The preview loads the real public/widget.js with the chosen attributes, so
 * what the reader sees here is exactly what their site will render. The card
 * reads iraqsm.com's open data, so the preview shows production figures even
 * on localhost — which is the point: there is no separate "demo" data.
 */
const ORIGIN = 'https://iraqsm.com'

export function WidgetPage() {
  const { t } = useLocale()
  const W = t.site.widget
  const [rows, setRows] = useState<string[]>(['fx', 'gold', 'index'])
  const [lang, setLang] = useState<'ar' | 'en'>('ar')
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark'>('auto')
  const [width, setWidth] = useState('320px')
  const [copied, setCopied] = useState(false)
  const holder = useRef<HTMLDivElement>(null)

  const code = `<script src="${ORIGIN}/widget.js" data-show="${rows.join(',')}" data-lang="${lang}" data-theme="${theme}" data-width="${width}"></script>`

  /* Re-mount the script on every option change; the script renders itself
     next to where it is inserted. Locally the script is the repo copy. */
  useEffect(() => {
    const el = holder.current
    if (!el) return
    el.innerHTML = ''
    const s = document.createElement('script')
    s.src = `/widget.js?v=${Date.now()}`
    s.setAttribute('data-show', rows.join(','))
    s.setAttribute('data-lang', lang)
    s.setAttribute('data-theme', theme)
    s.setAttribute('data-width', width)
    el.appendChild(s)
    return () => { el.innerHTML = '' }
  }, [rows, lang, theme, width])

  const toggle = (r: string) => setRows((x) => (x.includes(r) ? (x.length > 1 ? x.filter((y) => y !== r) : x) : [...x, r]))
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* the textarea below is selectable */ } }

  const pill = (on: boolean, label: string, onClick: () => void) => (
    <button type="button" className={`id-pill ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={onClick}>{label}</button>
  )

  return (
    <SiteShell>
      <main className="eco id-full">
        <div className="eco-body wdg">
          <header className="eco-head">
            <p className="id-eyebrow">{W.eyebrow}</p>
            <PageTitle title={W.title} note={W.note} />
          </header>

          <div className="wdg-grid">
            <section className="id-panel eco-panel" aria-label={W.options}>
              <h2 className="id-h3">{W.options}</h2>
              <p className="id-cap">{W.rows}</p>
              <div className="id-pills">{pill(rows.includes('fx'), W.fx, () => toggle('fx'))}{pill(rows.includes('gold'), W.gold, () => toggle('gold'))}{pill(rows.includes('index'), W.index, () => toggle('index'))}</div>
              <p className="id-cap">{W.lang}</p>
              <div className="id-pills">{pill(lang === 'ar', W.ar, () => setLang('ar'))}{pill(lang === 'en', W.en, () => setLang('en'))}</div>
              <p className="id-cap">{W.theme}</p>
              <div className="id-pills">{pill(theme === 'auto', W.auto, () => setTheme('auto'))}{pill(theme === 'light', W.light, () => setTheme('light'))}{pill(theme === 'dark', W.dark, () => setTheme('dark'))}</div>
              <p className="id-cap">{W.width}</p>
              <div className="id-pills">{['280px', '320px', '100%'].map((w) => <span key={w}>{pill(width === w, w, () => setWidth(w))}</span>)}</div>
            </section>

            <section className="id-panel eco-panel" aria-label={W.preview}>
              <h2 className="id-h3">{W.preview}</h2>
              <div ref={holder} className="wdg-preview" />
            </section>
          </div>

          <section className="id-panel eco-panel" aria-label={W.code}>
            <h2 className="id-h3">{W.code}</h2>
            <p className="id-cap">{W.codeNote}</p>
            <textarea className="id-input wdg-code" readOnly value={code} rows={3} dir="ltr" onFocus={(e) => e.currentTarget.select()} aria-label={W.code} />
            <p><button type="button" className="id-btn" onClick={copy}>{copied ? W.copied : W.copy}</button></p>
          </section>

          <AboutSection title={W.terms} body={W.termsBody} />
          <p className="id-cap">{W.data} {W.dataNote} <Link href="/llms.txt">llms.txt</Link></p>
        </div>
      </main>
    </SiteShell>
  )
}
