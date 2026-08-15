'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'

/**
 * The detached top header.
 *
 * ⚠ The notification bell is GONE, deliberately. In the old shell
 * (`components/layout/AppShell.tsx:407`) it was a `<button>` with no `onClick`,
 * no `aria-label` and no behaviour of any kind: a control that looked like a
 * feature and did nothing, announced to a screen reader as an unnamed button.
 * It is not replaced with another decorative notification icon.
 */
export function GlobalHeader({
  onMenu,
  onSearchOpen,
}: {
  onMenu: () => void
  onSearchOpen: () => void
}) {
  const { theme, toggleTheme, user, openAuth } = useApp()

  /**
   * The `/` shortcut, actually bound this time.
   *
   * Guarded against firing while the user is typing — without the check, `/`
   * inside a text field opens the palette instead of typing a slash, which is
   * maddening and looks like a broken keyboard.
   */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (!t) return
      const tag = t.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) return
      e.preventDefault()
      onSearchOpen()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onSearchOpen])

  return (
    <header className="gh">
      <button
        type="button"
        className="gh-menu"
        onClick={onMenu}
        aria-label="القائمة"
      >
        <span aria-hidden="true">☰</span>
      </button>

      <button type="button" className="gh-searchbtn" onClick={onSearchOpen}>
        <i aria-hidden="true" />
        <span>ابحث عن شركة أو رمز…</span>
        <kbd aria-hidden="true">/</kbd>
      </button>

      <div className="gh-actions">
        <button
          type="button"
          className="gh-theme"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
        >
          <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
        </button>

        {user ? (
          <Link href="/profile" className="gh-account" aria-label="حسابي">
            <span aria-hidden="true">{(user.email ?? '؟').slice(0, 1).toUpperCase()}</span>
          </Link>
        ) : (
          /* Signed out gets one clear entry. No disabled workspace controls
             advertising an authenticated product to someone who cannot use it.
             Auth is a modal in production and stays one — the route-based auth
             family is a later phase, and inventing a second entry point now
             would leave two to reconcile. */
          <button type="button" className="gh-login" onClick={() => openAuth('signin')}>
            دخول
          </button>
        )}
      </div>
    </header>
  )
}
