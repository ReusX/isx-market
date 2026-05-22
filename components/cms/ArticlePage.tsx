'use client'

import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import type { WPPost, Section } from '@/lib/cms'
import { featuredImage, fmtDate, authorName, SECTIONS } from '@/lib/cms'

interface Props {
  post:     WPPost
  section:  Section
  backHref: string
}

export default function ArticlePage({ post, section, backHref }: Props) {
  const { lang } = useApp()
  const ar   = lang === 'ar'
  const meta = SECTIONS[section]
  const img  = featuredImage(post, 'large')
  const date = fmtDate(post.date, lang)
  const auth = authorName(post)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 24px 60px' }}>

      {/* Back link */}
      <Link href={backHref} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 13, color: 'var(--ink3)', marginBottom: 20,
        padding: '6px 12px', borderRadius: 8,
        border: '1px solid var(--line)', background: 'var(--surf)',
      }}>
        {ar ? '→' : '←'} {ar ? meta.labelAr : meta.labelEn}
      </Link>

      {/* Category badge */}
      <div style={{ marginBottom: 14 }}>
        <span style={{
          padding: '4px 12px', borderRadius: 999,
          background: `${meta.color}22`, color: meta.color,
          border: `1px solid ${meta.color}44`,
          fontSize: 11, fontWeight: 700,
        }}>
          {meta.icon} {ar ? meta.labelAr : meta.labelEn}
        </span>
      </div>

      {/* Title */}
      <h1
        style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.5, marginBottom: 12, margin: '0 0 12px' }}
        dangerouslySetInnerHTML={{ __html: post.title.rendered }}
      />

      {/* Meta row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        fontSize: 12, color: 'var(--ink4)', marginBottom: 24,
        paddingBottom: 20, borderBottom: '1px solid var(--line)',
      }}>
        {auth && <span>✍️ {auth}</span>}
        <span>📅 {date}</span>
      </div>

      {/* Featured image */}
      {img && (
        <div style={{ marginBottom: 28, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)' }}>
          <img src={img} alt={post.title.rendered.replace(/<[^>]*>/g, '')}
            style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 420, objectFit: 'cover' }} />
        </div>
      )}

      {/* Content — rewrite any cms.iraqsm.com image src URLs to Hostinger temp domain */}
      <div
        className="wp-content"
        dangerouslySetInnerHTML={{
          __html: post.content.rendered
            .replace(/https:\/\/cms\.iraqsm\.com/g, 'https://paleturquoise-deer-610016.hostingersite.com')
            .replace(/http:\/\/cms\.iraqsm\.com/g,  'https://paleturquoise-deer-610016.hostingersite.com'),
        }}
      />

      {/* Back to section */}
      <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--line)' }}>
        <Link href={backHref} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 10,
          background: `${meta.color}18`, border: `1px solid ${meta.color}44`,
          color: meta.color, fontWeight: 700, fontSize: 13,
        }}>
          {ar ? `← العودة إلى ${meta.labelAr}` : `← Back to ${meta.labelEn}`}
        </Link>
      </div>
    </div>
  )
}
