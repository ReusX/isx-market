'use client'

import { useApp } from '@/context/AppContext'

export default function ContactPage() {
  const { lang } = useApp()
  const ar = lang === 'ar'

  return (
    <div className="terminal-shell app-page prose-page">

      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
          {ar ? 'تواصل معنا' : 'Contact Us'}
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.2, margin: '0 0 14px', color: 'var(--ink)' }}>
          {ar ? 'يسعدنا سماعك' : 'We\'d Love to Hear From You'}
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink3)', lineHeight: 1.7, margin: 0 }}>
          {ar
            ? 'سواء كان لديك سؤال، اقتراح، أو تريد الإبلاغ عن مشكلة · نحن هنا.'
            : 'Whether you have a question, suggestion, or want to report an issue · we\'re here.'}
        </p>
      </div>

      <div style={{ height: 1, background: 'var(--line)', marginBottom: 40 }} />

      {/* Contact card */}
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 18, padding: '32px 28px', marginBottom: 32,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
          {ar ? 'البريد الإلكتروني' : 'Email'}
        </div>
        <a
          href="mailto:boatlef@gmail.com"
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            textDecoration: 'none',
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'var(--brand)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>✉️</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--brand)' }}>
              boatlef@gmail.com
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink4)', marginTop: 3 }}>
              {ar ? 'نرد عادةً خلال 1–2 يوم عمل' : 'We typically reply within 1–2 business days'}
            </div>
          </div>
        </a>
      </div>

      {/* Phone card */}
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 18, padding: '32px 28px', marginBottom: 32,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
          {ar ? 'الهاتف' : 'Phone'}
        </div>
        <a href="tel:+9647737339919" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: 'var(--brand)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>📞</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--brand)' }} dir="ltr">+964 773 733 9919</div>
            <div style={{ fontSize: 13, color: 'var(--ink4)', marginTop: 3 }}>
              {ar ? 'للاتصال المباشر' : 'Direct line'}
            </div>
          </div>
        </a>
      </div>

      {/* Social */}
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 18, padding: '28px', marginBottom: 40,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
          {ar ? 'وسائل التواصل الاجتماعي' : 'Social Media'}
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <a
            href="https://www.instagram.com/iraqsmcom"
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 18px', borderRadius: 12,
              background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCAF45)',
              color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
            Instagram
          </a>
          <a
            href="https://www.facebook.com/Iraqstockmarket/"
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 18px', borderRadius: 12,
              background: '#1877F2',
              color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
            </svg>
            Facebook
          </a>
        </div>
      </div>

      {/* Topics */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>
          {ar ? 'يمكنك التواصل معنا بخصوص:' : 'Feel free to reach out about:'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {[
            { icon: '🐛', en: 'Bug reports & issues', ar: 'الأخطاء والمشاكل التقنية' },
            { icon: '💡', en: 'Feature suggestions', ar: 'اقتراحات الميزات الجديدة' },
            { icon: '📊', en: 'Data corrections', ar: 'تصحيح البيانات' },
            { icon: '❓', en: 'General inquiries', ar: 'استفسارات عامة' },
            { icon: '🤝', en: 'Partnership inquiries', ar: 'استفسارات الشراكة' },
            { icon: '🔒', en: 'Privacy & legal', ar: 'الخصوصية والمسائل القانونية' },
          ].map(t => (
            <div key={t.en} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--surf)', border: '1px solid var(--line)',
              borderRadius: 10, padding: '12px 14px',
              fontSize: 13, color: 'var(--ink3)', fontWeight: 600,
            }}>
              <span>{t.icon}</span>
              {ar ? t.ar : t.en}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
