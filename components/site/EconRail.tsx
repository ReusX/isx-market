'use client'

import { useLocale } from '@/context/LocaleContext'
import { DoorRail } from './DoorRail'

/**
 * The economy door's rail, shared by its pages: the prices that exist, then
 * the ones planned as «قريباً» rows rather than links to nothing.
 */
const ITEMS = [
  { key: 'fx', route: '/fx' },
  { key: 'currencies', route: '/currencies', soon: true },
  { key: 'gold', route: '/gold' },
  { key: 'silver', route: '/silver' },
  { key: 'oil', route: '/oil' },
  { key: 'window', route: '/cbi-window', soon: true },
  { key: 'inflation', route: '/inflation', soon: true },
  { key: 'policyRate', route: '/policy-rate', soon: true },
] as const

export function EconRail() {
  const { t } = useLocale()
  const r = t.rates.page.rail
  return <DoorRail door="economy" />
}
