# Legal launch blockers — RESOLVED

**Status: closed on 2026-08-25.** All seven `[مراجعة قانونية: …]` markers on
`/privacy` and `/legal` were replaced with final copy supplied by the operator.
Zero markers remain in the rendered DOM of either page. Neither route is a
launch blocker any more.

Source of the text: [`lib/legalContent.ts`](../lib/legalContent.ts); rendered by
[`components/info/LegalDoc.tsx`](../components/info/LegalDoc.tsx). The visible
revision date is **25 أغسطس 2026**.

---

## What each marker became

| # | Was | Now | What was deliberately NOT done |
|---|---|---|---|
| 1 | `/privacy` operator legal name + registered address | New section **«من يدير المنصة»** (§2) identifying the platform as IQWealth on iraqsm.com, and stating it is an information platform — not a broker, exchange or investment adviser | No legal-entity name and no street address invented |
| 2 | `/privacy` data-hosting locations | **«مزوّدو الخدمة»** (§7) now says processing may sit inside Iraq **or outside**, depending on the provider and where its systems are at the time | No hosting country named — none was verified from the deployed provider config |
| 3 | `/privacy` retention periods | **«مدة الاحتفاظ بالبيانات»** (§9) states retention *criteria* — purpose, account operation, abuse protection, legal obligation — plus what survives in backups | No fixed period promised, because the product enforces no timer |
| 4 | `/privacy` minimum account age | **«العمر المسموح»** (§13) — **18+**, with the right to restrict or delete an underage account | No age gate is claimed at sign-up; the rule is stated and enforced by action |
| 5 | `/legal` liability wording | **«حدود المسؤولية»** (§13) limits liability only *to the extent Iraqi law permits*, with the carve-out for what may not be excluded intact | No blanket exclusion |
| 6 | `/legal` whether an indemnity clause belongs | Answered **NO**. The section is now **«الاستخدام المسؤول»** (§14) and says in as many words that nothing in the terms obliges the user to indemnify us for third-party claims | No broad indemnity clause added |
| 7 | `/legal` governing law, court, operator | **«القانون الواجب التطبيق وتسوية النزاعات»** (§17) — Iraqi law, competent Iraqi courts under the statutory rules of jurisdiction | No specific court or venue named; no registered entity asserted |

---

## Standing claims re-verified after the edit

- **No GDPR compliance claimed.** The string does not appear on either page.
- **No comprehensive Iraqi data-protection statute claimed to govern the
  platform.** `/privacy` still opens by saying none is in force and that a draft
  law exists.
- **No regulatory status, licence or brokerage capacity claimed** anywhere. The
  only regulatory sentences are negative ones — «ليست شركة وساطة مالية مرخّصة»,
  «ليست وسيطاً مالياً أو بورصةً أو مستشاراً استثمارياً».
- **Account deletion is still the manual email process** the product actually
  performs, and `/privacy` still states there is no in-app delete button and no
  promised turnaround.
- **The security claim still holds.** «لا يصل المستخدم إلا إلى صفوفه» is backed
  by the two-user RLS isolation test — 16/16 checks passed with two real
  authenticated sessions.
- **Analytics disclosure still matches what renders.** Vercel Analytics and
  Speed Insights are named, and both are still mounted in `app/layout.tsx`.
- **Alerts** appear only as retained backend data (`price_alerts`), never as
  navigation.

---

## One editorial note for the operator

`/legal` now has three sections in the same territory:

- §9 **«الاستخدام المقبول»** — a list of prohibited acts (unauthorised access,
  disrupting the service, heavy scraping, unlawful use)
- §14 **«الاستخدام المسؤول»** — the supplied replacement, which covenants the
  same acts and adds the right to restrict access
- §16 **«إنهاء الحساب أو تقييده»** — which already carries that restriction right

The supplied wording was placed **verbatim** rather than edited, because it is
the operator's legal copy. But §14 largely restates §9 and §16. Merging §14's
distinctive sentence — the explicit absence of an indemnity — into §9 and
deleting the rest would say the same thing once instead of three times. That is
a drafting call for the operator, not a code change, and nothing is false as it
stands.

## Remaining launch blockers from this file

**None.**
