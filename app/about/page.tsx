import Link from 'next/link'
import { InfoHead, FamilyRow, Plate } from '@/components/info/InfoChrome'
import { EMAIL, PHONE_DISPLAY, PHONE_INTL, mailto } from '@/lib/infoData'
import '@/styles/info.css'

/**
 * /about — من نحن. A direct transplant of the approved page.
 *
 * ── What the page is, and what it must not become ─────────────────────────
 * What is IQWealth, what does it do, why does it exist — concisely. Not a
 * founder story, not a pitch deck, not an SEO wall.
 *
 * The live page is a personal welcome LETTER signed أحمد بلحة, and the letter
 * is KEPT, verbatim. It is the most credible thing on the site: a named person
 * saying this is free, it is for you, and it is not finished yet. The
 * reference file replaces the body with «فقرة تجريبية» placeholders because
 * the design app had no right to the owner's words — this repo does, so the
 * real letter goes back in and the placeholders do not ship.
 *
 * ── Three claims, and only three ──────────────────────────────────────────
 * The letter's three real statements — FREE, DAILY DATA, STILL IN DEVELOPMENT
 * — become a stated strip instead of being buried mid-paragraph. Nothing is
 * added to them: no accuracy guarantee, no real-time claim, no regulatory
 * status, no coverage number, no user count, no founding year, no team.
 *
 * ── The empty slot, deliberately empty ────────────────────────────────────
 * The approved design carries a «من أين تأتي البيانات» section for the data
 * sources and the update methodology. THE PRODUCT HAS NO PUBLISHED
 * METHODOLOGY — no page states where a price comes from, when it updates, or
 * what a figure is derived from. So the section ships as a labelled slot with
 * an honest note and NOTHING under it. The reference's three
 * «عنوان فرعي / نص تجريبي» rows are removed rather than shipped: an empty slot
 * is a question, and three placeholder rows on a live page are a lie about
 * having answered it.
 */
export default function AboutPage() {
  return (
    <main className="in-page in-about iq-page">
      <InfoHead
        eyebrow="من نحن"
        title="أهلاً بك، عزيزي المستثمر"
        standfirst="منصّة مجانية تساعد المستثمر العراقي على اتخاذ قراراته ببيانات يومية."
      />

      {/* The one place in the product that gets to say what it is, so it
          carries the largest drawing in the system — but it stays a PLATE:
          framed, and above the text rather than behind it, so the reading is
          never set on texture. */}
      <Plate scene="about" tier="hero" />

      <div className="in-about-grid">
        <article className="in-body">
          {/* ── The letter · the live page's own words ─────────────────── */}
          <div className="in-letter">
            <p>
              ترحيبٌ خاصٌّ بك، عزيزي المستثمر. أنشأ هذا الموقع <strong>أحمد بلحة</strong>،
              كاتبٌ ماليّ ومستثمرٌ في الأسهم الأمريكية والعراقية.
            </p>
            <p>
              الموقع مجانيّ تماماً، وقد صُمّم لمساعدة المستثمرين العراقيين على اتخاذ قراراتهم.
              لا يزال قيد التطوير وستُضاف إليه ميزاتٌ أكثر بكثير، لكن يمكنك الاعتماد عليه في
              الحصول على معلوماتك اليومية بكل تأكيد.
            </p>
            <p className="in-sign">
              مع كل الشكر،<br />
              <strong>أحمد.</strong>
            </p>
          </div>

          {/* ── The three real claims ──────────────────────────────────── */}
          <section className="in-claims" aria-labelledby="in-claims-h">
            <h2 id="in-claims-h">ما هذه المنصة</h2>
            <dl>
              <div>
                <dt>مجانية</dt>
                <dd>الوصول إلى كل الصفحات دون اشتراك.</dd>
              </div>
              <div>
                <dt>يومية</dt>
                <dd>بيانات الجلسة والشركات تُحدَّث مع كل جلسة تداول.</dd>
              </div>
              <div>
                <dt>قيد التطوير</dt>
                <dd>تُضاف الميزات تباعاً، والقائم عليها معلن.</dd>
              </div>
            </dl>
          </section>

          {/* ── The slot the product has not filled ────────────────────── */}
          <section className="in-principles" aria-labelledby="in-principles-h">
            <h2 id="in-principles-h">من أين تأتي البيانات</h2>
            <p className="in-note">
              هذا القسم مخصّص لمصادر البيانات ومنهجية التحديث. المحتوى النهائي
              يُكتب لاحقاً.
            </p>
          </section>

          {/* ── One way onward ─────────────────────────────────────────── */}
          <section className="in-reach" aria-labelledby="in-reach-h">
            <h2 id="in-reach-h">للتواصل</h2>
            <p className="in-reach-rows">
              <a href={mailto()} dir="ltr">{EMAIL}</a>
              <a href={`tel:${PHONE_INTL}`} dir="ltr">{PHONE_DISPLAY}</a>
            </p>
            <Link className="in-reach-go" href="/contact">
              كل طرق التواصل <i aria-hidden="true">‹</i>
            </Link>
          </section>

          <FamilyRow current="/about" />
        </article>
      </div>
    </main>
  )
}
