'use client'

import Link from 'next/link'
import { Sheet } from '@/components/system/Overlay'
import { getNavigationGroups, HOME, INFO_LINKS, isActiveHref } from '@/lib/navigation'
import { useLocale, useRoute } from '@/context/LocaleContext'
import { LanguageSwitch } from './LanguageSwitch'

/**
 * Mobile navigation.
 *
 * Designed for a thumb, not shrunk from the desktop rail — that was the bug it
 * replaces: the phone used to get the same rail narrowed to icons, which is a
 * memory test with small targets.
 *
 * A full-height sheet on the inline-start edge, which in RTL is the RIGHT —
 * under the thumb that just pressed the menu button. Search comes first,
 * because on a phone the fastest path to a company is naming it.
 *
 * Rows are 52px, comfortably past the 44px floor. Scroll lock, focus trap,
 * focus return and Escape all come from `useOverlay` via `Sheet`; nothing here
 * reimplements them.
 */
export function MobileNav({
  open,
  onClose,
  signedIn,
  onSearch,
}: {
  open: boolean
  onClose: () => void
  signedIn: boolean
  onSearch: () => void
}) {
  const route = useRoute()
  const { t, href: L } = useLocale()
  const groups = getNavigationGroups()

  function Row({ href, label }: { href: string; label: string }) {
    const active = isActiveHref(href, route)
    return (
      <Link
        href={L(href)}
        className={`mn-row ${active ? 'is-on' : ''}`.trim()}
        aria-current={active ? 'page' : undefined}
        onClick={onClose}
      >
        {active ? <em aria-hidden="true" /> : null}
        <span>{label}</span>
      </Link>
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.shell.navMobile} side="inline-start">
      <button
        type="button"
        className="mn-search"
        onClick={() => { onClose(); onSearch() }}
      >
        <i aria-hidden="true" />
        <span>{t.shell.search.trigger}</span>
      </button>

      <div className="mn-group">
        <Row href={HOME.href} label={t.nav.home} />
      </div>

      {groups.map(({ group, items }) => (
        <section className="mn-group" key={group}>
          <h3>{t.nav.groups[group]}</h3>
          {items.map((item) => <Row key={item.id} href={item.href} label={t.nav[item.id]} />)}
        </section>
      ))}

      <section className="mn-group">
        <h3>{t.nav.info.heading}</h3>
        {INFO_LINKS.map((l) => <Row key={l.href} href={l.href} label={t.nav.info[l.id]} />)}
      </section>

      {/* The language switch, on a phone, in the navigation — NOT buried in
          account settings. A reader who cannot read the current language must
          be able to find it from the first sheet they open. */}
      <section className="mn-group">
        <h3>{t.shell.language.group}</h3>
        <LanguageSwitch variant="row" onNavigate={onClose} />
      </section>

      <div className="mn-foot">
        {signedIn ? (
          <Link href={L('/profile')} className="mn-account" onClick={onClose}>{t.shell.account}</Link>
        ) : (
          /* Signed out gets ONE clear entry, not a disabled workspace. */
          <Link href={L('/login')} className="mn-signin" onClick={onClose}>
            {t.shell.signInLong}
          </Link>
        )}
      </div>
    </Sheet>
  )
}
