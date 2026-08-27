'use client'

import { FaultView } from '@/components/system/RouteStates'

/**
 * The Arabic 500. Surface shared with `app/(en)/en/error.tsx`.
 *
 * ⚠ The `error` object is received and deliberately not forwarded — see the
 * note on `FaultView`. `reset` is the real Next error-boundary reset, wired to
 * the real button; nothing here simulates a failure to make the screen
 * reachable.
 */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <FaultView reset={reset} />
}
