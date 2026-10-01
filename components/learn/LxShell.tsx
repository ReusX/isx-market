'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { existsIn } from '@/lib/i18n/routes'
import { LanguageSwitch } from '@/components/site/LanguageSwitch'
import { InkDefs } from './Ink'
import { ruqaa } from './fonts'
import '@/styles/learn-home.css'

/**
 * The Learn platform's frame: ink on newsprint, its own header and footer, no
 * site chrome. Every Learn page renders inside it, so the platform reads as
 * one place (and the same look carries to IQWealth's social content).
 */
function Top() {
  const { t, locale, href: L } = useLocale()
  const N = t.learn.home.nav
  const street = '/learn/invest'
  return (
    <header className="lx-top">
      <Link href={L('/learn')} className="lx-brand">
        <span className="lx-brand-word">{N.brand}</span>
        <span className="lx-brand-by">{N.by}</span>
      </Link>
      <nav className="lx-nav" aria-label={N.menu}>
        <a href="#lx-levels">{N.levels}</a>
        {existsIn(street, locale) ? <Link href={L(street)}>{N.street}</Link> : null}
        <a href="#lx-terms">{N.terms}</a>
        <a href="#lx-faq">{N.faq}</a>
      </nav>
      <div className="lx-top-end">
        <LanguageSwitch />
        <Link href={L('/')} className="lx-site">{N.site} ↩</Link>
      </div>
    </header>
  )
}


export function LxShell({ children }: { children: ReactNode }) {
  const { t, href: L } = useLocale()
  const F = t.learn.home.foot
  return (
    <div className={`lx ${ruqaa.variable}`}>
      <InkDefs />
      <Top />
      <main>{children}</main>
      <footer className="lx-foot">
        <Link href={L('/')}>{F.back}</Link>
        <p>{F.disclaimer}</p>
      </footer>
    </div>
  )
}
