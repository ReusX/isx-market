import type { Messages } from '@/lib/i18n'

/**
 * The one list of the site's pages, as the rails see them: route, icon,
 * label, section. Every DoorRail draws from here, so a page appears in one
 * place with one name, and the reader's own arrangement (rail.ts prefs)
 * can pull any page into any section.
 */
export type Door = 'markets' | 'banking' | 'economy' | 'learn'
export type RailIcon =
  | 'market' | 'board' | 'companies' | 'screener' | 'heatmap' | 'statistics' | 'pulse' | 'news'
  | 'banks' | 'deposits' | 'loans' | 'cards'
  | 'fx' | 'currencies' | 'gold' | 'silver' | 'oil' | 'window' | 'inflation' | 'policyRate'
  | 'learn' | 'zero' | 'research'
  | 'portfolio' | 'watchlist' | 'alerts'

export type RailDef = {
  route: string
  icon: RailIcon
  label: (t: Messages) => string
  /** Planned, not built: a «قريباً» row, never a link. */
  soon?: boolean
  /** Personal tools sit under their own small heading. */
  group?: 'tools'
  /** Sub-pages shown under the item behind a chevron — never as rail rows of their own. */
  children?: { route: string; label: (t: Messages) => string }[]
}

const m = (t: Messages) => t.market.page.rail
const b = (t: Messages) => t.banks.hub.rail
const e = (t: Messages) => t.rates.page.rail
const l = (t: Messages) => t.home.landing.doors.learn.links
const p = (t: Messages) => t.personal.tools.rail

export const RAILS: Record<Door, RailDef[]> = {
  markets: [
    { route: '/', icon: 'market', label: (t) => m(t).market },
    { route: '/market', icon: 'board', label: (t) => m(t).board },
    { route: '/companies', icon: 'companies', label: (t) => m(t).companies },
    { route: '/screener', icon: 'screener', label: (t) => m(t).screener },
    { route: '/heatmap', icon: 'heatmap', label: (t) => m(t).heatmap },
    { route: '/statistics', icon: 'statistics', label: (t) => m(t).statistics },
    { route: '/pulse', icon: 'pulse', label: (t) => m(t).pulse },
    { route: '/news', icon: 'news', label: (t) => m(t).news },
    { route: '/portfolio', icon: 'portfolio', label: (t) => p(t).portfolio, group: 'tools' },
    { route: '/watchlist', icon: 'watchlist', label: (t) => p(t).watchlist, group: 'tools' },
    { route: '/alerts', icon: 'alerts', label: (t) => p(t).alerts, group: 'tools' },
  ],
  banking: [
    { route: '/banks', icon: 'banks', label: (t) => b(t).banks },
    { route: '/banks/deposits', icon: 'deposits', label: (t) => b(t).deposits },
    { route: '/banks/loans', icon: 'loans', label: (t) => b(t).loans },
    { route: '/banks/cards', icon: 'cards', label: (t) => b(t).cards, soon: true },
  ],
  economy: [
    { route: '/fx', icon: 'fx', label: (t) => e(t).fx },
    {
      route: '/currencies', icon: 'currencies', label: (t) => e(t).currencies,
      children: (['try', 'sar', 'irr', 'eur', 'aed', 'kwd', 'jod', 'gbp'] as const).map((c) => ({
        route: `/currencies/${c}`, label: (t: Messages) => t.rates.page.currencies.names[c.toUpperCase()] ?? c.toUpperCase(),
      })),
    },
    { route: '/gold', icon: 'gold', label: (t) => e(t).gold },
    { route: '/silver', icon: 'silver', label: (t) => e(t).silver },
    { route: '/oil', icon: 'oil', label: (t) => e(t).oil },
    { route: '/cbi-window', icon: 'window', label: (t) => e(t).window, soon: true },
    { route: '/inflation', icon: 'inflation', label: (t) => e(t).inflation },
    { route: '/policy-rate', icon: 'policyRate', label: (t) => e(t).policyRate },
  ],
  learn: [
    { route: '/news', icon: 'news', label: (t) => l(t).news },
    { route: '/learn', icon: 'learn', label: (t) => l(t).learn },
    { route: '/learn/trading-from-zero', icon: 'zero', label: (t) => l(t).zero },
    { route: '/research', icon: 'research', label: (t) => l(t).research },
  ],
}

/** Every buildable page, once, for the «add a page» picker. */
export function allPages(): RailDef[] {
  const seen = new Set<string>()
  const out: RailDef[] = []
  for (const door of Object.keys(RAILS) as Door[]) {
    for (const d of RAILS[door]) {
      if (d.soon || seen.has(d.route)) continue
      seen.add(d.route); out.push(d)
    }
  }
  return out
}

export function railDef(route: string): RailDef | undefined {
  for (const door of Object.keys(RAILS) as Door[]) {
    const hit = RAILS[door].find((d) => d.route === route)
    if (hit) return hit
  }
  return undefined
}
