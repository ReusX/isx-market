/*
 * Operating status, USD restriction, and the English rendering column.
 *
 * The CBI directory carries 79 entries and they are not 79 working banks. Seven
 * are in liquidation, several are under guardianship or judicial custody, one
 * has not commenced business, and around twenty-five carry a restriction on
 * dealing in US dollars. A profile that renders all of those the same way is
 * wrong in the way that matters most: it tells a reader a bank in liquidation
 * is open for deposits.
 *
 * These are FOUR independent dimensions and the schema keeps them apart:
 *
 *   operating_status   what the institution is doing — the CBI directory's own
 *                      annotation, not our inference
 *   usd_restricted     a restriction on USD dealing. Orthogonal: a bank can be
 *                      fully operating and USD-restricted, and most of the
 *                      restricted ones are
 *   research_state     how far WE got (already present)
 *   product facts      what the bank publishes (already present)
 *
 * The same reasoning as `research_state`: without this, "in liquidation" and
 * "we found nothing published" are the same empty page.
 */

alter table public.banks
  add column if not exists operating_status text not null default 'operating'
    check (operating_status in ('operating', 'establishment', 'guardianship', 'liquidation')),
  /* Nullable on purpose: false is a claim that the bank is NOT restricted, and
     absence of an annotation in the directory does not establish that. */
  add column if not exists usd_restricted boolean,
  add column if not exists status_note_ar text,
  add column if not exists status_note_en text,
  add column if not exists status_source_id bigint references public.data_sources(id),
  add column if not exists status_verified_at date;

comment on column public.banks.operating_status is
  'CBI directory annotation: operating / under establishment / under guardianship or judicial custody / in liquidation. Independent of usd_restricted and of research_state.';
comment on column public.banks.usd_restricted is
  'A published restriction on USD dealing. NULL means no annotation was found, which is not the same as unrestricted.';

/* ── The English rendering of a free-prose fact ─────────────────────────────
 * A text-valued fact is the bank's own wording, which is Arabic. Keeping only
 * that put an untranslated Iraqi banking sentence on the English page. The
 * source wording stays in `value_text` — it is the evidence — and
 * `value_text_en` carries our rendering of it.
 *
 * This block was written for the /banks UI and never applied; the view was
 * later rebuilt from the canonical migration, which dropped the column from
 * it again. Both halves are here so the two cannot separate a second time.
 */
alter table public.product_facts add column if not exists value_text_en text;

drop view if exists public.product_facts_current cascade;
create view public.product_facts_current as
select
  f.id, f.product_id, f.field_key, f.value_num, f.value_text, f.value_text_en, f.value_bool,
  coalesce(f.unit, p.unit) as unit,
  f.state, f.condition_hash,
  (f.condition_hash <> '') as is_conditional,
  f.source_id, s.key as source_key, s.name_ar as source_name_ar, s.name_en as source_name_en,
  f.source_url, f.source_excerpt, f.source_page, f.effective_date, f.verified_at, f.note,
  p.fact_class, p.max_age_days, p.label_ar, p.label_en,
  (f.verified_at + p.max_age_days) as stale_after,
  (f.state = 'KNOWN' and f.verified_at is not null
     and (f.verified_at + p.max_age_days) < current_date) as is_stale
from public.product_facts f
join public.fact_policy p on p.field_key = f.field_key
left join public.data_sources s on s.id = f.source_id
where f.superseded_at is null;

grant select on public.product_facts_current to anon, authenticated;

/* `cascade` above drops the views that read this one. Both are recreated from
   the canonical definitions, and both get security_invoker re-asserted below —
   a rebuilt view comes back with the owner's rights, which is the finding the
   September advisor pass closed. */
drop view if exists public.bank_products_current;
create view public.bank_products_current as
select
  pr.id, b.slug as bank_slug, pr.slug, pr.kind, pr.name_ar, pr.name_en,
  pr.currency, pr.financing_type, pr.is_active,
  max(f.value_num) filter (where f.field_key = 'rate'            and f.state='KNOWN' and f.condition_hash='') as rate,
  max(f.value_text) filter (where f.field_key = 'rate_basis'     and f.state='KNOWN' and f.condition_hash='') as rate_basis,
  max(f.value_num) filter (where f.field_key = 'min_amount'      and f.state='KNOWN' and f.condition_hash='') as min_amount,
  max(f.value_num) filter (where f.field_key = 'max_amount'      and f.state='KNOWN' and f.condition_hash='') as max_amount,
  max(f.value_num) filter (where f.field_key = 'min_salary'      and f.state='KNOWN' and f.condition_hash='') as min_salary,
  max(f.value_num) filter (where f.field_key = 'max_term_months' and f.state='KNOWN' and f.condition_hash='') as max_term_months,
  max(f.value_num) filter (where f.field_key = 'term_months'     and f.state='KNOWN' and f.condition_hash='') as term_months,
  min(f.value_num) filter (where f.field_key = 'rate'       and f.state='KNOWN') as rate_from,
  max(f.value_num) filter (where f.field_key = 'rate'       and f.state='KNOWN') as rate_to,
  min(f.value_num) filter (where f.field_key = 'max_amount' and f.state='KNOWN') as max_amount_from,
  max(f.value_num) filter (where f.field_key = 'max_amount' and f.state='KNOWN') as max_amount_to,
  count(*) filter (where f.field_key = 'rate' and f.state='KNOWN' and f.condition_hash <> '') as conditional_rates,
  bool_or(f.condition_hash <> '') as has_conditions,
  count(*) filter (where f.state = 'KNOWN')   as known_facts,
  count(*) filter (where f.state = 'UNKNOWN') as unknown_facts,
  count(*) filter (where f.is_stale)          as stale_facts,
  max(f.verified_at)                          as last_verified
from public.bank_products pr
join public.banks b on b.id = pr.bank_id
left join public.product_facts_current f on f.product_id = pr.id
group by pr.id, b.slug, pr.slug, pr.kind, pr.name_ar, pr.name_en,
         pr.currency, pr.financing_type, pr.is_active;

grant select on public.bank_products_current to anon, authenticated;

drop view if exists public.bank_facts_stale;
create view public.bank_facts_stale as
select b.slug as bank_slug, pr.slug as product_slug, f.field_key,
       f.fact_class, f.verified_at, f.stale_after,
       (current_date - f.stale_after) as days_overdue
from public.product_facts_current f
join public.bank_products pr on pr.id = f.product_id
join public.banks b on b.id = pr.bank_id
where f.is_stale
order by days_overdue desc;

grant select on public.bank_facts_stale to anon, authenticated;

alter view public.product_facts_current set (security_invoker = on);
alter view public.bank_products_current set (security_invoker = on);
alter view public.bank_facts_stale      set (security_invoker = on);

/* ── New fact vocabulary ────────────────────────────────────────────────────
 * `payout` is what makes a term-deposit headline meaningful: First Iraqi Bank
 * publishes 9% at maturity and 8.5% monthly for the same 12 months, and a
 * single number without the payout method is not an offer.
 *
 * `total_cost_note` carries the thing a percentage hides — a zero-return
 * housing product with a one-off 5% administrative fee is not free, and the
 * fee is not interest.
 */
insert into public.fact_policy (field_key, value_type, unit, fact_class, max_age_days, label_ar, label_en) values
  ('payout',          'text', null, 'medium', 60, 'طريقة صرف الأرباح', 'Profit payout'),
  ('total_cost_note', 'text', null, 'medium', 60, 'تكاليف أخرى',       'Other costs')
on conflict (field_key) do nothing;
