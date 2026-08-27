'use client'

import { createContext, useContext, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { messages, type Messages } from '@/lib/i18n'
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/locale'
import { localePath, splitLocale } from '@/lib/i18n/paths'

/**
 * Locale for client components.
 *
 * The value comes from the root layout, which knows it statically — `app/(ar)`
 * provides `ar`, `app/(en)` provides `en`. It is NOT re-derived from the
 * pathname here, because during a client transition `usePathname()` updates
 * before the new tree commits and the shell would flash the wrong language.
 *
 * `href()` is the important export. Every internal `<Link>` in the shell has to
 * stay inside the reader's language, and hand-prefixing them is how half the
 * links in a bilingual app end up dropping people back into the other one.
 */
type LocaleValue = {
  locale: Locale
  t: Messages
  /** Locale-free route → the href to use in this locale. */
  href: (route: string) => string
}

const Ctx = createContext<LocaleValue | null>(null)

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo<LocaleValue>(() => ({
    locale,
    t: messages(locale),
    href: (route: string) => localePath(route, locale),
  }), [locale])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLocale(): LocaleValue {
  const v = useContext(Ctx)
  // A component rendered outside the provider gets Arabic rather than a crash:
  // the shell must never be the thing that takes the page down.
  return v ?? { locale: DEFAULT_LOCALE, t: messages(DEFAULT_LOCALE), href: (r) => r }
}

/** The message bundle alone, which is what most call sites want. */
export function useT(): Messages {
  return useLocale().t
}

/**
 * The locale-free route currently on screen, for the language switch and for
 * active-link tests. This one DOES read the pathname — it is asking «where am
 * I», not «what language is this tree».
 */
export function useRoute(): string {
  const pathname = usePathname() ?? '/'
  return splitLocale(pathname).route
}
