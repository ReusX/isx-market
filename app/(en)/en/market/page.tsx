import { permanentRedirect } from 'next/navigation'

/**
 * The market lives at the root now — the URL that carries the site's
 * authority — and this address folds into it with a 308, so its history and
 * links consolidate there instead of competing.
 */
export default function Page() {
  permanentRedirect('/en')
}
