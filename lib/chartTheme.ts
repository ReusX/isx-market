'use client'

import { useEffect, useState } from 'react'

/**
 * The shared chart palette, and the theme-observation it needs.
 *
 * ── The bug this fixes ────────────────────────────────────────────────────
 * `components/KChart.tsx` hard-coded a 15-colour TradingView dark palette at
 * module scope and used it in 89 places. `app/charts/page.tsx` did the same
 * with 5 more. Neither read the theme at all — no `data-theme`, no observer —
 * so both rendered a dark chart on a light page. That was already broken in
 * production before any redesign touched them.
 *
 * ── Why a hook and not CSS ────────────────────────────────────────────────
 * Charting libraries draw to canvas. A canvas cannot resolve `var(--ink)`; it
 * needs a resolved string at draw time, and it needs to be TOLD when that
 * string changes. CSS custom properties alone are not enough, which is why
 * this exists as a hook with a MutationObserver rather than a stylesheet.
 *
 * `components/design/IndexChart.tsx` already reads computed custom properties
 * for its PNG export — that is the pattern this generalises.
 *
 * ── What this is NOT ──────────────────────────────────────────────────────
 * Not a redesign of the company chart. The dark values are the ones KChart
 * already shipped, unchanged, so dark mode renders exactly as before. The only
 * new thing is that light mode now renders as light.
 */

export type ChartTheme = {
  bg: string
  panel: string
  border: string
  hover: string
  text: string
  icon: string
  muted: string
  faint: string
  accent: string
  up: string
  down: string
  grid: string
  cross: string
  crossBg: string
  /** Text drawn ON an accent/cross fill. Always the high-contrast one. */
  onFill: string
}

/** The palette KChart already shipped. Unchanged, so dark mode does not move. */
const DARK: ChartTheme = {
  bg: '#131722',
  panel: '#1c2030',
  border: '#2a2e39',
  hover: '#2a2e39',
  text: '#d1d4dc',
  icon: '#b2b5be',
  muted: '#787b86',
  faint: '#5d606b',
  accent: '#2962ff',
  up: '#26a69a',
  down: '#ef5350',
  grid: '#1e222d',
  cross: '#9598a1',
  crossBg: '#363a45',
  onFill: '#ffffff',
}

/**
 * The light counterpart.
 *
 * Derived from the product's own light tokens rather than invented: the
 * surfaces are the base layer's `--surface` / `--page` family, and up/down are
 * the approved semantic pair, not TradingView's teal and salmon — a rising
 * price must be the same colour on a chart as it is in the table beside it.
 */
const LIGHT: ChartTheme = {
  bg: '#ffffff',
  panel: '#f7f7f5',
  border: '#e2e2df',
  hover: '#ededea',
  text: '#1b1c1f',
  icon: '#545963',
  muted: '#6b6d74',
  faint: '#8a8c91',
  accent: '#3171c6',
  up: '#117f59',
  down: '#b5432f',
  grid: '#ececea',
  cross: '#6b6d74',
  crossBg: '#4a4d57',
  onFill: '#ffffff',
}

function currentTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

export function readChartTheme(): ChartTheme {
  return currentTheme() === 'light' ? LIGHT : DARK
}

/**
 * The palette, kept in step with the theme.
 *
 * Starts on DARK so server and first client render agree — the app's own
 * pre-paint script sets `data-theme` before this ever runs, and the effect
 * immediately corrects it. Assuming the initial theme is enough is the mistake
 * this hook exists to prevent: the user can toggle at any time, and a canvas
 * that read its colours once keeps the old ones forever.
 */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(DARK)

  useEffect(() => {
    const sync = () => setTheme(readChartTheme())
    sync()

    const observer = new MutationObserver((records) => {
      if (records.some((r) => r.attributeName === 'data-theme')) sync()
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return theme
}
