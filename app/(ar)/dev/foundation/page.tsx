/**
 * Foundation proof sheet — Phase 0.8.
 *
 * Renders the token layer's primitives side by side so token and font drift is
 * visible BEFORE the shell is built on top of them. This is a test surface,
 * not a migrated route: no product page uses these classes, and nothing links
 * here.
 *
 * DELETE THIS ROUTE at the end of the migration, together with the styles it
 * carries. It is noindex and excluded from the sitemap in the meantime.
 */
import type { Metadata } from 'next'
import './foundation.css'

export const metadata: Metadata = {
  title: 'Foundation proof sheet',
  robots: { index: false, follow: false },
  /* No canonical at all — a design-mode proof sheet that is not part of the product,
     so it should not declare itself a duplicate of anything. Left
     unset it inherits the root's, which points at the homepage. */
  alternates: { canonical: null },
}

const ROWS = [
  { sym: 'BBOB', name: 'مصرف بغداد', price: '1.230', chg: '+2.41%', dir: 'up' },
  { sym: 'TASC', name: 'آسياسيل', price: '9.850', chg: '−1.08%', dir: 'down' },
  { sym: 'BNOI', name: 'المصرف الأهلي العراقي', price: '0.420', chg: '+0.00%', dir: 'flat' },
] as const

export default function FoundationPage() {
  return (
    <main className="iq-page fd">
      <header className="fd-head">
        <p className="fd-eyebrow">Phase 0.8 · foundation</p>
        <h1 className="fd-h1">أسعار الأسهم العراقية اليوم</h1>
        <p className="fd-lead">
          هذه صفحة اختبار للطبقة الأساسية: الخطوط، الألوان، الحدود، والحالات.
          لا تعرض بيانات حقيقية.
        </p>
      </header>

      <section className="fd-panel">
        <h2 className="fd-h2">جدول الأسعار</h2>
        <table className="fd-table">
          <thead>
            <tr>
              <th>الرمز</th><th>الشركة</th><th>السعر</th><th>التغير</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(r => (
              <tr key={r.sym}>
                <td><span className="fd-ticker" dir="ltr">{r.sym}</span></td>
                <td>{r.name}</td>
                <td className="fd-num"><bdi>{r.price}</bdi></td>
                <td className={`fd-num fd-${r.dir}`}><bdi>{r.chg}</bdi></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="fd-panel">
        <h2 className="fd-h2">عناصر التحكم</h2>
        <div className="fd-controls">
          <button className="fd-btn is-primary" type="button">عرض السوق</button>
          <button className="fd-btn" type="button">إلغاء</button>
          <button className="fd-btn" type="button" disabled>غير متاح</button>
          <input className="fd-input" placeholder="ابحث عن شركة…" aria-label="بحث" />
          <input className="fd-input" dir="ltr" placeholder="name@example.com" aria-label="Email" />
        </div>
        <p className="fd-hint">
          استخدم <kbd>Tab</kbd> لمعاينة حلقة التركيز.
        </p>
      </section>

      <section className="fd-panel">
        <h2 className="fd-h2">القيم الدلالية</h2>
        <div className="fd-chips">
          <span className="fd-chip is-up"><bdi>+2.41%</bdi> ارتفاع</span>
          <span className="fd-chip is-down"><bdi>−1.08%</bdi> انخفاض</span>
          <span className="fd-chip">—  غير متوفر</span>
          <span className="fd-chip"><bdi>0</bdi> صفر</span>
        </div>
      </section>
    </main>
  )
}
