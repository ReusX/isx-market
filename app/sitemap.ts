import { MetadataRoute } from 'next'
import companiesData from '@/public/data/companies.json'

const BASE = 'https://iraqsm.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const statics: MetadataRoute.Sitemap = [
    { url: `${BASE}`,           lastModified: now, changeFrequency: 'hourly',  priority: 1.0 },
    { url: `${BASE}/market`,    lastModified: now, changeFrequency: 'hourly',  priority: 1.0 },
    { url: `${BASE}/pulse`,     lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/screener`,  lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/companies`, lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/charts`,    lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/news`,      lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE}/gold`,      lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE}/oil`,       lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE}/fx`,        lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE}/statistics`,lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE}/research`,  lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE}/learn`,     lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE}/banks`,     lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/about`,     lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/learn/trading-from-zero`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ]

  const companies: MetadataRoute.Sitemap = (companiesData as { sym: string }[]).map(c => ({
    url:             `${BASE}/c/${c.sym}`,
    lastModified:    now,
    changeFrequency: 'hourly' as const,
    priority:        0.8,
  }))

  return [...statics, ...companies]
}
