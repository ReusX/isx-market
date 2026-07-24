'use client'

import Link from 'next/link'

export type MarketTool = 'fx' | 'gold' | 'oil'

// Routes are the live ones (/fx, not the design package's /exchange-rate).
const TABS = [
  { id: 'fx',   ar: 'الدولار', en: 'USD',  href: '/fx' },
  { id: 'gold', ar: 'الذهب',   en: 'Gold', href: '/gold' },
  { id: 'oil',  ar: 'النفط',   en: 'Oil',  href: '/oil' },
] satisfies Array<{ id: MarketTool; ar: string; en: string; href: string }>

export function MarketToolTabs({ active, ar = true }: { active: MarketTool; ar?: boolean }) {
  return (
    <nav className="market-tool-tabs" aria-label={ar ? 'أسعار الأسواق' : 'Market rates'}>
      {TABS.map(tab => (
        <Link
          className={tab.id === active ? 'active' : ''}
          href={tab.href}
          key={tab.id}
          aria-current={tab.id === active ? 'page' : undefined}
        >
          {ar ? tab.ar : tab.en}
        </Link>
      ))}
    </nav>
  )
}
