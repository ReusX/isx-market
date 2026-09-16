import Link from 'next/link'
import { Globe } from '@/components/home/Globe'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/shell/SiteFooter'
import { messages } from '@/lib/i18n'
import { localePath } from '@/lib/i18n/paths'
import type { Locale } from '@/lib/i18n/locale'
import '@/styles/site.css'
import '@/styles/landing.css'

/**
 * The homepage · a full-viewport blue opener with the market constellation
 * on one side and the headline, copy and action on the other, then the four
 * doors into the site.
 *
 * The four doors ARE the information architecture from here on:
 *
 *   الأسواق · everything traded on the ISX, and the reader's own lists
 *   البنوك والتمويل · the bank profiles, deposits, loans
 *   الاقتصاد العراقي · the dollar, oil, gold; the central bank and the budget
 *   تعلّم · the educational content
 *
 * A door lists its pages as pills. A page that does not exist yet is shown
 * with «قريباً» and no link — the promise is made in the open, and the pill
 * becomes a link the day the page ships. Nothing here is a data module: the
 * homepage's job is to say what the site is and where to go, and the live
 * numbers live one click away on /market.
 *
 * This route renders WITHOUT the app frame (see AppFrame.BARE_ROUTES): the
 * hero carries its own navigation, the way the reference does, and a sidebar
 * beside a full-bleed opener would be two chromes on one screen.
 */
/* `arOnly`: the page exists in Arabic only, so the English door leaves it out
   rather than link a 404. */
type Door = { id: 'markets' | 'banking' | 'economy' | 'learn'; links: { key: string; route?: string; arOnly?: boolean }[] }

const DOORS: Door[] = [
  { id: 'markets', links: [
    { key: 'market', route: '/market' }, { key: 'companies', route: '/companies' },
    { key: 'screener', route: '/screener' }, { key: 'heatmap', route: '/heatmap' },
    { key: 'statistics', route: '/statistics' }, { key: 'pulse', route: '/pulse' },
    { key: 'portfolio', route: '/portfolio' }, { key: 'watchlist', route: '/watchlist' }, { key: 'alerts', route: '/alerts', arOnly: true },
  ] },
  { id: 'banking', links: [
    { key: 'banks', route: '/banks' }, { key: 'deposits' }, { key: 'loans' }, { key: 'cards' },
  ] },
  { id: 'economy', links: [
    { key: 'fx', route: '/fx' }, { key: 'oil', route: '/oil' }, { key: 'gold', route: '/gold' }, { key: 'cbi' }, { key: 'budget' },
  ] },
  { id: 'learn', links: [
    { key: 'learn', route: '/learn' }, { key: 'zero', route: '/learn/trading-from-zero' },
    { key: 'news', route: '/news' }, { key: 'research', route: '/research', arOnly: true },
  ] },
]

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


export function Landing({ locale }: { locale: Locale }) {
  const t = messages(locale)
  const c = t.home.landing
  const L = (r: string) => localePath(r, locale)
  const [titleA, titleB] = c.title.split('\n')

  return (
    <>
      <main className="ld">
        <section className="ld-hero">
          <Globe className="ld-globe" labels={{ anchors: c.globe.anchors, sectors: SECTORS.map((s, i) => ({ name: c.globe.sectors[i], syms: s })) }} />

          <SiteNav on="hero" />

          {/* One RTL content group: headline, copy, action — start side. */}
          <div className="ld-hero-body">
            <h1 className="ld-title">{titleA}<br />{titleB}</h1>
            <p className="ld-intro">{c.intro}</p>
            <Link href={L('/market')} className="ld-cta">{c.explore}</Link>
          </div>
        </section>

        <div className="ld-doors id-wrap">
          {DOORS.map((d) => {
            const door = c.doors[d.id]
            const links = door.links as Record<string, string>
            return (
              <section key={d.id} id={d.id} className="ld-door">
                <div className="ld-door-head">
                  <div className="id-rule" />
                  <h2 className="id-h1">{door.name}</h2>
                  <p className="id-lede">{door.lede}</p>
                </div>
                <ul className="ld-door-links">
                  {d.links.filter((l) => locale === 'ar' || !l.arOnly).map((l) => (
                    <li key={l.key}>
                      {l.route
                        ? <Link href={L(l.route)} className="id-pill">{links[l.key]}</Link>
                        : <span className="id-pill is-soon" aria-disabled="true">{links[l.key]}<i>{c.soon}</i></span>}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
