import { notFound } from 'next/navigation'

/**
 * The English 404 catch-all.
 *
 * Without it, an unmatched URL under `/en` falls out of the English route group
 * entirely and is answered by the ARABIC not-found — an English reader who
 * mistypes a ticker gets a page in a language they came here to avoid, under a
 * `lang="ar"` document.
 *
 * It returns a real 404 status, not a 200 with a 404-looking page: `notFound()`
 * throws the not-found boundary, which Next serves with the correct status.
 * The metadata that boundary carries is `robots: noindex` and a null canonical,
 * so none of these URLs becomes indexable.
 */
export default function EnCatchAll(): never {
  notFound()
}
