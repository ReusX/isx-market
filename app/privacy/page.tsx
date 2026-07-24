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

export default function PrivacyPage() {
  const { lang } = useApp()
  const ar = lang === 'ar'

  return (
    <div className="terminal-shell app-page prose-page">

      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
          {ar ? 'سياسة الخصوصية' : 'Privacy Policy'}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 10px', color: 'var(--ink)' }}>
          {ar ? 'كيف نتعامل مع بياناتك' : 'How We Handle Your Data'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink5)', margin: 0 }}>
          {ar ? 'آخر تحديث: يونيو 2026' : 'Last updated: June 2026'}
        </p>
      </div>
      <div style={{ height: 1, background: 'var(--line)', marginBottom: 40 }} />

      {ar ? (
        <>
          <Section title="المعلومات التي نجمعها">
            <p>عند إنشاء حساب، نجمع عنوان بريدك الإلكتروني واسم المستخدم الذي تختاره. لا نطلب بيانات مالية حقيقية كأرقام الحسابات البنكية أو بيانات البطاقات الائتمانية.</p>
            <p>نجمع أيضاً تفضيلاتك على المنصة، مثل قوائم المتابعة وتفضيل اللغة.</p>
          </Section>
          <Section title="كيف نستخدم بياناتك">
            <ul style={{ paddingInlineStart: 20, margin: 0 }}>
              <li style={{ marginBottom: 8 }}>تشغيل حسابك وحفظ قوائم المتابعة والتفضيلات</li>
              <li style={{ marginBottom: 8 }}>تحسين تجربة المنصة وإصلاح الأخطاء</li>
              <li style={{ marginBottom: 8 }}>تواصلنا معك بخصوص حسابك عند الضرورة</li>
            </ul>
          </Section>
          <Section title="مشاركة البيانات">
            <p>لا نبيع بياناتك ولا نشاركها مع أطراف خارجية بغرض التسويق. نستخدم Supabase لتخزين البيانات بشكل آمن. قد نستخدم خدمات تحليل مجهولة الهوية لفهم أنماط الاستخدام العامة.</p>
          </Section>
          <Section title="ملفات الكوكيز">
            <p>نستخدم ملفات كوكيز ضرورية فقط للحفاظ على جلسة تسجيل الدخول وحفظ تفضيل اللغة. لا نستخدم كوكيز تتبع من أطراف خارجية.</p>
          </Section>
          <Section title="أمان البيانات">
            <p>جميع البيانات مشفرة أثناء النقل (HTTPS). كلمات المرور لا يتم تخزينها بأي شكل قابل للقراءة · نعتمد على Supabase Auth للمصادقة الآمنة.</p>
          </Section>
          <Section title="حذف الحساب">
            <p>يمكنك طلب حذف حسابك وجميع بياناتك في أي وقت بالتواصل معنا على <a href="mailto:boatlef@gmail.com" style={{ color: 'var(--brand)' }}>boatlef@gmail.com</a>. سنعالج طلبك خلال 7 أيام عمل.</p>
          </Section>
          <Section title="تواصل معنا">
            <p>لأي استفسار يتعلق بخصوصيتك، راسلنا على <a href="mailto:boatlef@gmail.com" style={{ color: 'var(--brand)' }}>boatlef@gmail.com</a>.</p>
          </Section>
        </>
      ) : (
        <>
          <Section title="Information We Collect">
            <p>When you create an account, we collect your email address and the username you choose. We do not request real financial data such as bank account numbers or credit card details.</p>
            <p>We also store your platform preferences, such as your watchlists and language preference.</p>
          </Section>
          <Section title="How We Use Your Data">
            <ul style={{ paddingInlineStart: 20, margin: 0 }}>
              <li style={{ marginBottom: 8 }}>Running your account and saving your watchlists and preferences</li>
              <li style={{ marginBottom: 8 }}>Improving the platform and fixing bugs</li>
              <li style={{ marginBottom: 8 }}>Contacting you about your account when necessary</li>
            </ul>
          </Section>
          <Section title="Data Sharing">
            <p>We do not sell your data or share it with third parties for marketing purposes. We use Supabase to store data securely. We may use anonymized analytics services to understand general usage patterns.</p>
          </Section>
          <Section title="Cookies">
            <p>We use only essential cookies to maintain your login session and save your language preference. We do not use third-party tracking cookies.</p>
          </Section>
          <Section title="Data Security">
            <p>All data is encrypted in transit (HTTPS). Passwords are never stored in readable form · we rely on Supabase Auth for secure authentication.</p>
          </Section>
          <Section title="Account Deletion">
            <p>You can request deletion of your account and all associated data at any time by contacting us at <a href="mailto:boatlef@gmail.com" style={{ color: 'var(--brand)' }}>boatlef@gmail.com</a>. We will process your request within 7 business days.</p>
          </Section>
          <Section title="Contact">
            <p>For any privacy-related questions, email us at <a href="mailto:boatlef@gmail.com" style={{ color: 'var(--brand)' }}>boatlef@gmail.com</a>.</p>
          </Section>
        </>
      )}
    </div>
  )
}
