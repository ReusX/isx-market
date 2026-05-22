'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { UserProfile, Lang } from '@/types'
import { createClient } from '@/lib/supabase/client'
import AuthModal from '@/components/auth/AuthModal'

interface AppState {
  lang:        Lang
  user:        any | null
  profile:     UserProfile | null
  watchlist:   string[]
  authLoading: boolean
  setLang:     (l: Lang) => void
  toggleWatchlist: (sym: string) => void
  refreshProfile:  () => Promise<void>
  signOut:     () => Promise<void>
  openAuth:    (tab?: 'signin' | 'signup') => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar')
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [authLoading, setAuthLoading] = useState(true)
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup' | null>(null)
  const supabase = createClient()

  // Init lang from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null
    if (saved) setLangState(saved)
  }, [])

  // Init watchlist from localStorage
  useEffect(() => {
    try {
      const wl = JSON.parse(localStorage.getItem('isx_watchlist') ?? '[]')
      setWatchlist(wl)
    } catch {}
  }, [])

  // Auth listener
  useEffect(() => {
    // Safety timeout — never leave users stuck loading
    const timeout = setTimeout(() => setAuthLoading(false), 4000)

    // Resolve auth state on first load
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        setUser(user ?? null)
        if (user) {
          return refreshProfile()
        }
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout)
        setAuthLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await refreshProfile()
      } else {
        setProfile(null)
      }
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) {
      setProfile(data as UserProfile)
      // Merge server watchlist with local
      if (data.watchlist?.length) {
        const merged = Array.from(new Set([...watchlist, ...(data.watchlist ?? [])]))
        setWatchlist(merged)
        localStorage.setItem('isx_watchlist', JSON.stringify(merged))
      }
    }
  }, [supabase, watchlist])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('lang', l)
    document.documentElement.setAttribute('lang', l)
    document.documentElement.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr')
  }

  const toggleWatchlist = (sym: string) => {
    const updated = watchlist.includes(sym)
      ? watchlist.filter(s => s !== sym)
      : [...watchlist, sym]
    setWatchlist(updated)
    localStorage.setItem('isx_watchlist', JSON.stringify(updated))
    // Sync to Supabase if logged in
    if (user) {
      supabase.from('profiles').update({ watchlist: updated }).eq('id', user.id)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const openAuth = (tab: 'signin' | 'signup' = 'signin') => setAuthModalTab(tab)

  return (
    <AppContext.Provider value={{ lang, user, profile, watchlist, authLoading, setLang, toggleWatchlist, refreshProfile, signOut, openAuth }}>
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
