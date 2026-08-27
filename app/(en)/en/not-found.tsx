import type { Metadata } from 'next'
import { NotFoundView } from '@/components/system/RouteStates'
import { messages } from '@/lib/i18n'

/**
 * The English 404. See `app/(ar)/not-found.tsx` for the shared reasoning and
 * for the Next 14.2 limitation that currently reduces both of these to their
 * metadata.
 *
 * It earns its place regardless: without it, an unmatched `/en/...` URL is
 * answered with the ARABIC 404 title, and the one reader guaranteed not to
 * read Arabic is the one who mistyped an English URL.
 */
export const metadata: Metadata = {
  title: messages('en').system.notFound.metaTitle,
  robots: { index: false, follow: true },
  alternates: { canonical: null },
}

export default function EnNotFound() {
  return <NotFoundView />
}
