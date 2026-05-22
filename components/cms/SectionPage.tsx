'use client'

import { useApp } from '@/context/AppContext'
import PostCard from './PostCard'
import type { WPPost, Section } from '@/lib/cms'
import { SECTIONS } from '@/lib/cms'

interface Props {
  section: Section
  posts:   WPPost[]
}

export default function SectionPage({ section, posts }: Props) {
  const { lang } = useApp()
  const ar   = lang === 'ar'
  const meta = SECTIONS[section]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 40px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `${meta.color}22`, border: `1px solid ${meta.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            {meta.icon}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
              {ar ? meta.labelAr : meta.labelEn}
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink3)', marginTop: 2 }}>
              {ar ? meta.descAr : meta.descEn}
            </p>
          </div>
        </div>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${meta.color}, transparent)`, borderRadius: 2 }} />
      </div>

      {/* Posts grid */}
      {posts.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          color: 'var(--ink4)', fontSize: 14,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{meta.icon}</div>
          {ar ? 'لا توجد مقالات بعد — تابعنا قريباً!' : 'No posts yet — check back soon!'}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 20,
        }}>
          {posts.map(post => (
            <PostCard key={post.id} post={post} section={section} lang={lang} />
          ))}
        </div>
      )}
    </div>
  )
}
