/**
 * The public-information layer — the CONTACT FACTS and the family navigation.
 *
 * Everything here is real and already published by the product. Nothing on
 * this list is invented: no address, no legal entity, no office hours, no
 * second mailbox, no support SLA beyond the reply time the live page already
 * states, no department routing.
 *
 * Labels are NOT here — they are copy, and copy lives in the dictionaries.
 *
 * The legal documents live in `lib/legalContent.ts` — titles, bodies, the
 * draft date and the counsel-review markers together, because a title list
 * that can drift from the text it indexes is a bug waiting to happen.
 */

/* ── Contact · REAL details only. Nothing on this list is invented. ─────── */
export const EMAIL = "boatlef@gmail.com";
export const PHONE_INTL = "+9647737339919";
export const PHONE_DISPLAY = "+964 773 733 9919";

export const SOCIAL = [
  { id: "instagram", label: "Instagram", handle: "@iraqsmcom", href: "https://www.instagram.com/iraqsmcom" },
  { id: "facebook", label: "Facebook", handle: "Iraqstockmarket", href: "https://www.facebook.com/Iraqstockmarket/" },
];

/**
 * The contact topics, in the order the page lists them.
 *
 * Only the ORDER and the ids live here; the label and the mail subject are in
 * the `info.contact.topics` dictionary, because both are copy and both have to
 * exist in two languages. `mailto:` with a prefilled subject is the whole
 * mechanism: one mailbox, no router, no ticket id, no queue. It makes the
 * chips honest without promising a support system the product does not have.
 */
export const TOPIC_IDS = ["data", "account", "fix", "idea", "partner", "other"] as const;
export type TopicId = (typeof TOPIC_IDS)[number];

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
  { id: "about", href: "/about" },
  { id: "contact", href: "/contact" },
  { id: "privacy", href: "/privacy" },
  { id: "legal", href: "/legal" },
] as const;

