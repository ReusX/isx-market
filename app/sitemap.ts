import { MetadataRoute } from 'next'
import companiesData from '@/public/data/companies.json'

const BASE = 'https://iraqsm.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  // Static routes
  const statics: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    {
      url: `${BASE}/market`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE}/charts`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE}/fx`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${BASE}/leaderboard`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.7,
    },
    {
      url: `${BASE}/quests`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${BASE}/rewards/spin`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.5,
    },
  ]

  // One page per listed company
  const companies: MetadataRoute.Sitemap = (companiesData as { sym: string }[]).map(c => ({
    url: `${BASE}/c/${c.sym}`,
    lastModified: now,
    changeFrequency: 'hourly' as const,
    priority: 0.8,
  }))

  return [...statics, ...companies]
}
