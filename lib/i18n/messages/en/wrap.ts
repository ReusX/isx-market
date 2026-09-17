import type { WrapVars as V } from '../ar/wrap'

/* English mirror of the session wrap. The page is Arabic-only for now; this
   keeps the dictionary shape whole and is ready for /en/news/session. */
type Dir = 'up' | 'down' | 'flat'
const pick = <T,>(arr: T[], seed: string) => arr[Array.from(seed).reduce((t, c) => t + c.charCodeAt(0), 0) % arr.length]
const list = (xs: string[]) => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`
const sign = (d: Dir) => (d === 'up' ? '+' : d === 'down' ? '−' : '')

export const wrap = {
  eyebrow: 'Session wrap',
  h1: (day: string) => `Iraq Stock Exchange session wrap · ${day}`,
  seoTitle: (dateShort: string, close: string, pct: string, dir: Dir) => `Iraq Stock Exchange today · ${dateShort} wrap: ISX60 ${close} (${sign(dir)}${pct}%)`,
  seoDescription: (v: V) => `ISX60 closed the ${v.dateShort} session at ${v.close}${v.dir === 'flat' ? ', unchanged' : ` (${sign(v.dir)}${v.pct}%)`}. ${v.up} advancers, ${v.down} decliners, ${v.value} IQD traded in ${v.trades} trades; foreign investors ${v.foreign ? (v.foreign.netDir === 'up' ? `net buyers of ${v.foreign.net}` : v.foreign.netDir === 'down' ? `net sellers of ${v.foreign.net}` : 'balanced') : 'not reported'}.`,
  standfirst: 'Written automatically from the official session data after the close: the ISX60 index, every company\'s price, and non-Iraqi investor trades. Numbers only — no opinion, no recommendation.',
  index: (v: V) => {
    const seed = v.dateShort
    if (v.dir === 'flat') return pick([`ISX60 closed the ${v.day} session essentially unchanged at ${v.close}, after ${v.prevClose} the session before.`], seed)
    if (v.dir === 'up') return pick([
      `ISX60 closed the ${v.day} session at ${v.close}, up ${v.pts} points or ${v.pct}% from the previous close of ${v.prevClose}.`,
      `The ISX60 index rose ${v.pct}% in the ${v.day} session to close at ${v.close}, adding ${v.pts} points to its previous close of ${v.prevClose}.`,
    ], seed)
    return pick([
      `ISX60 closed the ${v.day} session at ${v.close}, down ${v.pts} points or ${v.pct}% from the previous close of ${v.prevClose}.`,
      `The ISX60 index fell ${v.pct}% in the ${v.day} session to close at ${v.close}, losing ${v.pts} points from its previous close of ${v.prevClose}.`,
    ], seed)
  },
  context: (v: V) => {
    const parts: string[] = []
    if (v.weekPct && v.weekDir && v.weekDir !== 'flat') parts.push(`the index is ${v.weekPct}% ${v.weekDir === 'up' ? 'above' : 'below'} where it stood five sessions ago`)
    if (v.ytdPct && v.ytdDir && v.ytdDir !== 'flat') parts.push(`${v.ytdDir === 'up' ? 'up' : 'down'} ${v.ytdPct}% since the start of the year`)
    if (v.nearHigh && v.high52) parts.push(`close to its 52-week high (${v.high52})`)
    else if (v.nearLow && v.low52) parts.push(`close to its 52-week low (${v.low52})`)
    if (v.isx15) parts.push(`ISX15 closed at ${v.isx15}`)
    return parts.length ? parts.join(', ').replace(/^./, (c) => c.toUpperCase()) + '.' : ''
  },
  breadth: (v: V) => `${v.up} companies rose, ${v.down} fell and ${v.flat} closed unchanged, out of ${v.traded} traded of ${v.listed} listed.`,
  liquidity: (v: V) => `Turnover was ${v.value} IQD in ${v.trades} trades on ${v.volume} shares${v.valueVsAvg && v.valueAbove != null ? `, ${v.valueVsAvg}% ${v.valueAbove ? 'above' : 'below'} the 20-session average` : ''}.`,
  gainers: (v: V) => v.gainers.length ? `Top gainers: ${list(v.gainers.map((g) => `${g.name} (+${g.pct}% to ${g.close})`))}.` : 'No company closed higher.',
  losers: (v: V) => v.losers.length ? `Decliners: ${list(v.losers.map((g) => `${g.name} (−${g.pct}% to ${g.close})`))}.` : 'No company closed lower.',
  active: (v: V) => v.active.length ? `${list(v.active.slice(0, 3).map((a) => `${a.name} (${a.value} IQD)`))} took the largest share of turnover.` : '',
  foreign: (v: V) => {
    if (!v.foreign) return 'The exchange did not publish non-Iraqi investor trades for this session.'
    const f = v.foreign
    const head = f.netDir === 'flat' ? 'Non-Iraqi investors bought and sold in equal measure' : f.netDir === 'up' ? `Non-Iraqi investors were net buyers of ${f.net} IQD` : `Non-Iraqi investors were net sellers of ${f.net} IQD`
    const bought = f.bought.length ? `, buying mostly ${list(f.bought)}` : ''
    const sold = f.sold.length ? ` and selling ${list(f.sold)}` : ''
    return `${head} (bought ${f.buy} · sold ${f.sell})${bought}${sold}.`
  },
  sections: { index: 'The index', breadth: 'Breadth and liquidity', movers: 'Gainers and losers', active: 'Most traded', foreign: 'Foreign investors' },
  cols: { company: 'Company', close: 'Close', change: 'Change', value: 'Turnover' },
  prevSession: 'Previous session',
  nextSession: 'Next session',
  board: 'This session\'s price table',
  archive: 'All wraps',
  archiveTitle: 'Iraq Stock Exchange session wraps',
  archiveSeoTitle: 'Iraq Stock Exchange daily session wraps · archive',
  archiveSeoDescription: 'A daily wrap of every Iraq Stock Exchange session: ISX60 close, advancers and decliners, turnover, and foreign investor net trades.',
  archiveIntro: 'A wrap written from each session\'s data after the close. Pick a session to read what happened.',
  aboutTitle: 'How this wrap is written',
  aboutBody: 'The text is generated from the official session tables the Iraq Stock Exchange publishes after the close and refreshes automatically once the data is complete. Changes are measured against each company\'s last previous close; the 20-session average excludes the current session. Foreign investor data comes from its official source and can lag the other figures.',
  unitBn: 'bn', unitMn: 'mn', unitK: 'k',
  weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  kindLabel: 'Session wrap',
  feedHeadline: (dateShort: string, close: string, pct: string, dir: Dir) => `${dateShort} session wrap: ISX60 ${close} (${sign(dir)}${pct}%)`,
  source: 'IQWealth · from session data',
}
