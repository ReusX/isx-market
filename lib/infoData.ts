/**
 * The public-information layer — the CONTACT FACTS and the family navigation.
 *
 * Everything here is real and already published by the product. Nothing on
 * this list is invented: no address, no legal entity, no office hours, no
 * second mailbox, no support SLA beyond the reply time the live page already
 * states, no department routing.
 *
 * The legal documents live in `lib/legalContent.ts` — titles, bodies, the
 * draft date and the counsel-review markers together, because a title list
 * that can drift from the text it indexes is a bug waiting to happen.
 */

/* ── Contact · REAL details only. Nothing on this list is invented. ─────── */
export const EMAIL = "boatlef@gmail.com";
export const PHONE_INTL = "+9647737339919";
export const PHONE_DISPLAY = "+964 773 733 9919";
export const REPLY_TIME = "نرد عادةً خلال 1–2 يوم عمل";
export const SOCIAL = [
  { id: "instagram", label: "Instagram", handle: "@iraqsmcom", href: "https://www.instagram.com/iraqsmcom" },
  { id: "facebook", label: "Facebook", handle: "Iraqstockmarket", href: "https://www.facebook.com/Iraqstockmarket/" },
];

/**
 * The six topics, from the real page — now addressed rather than decorative.
 *
 * `mailto:` with a prefilled subject is the whole mechanism: one mailbox, no
 * router, no ticket id, no queue. It makes the chips honest without promising
 * a support system the product does not have (§8, §24).
 */
export const TOPICS = [
  { id: "bug", label: "الأخطاء والمشاكل التقنية", subject: "بلاغ عن مشكلة تقنية" },
  { id: "feature", label: "اقتراحات الميزات الجديدة", subject: "اقتراح ميزة" },
  { id: "data", label: "تصحيح البيانات", subject: "تصحيح بيانات" },
  { id: "general", label: "استفسارات عامة", subject: "استفسار عام" },
  { id: "partner", label: "استفسارات الشراكة", subject: "استفسار شراكة" },
  { id: "legal", label: "الخصوصية والمسائل القانونية", subject: "استفسار قانوني" },
];

export const mailto = (subject?: string) =>
  subject ? `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}` : `mailto:${EMAIL}`;

/**
 * The family, for the cross-link row at the foot of each page.
 *
 * Four pages that answer four halves of one question — who is this, how do I
 * reach them, what do they do with my data, what are they liable for — should
 * not be four dead ends. The real footer links them; the reference app has no
 * footer, so the family carries its own navigation.
 */
export const FAMILY = [
  { href: "/about", label: "من نحن" },
  { href: "/contact", label: "تواصل معنا" },
  { href: "/privacy", label: "الخصوصية" },
  { href: "/legal", label: "إشعار قانوني" },
];

