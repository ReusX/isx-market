'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sheet } from '@/components/system/Overlay'
import { getNavigationGroups, HOME, INFO_LINKS, isActiveHref } from '@/lib/navigation'

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
  const pathname = usePathname() ?? '/'
  const groups = getNavigationGroups()

  function Row({ href, label }: { href: string; label: string }) {
    const active = isActiveHref(href, pathname)
    return (
      <Link
        href={href}
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
    <Sheet open={open} onClose={onClose} title="التنقل" side="inline-start">
      <button
        type="button"
        className="mn-search"
        onClick={() => { onClose(); onSearch() }}
      >
        <i aria-hidden="true" />
        <span>ابحث عن شركة أو رمز…</span>
      </button>

      <div className="mn-group">
        <Row href={HOME.href} label={HOME.label} />
      </div>

      {groups.map(({ group, items }) => (
        <section className="mn-group" key={group}>
          <h3>{group}</h3>
          {items.map((item) => <Row key={item.id} href={item.href} label={item.label} />)}
        </section>
      ))}

      <section className="mn-group">
        <h3>الموقع</h3>
        {INFO_LINKS.map((l) => <Row key={l.href} href={l.href} label={l.label} />)}
      </section>

      <div className="mn-foot">
        {signedIn ? (
          <Link href="/profile" className="mn-account" onClick={onClose}>حسابي</Link>
        ) : (
          /* Signed out gets ONE clear entry, not a disabled workspace. */
          <Link href="/profile" className="mn-signin" onClick={onClose}>
            تسجيل الدخول · أنشئ حسابك المجاني
          </Link>
        )}
      </div>
    </Sheet>
  )
}
