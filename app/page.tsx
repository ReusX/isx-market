import { promises as fs } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import type { LiveData } from '@/types'
import HomeClient from './HomeClient'

// Re-render the static HTML at most once a minute so the server-rendered hero
// (the ISX60 index number — the LCP element) stays fresh. Only the small live
// snapshot is server-rendered; the heavy company list stays client-rendered so
// the initial HTML document stays light and FCP stays fast on slow networks.
export const revalidate = 60

async function getInitialLive(): Promise<LiveData | null> {
  try {
    const file = path.join(process.cwd(), 'public', 'data', 'live.json')
    return JSON.parse(await fs.readFile(file, 'utf8')) as LiveData
  } catch {
    return null
  }
}

// Hero index = official ISX60 from our own daily_index table (parsed from
// ISX reports, refreshed by the daily cron). Anon key + RLS read-only.
async function getInitialIndex(): Promise<{ value: number; pct: number } | null> {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data } = await db
      .from('daily_index')
      .select('date,isx60')
      .not('isx60', 'is', null)
      .order('date', { ascending: false })
      .limit(2)
    const [last, prev] = data ?? []
    if (!last?.isx60) return null
    return {
      value: last.isx60,
      pct: prev?.isx60 ? ((last.isx60 - prev.isx60) / prev.isx60) * 100 : 0,
    }
  } catch {
    return null
  }
}

export default async function HomePage() {
  const [initialLive, initialIndex] = await Promise.all([getInitialLive(), getInitialIndex()])
  return <HomeClient initialLive={initialLive} initialIndex={initialIndex} />
}
