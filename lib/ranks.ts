import type { Rank, RankId } from '@/types'

export const RANKS: Rank[] = [
  { id: 'noob',     en: 'Noob',     ar: 'مبتدئ',  min: 0,     max: 9999,    color: '#9CA3AF', icon: '⭐' },
  { id: 'trader',   en: 'Trader',   ar: 'متداول', min: 10000, max: 19999,   color: '#4F6BFF', icon: '🔷' },
  { id: 'investor', en: 'Investor', ar: 'مستثمر', min: 20000, max: 49999,   color: '#22C55E', icon: '💚' },
  { id: 'shark',    en: 'Shark',    ar: 'قرش',    min: 50000, max: Infinity, color: '#A855F7', icon: '🦈' },
]

export function rankFor(points: number): Rank {
  return RANKS.find(r => points >= r.min && points <= r.max) ?? RANKS[0]
}

export function nextRank(rank: Rank): Rank | null {
  const idx = RANKS.indexOf(rank)
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null
}

export function rankProgress(points: number): number {
  const rank = rankFor(points)
  const next = nextRank(rank)
  if (!next) return 100
  return Math.min(100, ((points - rank.min) / (next.min - rank.min)) * 100)
}

export function fmtPts(n: number | null | undefined, locale: 'ar' | 'en' = 'en'): string {
  if (n == null) return '—'
  return n.toLocaleString(locale === 'ar' ? 'ar-IQ' : 'en-US')
}
