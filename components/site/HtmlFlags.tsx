'use client'

import { useLayoutEffect } from 'react'

/**
 * Puts back the flags the <head> bootstrap stamps on <html> before paint —
 * data-theme, data-welcome="off", and the app's `is-app` class.
 *
 * React 19 takes <html> over at hydration and clears every attribute it
 * did not render itself, so those stamps vanished the moment the page came
 * alive: the closed welcome card reappeared on every load, and the theme
 * and app chrome were only restored by later effects (a visible flicker).
 * A layout effect runs in that same commit, before the browser paints, so
 * nothing is ever seen without them. The logic is the bootstrap's own
 * (window.__iqFlags, Document.tsx), not a copy that could drift.
 */
declare global { interface Window { __iqFlags?: () => void } }

export function HtmlFlags() {
  useLayoutEffect(() => { window.__iqFlags?.() }, [])
  return null
}
