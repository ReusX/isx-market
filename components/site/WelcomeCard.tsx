'use client'

import Link from 'next/link'
import { Globe } from '@/components/home/Globe'
import { useLocale } from '@/context/LocaleContext'

/**
 * The welcome card · the blue globe, for people who have not seen it.
 *
 * It sits above the market on the root, and an × puts it away for good on
 * that browser. The choice is honoured BEFORE paint: Document's bootstrap
 * script reads localStorage and stamps `data-welcome="off"` on <html>, and
 * the stylesheet hides the card on that attribute — so a returning reader
 * never sees it flash in and out, and the card is still in the HTML for
 * everyone else (and for crawlers, which see a first-time visit).
 */
export const WELCOME_KEY = 'iq-welcome'

/* Real ISX symbols by sector, as listed in public/data/companies.json; the
   sector names come from the dictionary in the same order. */
const SECTORS: string[][] = [
  ['BBOB', 'BNOI', 'BIME', 'BMFI', 'BKUI', 'BASH', 'BIBI', 'BGUC', 'BROI', 'BMNS', 'BCIH', 'BJAB'],
  ['TASC', 'TZNI'],
  ['IBSD', 'IMAP', 'IITC', 'IKLV', 'INCP', 'IMOS', 'IIDP', 'IFCM'],
  ['HBAY', 'HMAN', 'HISH', 'HPAL', 'HNTI', 'HBAG', 'HSAD'],
  ['AIRP', 'AMEF', 'AIPM', 'AMAP', 'AISP'],
  ['NAME', 'NGIR', 'NAHF', 'NDSA', 'NHAM'],
  ['SBPT', 'SMOF', 'SILT', 'SKTA', 'SMRI', 'SIGT'],
  ['VKHF', 'VMES', 'VWIF', 'VAMF', 'VZAF', 'VBAT'],
]

export function WelcomeCard() {
  const { t, href: L } = useLocale()
  const c = t.home.landing
  const [titleA, titleB] = c.title.split('\n')
  const dismiss = () => {
    try { localStorage.setItem(WELCOME_KEY, 'off') } catch {}
    document.documentElement.setAttribute('data-welcome', 'off')
  }
  return (
    <section className="ld-card" aria-label={c.title.replace('\n', ' ')}>
      <Globe className="ld-globe" labels={{ anchors: c.globe.anchors, sectors: SECTORS.map((s, i) => ({ name: c.globe.sectors[i], syms: s })) }} />
      <button type="button" className="ld-close" onClick={dismiss} aria-label={t.site.close}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <div className="ld-hero-body">
        {/* A <p>, not an <h1>: the page's one heading is «السوق» below. */}
        <p className="ld-title">{titleA}<br />{titleB}</p>
        <p className="ld-intro">{c.intro}</p>
        {/* Exploring IS dismissing: the card has done its job. */}
        <a href="#market" className="ld-cta" onClick={dismiss}>{c.explore}</a>
      </div>
    </section>
  )
}
