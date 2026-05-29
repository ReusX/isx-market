import { promises as fs } from 'fs'
import path from 'path'
import { mergeCompanies } from '@/lib/market'
import type { Company, LiveData } from '@/types'
import HomeClient from './HomeClient'

// Re-render the static HTML at most once a minute so the server-rendered hero
// (RSISX index + the stock list) stays fresh without gating LCP on a client
// fetch. The client still refreshes to the latest prices on mount.
export const revalidate = 60

async function getInitialData(): Promise<{ initialLive: LiveData | null; initialCompanies: Company[] }> {
  try {
    const dir = path.join(process.cwd(), 'public', 'data')
    const [liveRaw, metaRaw] = await Promise.all([
      fs.readFile(path.join(dir, 'live.json'), 'utf8'),
      fs.readFile(path.join(dir, 'companies.json'), 'utf8'),
    ])
    const live = JSON.parse(liveRaw) as LiveData
    const meta = JSON.parse(metaRaw)
    return { initialLive: live, initialCompanies: mergeCompanies(meta, live.stocks) }
  } catch {
    // If the files are missing the client effect will still fetch them.
    return { initialLive: null, initialCompanies: [] }
  }
}

export default async function HomePage() {
  const { initialLive, initialCompanies } = await getInitialData()
  return <HomeClient initialLive={initialLive} initialCompanies={initialCompanies} />
}
