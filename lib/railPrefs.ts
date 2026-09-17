/**
 * The reader's own arrangement of a section rail — order, hidden pages,
 * pages pulled in from other sections. One small record per door in
 * localStorage; nothing here is worth an account round-trip, and a rail
 * that differs by device is what a per-device preference should do.
 */
export type RailPrefs = { order: string[]; hidden: string[]; added: string[] }
export const EMPTY: RailPrefs = { order: [], hidden: [], added: [] }
const KEY = (door: string) => `iq-rail:${door}`

export function readPrefs(door: string): RailPrefs {
  try {
    const raw = localStorage.getItem(KEY(door))
    if (!raw) return EMPTY
    const v = JSON.parse(raw) as Partial<RailPrefs>
    const arr = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : [])
    return { order: arr(v.order), hidden: arr(v.hidden), added: arr(v.added) }
  } catch { return EMPTY }
}
export function writePrefs(door: string, p: RailPrefs) {
  try {
    if (!p.order.length && !p.hidden.length && !p.added.length) localStorage.removeItem(KEY(door))
    else localStorage.setItem(KEY(door), JSON.stringify(p))
  } catch { /* private mode, blocked storage */ }
}

/** Apply prefs to the default list: additions appended, then the saved
 *  order (unknown routes dropped, new routes kept at the end). */
export function arrange<T extends { route: string; def?: { group?: string } }>(defaults: T[], extras: T[], p: RailPrefs): T[] {
  const pool = [...defaults, ...extras.filter((x) => p.added.includes(x.route) && !defaults.some((d) => d.route === x.route))]
  const rank = new Map(p.order.map((r, i) => [r, i]))
  const sorted = !p.order.length ? pool : pool
    .map((x, i) => ({ x, k: rank.has(x.route) ? (rank.get(x.route) as number) : p.order.length + i }))
    .sort((a, b) => a.k - b.k)
    .map(({ x }) => x)
  /* The personal tools keep their own heading at the end, whatever the
     reader does with the pages above it. */
  return [...sorted.filter((x) => x.def?.group !== 'tools'), ...sorted.filter((x) => x.def?.group === 'tools')]
}
