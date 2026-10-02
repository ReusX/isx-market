'use client'

import { InkIcon } from './InkIcon'
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
      <InkIcon name={dark ? 'theme' : 'theme-dark'} size={18} />
    </button>
  )
}
