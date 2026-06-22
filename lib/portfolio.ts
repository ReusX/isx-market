'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import { fetchCompanyMeta } from '@/lib/market'
import type { CompanyMeta } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────
/** A single buy lot. Holdings aggregate one-or-more lots per ticker. */
export interface Lot {
  id: string
  sym: string
  qty: number       // number of shares
  price: number     // buy price per share (IQD)
  date?: string     // YYYY-MM-DD (purchase date, optional)
  note?: string
}

export interface Alert {
  id: string
  sym: string
  dir: 'above' | 'below'
  target: number          // target price (IQD)
  createdAt: string       // ISO
  basePrice: number       // price at creation, for context
  triggeredAt?: string | null
}

/** An aggregated position across all lots of one ticker. */
export interface Holding {
  sym: string
  qty: number
  cost: number      // total cost basis (Σ qty·price)
  avg: number       // weighted average buy price
  price: number     // current price
  value: number     // qty · price
  pl: number        // value − cost
  plPct: number     // pl / cost · 100
  lots: Lot[]
}

export interface PortfolioTotals {
  value: number
  cost: number
  pl: number
  plPct: number
}

// ─── Calc ─────────────────────────────────────────────────────────────────────
export function aggregate(lots: Lot[], prices: Record<string, number>): Holding[] {
  const bySym = new Map<string, Lot[]>()
  for (const l of lots) {
    const arr = bySym.get(l.sym) ?? []
    arr.push(l); bySym.set(l.sym, arr)
  }
  const out: Holding[] = []
  bySym.forEach((ls, sym) => {
    const qty = ls.reduce((s, l) => s + l.qty, 0)
    const cost = ls.reduce((s, l) => s + l.qty * l.price, 0)
    if (qty <= 0) return
    const price = prices[sym] ?? 0
    const value = qty * price
    const pl = value - cost
    out.push({
      sym, qty, cost, avg: cost / qty, price, value, pl,
      plPct: cost > 0 ? (pl / cost) * 100 : 0,
      lots: ls,
    })
  })
  return out.sort((a, b) => b.value - a.value)
}

export function totals(holdings: Holding[]): PortfolioTotals {
  const value = holdings.reduce((s, h) => s + h.value, 0)
  const cost  = holdings.reduce((s, h) => s + h.cost, 0)
  const pl    = value - cost
  return { value, cost, pl, plPct: cost > 0 ? (pl / cost) * 100 : 0 }
}

/** True when an alert's condition is met at the given price. */
export function alertHit(a: Alert, price: number): boolean {
  if (!price) return false
  return a.dir === 'above' ? price >= a.target : price <= a.target
}

// ─── Formatters ─────────────────────────────────────────────────────────────
export function fmtIQD(v: number): string {
  const a = Math.abs(v), sign = v < 0 ? '−' : ''
  if (a >= 1e9) return `${sign}${(a / 1e9).toFixed(2)} مليار`
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(2)} مليون`
  return `${sign}${Math.round(a).toLocaleString('en')}`
}
export const fmtPct = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%`
export const newId = () => (crypto.randomUUID?.() ?? String(Date.now() + Math.random()))

// ─── Market data (prices + company meta) ──────────────────────────────────────
export function useMarketData() {
  const [meta, setMeta]     = useState<CompanyMeta[]>([])
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const [{ data }, m] = await Promise.all([
          createClient().from('company_metrics').select('ticker,last_close'),
          fetchCompanyMeta().catch(() => [] as CompanyMeta[]),
        ])
        const pm: Record<string, number> = {}
        for (const r of (data ?? []) as { ticker: string; last_close: number }[]) {
          if (r.last_close > 0) pm[r.ticker] = r.last_close
        }
        setMeta(m); setPrices(pm)
      } finally { setLoading(false) }
    })()
  }, [])

  const metaBy = useMemo(() => new Map(meta.map(m => [m.sym, m])), [meta])
  return { meta, metaBy, prices, loading }
}

// ─── Synced storage (localStorage + optional Supabase profile column) ──────────
// Works fully offline/anonymous via localStorage. When signed in, the matching
// profiles JSONB column (portfolio / price_alerts) is read once and written on
// every change — best-effort, so the feature still works if the column has not
// been created yet (the update simply no-ops on a PostgREST error).
function useSyncedList<T extends { id: string }>(
  lsKey: string,
  column: 'portfolio' | 'price_alerts',
): [T[], (next: T[]) => void, boolean] {
  const { user } = useApp()
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<T[]>([])
  const [ready, setReady] = useState(false)

  // hydrate from localStorage
  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(lsKey) ?? '[]')) } catch {}
    setReady(true)
  }, [lsKey])

  // on sign-in, merge the cloud copy (union by id; cloud is source of truth
  // for anything it already has)
  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.from('profiles').select(column).eq('id', user.id).single()
      if (cancelled || error || !data) return
      const cloud = (data as Record<string, unknown>)[column] as T[] | null
      if (!cloud?.length) return
      setItems(prev => {
        const map = new Map(prev.map(i => [i.id, i]))
        for (const c of cloud) map.set(c.id, c)
        const merged = Array.from(map.values())
        localStorage.setItem(lsKey, JSON.stringify(merged))
        return merged
      })
    })()
    return () => { cancelled = true }
  }, [user, supabase, column, lsKey])

  const save = useCallback((next: T[]) => {
    setItems(next)
    try { localStorage.setItem(lsKey, JSON.stringify(next)) } catch {}
    if (user) {
      supabase.from('profiles').update({ [column]: next }).eq('id', user.id)
        .then(undefined, () => {}) // ignore (column may not exist yet)
    }
  }, [user, supabase, column, lsKey])

  return [items, save, ready]
}

export function usePortfolio() {
  const [lots, setLots, ready] = useSyncedList<Lot>('isx_portfolio', 'portfolio')
  const addLot    = (l: Omit<Lot, 'id'>) => setLots([...lots, { ...l, id: newId() }])
  const removeLot = (id: string) => setLots(lots.filter(l => l.id !== id))
  const removeSym = (sym: string) => setLots(lots.filter(l => l.sym !== sym))
  return { lots, ready, addLot, removeLot, removeSym }
}

export function useAlerts() {
  const [alerts, setAlerts, ready] = useSyncedList<Alert>('isx_alerts', 'price_alerts')
  const addAlert    = (a: Omit<Alert, 'id' | 'createdAt' | 'triggeredAt'>) =>
    setAlerts([...alerts, { ...a, id: newId(), createdAt: new Date().toISOString(), triggeredAt: null }])
  const removeAlert = (id: string) => setAlerts(alerts.filter(a => a.id !== id))
  const setAll      = (next: Alert[]) => setAlerts(next)
  return { alerts, ready, addAlert, removeAlert, setAll }
}
