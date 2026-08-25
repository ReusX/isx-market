'use client'

import Link from 'next/link'
import { StatePage, StateLinks } from '@/components/system/StatePage'
import { useLocale } from '@/context/LocaleContext'

/**
 * 404 and 500, in whichever language the reader arrived in.
 *
 * Both used to be written inline in `app/not-found.tsx` and `app/error.tsx`.
 * They live here now because there are two of each — one per root layout — and
 * a 404 whose Arabic and English versions drift apart is a 404 that stops
 * offering the same three destinations.
 *
 * Everything the original files argued for is unchanged: the plate, the chosen
 * destinations, the `/` hint, and the rule that the `Error` object is received
 * and never rendered.
 */

/** 404 · «this page does not exist. Where can I go instead?» */
export function NotFoundView() {
  const { t, href: L } = useLocale()
  const s = t.system.notFound

  return (
    <StatePage scene="missing" code="404" title={s.title} note={s.note}>
      <div className="sp-actions">
        <Link className="sp-primary" href={L('/')}>{s.home}</Link>
      </div>
      {/* Chosen, not listed: the market is where most mistyped company URLs
          were heading, the screener finds the company they actually meant, and
          Learn is where a stale article path usually points. */}
      <StateLinks
        items={[
          { href: L('/market'),   label: t.nav.market },
          { href: L('/screener'), label: t.nav.screener },
          { href: L('/learn'),    label: t.nav.learn },
        ]}
      />
      {/* A real shortcut: GlobalHeader binds `/` to the global search. */}
      <p className="sp-hint">
        {s.hintBefore} <kbd>/</kbd> {s.hintAfter}
      </p>
    </StatePage>
  )
}

/**
 * 500 · a route-level failure.
 *
 * ⚠ The `error` object is received by the route file and deliberately NOT
 * passed here — no stack trace, no digest, no internal code, no component
 * name, and above all not the raw provider message, which is English on an
 * Arabic page at best and a database schema hint at worst.
 */
export function FaultView({ reset }: { reset: () => void }) {
  const { t, href: L } = useLocale()
  const s = t.system.fault

  return (
    <StatePage scene="fault" code="500" title={s.title} note={s.note}>
      <div className="sp-actions">
        <button className="sp-primary" type="button" onClick={reset}>{t.system.retry}</button>
        <Link className="sp-secondary" href={L('/')}>{s.home}</Link>
      </div>
      <p className="sp-hint">
        {s.hintBefore} <Link href={L('/contact')}>{s.contact}</Link>.
      </p>
    </StatePage>
  )
}
