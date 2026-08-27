/**
 * The auth family's shared vocabulary — validators, the error dictionary and
 * the bilingual copy.
 *
 * Ported from `/Users/amed/iqwealth-design/app/auth/authData.ts`.
 *
 * The error dictionary is the point. Supabase returns English strings that a
 * user should never see — "Invalid login credentials", "Email not confirmed",
 * "User already registered" — and the old modal showed one generic «حدث خطأ»
 * for every one of them. `authErrorId` maps the real messages onto the ids
 * below, so a wrong password reads differently from an unverified account and
 * neither leaks which of the two fields was wrong.
 */

/* ── Where a signed-out user came from · §22 ─────────────────────────────── */
export const RETURN_TARGETS: Record<string, readonly [string, string]> = {
  "/portfolio": ["المحفظة", "your portfolio"],
  "/watchlists": ["قوائم المتابعة", "your watchlist"],
  "/profile": ["حسابي", "your account"],
};

/* ── Fields · exactly the real ones ──────────────────────────────────────── */
/** The product's only password rule. */
export const MIN_PASSWORD = 6;
/** `maxLength={8}` on the real input. */
export const REFERRAL_MAX = 8;

export type FieldError = string | null;

type L = "ar" | "en";

export function checkEmail(v: string, l: L = "ar"): FieldError {
  const s = v.trim();
  if (!s) return l === "ar" ? "أدخل بريدك الإلكتروني." : "Enter your email.";
  // Deliberately the same shape the browser's type="email" accepts — the real
  // form has no stricter rule, and a regex that rejects a valid address is
  // worse than one that lets the server decide.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
    return l === "ar" ? "صيغة البريد غير صحيحة." : "That email doesn't look right.";
  }
  return null;
}

export function checkPassword(v: string, l: L = "ar"): FieldError {
  if (!v) return l === "ar" ? "أدخل كلمة المرور." : "Enter your password.";
  if (v.length < MIN_PASSWORD) {
    return l === "ar"
      ? `كلمة المرور ${MIN_PASSWORD} أحرف على الأقل.`
      : `Password must be at least ${MIN_PASSWORD} characters.`;
  }
  return null;
}

export function checkUsername(v: string, l: L = "ar"): FieldError {
  const s = v.trim();
  if (!s) return l === "ar" ? "أدخل اسم المستخدم." : "Enter a username.";
  if (s.length < 2) return l === "ar" ? "الاسم قصير جداً." : "That's too short.";
  return null;
}

export function checkConfirm(pw: string, confirm: string, l: L = "ar"): FieldError {
  if (!confirm) return l === "ar" ? "أعد كتابة كلمة المرور." : "Re-enter the password.";
  if (pw !== confirm) return l === "ar" ? "كلمتا المرور غير متطابقتين." : "The passwords don't match.";
  return null;
}

/* ── Error mapping · §9 §24 · real SDK messages → real Arabic ────────────── */
export type AuthErrorId =
  | "credentials" | "unconfirmed" | "exists" | "weak"
  | "ratelimit" | "network" | "expired" | "unknown";

export const AUTH_ERRORS: Record<AuthErrorId, { title: string; hint?: string }> = {
  /* Supabase: "Invalid login credentials" — one message for both a wrong
     password and an unknown address, deliberately, so the form must not
     guess which and must not leak which. */
  credentials: {
    title: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    hint: "تحقّق من الحقلين، أو أعد تعيين كلمة المرور إن نسيتها.",
  },
  /* Supabase: "Email not confirmed" */
  unconfirmed: {
    title: "لم يُفعَّل هذا الحساب بعد.",
    hint: "افتح رابط التأكيد المرسل إلى بريدك، أو اطلب رابطاً جديداً.",
  },
  /* Supabase: "User already registered" */
  exists: {
    title: "هذا البريد مسجَّل بالفعل.",
    hint: "سجّل الدخول بدلاً من إنشاء حساب جديد.",
  },
  /* Supabase: "Password should be at least 6 characters" */
  weak: { title: `كلمة المرور ${MIN_PASSWORD} أحرف على الأقل.` },
  /* Supabase: "For security purposes, you can only request this after N seconds" */
  ratelimit: {
    title: "محاولات كثيرة خلال وقت قصير.",
    hint: "انتظر قليلاً قبل المحاولة مرة أخرى.",
  },
  network: {
    title: "تعذّر الاتصال بالخادم.",
    hint: "تحقّق من اتصالك بالإنترنت وحاول مرة أخرى — لم تُفقد بياناتك المكتوبة.",
  },
  /* Supabase: "Token has expired or is invalid" */
  expired: {
    title: "انتهت صلاحية الرابط.",
    hint: "روابط التأكيد وإعادة التعيين صالحة لفترة محدودة.",
  },
  unknown: {
    title: "تعذّر إتمام العملية.",
    hint: "حاول مرة أخرى بعد قليل.",
  },
};

/* ── Resend cooldown · §14 ───────────────────────────────────────────────── */
/** Supabase's own default rate window for auth emails. */
export const RESEND_COOLDOWN = 60;

/* ── What an account actually unlocks · §11 · three, all real ────────────── */
export const BENEFITS = [
  { title: "محفظة تتابعها", note: "سجّل مشترياتك واعرف أرباحك عبر أجهزتك." },
  { title: "قوائم متابعة", note: "شركاتك المختارة محفوظة مع حسابك لا مع المتصفح." },
  { title: "تفضيلاتك محفوظة", note: "اللغة والمظهر يبقيان كما تركتهما." },
];

export const SUPPORT_EMAIL = "support@iraqsm.com";

/* ── Copy · both directions · §25 ─────────────────────────────────────────
   English is not invented here: `AuthModal` is one of the genuinely bilingual
   surfaces in the product — every label in it is an `ar ? … : …` ternary. A
   language control that flipped the layout to LTR while leaving Arabic copy
   underneath would be the exact "English chrome around Arabic bodies" failure
   the main plan warns about, so the strings come in pairs. */
export type Lang = "ar" | "en";
type Pair = readonly [ar: string, en: string];
export const pick = (p: Pair, l: Lang) => (l === "ar" ? p[0] : p[1]);

export const T = {
  tagline: ["بيانات سوق العراق للأوراق المالية، في مكان واحد.", "The Iraq Stock Exchange, in one place."],
  state: ["الحالة", "State"],

  email: ["البريد الإلكتروني", "Email"],
  password: ["كلمة المرور", "Password"],
  username: ["اسم المستخدم", "Username"],
  referral: ["رمز الدعوة (اختياري)", "Referral code (optional)"],
  newPassword: ["كلمة المرور الجديدة", "New password"],
  confirmPassword: ["تأكيد كلمة المرور", "Confirm password"],
  show: ["إظهار", "Show"],
  hide: ["إخفاء", "Hide"],

  loginTitle: ["تسجيل الدخول", "Sign in"],
  loginLede: ["ادخل إلى محفظتك وقوائمك المحفوظة.", "Get back to your portfolio and saved lists."],
  loginGo: ["دخول", "Sign in"],
  loginBusy: ["جارٍ الدخول…", "Signing in…"],
  noAccount: ["ليس لديك حساب؟", "No account yet?"],
  createAccount: ["إنشاء حساب", "Create account"],
  forgot: ["نسيت كلمة المرور؟", "Forgot your password?"],
  resendLink: ["إرسال رابط تفعيل جديد", "Send a new activation link"],

  signupTitle: ["إنشاء حساب", "Create an account"],
  signupLede: ["حساب واحد يحفظ محفظتك وقوائمك عبر أجهزتك.",
    "One account keeps your portfolio and lists across devices."],
  signupBusy: ["جارٍ الإنشاء…", "Creating…"],
  haveAccount: ["لديك حساب؟", "Already have an account?"],
  signIn: ["تسجيل الدخول", "Sign in"],
  benefitsTitle: ["ماذا يضيف الحساب؟", "What an account adds"],
  minChars: ["6 أحرف على الأقل", "At least 6 characters"],
  lengthOk: ["✓ الطول كافٍ", "✓ Long enough"],
  charsLeft: ["أحرف متبقية", "more to go"],

  verifyTitle: ["تفعيل الحساب", "Activate your account"],
  checkEmail: ["تحقّق من بريدك الإلكتروني", "Check your email"],
  sentNew: ["أُرسل رابط جديد", "New link sent"],
  activated: ["تم تفعيل حسابك", "Your account is active"],
  activatedBody: ["يمكنك الآن تسجيل الدخول واستخدام حسابك على أي جهاز.",
    "You can now sign in and use your account on any device."],
  linkExpired: ["انتهت صلاحية الرابط", "This link has expired"],
  linkExpiredBody: ["روابط التفعيل صالحة لفترة محدودة. اطلب رابطاً جديداً وسنرسله إلى البريد نفسه.",
    "Activation links are valid for a limited time. Request a new one and we'll send it to the same address."],
  sentTo: ["أرسلنا رابط التفعيل إلى", "We sent an activation link to"],
  openToActivate: ["افتحه لتفعيل حسابك.", "Open it to activate your account."],
  spamNote: ["لم يصلك شيء؟ تحقّق من مجلد الرسائل غير المرغوبة قبل إعادة الإرسال.",
    "Nothing arrived? Check your spam folder before resending."],
  resend: ["إعادة إرسال الرابط", "Resend the link"],
  resendIn: ["إعادة الإرسال بعد", "Resend in"],
  seconds: ["ثانية", "s"],
  newLink: ["إرسال رابط جديد", "Send a new link"],
  newLinkIn: ["إرسال رابط جديد بعد", "New link in"],
  backToLogin: ["العودة لتسجيل الدخول", "Back to sign in"],
  resendFailed: ["تعذّر إرسال الرابط. حاول بعد قليل، أو راسلنا على",
    "We couldn't send the link. Try again shortly, or email us at"],
  cooldownNote: ["يسمح النظام بطلب رابط واحد كل 60 ثانية.",
    "One link may be requested every 60 seconds."],

  forgotTitle: ["إعادة تعيين كلمة المرور", "Reset your password"],
  forgotLede: ["أدخل بريدك وسنرسل رابطاً لاختيار كلمة مرور جديدة.",
    "Enter your email and we'll send a link to choose a new password."],
  sendLink: ["إرسال الرابط", "Send the link"],
  sending: ["جارٍ الإرسال…", "Sending…"],
  linkSent: ["أرسلنا الرابط", "Link sent"],
  resetSentTo: ["أُرسل رابط إعادة التعيين إلى", "A reset link was sent to"],
  openToChoose: ["افتحه لاختيار كلمة مرور جديدة.", "Open it to choose a new password."],
  notFoundNote: [
    "لم يصلك شيء؟ تحقّق من مجلد الرسائل غير المرغوبة، وتأكّد من صحة البريد. إن كان البريد غير مسجَّل فلن تصلك رسالة — ولا نكشف ذلك حمايةً للحسابات.",
    "Nothing arrived? Check spam and confirm the address. If the email isn't registered you won't receive anything — we don't reveal which, to protect accounts."],
  otherEmail: ["إرسال إلى بريد آخر", "Use a different email"],
  remembered: ["تذكّرتها؟", "Remembered it?"],

  resetTitle: ["كلمة مرور جديدة", "New password"],
  forAccount: ["للحساب", "For"],
  savePassword: ["حفظ كلمة المرور", "Save password"],
  saving: ["جارٍ الحفظ…", "Saving…"],
  resetDoneTitle: ["تم تغيير كلمة المرور", "Password changed"],
  resetDoneHead: ["كلمة المرور الجديدة فعّالة", "Your new password is active"],
  resetDoneBody: ["استخدم كلمة المرور الجديدة في المرة القادمة على كل أجهزتك.",
    "Use it next time you sign in, on every device."],
  invalidLink: ["رابط غير صالح", "Invalid link"],
  resetExpired: ["انتهت صلاحية رابط إعادة التعيين", "This reset link has expired"],
  resetExpiredBody: ["الروابط صالحة لفترة محدودة، ولمرة واحدة. اطلب رابطاً جديداً للمتابعة.",
    "Links are valid for a limited time and for one use. Request a new one to continue."],
  requestNew: ["طلب رابط جديد", "Request a new link"],

  callbackTitle: ["جارٍ إتمام تسجيل الدخول", "Finishing sign-in"],
  working: ["لحظة واحدة — نتحقّق من الرابط.", "One moment — we're checking the link."],
  dontClose: ["لا تغلق هذه الصفحة.", "Don't close this page."],
  badLink: ["تعذّر قراءة الرابط", "We couldn't read this link"],
  badLinkBody: ["الرابط غير مكتمل أو استُخدم من قبل. افتحه من رسالة البريد مباشرة دون نسخه يدوياً، أو اطلب رابطاً جديداً.",
    "The link is incomplete or already used. Open it straight from the email rather than copying it by hand, or request a new one."],

  returnTo: ["سجّل الدخول للعودة إلى", "Sign in to return to"],
  needsWiring: ["يحتاج ربطاً:", "Needs wiring:"],
} satisfies Record<string, Pair>;

/** Both languages for the error map. §24 */
export const ERROR_EN: Record<AuthErrorId, { title: string; hint?: string }> = {
  credentials: { title: "Email or password is incorrect.", hint: "Check both fields, or reset your password." },
  unconfirmed: { title: "This account isn't activated yet.", hint: "Open the activation link we emailed, or request a new one." },
  exists: { title: "That email is already registered.", hint: "Sign in instead of creating a new account." },
  weak: { title: `Password must be at least ${MIN_PASSWORD} characters.` },
  ratelimit: { title: "Too many attempts in a short time.", hint: "Wait a moment before trying again." },
  network: { title: "Couldn't reach the server.", hint: "Check your connection and try again — nothing you typed was lost." },
  expired: { title: "This link has expired.", hint: "Activation and reset links are valid for a limited time." },
  unknown: { title: "That didn't go through.", hint: "Please try again shortly." },
};

export const BENEFITS_EN = [
  { title: "A portfolio you follow", note: "Record your purchases and see your returns across devices." },
  { title: "Watchlists", note: "Your chosen companies live with your account, not your browser." },
  { title: "Preferences kept", note: "Language and theme stay where you left them." },
];

/* ── Mapping the SDK's own strings ────────────────────────────────────────
   Supabase does not give stable error codes for these, so the message is what
   there is to match on. Anything unrecognised falls through to `unknown`
   rather than being guessed at — and the raw string is never rendered. */
export function authErrorId(err: unknown): AuthErrorId {
  const raw = (err && typeof err === 'object' && 'message' in err
    ? String((err as { message: unknown }).message)
    : String(err ?? '')).toLowerCase()
  if (!raw) return 'unknown'
  if (raw.includes('invalid login credentials')) return 'credentials'
  if (raw.includes('email not confirmed')) return 'unconfirmed'
  if (raw.includes('already registered') || raw.includes('already been registered')) return 'exists'
  if (raw.includes('password should be') || raw.includes('weak password')) return 'weak'
  if (raw.includes('rate limit') || raw.includes('too many requests') || raw.includes('for security purposes')) return 'ratelimit'
  if (raw.includes('expired') || raw.includes('invalid or has expired')) return 'expired'
  if (raw.includes('fetch') || raw.includes('network')) return 'network'
  return 'unknown'
}
