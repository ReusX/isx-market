'use client'

import { useApp } from '@/context/AppContext'

export default function AboutPage() {
  const { lang } = useApp()
  const ar = lang === 'ar'

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
          {ar ? 'من نحن' : 'About Us'}
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.2, margin: '0 0 16px', color: 'var(--ink)' }}>
          {ar ? 'بنيناها لأننا كنا نحتاجها' : 'We Built It Because We Needed It'}
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink3)', lineHeight: 1.8, margin: 0 }}>
          {ar
            ? 'منصة الاستثمار في بورصة العراق — بيانات حية، تحليل موضوعي، لا تعقيد.'
            : 'Iraq Stock Exchange platform — live data, honest analysis, zero noise.'}
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--line)', marginBottom: 40 }} />

      {ar ? (
        /* ── Arabic content ── */
        <div style={{ fontSize: 16, lineHeight: 1.95, color: 'var(--ink2)' }}>
          <p>
            نحن مجموعة من المستثمرين المستقلين اكتشفنا بالتجربة أن الاستثمار في بورصة العراق أصعب مما ينبغي. معلومات متناثرة، أدوات متقادمة، ولا دعم حقيقي للمبتدئين. فقررنا أن نبني المنصة التي كنا نتمنى وجودها.
          </p>
          <p>
            <strong style={{ color: 'var(--ink)' }}>ISX Market</strong> منصة بناها مستثمرون لمستثمرين. نتابع أسعار الأسهم العراقية لحظة بلحظة، ونرصد الأخبار التي تحرك السوق فعلاً، ونوفر أدوات البحث والتحليل التي تحتاجها لتتخذ قراراتك بثقة. سواء كنت تضع أولى استثماراتك أو تدير محفظة متكاملة، هذا هو مقرك الأساسي.
          </p>
          <p>
            العراق واحدة من أكثر قصص الاستثمار إثارة في المنطقة وأقلها انتباهاً. شعب شاب، بنية تحتية في طور إعادة البناء، وسوق مالي لا يزال بعيداً عن أعين كثير من المستثمرين الإقليميين والدوليين. الإمكانات حقيقية، والعائق الوحيد كان دائماً هو صعوبة الوصول.
          </p>
          <p>
            نحن هنا لإزالة هذا العائق. لا تعقيد، لا ضجيج، فقط بيانات دقيقة وتحليل موضوعي. السوق العراقي في نمو مستمر، ونريدك أن تكون جزءاً من هذا النمو.
          </p>
        </div>
      ) : (
        /* ── English content ── */
        <div style={{ fontSize: 16, lineHeight: 1.95, color: 'var(--ink2)' }}>
          <p>
            We are independent investors who found out the hard way that navigating the Iraqi Stock Exchange is harder than it needs to be. Outdated tools, scattered information, zero hand-holding for newcomers. So we built the thing we wished existed.
          </p>
          <p>
            <strong style={{ color: 'var(--ink)' }}>ISX Market</strong> is a platform built by investors, for investors. We track live prices on the Iraq Stock Exchange, surface the news that actually moves markets, and give you the research tools to make decisions with confidence. Whether you are putting in your first dinar or managing a serious position, this is your home base.
          </p>
          <p>
            Iraq is one of the most underrated investment stories in the region. A young population, rebuilding infrastructure, a stock market that most outsiders have never touched. The upside is real. The friction has just always been too high.
          </p>
          <p>
            We are here to fix that. No gatekeeping, no noise, just clean data and honest analysis. The Iraqi market is growing. We want you to grow with it.
          </p>
        </div>
      )}

      {/* Values grid */}
      <div style={{ marginTop: 56 }}>
        <div style={{ height: 1, background: 'var(--line)', marginBottom: 40 }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 24 }}>
          {ar ? 'مبادئنا' : 'Our Principles'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { icon: '📊', en: 'Accuracy First', ar: 'الدقة أولاً', descEn: 'Data straight from official ISX sources. No estimates, no guesses.', descAr: 'بيانات مباشرة من بورصة العراق. لا تقديرات، لا تخمينات.' },
            { icon: '🔓', en: 'No Gatekeeping', ar: 'لا حواجز', descEn: 'Everything on this platform is free to use. Knowledge belongs to everyone.', descAr: 'كل ما على المنصة مجاني. المعرفة للجميع.' },
            { icon: '🧭', en: 'Investor-Led', ar: 'بيد المستثمرين', descEn: 'We use this platform ourselves. Every feature exists because we needed it.', descAr: 'نستخدم المنصة بأنفسنا. كل ميزة موجودة لأننا احتجناها.' },
            { icon: '🌱', en: 'Built for Growth', ar: 'بُني للنمو', descEn: 'As the Iraqi market grows, this platform grows with it.', descAr: 'مع نمو السوق العراقي، تنمو المنصة معه.' },
          ].map(v => (
            <div key={v.en} style={{
              background: 'var(--surf)', border: '1px solid var(--line)',
              borderRadius: 14, padding: '20px 18px',
            }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{v.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 6 }}>
                {ar ? v.ar : v.en}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.65 }}>
                {ar ? v.descAr : v.descEn}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
