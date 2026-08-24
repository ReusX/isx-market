# Legal launch blockers — `/privacy` and `/legal`

Audited on `implement/iqwealth-redesign` at `5293069`. Source of the text:
[`lib/legalContent.ts`](../lib/legalContent.ts); rendered by
[`components/info/LegalDoc.tsx`](../components/info/LegalDoc.tsx).

**Both routes are NOT production-ready.** Seven fields could not be determined
from the product or the code, and each is rendered as a visible
`[مراجعة قانونية: …]` marker rather than guessed. The markers are deliberately
visible: a draft that hides its own gaps reads as finished and can be published
by accident.

Nothing below is a drafting suggestion. Each row states what is missing and who
can supply it — the answers are the operator's and their counsel's, not the
code's.

---

## How to read this

- **Route / section** — the `id` is the anchor, e.g. `/privacy#retention`.
- **Current visible placeholder** — exactly what a reader sees today.
- **Why the code cannot answer** — what was searched, and what was not found.
- **Input required** — the factual or legal decision needed to close the item.

Removing a marker without supplying the answer would leave unsupported wording
behind, which is worse than the visible gap. Do not do it.

---

## 1 · `/privacy#processors` — data-hosting locations

| | |
|---|---|
| **Placeholder** | `[مراجعة قانونية: تحديد مواقع استضافة البيانات وإدراجها صراحةً]` |
| **Sentence it sits in** | «يجري تشغيل هذه الخدمات على بنية تحتية قد تقع خارج العراق.» |
| **Why the code cannot answer** | The repo names the processors (Supabase for auth + database, Vercel for hosting and the two measurement products, WordPress for articles) but nowhere records the **regions** those instances run in. The Supabase project ref and the Vercel project settings hold that fact; the source tree does not. Guessing a region would be a false statement about where a user's data physically sits. |
| **Input required** | From the operator: the Supabase project's region and the Vercel deployment regions, confirmed from each provider's dashboard. From counsel: whether Iraqi law as it stands requires those locations to be disclosed, and in what form. |

## 2 · `/privacy#retention` — retention periods

| | |
|---|---|
| **Placeholder** | `[مراجعة قانونية: اعتماد مدد احتفاظ محدّدة للحسابات غير النشطة وللسجلّات]` |
| **Sentence it sits in** | «لم تُحدَّد بعد مدد رقمية، ولا نذكر هنا مدّة لم نعتمدها فعلاً.» |
| **Why the code cannot answer** | There is no retention job, no TTL, no scheduled purge and no `deleted_at` anywhere in the repo — verified by grep across `app/`, `lib/`, `scripts/` and the cron routes. Data is kept indefinitely because nothing has been built to remove it. A policy cannot state a period the system does not implement. |
| **Input required** | An operator **decision** on how long an inactive account and its logs are kept, then an implementation to enforce it. Counsel confirms whether a stated period is required at all under Iraqi law. Until both exist, the honest sentence is the one already printed. |

## 3 · `/privacy#children` — minimum age for an account

| | |
|---|---|
| **Placeholder** | `[مراجعة قانونية: تحديد حدّ أدنى لعمر إنشاء الحساب وإدراجه هنا وفي شروط الاستخدام]` |
| **Sentence it sits in** | «لا نوجّه المنصّة إلى الأطفال ولا نجمع بياناتهم عن قصد. … ولم يُعتمد بعد حدٌّ عمري، ولا نذكر رقماً لم يُقرَّر.» |
| **Why the code cannot answer** | Sign-up collects an email and a password and nothing else — no date of birth, no age attestation, no gate. There is no age field on `profiles`. The product therefore has no minimum age to disclose, and inventing one (13, 16, 18) would state a rule that nothing enforces. |
| **Input required** | An operator decision on the minimum age, whether it is enforced at sign-up or only stated, and counsel's view on the age Iraqi law implies for contracting. The number must land in **both** documents, not one. |

## 4 · `/privacy#contact` — operator's legal name and registered address

| | |
|---|---|
| **Placeholder** | `[مراجعة قانونية: الاسم القانوني للمشغّل وعنوانه المسجّل]` |
| **Context** | The privacy contact section already names the real channel — `boatlef@gmail.com` — and states it is the authorised route for privacy requests. What is missing is the identity of the data controller behind it. |
| **Why the code cannot answer** | The repo contains a person's name (أحمد بلحة, on `/about`) and a brand (IQWealth). Neither is a **legal entity**. There is no company registration number, no trade name, no registered address anywhere in the product, and a personal name is not automatically the controller's legal identity. |
| **Input required** | From the operator: whether IQWealth is operated by a registered company or by an individual, the exact legal name, and the registered address. See also item 7 — the same fact is needed in the Terms. |

## 5 · `/legal#liability` — limitation of liability wording

| | |
|---|---|
| **Placeholder** | `[مراجعة قانونية: صياغة حدود المسؤولية بما يتوافق مع القانون العراقي وحدود ما يجيز استبعاده]` |
| **Why the code cannot answer** | This is purely a question of law. Which heads of liability may be excluded, and how far, is set by Iraqi statute and case law — not by anything observable in the product. A template clause copied from an English-law or US-style agreement is the specific failure mode this marker exists to prevent. |
| **Input required** | Drafting by Iraq-qualified counsel, stating what may be limited, what may not, and the wording. |

## 6 · `/legal#indemnity` — whether an indemnity clause belongs

| | |
|---|---|
| **Placeholder** | `[مراجعة قانونية: البتّ في إدراج بند تعويض من عدمه]` |
| **Sentence it sits in** | «لم يُدرَج بند تعويض في هذه المسوّدة: المنصّة مجانية ولا تتيح للمستخدمين نشر محتوى عام، ولا نرى ما يبرّره حالياً.» |
| **Why the code cannot answer** | The product reasoning is already stated and is accurate against the code — the platform is free, and there is no user-generated public content anywhere (no comments, no posts, no uploads, no public profiles; verified). Whether that reasoning is *legally* sufficient to omit an indemnity is not a product question. |
| **Input required** | A yes/no from counsel. If yes, the clause itself. This is the lowest-risk of the seven: the current text neither asserts nor omits anything false. |

## 7 · `/legal#law` — governing law, competent court, operator identity

| | |
|---|---|
| **Placeholder** | `[مراجعة قانونية: القانون الواجب التطبيق، والمحكمة المختصّة، والاسم القانوني للمشغّل وعنوانه]` |
| **Why the code cannot answer** | Three separate facts, none of them derivable. The pre-redesign `/legal` did assert Iraqi governing law, but it named no court and no entity, and an assertion without a forum or a party is not a usable clause. Naming a court by inference would be an invention. |
| **Input required** | From counsel: the governing law and the competent court. From the operator: the same legal name and address as item 4. |

---

## Adjacent findings — not markers, but check them at the same time

**A · Account deletion is described as a manual email process, and that is a
commitment.** `/privacy#deletion` states that full account deletion is requested
by writing from the registered address, that it is handled by hand, and — in a
`note` block — that there is no in-app delete button and therefore no promised
turnaround. That text is accurate about the product: there is no
account-deletion server action, and `profiles` has no DELETE policy. **The legal
copy does not over-promise**, so this is not one of the seven blockers. It does
commit the operator to actually honouring emailed deletion requests. See
[`FINAL_ROUTE_INVENTORY.md`](./FINAL_ROUTE_INVENTORY.md) and the pre-deploy
report for the engineering status.

**B · The security section makes a testable claim, and it now holds.**
`/privacy#security` states that account-data access is restricted at the database
level so a user reaches only their own rows. That claim was verified on
2026-08-24 with two real authenticated sessions: 16/16 isolation checks passed,
including unfiltered reads, widened filters, cross-user update, delete, and an
upsert carrying another user's id. Re-run that probe if RLS policies change.

**C · The analytics disclosure is current.** `/privacy#processors` names Vercel
Analytics and Speed Insights explicitly. Both are still rendered in
[`app/layout.tsx`](../app/layout.tsx). If either is removed or another
measurement service is added, this section must change with it.

---

## Status

| | |
|---|---|
| `/privacy` | **BLOCKS DEPLOYMENT** — 4 unresolved markers |
| `/legal` | **BLOCKS DEPLOYMENT** — 3 unresolved markers |

Every other migrated route is unaffected. Nothing here blocks the rest of the
migration; it blocks publishing these two documents.
