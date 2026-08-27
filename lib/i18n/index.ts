import { ar } from './messages/ar'
import { en } from './messages/en'
import type { Locale } from './locale'

export type Messages = typeof ar

const DICTIONARIES: Record<Locale, Messages> = { ar, en }

/**
 * The dictionary for a locale.
 *
 * Both dictionaries are imported statically and selected at runtime rather
 * than passed down from the server as a prop. The alternative serialises the
 * whole message object into the RSC payload of every single navigation; this
 * pays for both languages once, in a shared chunk the browser caches.
 */
export function messages(locale: Locale): Messages {
  return DICTIONARIES[locale]
}

export * from './locale'
export * from './paths'
export * from './routes'
