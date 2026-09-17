'use client'

import { FaultPage as FaultView } from '@/components/site/StatePages'

/** The English 500. See `app/(ar)/error.tsx`. */
export default function EnErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <FaultView reset={reset} />
}
