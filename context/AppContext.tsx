'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { UserProfile, Lang } from '@/types'
import { createClient } from '@/lib/supabase/client'
import AuthModal from '@/components/auth/AuthModal'

type Theme = 'dark' | 'light'

/**
 * ⚠ `lang` is GONE from this context, deliberately.
 *
 * It was initialised from `localStorage.getItem('lang')` and nothing on the
 * site rendered differently because of it — a switch wired to nothing. Worse,
 * a locale that lives only in localStorage is invisible to a crawler, so the
 * same URL would have served two languages depending on who asked.
 *
 * The locale is now a function of the pathname and nothing else. Read it from
 * `useLocale()` in `context/LocaleContext.tsx`.
 */
interface AppState {
  theme:       Theme
  user:        any | null
  profile:     UserProfile | null
  watchlist:   string[]
  authLoading: boolean
  toggleTheme: () => void
  toggleWatchlist: (sym: string) => void
  refreshProfile:  () => Promise<void>
  signOut:     () => Promise<void>
  openAuth:    (tab?: 'signin' | 'signup') => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Stable client — created once, never recreated
  const supabase = useMemo(() => createClient(), [])

  const [theme, setThemeState] = useState<Theme>('dark')
  const [user, setUser]         = useState<any | null>(null)
  const [profile, setProfile]   = useState<UserProfile | null>(null)
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [authLoading, setAuthLoading] = useState(true)
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup' | null>(null)
  // Init theme + watchlist from localStorage
  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as Theme | null) ?? 'dark'
    setThemeState(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
    try {
      const wl = JSON.parse(localStorage.getItem('isx_watchlist') ?? '[]')
      setWatchlist(wl)
    } catch {}
  }, [])

  // Fetch profile for a given user id
  const fetchProfile = useCallback(async (uid: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single()
      if (data) {
        setProfile(data as UserProfile)
        if (data.watchlist?.length) {
          setWatchlist(prev => {
            const merged = Array.from(new Set([...prev, ...(data.watchlist ?? [])]))
            localStorage.setItem('isx_watchlist', JSON.stringify(merged))
            return merged
          })
        }
      }
    } catch {}
  }, [supabase])

  // Auth — onAuthStateChange fires INITIAL_SESSION immediately on mount
  useEffect(() => {
    // Safety net: if INITIAL_SESSION never fires, unblock after 5s
    const fallback = setTimeout(() => setAuthLoading(false), 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        clearTimeout(fallback)
        const u = session?.user ?? null
        setUser(u)
        setAuthLoading(false)   // ← resolve immediately — don't wait for profile fetch
        if (u) {
          fetchProfile(u.id)    // async, updates profile state when ready
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      clearTimeout(fallback)
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const refreshProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (u) await fetchProfile(u.id)
  }, [supabase, fetchProfile])

  const toggleTheme = () => {
    setThemeState(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      document.documentElement.setAttribute('data-theme', next)
      return next
    })
  }

  const toggleWatchlist = (sym: string) => {
    setWatchlist(prev => {
      const updated = prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
      localStorage.setItem('isx_watchlist', JSON.stringify(updated))
      if (user) supabase.from('profiles').update({ watchlist: updated }).eq('id', user.id)
      return updated
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const openAuth = (tab: 'signin' | 'signup' = 'signin') => setAuthModalTab(tab)

  return (
    <AppContext.Provider value={{
      theme, user, profile, watchlist, authLoading,
      toggleTheme, toggleWatchlist, refreshProfile, signOut, openAuth,
    }}>
      {children}
      {authModalTab && !user && (
        <AuthModal defaultTab={authModalTab} onClose={() => setAuthModalTab(null)} />
      )}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
