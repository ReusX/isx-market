import type { Metadata } from 'next'
import { Suspense } from 'react'
import AuthCallbackClient from './AuthCallbackClient'

export const metadata: Metadata = { robots: { index: false, follow: false },
  /* No canonical at all — a transient OAuth/PKCE handoff, not a page anyone should land on or link to,
     so it should not declare itself a duplicate of anything. Left
     unset it inherits the root's, which points at the homepage. */
  alternates: { canonical: null } }

export default function Page() {
  return <Suspense><AuthCallbackClient /></Suspense>
}
