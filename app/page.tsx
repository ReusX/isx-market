import { promises as fs } from 'fs'
import path from 'path'
import type { LiveData } from '@/types'
import HomeClient from './HomeClient'

// Re-render the static HTML at most once a minute so the server-rendered hero
// (the RSISX index number — the LCP element) stays fresh. Only the small live
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

export default async function HomePage() {
  const initialLive = await getInitialLive()
  return <HomeClient initialLive={initialLive} />
}
