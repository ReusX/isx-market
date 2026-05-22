'use client'

import { useApp } from '@/context/AppContext'
import { fmtPts } from '@/lib/ranks'

const EARN_METHODS = [
  { icon: '🎰', en: 'Daily Spin', ar: 'العجلة اليومية', descEn: 'Spin once every 24 hours. Win between 50 and 5,000 points per spin. Land on ×2 to double your balance.', descAr: 'أدر العجلة مرة كل 24 ساعة. اربح بين 50 و5,000 نقطة لكل دورة. وإذا أصبت ×2 فستضاعف رصيدك.' },
  { icon: '🔥', en: 'Daily Streak', ar: 'التسلسل اليومي', descEn: 'Spin on consecutive days to build a streak. The longer your streak, the bigger your rewards on future spins.', descAr: 'أدر العجلة أياماً متتالية لبناء تسلسل. كلما طال تسلسلك، زادت مكافآتك في الدورات القادمة.' },
  { icon: '📈', en: 'Trading Activity', ar: 'نشاط التداول', descEn: 'Earn 1 point for every 100,000 IQD worth of shares traded. Buy or sell — both count.', descAr: 'اكسب نقطة واحدة لكل 100,000 دينار من الأسهم المُتداوَلة. الشراء والبيع كلاهما محسوب.' },
  { icon: '🏆', en: 'Quests & Missions', ar: 'المهام والتحديات', descEn: 'Complete missions to earn bonus points. Check the Quests page for active challenges.', descAr: 'أكمل المهام لكسب نقاط إضافية. تحقق من صفحة المهام للتحديات النشطة.' },
]

const SPEND_METHODS = [
  { icon: '🏢', en: 'Buy Company Shares', ar: 'شراء أسهم الشركات', descEn: 'Use your points to buy shares in any ISX-listed company. 1 point = 1 IQD. Your holdings appear in your wallet.', descAr: 'استخدم نقاطك لشراء أسهم أي شركة مدرجة في بورصة العراق. 1 نقطة = 1 دينار عراقي. تظهر ممتلكاتك في محفظتك.' },
  { icon: '💸', en: 'Withdraw to Cash', ar: 'سحب نقداً', descEn: 'Redeem points for real cash once you hit 100,000 points minimum. Paid via Zaincash, First Iraq Bank, or Qi Card.', descAr: 'استبدل نقاطك بمبالغ نقدية حقيقية عند بلوغك 100,000 نقطة على الأقل. الدفع عبر زين كاش أو مصرف الرافدين أو بطاقة QI.' },
]

const PAYMENT_METHODS = [
  {
    id: 'zaincash',
    name: 'Zaincash',
    nameAr: 'زين كاش',
    logo: '📱',
    descEn: 'Iraq\'s leading mobile wallet. Instant transfer to your Zaincash number.',
    descAr: 'المحفظة الرقمية الأولى في العراق. تحويل فوري إلى رقم زين كاش الخاص بك.',
    color: '#7B2FBE',
  },
  {
    id: 'fib',
    name: 'First Iraq Bank',
    nameAr: 'المصرف العراقي الأول',
    logo: '🏦',
    descEn: 'Direct bank transfer to your First Iraq Bank account.',
    descAr: 'تحويل مصرفي مباشر إلى حسابك في المصرف العراقي الأول.',
    color: '#0A7C4E',
  },
  {
    id: 'qicard',
    name: 'Qi Card',
    nameAr: 'بطاقة QI',
    logo: '💳',
    descEn: 'Transfer to your Qi Card — Iraq\'s largest national prepaid card network.',
    descAr: 'تحويل إلى بطاقة QI — أكبر شبكة بطاقات مدفوعة مسبقاً في العراق.',
    color: '#B5001E',
  },
]

export default function PointsPage() {
  const { lang } = useApp()
  const ar = lang === 'ar'

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
          {ar ? 'نظام النقاط' : 'Points System'}
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.2, margin: '0 0 14px', color: 'var(--ink)' }}>
          {ar ? 'اكسب، استثمر، واسحب' : 'Earn, Invest & Withdraw'}
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink3)', lineHeight: 1.7, margin: 0 }}>
          {ar
            ? 'النقاط هي عملة المنصة. اكسبها يومياً، استخدمها لشراء أسهم حقيقية، أو استبدلها بمبالغ نقدية.'
            : 'Points are the platform currency. Earn them daily, use them to buy real shares, or cash them out.'}
        </p>
      </div>

      {/* Key fact */}
      <div style={{
        background: 'rgba(245,200,75,0.08)', border: '1px solid rgba(245,200,75,0.25)',
        borderRadius: 14, padding: '18px 24px', marginBottom: 48,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'var(--gold-grad)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 800, color: '#5a3a00', flexShrink: 0, fontFamily: 'serif',
        }}>د.ع</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--gold)' }}>
            {ar ? '1 نقطة = 1 دينار عراقي' : '1 Point = 1 Iraqi Dinar (IQD)'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink4)', marginTop: 4 }}>
            {ar ? 'ثابت دائماً — لا رسوم تحويل عند الشراء.' : 'Always fixed — no conversion fees on purchases.'}
          </div>
        </div>
      </div>

      {/* Earn */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', marginBottom: 20 }}>
          {ar ? '💡 كيف تكسب النقاط' : '💡 How to Earn Points'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {EARN_METHODS.map(m => (
            <div key={m.en} style={{
              background: 'var(--surf)', border: '1px solid var(--line)',
              borderRadius: 14, padding: '18px 16px',
            }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{m.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 6 }}>
                {ar ? m.ar : m.en}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.65 }}>
                {ar ? m.descAr : m.descEn}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Spend */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', marginBottom: 20 }}>
          {ar ? '🛒 كيف تستخدم النقاط' : '🛒 How to Use Points'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {SPEND_METHODS.map(m => (
            <div key={m.en} style={{
              background: 'var(--surf)', border: '1px solid var(--line)',
              borderRadius: 14, padding: '18px 16px',
            }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{m.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 6 }}>
                {ar ? m.ar : m.en}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.65 }}>
                {ar ? m.descAr : m.descEn}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Withdrawal section */}
      <div style={{
        background: 'var(--surf)', border: '1px solid var(--line)',
        borderRadius: 18, padding: '32px 28px', marginBottom: 48,
      }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)', margin: '0 0 8px' }}>
          {ar ? '💸 كيفية سحب نقاطك' : '💸 How to Withdraw Your Points'}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--ink4)', margin: '0 0 28px', lineHeight: 1.6 }}>
          {ar
            ? 'بمجرد وصولك إلى الحد الأدنى، يمكنك سحب نقاطك كمبالغ نقدية حقيقية.'
            : 'Once you reach the minimum threshold, you can cash out your points for real money.'}
        </p>

        {/* Minimum */}
        <div style={{
          background: 'rgba(99,179,113,0.08)', border: '1px solid rgba(99,179,113,0.25)',
          borderRadius: 12, padding: '14px 18px', marginBottom: 28,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 24 }}>🏁</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--up)' }}>
              {ar ? 'الحد الأدنى للسحب: 100,000 نقطة' : 'Minimum Withdrawal: 100,000 Points'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 3 }}>
              {ar ? '= 100,000 دينار عراقي نقداً' : '= 100,000 IQD in cash'}
            </div>
          </div>
        </div>

        {/* Steps */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>
            {ar ? 'خطوات السحب:' : 'Withdrawal Steps:'}
          </div>
          {[
            { en: 'Reach 100,000 points minimum in your wallet.', ar: 'اجمع 100,000 نقطة على الأقل في محفظتك.' },
            { en: 'Go to Wallet → Request Withdrawal.', ar: 'اذهب إلى المحفظة ← طلب سحب.' },
            { en: 'Choose your payment method and enter your details.', ar: 'اختر طريقة الدفع وأدخل بياناتك.' },
            { en: 'We process withdrawals within 3–5 business days.', ar: 'نعالج طلبات السحب خلال 3–5 أيام عمل.' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: 'var(--brand)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0, marginTop: 1,
              }}>{i + 1}</div>
              <div style={{ fontSize: 13, color: 'var(--ink3)', lineHeight: 1.6 }}>{ar ? s.ar : s.en}</div>
            </div>
          ))}
        </div>

        {/* Payment methods */}
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>
          {ar ? 'طرق الدفع المتاحة:' : 'Available Payment Methods:'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {PAYMENT_METHODS.map(pm => (
            <div key={pm.id} style={{
              background: 'var(--surf2)', border: `1px solid ${pm.color}33`,
              borderRadius: 12, padding: '14px 16px',
              borderInlineStart: `3px solid ${pm.color}`,
            }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{pm.logo}</div>
              <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--ink)', marginBottom: 4 }}>
                {ar ? pm.nameAr : pm.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink4)', lineHeight: 1.6 }}>
                {ar ? pm.descAr : pm.descEn}
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: 'var(--ink5)', marginTop: 20, marginBottom: 0, lineHeight: 1.6 }}>
          {ar
            ? '* طلبات السحب مراجعة يدوية. نحتفظ بحق رفض الطلبات المشبوهة. النقاط المكتسبة من النشاط الطبيعي فقط مؤهلة للسحب.'
            : '* Withdrawal requests are manually reviewed. We reserve the right to reject suspicious requests. Only points earned through normal activity are eligible for withdrawal.'}
        </p>
      </div>

      {/* Ranks */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', marginBottom: 20 }}>
          {ar ? '🏅 المستويات والرتب' : '🏅 Ranks & Levels'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {[
            { icon: '🌱', en: 'Seedling',   ar: 'ناشئ',        pts: '0 – 999',       color: '#6BBF77' },
            { icon: '🥉', en: 'Bronze',     ar: 'برونزي',       pts: '1,000+',        color: '#CD7F32' },
            { icon: '🥈', en: 'Silver',     ar: 'فضي',          pts: '5,000+',        color: '#A8A9AD' },
            { icon: '🥇', en: 'Gold',       ar: 'ذهبي',         pts: '15,000+',       color: '#F5C84B' },
            { icon: '💎', en: 'Diamond',    ar: 'ألماسي',       pts: '50,000+',       color: '#00D4FF' },
            { icon: '👑', en: 'Legend',     ar: 'أسطورة',       pts: '150,000+',      color: '#E040FB' },
          ].map(r => (
            <div key={r.en} style={{
              background: 'var(--surf)', border: `1px solid ${r.color}44`,
              borderRadius: 12, padding: '14px 12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>{r.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: r.color, marginBottom: 4 }}>
                {ar ? r.ar : r.en}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink5)', fontFamily: 'var(--font-mono)' }}>{r.pts}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', marginBottom: 20 }}>
          {ar ? '❓ أسئلة شائعة' : '❓ Frequently Asked Questions'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            {
              q: { en: 'Do points expire?', ar: 'هل تنتهي صلاحية النقاط؟' },
              a: { en: 'No. Points never expire as long as your account is active.', ar: 'لا. النقاط لا تنتهي صلاحيتها طالما حسابك نشط.' },
            },
            {
              q: { en: 'Can I transfer points to another user?', ar: 'هل يمكنني نقل النقاط لمستخدم آخر؟' },
              a: { en: 'Not currently. Points are tied to your account only.', ar: 'ليس حالياً. النقاط مرتبطة بحسابك فقط.' },
            },
            {
              q: { en: 'Is the share buying real or simulated?', ar: 'هل شراء الأسهم حقيقي أم افتراضي؟' },
              a: { en: 'Buying shares with points is a simulated investment tracked on our platform. It does not execute real trades on the ISX exchange.', ar: 'شراء الأسهم بالنقاط هو استثمار افتراضي يُتتبع على منصتنا. لا تُنفَّذ صفقات حقيقية في بورصة العراق.' },
            },
            {
              q: { en: 'How long do withdrawals take?', ar: 'كم يستغرق السحب؟' },
              a: { en: '3 to 5 business days after your request is approved.', ar: 'من 3 إلى 5 أيام عمل بعد الموافقة على طلبك.' },
            },
          ].map((f, i) => (
            <div key={i} style={{
              background: 'var(--surf)', border: '1px solid var(--line)',
              borderRadius: 12, padding: '16px 18px',
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 8 }}>
                {ar ? f.q.ar : f.q.en}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink4)', lineHeight: 1.65 }}>
                {ar ? f.a.ar : f.a.en}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
