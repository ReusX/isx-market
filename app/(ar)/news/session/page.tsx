import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { SessionArchivePage } from '@/components/site/SessionWrapPage'
import { messages } from '@/lib/i18n'
import { absUrl, seoAlternates } from '@/lib/seo'

/** /news/session · the archive of daily wraps, newest first (last 120). */
export const revalidate = 1800

export function generateMetadata(): Metadata {
  const w = messages('ar').wrap
  return {
    title: { absolute: w.archiveSeoTitle },
    description: w.archiveSeoDescription,
    alternates: seoAlternates('/news/session'),
    openGraph: { url: absUrl('/news/session'), title: w.archiveSeoTitle, description: w.archiveSeoDescription, images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  }
}

export default async function Page() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { fetch: (u, i) => fetch(u, { ...i, next: { revalidate: 300 } }) }, auth: { persistSession: false },
  })
  const { data } = await sb.from('daily_index').select('date,isx60').gt('isx60', 0).order('date', { ascending: false }).limit(121)
  const rows = ((data ?? []) as { date: string; isx60: number }[]).map((r, i, a) => ({
    date: r.date, close: r.isx60, pct: a[i + 1] ? ((r.isx60 - a[i + 1].isx60) / a[i + 1].isx60) * 100 : null,
  })).slice(0, 120)
  return <SessionArchivePage rows={rows} />
}
