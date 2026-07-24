'use client'

import { useApp } from '@/context/AppContext'

export default function AboutPage() {
  const { lang } = useApp()
  const ar = lang === 'ar'

  return (
    <div className="terminal-shell app-page prose-page">

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
          {ar ? 'من نحن' : 'About'}
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.2, margin: '0 0 16px', color: 'var(--ink)' }}>
          {ar ? 'أهلاً بك، عزيزي المستثمر' : 'Welcome, Dear Investor'}
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink3)', lineHeight: 1.8, margin: 0 }}>
          {ar
            ? 'منصّة مجانية تساعد المستثمر العراقي على اتخاذ قراراته ببيانات يومية موثوقة.'
            : 'A free platform helping Iraqi investors decide · with reliable daily data.'}
        </p>
      </div>

      <div style={{ height: 1, background: 'var(--line)', marginBottom: 40 }} />

      {/* Welcome letter */}
      <div style={{ fontSize: 16.5, lineHeight: 2, color: 'var(--ink2)' }}>
        {ar ? (
          <>
            <p>
              ترحيبٌ خاصٌّ بك، عزيزي المستثمر. أنشأ هذا الموقع <strong style={{ color: 'var(--ink)' }}>أحمد بلحة</strong>،
              كاتبٌ ماليّ ومستثمرٌ في الأسهم الأمريكية والعراقية.
            </p>
            <p>
              الموقع مجانيّ تماماً، وقد صُمّم لمساعدة المستثمرين العراقيين على اتخاذ قراراتهم. لا يزال قيد التطوير
              وستُضاف إليه ميزاتٌ أكثر بكثير، لكن يمكنك الاعتماد عليه في الحصول على معلوماتك اليومية بكل تأكيد.
            </p>
            <p style={{ marginTop: 28 }}>
              مع كل الشكر،<br />
              <strong style={{ color: 'var(--ink)' }}>أحمد.</strong>
            </p>
          </>
        ) : (
          <>
            <p>
              A special welcome to you, our dear investor. This website was created by{' '}
              <strong style={{ color: 'var(--ink)' }}>Ahmed Balaha</strong>, a finance writer and investor in
              US and Iraqi equities.
            </p>
            <p>
              The site is completely free and designed to help Iraqi investors make their decisions. It is still
              under development and many more features will be added · but you can rely on it for your daily
              information, for sure.
            </p>
            <p style={{ marginTop: 28 }}>
              With all thanks,<br />
              <strong style={{ color: 'var(--ink)' }}>Ahmed.</strong>
            </p>
          </>
        )}
      </div>

      {/* Contact card */}
      <div style={{
        marginTop: 40, background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 16, padding: '22px 24px',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
          {ar ? 'للتواصل' : 'Contact'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <a href="mailto:boatlef@gmail.com" style={contactRow}>
            <span style={iconWrap}>✉️</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14.5, color: 'var(--ink)' }} dir="ltr">boatlef@gmail.com</span>
          </a>
          <a href="tel:+9647737339919" style={contactRow}>
            <span style={iconWrap}>📞</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14.5, color: 'var(--ink)' }} dir="ltr">+964 773 733 9919</span>
          </a>
        </div>
      </div>

    </div>
  )
}

const contactRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
}
const iconWrap: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 9, background: 'var(--surf2)',
  border: '1px solid var(--line)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', fontSize: 16, flexShrink: 0,
}
