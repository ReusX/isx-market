'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/context/LocaleContext'
import { LOCALE_NAME, otherLocale } from '@/lib/i18n/locale'
import { switchPath } from '@/lib/i18n/paths'
import { routeClass } from '@/lib/i18n/routes'

/**
 * The language switch.
 *
 * ── It is a link, not a button ────────────────────────────────────────────
 * The other language is a different URL, so this is an `<a>` with a real
 * `href`. That gives middle-click, copy-link, open-in-new-tab and, more
 * importantly, it means a crawler can follow it — a `<button>` that calls
 * `router.push` is invisible to one, and an unlinked `/en` tree is an
 * unindexed one.
 *
 * ── It goes to the equivalent page ────────────────────────────────────────
 * `switchPath` resolves the destination against the route registry: the same
 * route when it exists in the other language, otherwise the nearest ancestor
 * that does. Standing on an Arabic-only article, an English reader lands on
 * `/en/news`, not on `/en`. Sending everyone to Home was the behaviour the
 * brief singled out, and it is the reason people stop using the switch.
 *
 * ── No flags ──────────────────────────────────────────────────────────────
 * A flag is a country, not a language, and English is not a country here. Each
 * label is the language's own endonym — «العربية» and «English» — so it is
 * legible to precisely the person who needs it.
 *
 * ── Nothing is remembered, deliberately ───────────────────────────────────
 * There is no locale cookie and no localStorage key. The URL already IS the
 * memory: an English reader's history, bookmarks and shared links are all
 * `/en/…`. A stored preference that silently redirects is the thing that makes
 * one URL serve two languages, which is exactly what breaks hreflang.
 */
export function LanguageSwitch({
  variant = 'header',
  onNavigate,
}: {
  variant?: 'header' | 'row'
  onNavigate?: () => void
}) {
  const pathname = usePathname() ?? '/'
  const { locale } = useLocale()
  const target = otherLocale(locale)
  const href = switchPath(pathname, target)

  /*
   * When the current route has no twin, the switch still works but lands on an
   * ancestor — so say so rather than appearing to lose the reader's place. The
   * `title` carries it; the visible label stays one word wide.
   */
  const cls = routeClass(pathname.replace(/^\/en(?=\/|$)/, '') || '/')
  const approximate = cls === 'ar-only' && target === 'en'

  const label = LOCALE_NAME[target]
  const aria = target === 'en' ? 'Switch to the English version' : 'التبديل إلى النسخة العربية'

  return (
    <Link
      href={href}
      hrefLang={target}
      // `lang` on the element itself: the label is written IN the target
      // language, so a screen reader has to switch voice to say it correctly.
      lang={target}
      className={variant === 'row' ? 'mn-row mn-lang' : 'gh-lang'}
      aria-label={aria}
      title={approximate
        ? (target === 'en' ? 'This page is available in Arabic only — opens the nearest English page' : undefined)
        : undefined}
      onClick={onNavigate}
    >
      <span>{label}</span>
    </Link>
  )
}
