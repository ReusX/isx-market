'use client'

import { drawShareCard, shareCard } from '@/lib/shareCard'

/**
 * App mode · what the IQWealth app (the Capacitor shell) shows instead of the
 * website's own navigation.
 *
 * The app loads iraqsm.com itself, so every page is the same page. What
 * changes is the frame: `html.is-app` hides the website chrome (top nav,
 * footer, section rails, the long SEO copy) and components/app/AppChrome draws
 * a top bar and a bottom tab bar in its place. Which tabs, which home cards and
 * which page opens at launch follow the reader's own choices, kept here in
 * localStorage — per phone, no account.
 *
 * The pre-paint script in components/site/Document.tsx reads the same key to
 * redirect the launch URL (`/`) to the chosen start page before anything
 * paints; START_TABS below and the copy inlined there must agree.
 */
export type Interest = 'fx' | 'gold' | 'market' | 'banks' | 'economy' | 'learn' | 'news'
export type CardId = 'fx' | 'gold' | 'market' | 'watchlist' | 'movers' | 'links'
export type Start = 'auto' | 'home' | 'last' | Interest

export interface AppPrefs {
  v: 1
  interests: Interest[]
  start: Start
  cards: { id: CardId; on: boolean }[]
  last?: string
}

export const HOME = '/app'
export const SETTINGS = '/app/settings'
export const PREFS_KEY = 'iq.app'
export const NATIVE_KEY = 'iq.app.native'
export const PREVIEW_KEY = 'iq.app.preview'

/** Each interest: its tab, the pages it owns (in chip order) and the route prefixes it claims. */
export const INTERESTS: { id: Interest; tab: string; pages: string[]; owns: string[] }[] = [
  { id: 'fx', tab: '/app/fx', pages: ['/app/fx', '/app/currencies'], owns: ['/app/fx', '/app/currencies', '/fx', '/currencies'] },
  { id: 'gold', tab: '/app/gold', pages: ['/app/gold', '/silver'], owns: ['/app/gold', '/gold', '/silver'] },
  {
    id: 'market', tab: '/app/market',
    pages: ['/app/market', '/app/companies', '/watchlist', '/portfolio', '/heatmap', '/screener', '/statistics', '/pulse'],
    owns: ['/app/market', '/app/companies', '/market', '/companies', '/c', '/screener', '/heatmap', '/statistics', '/pulse', '/portfolio', '/watchlist', '/alerts', '/analysis'],
  },
  { id: 'banks', tab: '/app/banks', pages: ['/app/banks', '/banks/deposits', '/banks/loans'], owns: ['/app/banks', '/banks'] },
  { id: 'economy', tab: '/oil', pages: ['/oil', '/cbi-window', '/inflation', '/policy-rate'], owns: ['/oil', '/cbi-window', '/inflation', '/policy-rate'] },
  { id: 'learn', tab: '/learn', pages: ['/learn', '/learn/invest', '/learn/trading-from-zero', '/research'], owns: ['/learn', '/research'] },
  { id: 'news', tab: '/news', pages: ['/news'], owns: ['/news'] },
]
export const INTEREST_IDS = INTERESTS.map((i) => i.id)
export const interestDef = (id: Interest) => INTERESTS.find((i) => i.id === id)!

/** Which home card needs which interest. */
export const CARD_NEEDS: Record<CardId, Interest[]> = {
  fx: ['fx'], gold: ['gold'], market: ['market'], watchlist: ['market'], movers: ['market'],
  links: ['banks', 'economy', 'learn', 'news'],
}
const DEFAULT_CARDS: CardId[] = ['fx', 'gold', 'market', 'watchlist', 'movers', 'links']

export function defaultPrefs(interests: Interest[] = []): AppPrefs {
  return { v: 1, interests, start: 'auto', cards: DEFAULT_CARDS.map((id) => ({ id, on: true })) }
}

export function readPrefs(): AppPrefs | null {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null') as AppPrefs | null
    if (!p || p.v !== 1 || !Array.isArray(p.interests)) return null
    // Cards added in a later version join at the end, switched on.
    const have = new Set(p.cards?.map((c) => c.id) ?? [])
    p.cards = [...(p.cards ?? []).filter((c) => DEFAULT_CARDS.includes(c.id)), ...DEFAULT_CARDS.filter((id) => !have.has(id)).map((id) => ({ id, on: true }))]
    p.interests = p.interests.filter((i) => INTEREST_IDS.includes(i))
    return p
  } catch { return null }
}

export function writePrefs(p: AppPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)) } catch { /* private mode: this session only */ }
  window.dispatchEvent(new Event('iq:prefs'))
}

/**
 * Website pages that have an app screen of their own. Inside the app a link
 * to one of these (a notification, a card) opens the app screen instead; the
 * pre-paint script in Document.tsx applies the same map before first paint.
 */
export function appRoute(route: string): string | null {
  if (route === '/fx' || route === '/fx/100-dollar') return '/app/fx'
  if (route === '/currencies') return '/app/currencies'
  if (route === '/gold' || route.startsWith('/gold/')) return '/app/gold'
  if (route === '/market') return '/app/market'
  if (route === '/companies') return '/app/companies'
  if (route === '/banks') return '/app/banks'
  const m = /^\/currencies\/([a-z]{3})$/.exec(route)
  return m ? `/app/currencies/${m[1]}` : null
}

/** The public page to share for an app screen: links sent to friends should open the website. */
export function publicRoute(route: string): string {
  if (route === '/app/fx') return '/fx'
  if (route === '/app/currencies') return '/currencies'
  if (route === '/app/gold') return '/gold'
  if (route === '/app/market') return '/market'
  if (route === '/app/companies') return '/companies'
  if (route === '/app/banks') return '/banks'
  const m = /^\/app\/currencies\/([a-z]{3})$/.exec(route)
  if (m) return ['try', 'sar', 'irr', 'eur', 'aed', 'kwd', 'jod', 'gbp'].includes(m[1]) ? `/currencies/${m[1]}` : '/currencies'
  return route.startsWith('/app') ? '/' : route
}

/** The interest that owns a locale-free route, if any. */
export function interestOf(route: string): Interest | null {
  for (const i of INTERESTS) if (i.owns.some((o) => route === o || route.startsWith(`${o}/`))) return i.id
  return null
}

/** The page the app opens at launch. Must match the pre-paint copy in Document.tsx. */
export function startRoute(p: AppPrefs | null): string {
  if (!p || !p.interests.length) return HOME
  if (p.start === 'home') return HOME
  if (p.start === 'last') return p.last ?? HOME
  if (p.start === 'auto') return p.interests.length === 1 ? interestDef(p.interests[0]).tab : HOME
  return p.interests.includes(p.start) ? interestDef(p.start).tab : HOME
}

export type TabId = 'home' | Interest | 'notify' | 'more'
export interface Tab { id: TabId; route: string | null }

/**
 * The bottom bar, at most five: «الرئيسية» when there is more than one interest
 * to gather, the interests in their canonical order, «الإشعارات» if there is
 * room, and «المزيد» always last.
 */
export function tabsFor(interests: Interest[]): Tab[] {
  const tabs: Tab[] = []
  if (interests.length !== 1) tabs.push({ id: 'home', route: HOME })
  for (const i of INTERESTS) if (interests.includes(i.id) && tabs.length < 4) tabs.push({ id: i.id, route: i.tab })
  if (tabs.length < 4) tabs.push({ id: 'notify', route: '/notifications' })
  tabs.push({ id: 'more', route: null })
  return tabs
}

export function isAppMode(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('is-app')
}

type CapPlugins = {
  Haptics?: { impact: (o: { style: string }) => Promise<void> }
  Share?: { share: (o: { title?: string; text?: string; url?: string; files?: string[] }) => Promise<unknown> }
  Filesystem?: { writeFile: (o: { path: string; data: string; directory: string }) => Promise<{ uri: string }> }
}
type Cap = { Plugins?: Record<string, unknown>; isPluginAvailable?: (n: string) => boolean; registerPlugin?: (n: string) => unknown }
/** Native plugins exist only in app builds that ship them (1.1+); older installs fall back. */
const plugins = (): CapPlugins => {
  const C = (window as unknown as { Capacitor?: Cap }).Capacitor
  const one = (n: string) => (C?.isPluginAvailable?.(n) ? (C.Plugins?.[n] ?? C.registerPlugin?.(n)) : undefined)
  return { Haptics: one('Haptics') as CapPlugins['Haptics'], Share: one('Share') as CapPlugins['Share'], Filesystem: one('Filesystem') as CapPlugins['Filesystem'] }
}

/** A light tick under the finger: the native haptics plugin when the app has it, else the vibration API. */
export function haptic() {
  try {
    const h = plugins().Haptics
    if (h) { h.impact({ style: 'LIGHT' }).catch(() => {}); return }
    navigator.vibrate?.(8)
  } catch { /* cosmetic */ }
}

/**
 * Share what is on screen: the screen's price card as an image with the link
 * as its text (app builds with Share + Filesystem, 1.4+), else the link.
 */
export async function shareScreen(title: string, url: string, rtl: boolean): Promise<'shared' | 'copied' | 'failed'> {
  const { Share, Filesystem } = plugins()
  const card = shareCard()
  if (card && Share && Filesystem) {
    try {
      const data = await drawShareCard(card, rtl)
      const { uri } = await Filesystem.writeFile({ path: `iqwealth-${Date.now()}.png`, data, directory: 'CACHE' })
      await Share.share({ title, text: `${card.title} · ${url}`, files: [uri] })
      return 'shared'
    } catch { /* cancelled or unsupported: fall through to the link */ }
  }
  return sharePage(title, url)
}

/** The system share sheet; falls back to copying the link. Resolves 'copied' when it copied. */
export async function sharePage(title: string, url: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    const s = plugins().Share
    if (s) { await s.share({ title, url }); return 'shared' }
    if (navigator.share) { await navigator.share({ title, url }); return 'shared' }
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch { return 'failed' }
}
