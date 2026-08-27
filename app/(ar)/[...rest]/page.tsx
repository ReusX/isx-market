import { notFound } from 'next/navigation'

/**
 * The Arabic 404 catch-all.
 *
 * ── Why a catch-all is required, and was not before ───────────────────────
 * With ONE root layout, Next could answer an unmatched URL with
 * `app/not-found.tsx` inside that layout, because there was only one layout it
 * could possibly be. With TWO root layouts there is no such default: Next
 * cannot know whether `/typo` is a broken Arabic URL or a broken English one,
 * so it bails out to its own built-in error document — a bare
 * `<html id="__next_error__">` reading «404: This page could not be found.»,
 * with no `lang`, no fonts, no frame and no way onward.
 *
 * This route claims the unmatched space for Arabic, which is correct: the site
 * root IS the Arabic tree. `/en/...` misses are claimed by the matching
 * catch-all in the English group, which is the more specific match and wins.
 *
 * It returns a real 404 status — `notFound()` throws the not-found boundary
 * and Next serves it with the right code — rather than a 200 that merely looks
 * like one.
 */
export default function ArabicCatchAll(): never {
  notFound()
}
