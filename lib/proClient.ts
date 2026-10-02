'use client'

import { useCallback, useEffect, useState } from 'react'
import { useApp } from '@/context/AppContext'

/**
 * The browser's side of «IQWealth برو» (lib/pro.ts is the server's).
 * Every call carries the Supabase access token; the server decides.
 */
export async function proFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const { createClient } = await import('@/lib/supabase/client')
  const token = (await createClient().auth.getSession()).data.session?.access_token
  return fetch(url, { ...init, headers: { ...(init.headers ?? {}), 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, cache: 'no-store' })
}

export type ProState = { loading: boolean; until: string | null; test: boolean; refresh: () => void }

/** Whether the signed-in reader has a running pass. Re-checks when the user changes. */
export function usePro(): ProState {
  const { user, authLoading } = useApp()
  const [s, setS] = useState<{ loading: boolean; until: string | null; test: boolean }>({ loading: true, until: null, test: false })
  const [n, setN] = useState(0)
  const refresh = useCallback(() => setN((x) => x + 1), [])
  useEffect(() => {
    if (authLoading) return
    let live = true
    proFetch('/api/pro/status')
      .then((r) => r.json())
      .then((j: { proUntil: string | null; test?: boolean }) => { if (live) setS({ loading: false, until: j.proUntil, test: !!j.test }) })
      .catch(() => { if (live) setS({ loading: false, until: null, test: false }) })
    return () => { live = false }
  }, [user?.id, authLoading, n])
  return { ...s, refresh }
}
