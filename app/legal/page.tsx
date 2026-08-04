'use client'

import { useApp } from '@/context/AppContext'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', marginBottom: 12 }}>{title}</h2>
      <div style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--ink3)' }}>{children}</div>
    </div>
  )
}

export default function LegalPage() {
  const { lang } = useApp()
  const ar = lang === 'ar'

  return (
    <div className="terminal-shell app-page prose-page">

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
          {ar ? 'الإطار القانوني' : 'Legal'}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 10px', color: 'var(--ink)' }}>
          {ar ? 'إخلاء المسؤولية والشروط' : 'Disclaimer & Terms'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink5)', margin: 0 }}>
          {ar ? 'آخر تحديث: يونيو 2026' : 'Last updated: June 2026'}
        </p>
      </div>

      {/* Important banner */}
      <div style={{
        background: 'rgba(245,165,36,0.08)', border: '1px solid rgba(245,165,36,0.25)',
        borderRadius: 12, padding: '16px 20px', marginBottom: 36,
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <p style={{ fontSize: 13, color: 'var(--gold)', lineHeight: 1.7, margin: 0, fontWeight: 600 }}>
          {ar
            ? 'IQWealth ليست شركة وساطة مالية مرخصة ولا تقدم نصائح استثمارية. جميع المعلومات على المنصة لأغراض إعلامية وتعليمية فقط.'
            : 'IQWealth is not a licensed brokerage and does not provide investment advice. All information on this platform is for informational and educational purposes only.'}
        </p>
      </div>

      <div style={{ height: 1, background: 'var(--line)', marginBottom: 40 }} />

      {ar ? (
        <>
          <Section title="1. إخلاء المسؤولية الاستثمارية">
            <p>المعلومات الواردة على منصة IQWealth · بما فيها أسعار الأسهم، والتحليلات، والأخبار، وبيانات الشركات · هي لأغراض إعلامية فقط وليست توصيات استثمارية ولا نصيحة مالية.</p>
            <p>لا تعتمد على هذه المعلومات وحدها لاتخاذ قرارات استثمارية. استشر متخصصاً مالياً مؤهلاً قبل الاستثمار.</p>
          </Section>
          <Section title="2. دقة البيانات">
            <p>نسعى لتقديم بيانات دقيقة ومحدّثة، لكننا لا نضمن دقة المعلومات أو اكتمالها أو توقيتها. أسعار الأسهم قد تتأخر أو تختلف عن أسعار السوق الفعلية. لا نتحمل مسؤولية أي خسائر ناجمة عن الاعتماد على بيانات المنصة.</p>
          </Section>
          <Section title="3. حدود المسؤولية">
            <p>لا تتحمل IQWealth أي مسؤولية عن الأضرار المباشرة أو غير المباشرة أو العرضية الناجمة عن استخدام المنصة أو عدم القدرة على استخدامها، بما فيها خسائر الاستثمار أو ضياع البيانات.</p>
          </Section>
          <Section title="4. روابط خارجية">
            <p>قد تحتوي المنصة على روابط لمواقع خارجية. لا نتحمل مسؤولية محتوى هذه المواقع أو ممارساتها في مجال الخصوصية.</p>
          </Section>
          <Section title="5. الملكية الفكرية">
            <p>جميع محتويات المنصة · من تصميم وشعارات ونصوص وكود · محمية بحقوق الملكية الفكرية لصالح IQWealth ما لم يُذكر غير ذلك. لا يحق إعادة نشرها أو نسخها دون إذن مسبق.</p>
          </Section>
          <Section title="6. القانون المطبّق">
            <p>تخضع هذه الشروط لقوانين جمهورية العراق. أي نزاعات تُحسم عبر المحاكم المختصة في جمهورية العراق.</p>
          </Section>
          <Section title="7. التعديلات">
            <p>نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إبلاغ المستخدمين بأي تغييرات جوهرية عبر المنصة. الاستمرار في استخدام المنصة بعد نشر التعديلات يعني قبولك لها.</p>
          </Section>
          <Section title="8. تواصل معنا">
            <p>لأي استفسار قانوني، راسلنا على <a href="mailto:boatlef@gmail.com" style={{ color: 'var(--brand)' }}>boatlef@gmail.com</a>.</p>
          </Section>
        </>
      ) : (
        <>
          <Section title="1. Investment Disclaimer">
            <p>Information provided on IQWealth · including stock prices, analysis, news, and company data · is for informational purposes only and does not constitute investment advice or a financial recommendation.</p>
            <p>Do not rely solely on this information to make investment decisions. Consult a qualified financial professional before investing.</p>
          </Section>
          <Section title="2. Data Accuracy">
            <p>We strive to provide accurate and up-to-date data, but we do not guarantee the accuracy, completeness, or timeliness of information on this platform. Stock prices may be delayed or differ from actual market prices. We accept no liability for any losses arising from reliance on platform data.</p>
          </Section>
          <Section title="3. Limitation of Liability">
            <p>IQWealth shall not be liable for any direct, indirect, or incidental damages arising from the use or inability to use this platform, including investment losses or data loss.</p>
          </Section>
          <Section title="4. External Links">
            <p>The platform may contain links to external websites. We are not responsible for the content or privacy practices of those sites.</p>
          </Section>
          <Section title="5. Intellectual Property">
            <p>All platform content · including design, logos, copy, and code · is the intellectual property of IQWealth unless otherwise stated. Reproduction or republication without prior permission is prohibited.</p>
          </Section>
          <Section title="6. Governing Law">
            <p>These terms are governed by the laws of the Republic of Iraq. Any disputes shall be resolved through competent courts in the Republic of Iraq.</p>
          </Section>
          <Section title="7. Changes to These Terms">
            <p>We reserve the right to modify these terms at any time. Users will be notified of material changes through the platform. Continued use after changes are posted constitutes acceptance of the updated terms.</p>
          </Section>
          <Section title="8. Contact">
            <p>For legal inquiries, email us at <a href="mailto:boatlef@gmail.com" style={{ color: 'var(--brand)' }}>boatlef@gmail.com</a>.</p>
          </Section>
        </>
      )}
    </div>
  )
}
