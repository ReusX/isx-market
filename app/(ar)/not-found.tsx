import type { Metadata } from 'next'
import { NotFoundView } from '@/components/system/RouteStates'
import { messages } from '@/lib/i18n'

/**
 * The Arabic 404.
 *
 * ⚠ KNOWN LIMITATION, measured rather than assumed — see the report.
 *
 * Next 14.2 has no way to render a custom not-found INSIDE a layout when the
 * app has two root layouts, which this one now needs so that `/en` can serve a
 * real `lang="en" dir="ltr"` document. For an unmatched URL Next cannot know
 * which of the two roots to wrap the page in, so it falls back to its own bare
 * error document and only the `metadata` below survives. The component is kept
 * wired because it is what renders the moment that constraint lifts, and
 * because nothing else about the surface changed.
 *
 * What was measured on the pre-change build: `/c/BOGUS` and every other
 * `notFound()` from a dynamic route ALREADY produced that bare document. The
 * behaviour lost here is narrower than it looks — top-level typos only.
 */
export const metadata: Metadata = {
  title: messages('ar').system.notFound.metaTitle,
  // A 404 must never become an indexable content page.
  robots: { index: false, follow: true },
  /* And it must not inherit the root canonical either. Without this, every
     mistyped URL emits `<link rel="canonical" href="https://iraqsm.com">` and
     tells a crawler the 404 is a duplicate of the homepage. There is no
     hreflang here for the same reason: a 404 has no alternate. */
  alternates: { canonical: null },
}

export default function NotFound() {
  return <NotFoundView />
}
