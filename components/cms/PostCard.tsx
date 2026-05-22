import Link from 'next/link'
import type { WPPost } from '@/lib/cms'
import { featuredImage, fmtDate, stripHtml, SECTIONS } from '@/lib/cms'

interface Props {
  post:    WPPost
  section: 'news' | 'research' | 'learn'
  lang:    string
}

export default function PostCard({ post, section, lang }: Props) {
  const ar    = lang === 'ar'
  const meta  = SECTIONS[section]
  const img   = featuredImage(post, 'medium')
  const title = post.title.rendered
  const blurb = stripHtml(post.excerpt.rendered).slice(0, 120) + '…'
  const date  = fmtDate(post.date, lang)
  const href  = `/${section}/${post.slug}`

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 16, overflow: 'hidden',
        transition: 'border-color 0.15s, transform 0.15s',
        cursor: 'pointer', height: '100%',
        display: 'flex', flexDirection: 'column',
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = meta.color
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--line)'
          ;(e.currentTarget as HTMLDivElement).style.transform = ''
        }}
      >
        {/* Thumbnail */}
        <div style={{
          width: '100%', height: 180, flexShrink: 0,
          background: `${meta.color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative',
        }}>
          {img ? (
            <img src={img} alt={title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 48 }}>{meta.icon}</span>
          )}
          {/* Section badge */}
          <div style={{
            position: 'absolute', top: 10,
            ...(ar ? { right: 10 } : { left: 10 }),
            padding: '3px 10px', borderRadius: 999,
            background: meta.color, color: '#fff',
            fontSize: 10, fontWeight: 700,
          }}>
            {ar ? meta.labelAr : meta.labelEn}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3 style={{
            margin: 0, fontSize: 14, fontWeight: 700,
            color: 'var(--ink)', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}
            dangerouslySetInnerHTML={{ __html: title }}
          />
          <p style={{
            margin: 0, fontSize: 12, color: 'var(--ink3)',
            lineHeight: 1.6, flex: 1,
            display: '-webkit-box', WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {blurb}
          </p>
          <div style={{
            fontSize: 11, color: 'var(--ink4)',
            display: 'flex', alignItems: 'center', gap: 6,
            marginTop: 4,
          }}>
            <span>📅</span>
            <span>{date}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
