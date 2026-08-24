'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { usePortfolio } from '@/lib/portfolio'
import { arFull } from '@/lib/statistics'
import '@/styles/panels.css'
// The signed-out state reuses the portfolio's empty-state pieces (`.pf-empty`,
// `.pf-add`), which is what the approved design does too.
import '@/app/portfolio/portfolio.css'
import './profile.css'

/**
 * حسابي — a direct port of the approved account page.
 *
 * Deliberately the smallest page in the product: the account layer supports
 * six things and this styles those six and nothing else. Every row below is
 * backed by something production actually does —
 *
 *   username       `profiles.username`, UNIQUE, so «الاسم مستخدم» is a real
 *                  failure and is reported from the database's own error
 *   email          read from the auth session · DISPLAY ONLY, because no
 *                  email-change interface exists
 *   password       `resetPasswordForEmail` → a link to /auth/reset
 *   language       `useApp().setLang`
 *   theme          `useApp().toggleTheme`
 *   referral code  `profiles.referral_code`, UNIQUE and copyable
 *   sign out       `supabase.auth.signOut()`
 *
 * There is NO notification section, NO alert preferences, NO two-factor, NO
 * session management, NO data export and NO account deletion, because none of
 * those exist. The page says so once, plainly, rather than rendering five
 * controls that do nothing — and account deletion in particular is a real
 * backend gap: `profiles` has no DELETE policy and there is no server action,
 * so wiring a client delete would either fail or need RLS weakened.
 */

const SECTIONS = [
  { id: 'account', label: 'الحساب', hint: 'الاسم والبريد وكلمة المرور' },
  { id: 'prefs', label: 'التفضيلات', hint: 'اللغة والمظهر' },
  { id: 'data', label: 'بياناتي', hint: 'القوائم والمحفظة ورمز الدعوة' },
] as const
type SectionId = (typeof SECTIONS)[number]['id']

const LANGUAGES = [
  { id: 'ar', label: 'العربية', note: 'الاتجاه من اليمين إلى اليسار' },
  { id: 'en', label: 'English', note: 'Left-to-right' },
] as const
/* Two options, not three: `toggleTheme` writes 'light' or 'dark' and there is
   no prefers-color-scheme branch anywhere, so «تلقائي» would do nothing. */
const THEMES = [
  { id: 'light', label: 'فاتح' },
  { id: 'dark', label: 'داكن' },
] as const

export default function ProfileClient() {
  const { lang, setLang, theme, toggleTheme, user, profile, authLoading, refreshProfile, signOut, openAuth } = useApp()
  const { lots } = usePortfolio()

  const [section, setSection] = useState<SectionId>('account')
  const [openPanel, setOpenPanel] = useState<SectionId | null>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { setName(profile?.username ?? '') }, [profile?.username])

  const email = (user?.email as string | undefined) ?? null
  const mark = (profile?.username || email || '؟').trim().charAt(0).toUpperCase()
  const watchCount = profile?.watchlist?.length ?? 0

  const positions = useMemo(
    () => new Set(lots.map(l => l.sym)).size, [lots])

  async function saveName() {
    const v = name.trim()
    if (!v || v === profile?.username) { setEditing(false); return }
    if (v.length < 2) { setNameError('الاسم قصير جداً.'); return }
    setSaving(true); setNameError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { error } = await createClient().from('profiles').update({ username: v }).eq('id', user!.id)
      if (error) {
        // The UNIQUE constraint is the only real failure this column has.
        setNameError(error.code === '23505'
          ? 'هذا الاسم مستخدم بالفعل — اختر اسماً آخر.'
          : 'تعذّر حفظ الاسم. حاول مرة أخرى.')
        return
      }
      await refreshProfile()
      setEditing(false); setSaved(true)
      setTimeout(() => setSaved(false), 2400)
    } finally { setSaving(false) }
  }

  async function sendReset() {
    if (!email) return
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    setResetSent(true)
  }

  if (authLoading) {
    return (
      <main className="ac-page iq-page">
        <div className="ac-skel ac-skel-id" aria-hidden="true"><span /><span /><span /></div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="ac-page iq-page">
        <section className="pf-empty">
          {/* An `h1`, not a `strong` — this is the whole page when signed out,
              and a page with no top-level heading has no landmark to enter. */}
          <h1>سجّل الدخول لعرض حسابك</h1>
          <p>يحتاج هذا القسم إلى حساب. محفظتك وقائمتك تعملان دون تسجيل دخول، ويزامنهما الحساب عبر أجهزتك.</p>
          <button type="button" className="pf-add pf-add-lg" onClick={() => openAuth?.()}>تسجيل الدخول</button>
        </section>
      </main>
    )
  }

  const panels: Record<SectionId, React.ReactNode> = {
    account: (
      <>
        <h2 className="ac-h2">الحساب</h2>

        <div className="ac-field">
          <div className="ac-field-head">
            <span className="ac-label">اسم المستخدم</span>
            {saved ? <span className="ac-saved" role="status"><i aria-hidden="true">✓</i> تم الحفظ</span> : null}
          </div>
          {!editing ? (
            <div className="ac-static">
              <span>{profile?.username || 'بلا اسم'}</span>
              <button type="button" onClick={() => { setEditing(true); setNameError(null) }}>تعديل</button>
            </div>
          ) : (
            <div className="ac-edit">
              <label>
                <span className="sr-only">اسم المستخدم</span>
                <input value={name} autoFocus autoComplete="username"
                  onChange={e => { setName(e.target.value); setNameError(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') saveName() }}
                  aria-invalid={!!nameError} aria-describedby={nameError ? 'ac-name-err' : undefined} />
              </label>
              <button type="button" className="ac-save" onClick={saveName} disabled={saving}>
                {saving ? 'جارٍ الحفظ' : 'حفظ'}
              </button>
              <button type="button" className="ac-cancel"
                onClick={() => { setEditing(false); setName(profile?.username ?? ''); setNameError(null) }}>
                إلغاء
              </button>
            </div>
          )}
          {nameError
            ? <p className="ac-err" id="ac-name-err" role="alert">{nameError}</p>
            : <p className="ac-hint">الاسم يظهر في حسابك فقط، ويجب أن يكون غير مستخدم.</p>}
        </div>

        {/* Display only, and it says why. */}
        <div className="ac-field">
          <div className="ac-field-head"><span className="ac-label">البريد الإلكتروني</span></div>
          <div className="ac-static is-locked">
            <span dir="ltr">{email ?? '—'}</span>
            <em>غير قابل للتعديل</em>
          </div>
          <p className="ac-hint">
            تغيير البريد غير متاح في المنتج حالياً — لا توجد واجهة لتحديث بيانات الدخول.
          </p>
        </div>

        <div className="ac-field">
          <div className="ac-field-head"><span className="ac-label">كلمة المرور</span></div>
          <div className="ac-static">
            <span>تُغيَّر عبر رابط يُرسَل إلى بريدك</span>
            <button type="button" onClick={sendReset} disabled={resetSent || !email}>
              {resetSent ? 'أُرسل الرابط' : 'إرسال رابط التغيير'}
            </button>
          </div>
          {resetSent ? (
            <p className="ac-ok" role="status">
              <i aria-hidden="true">✓</i>
              أُرسل رابط إلى <bdi dir="ltr">{email}</bdi>. تحقّق من بريدك، وقد يصل إلى مجلد
              الرسائل غير المرغوبة.
            </p>
          ) : (
            <p className="ac-hint">لا يطلب المنتج كلمة المرور الحالية: إعادة التعيين تتم عبر البريد وحده.</p>
          )}
        </div>
      </>
    ),
    prefs: (
      <>
        <h2 className="ac-h2">التفضيلات</h2>
        <div className="ac-field">
          <div className="ac-field-head"><span className="ac-label">اللغة</span></div>
          <div className="ac-choice" role="group" aria-label="اللغة">
            {LANGUAGES.map(l => (
              <button key={l.id} type="button" className={lang === l.id ? 'is-on' : ''}
                aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>
                <strong>{l.label}</strong><span>{l.note}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="ac-field">
          <div className="ac-field-head"><span className="ac-label">المظهر</span></div>
          <div className="ac-choice" role="group" aria-label="المظهر">
            {THEMES.map(t => (
              <button key={t.id} type="button" className={theme === t.id ? 'is-on' : ''}
                aria-pressed={theme === t.id}
                onClick={() => { if (theme !== t.id) toggleTheme() }}>
                <strong>{t.label}</strong>
              </button>
            ))}
          </div>
          <p className="ac-hint">يُحفظ الاختيار على هذا الجهاز ويُطبَّق قبل رسم الصفحة.</p>
        </div>
      </>
    ),
    data: (
      <>
        <h2 className="ac-h2">بياناتي</h2>
        <dl className="ac-data">
          <div>
            <dt>قائمة المتابعة</dt>
            <dd><bdi>{watchCount}</bdi> شركة · <Link href="/watchlist">عرض</Link></dd>
          </div>
          <div>
            <dt>المحفظة</dt>
            <dd><bdi>{positions}</bdi> مركز · <Link href="/portfolio">عرض</Link></dd>
          </div>
          {profile?.referral_code ? (
            <div>
              <dt>رمز الدعوة</dt>
              <dd>
                <bdi dir="ltr">{profile.referral_code}</bdi>
                <button type="button" className="ac-copy"
                  onClick={() => {
                    navigator.clipboard?.writeText(profile.referral_code as string)
                    setCopied(true); setTimeout(() => setCopied(false), 2000)
                  }}>
                  {copied ? 'نُسخ' : 'نسخ'}
                </button>
              </dd>
            </div>
          ) : null}
        </dl>
        <p className="ac-hint">
          تُحفظ المحفظة وقائمة المتابعة على جهازك أولاً، وتُزامَن مع حسابك عند تسجيل الدخول.
        </p>
      </>
    ),
  }

  return (
    <main className="ac-page iq-page">
      <section className="ac-identity" aria-label="الحساب">
        <div className="ac-id">
          <span className="ac-mark" aria-hidden="true">{mark}</span>
          <div className="ac-id-copy">
            <h1>{profile?.username || 'حسابي'}</h1>
            {email ? <span dir="ltr" className="ac-id-email">{email}</span> : null}
          </div>
          {profile?.created_at
            ? <p className="ac-id-since">عضو منذ <bdi>{arFull(profile.created_at.slice(0, 10))}</bdi></p>
            : null}
        </div>
      </section>

      <div className="ac-body">
        <nav className="ac-rail" aria-label="أقسام الإعدادات">
          {SECTIONS.map(s => (
            <button key={s.id} type="button"
              className={section === s.id ? 'is-on' : ''}
              aria-current={section === s.id ? 'page' : undefined}
              onClick={() => setSection(s.id)}>
              <strong>{s.label}</strong><span>{s.hint}</span>
            </button>
          ))}
          <button type="button" className="ac-rail-out" onClick={signOut}>تسجيل الخروج</button>
        </nav>

        {/* Mobile: a list that opens one panel at a time. */}
        <nav className={openPanel ? 'ac-list is-hidden' : 'ac-list'} aria-label="أقسام الإعدادات">
          {SECTIONS.map(s => (
            <button key={s.id} type="button" onClick={() => { setSection(s.id); setOpenPanel(s.id) }}>
              <span><strong>{s.label}</strong><em>{s.hint}</em></span>
              <i aria-hidden="true">‹</i>
            </button>
          ))}
          <button type="button" className="ac-list-out" onClick={signOut}>تسجيل الخروج</button>
        </nav>

        <div className={openPanel ? 'ac-panel is-open' : 'ac-panel'}>
          <button type="button" className="ac-back" onClick={() => setOpenPanel(null)}>
            <i aria-hidden="true">›</i> كل الإعدادات
          </button>
          {panels[section]}

          {/* Stated once, plainly. A settings page that silently lacks these
              reads as broken; one honest line beats five fake rows. */}
          <p className="ac-absent">
            <i aria-hidden="true">△</i>
            لا يدعم الحساب حالياً: حذف الحساب، تسجيل الدخول بحسابات خارجية، التحقق بخطوتين،
            إدارة الجلسات، أو تصدير البيانات. لم يُعرض أيٌّ منها هنا لأنها غير موجودة في المنتج.
          </p>

          <button type="button" className="ac-signout" onClick={signOut}>تسجيل الخروج</button>
        </div>
      </div>
    </main>
  )
}
