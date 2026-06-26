import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'تعلم تداول الأسهم من الصفر · دليل المبتدئين في بورصة العراق',
  description: 'دليل شامل لتعلم تداول الأسهم من الصفر في بورصة العراق · كيف تبدأ الاستثمار، كيف تقرأ الأسعار، وما الفرق بين التداول والاستثمار. خطوات عملية للمبتدئين.',
  alternates: { canonical: 'https://iraqsm.com/learn/trading-from-zero' },
  openGraph: {
    url: 'https://iraqsm.com/learn/trading-from-zero',
    title: 'تعلم تداول الأسهم من الصفر | بورصة العراق ISX',
    description: 'دليل المبتدئين الشامل لتعلم تداول الأسهم في بورصة العراق.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

const sections = [
  {
    title: 'ما هي بورصة العراق للأوراق المالية؟',
    body: `بورصة العراق للأوراق المالية (ISX - Iraq Stock Exchange) هي السوق الرسمي لتداول أسهم الشركات العراقية المدرجة. تأسست عام 2004 وتضم أكثر من 100 شركة مدرجة في قطاعات متعددة: المصارف، الصناعة، الاتصالات، الاستثمار، التأمين، والزراعة.

يُقاس أداء السوق بشكل عام عبر مؤشر ربيع للأوراق المالية (RSISX)، الذي يتتبع أداء الأسهم المدرجة ويعكس صحة الاقتصاد العراقي.`,
  },
  {
    title: 'الفرق بين التداول والاستثمار',
    body: `التداول (Trading): شراء وبيع الأسهم في فترات قصيرة (أيام أو أسابيع) بهدف الاستفادة من تذبذب الأسعار. يتطلب متابعة يومية وخبرة في قراءة المخططات.

الاستثمار (Investing): شراء أسهم والاحتفاظ بها لسنوات بهدف تنمية رأس المال وتحقيق عوائد على المدى البعيد. يناسب المبتدئين أكثر من التداول النشط.

للمبتدئين، يُنصح بالبدء بعقلية المستثمر طويل الأمد قبل الانتقال للتداول النشط.`,
  },
  {
    title: 'كيف تبدأ في بورصة العراق؟',
    body: `الخطوة 1 · اختر شركة وساطة مرخصة:
تحتاج إلى فتح حساب لدى شركة وساطة مالية مرخصة من هيئة الأوراق المالية العراقية. تتوفر عدة شركات وساطة معتمدة في بغداد والمحافظات.

الخطوة 2 · أودع رأس المال:
لا يوجد حد أدنى قانوني، لكن يُنصح البدء بمبلغ لا تتحمل خسارته أثناء مرحلة التعلم.

الخطوة 3 · اختر الأسهم:
ابدأ بدراسة أسهم الشركات التي تعرفها · المصارف الكبيرة، شركات الاتصالات، الشركات الصناعية الراسخة.

الخطوة 4 · تابع السوق:
استخدم منصة ISX Market لمتابعة أسعار الأسهم مباشرة، وقراءة الأخبار، ومشاهدة المخططات.`,
  },
  {
    title: 'كيف تقرأ سعر السهم؟',
    body: `سعر الإغلاق (Close): آخر سعر تم تداول السهم به في جلسة التداول.

التغيير اليومي: الفرق بين سعر اليوم وسعر الأمس · الرقم الأخضر يعني ارتفاعاً، الأحمر يعني انخفاضاً.

حجم التداول (Volume): عدد الأسهم المتداولة في الجلسة · الحجم الكبير يعني اهتماماً أكبر بالسهم.

القيمة السوقية (Market Cap): إجمالي قيمة الشركة = عدد الأسهم × سعر السهم.

مكرر الربح (P/E): مقياس لغلاء أو رخص السهم مقارنةً بأرباح الشركة. كلما كان أقل، كلما كان السهم أرخص نسبياً.`,
  },
  {
    title: 'قطاعات بورصة العراق',
    body: `تنقسم الشركات المدرجة في بورصة العراق إلى عدة قطاعات رئيسية:

• القطاع المصرفي: الأكبر والأكثر سيولة · يضم أكثر من 40 مصرفاً تجارياً وإسلامياً.
• قطاع الاتصالات: يضم شركات كبيرة مثل آسياسيل والخاتم للاتصالات.
• القطاع الصناعي: شركات الأغذية والمشروبات والمواد الإنشائية.
• قطاع الاستثمار: شركات تُدير محافظ استثمارية متنوعة.
• قطاع الفنادق والسياحة.
• قطاع التأمين.`,
  },
  {
    title: 'نصائح للمبتدئ في بورصة العراق',
    body: `1. لا تستثمر أكثر مما تستطيع تحمّل خسارته
الأسواق تتذبذب، والخسائر جزء طبيعي من الاستثمار. استثمر فقط ما هو فائض عن حاجتك اليومية.

2. تنوّع في القطاعات
لا تضع كل أموالك في قطاع واحد. وزّع استثماراتك بين المصارف والاتصالات والصناعة.

3. فكّر على المدى البعيد
أسعار بورصة العراق تتأثر بالأحداث السياسية والاقتصادية. المستثمر الصبور يحصد أفضل النتائج.

4. اقرأ التقارير المالية
الشركات المدرجة ملزمة بنشر تقاريرها المالية. ابحث عن الشركات ذات الأرباح المتنامية.

5. تابع مؤشر RSISX
مؤشر السوق العام يعطيك صورة عن الاتجاه العام · صعود أم هبوط.`,
  },
]

export default function TradingFromZeroPage() {
  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '24px 16px 80px' }}>

      <div style={{ marginBottom: 16 }}>
        <Link href="/learn" style={{ fontSize: 13, color: 'var(--ink4)', textDecoration: 'none' }}>
          ← تعلّم
        </Link>
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 99, marginBottom: 14,
        background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
        fontSize: 11, fontWeight: 700, color: '#818CF8',
      }}>
        📚 تعلّم
      </div>

      <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.35, marginBottom: 10 }}>
        تعلم تداول الأسهم من الصفر · دليل المبتدئين في بورصة العراق
      </h1>

      <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 32, lineHeight: 1.7 }}>
        هل تريد الاستثمار في بورصة العراق لكنك لا تعرف من أين تبدأ؟ هذا الدليل يشرح كل ما تحتاج معرفته
        من الصفر · من مفهوم التداول وحتى أول صفقة.
      </p>

      {/* Table of contents */}
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 12, padding: '16px 20px', marginBottom: 36,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--ink3)' }}>محتويات المقال</div>
        <ol style={{ margin: 0, padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sections.map((s, i) => (
            <li key={i} style={{ fontSize: 13, color: 'var(--brand)' }}>{s.title}</li>
          ))}
        </ol>
      </div>

      {/* Article sections */}
      <div className="wp-content" style={{ fontSize: 15, lineHeight: 1.85 }}>
        {sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--ink)' }}>
              {i + 1}. {s.title}
            </h2>
            {s.body.split('\n\n').map((para, j) => (
              <p key={j} style={{ marginBottom: 12, color: 'var(--ink2)', whiteSpace: 'pre-line' }}>
                {para}
              </p>
            ))}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(59,130,246,0.1))',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: 14, padding: '24px', marginTop: 40, textAlign: 'center',
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>ابدأ بمتابعة السوق الآن</div>
        <p style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 16 }}>
          تابع أسعار الأسهم العراقية مباشرة، وتدرّب على قراءة المخططات
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/market" style={{
            padding: '9px 20px', borderRadius: 9, background: 'var(--brand)',
            color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none',
          }}>
            السوق المباشر
          </Link>
          <Link href="/companies" style={{
            padding: '9px 20px', borderRadius: 9, background: 'var(--surf)',
            border: '1px solid var(--line)', color: 'var(--ink2)', fontWeight: 700, fontSize: 13, textDecoration: 'none',
          }}>
            استعرض الشركات
          </Link>
        </div>
      </div>
    </div>
  )
}
