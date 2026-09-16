'use client'

import { useApp } from '@/context/AppContext'
import { useLocale } from '@/context/LocaleContext'

/**
 * The light/dark switch. One component so the header and the homepage nav
 * cannot drift; the caller passes the class that dresses it for its surface.
 * Sun when dark (press for light), moon when light (press for dark) — the
 * icon names the destination, and the label says it in words.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useApp()
  const { t } = useLocale()
  const dark = theme === 'dark'
  return (
    <button type="button" className={className} onClick={toggleTheme} aria-label={dark ? t.shell.toLight : t.shell.toDark}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dark
          ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>
          : <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />}
      </svg>
    </button>
  )
}
