-- ═══════════════════════════════════════════════════════════════════════════
-- Banking data foundation
--
-- The model exists before any bank page, because the hard part of Iraqi
-- banking data is not rendering it. Rafidain publishes a car loan as "up to
-- 25 million if your salary is domiciled with us, secured by MasterCard;
-- 25–65 million with the card AND a lien on the vehicle; a guarantor instead
-- if your salary sits elsewhere; and the instalment may not exceed 50% of your
-- obligations either way." A `max_amount` column cannot hold that. Bank of
-- Baghdad publishes no numeric retail terms at all, and three of six major
-- bank domains do not resolve from outside Iraq.
--
-- So: values carry their own provenance, conditions are first-class and drawn
-- from a controlled vocabulary, "we never checked" and "we checked and they do
-- not publish it" are different states, and nothing is ever overwritten.
--
-- Reuses rather than duplicates:
--   · public/data/companies.json  the curated 104-company roster (43 banks)
--   · financial_facts             ISX-sourced financials for 39 listed banks
--   · data_sources                the provenance registry from the FX spine
-- `banks.ticker` is the only bridge to market data. No financial column lives
-- in this schema.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Banks · durable identity only ──────────────────────────────────────────

create table if not exists public.banks (
  id            bigint generated always as identity primary key,
  slug          text not null unique,
  name_ar       text not null,
  name_en       text not null,
  short_ar      text,
  short_en      text,

  /* What kind of institution, and who owns it. Kept apart because they vary
     independently: a state bank can be Islamic, a private bank conventional. */
  bank_type     text not null check (bank_type in ('commercial','islamic','investment','specialised','central')),
  ownership     text not null check (ownership in ('state','private','mixed','foreign')),

  founded       int,
  hq_city       text,
  website       text,
  swift         text,

  /* The bridge to existing market data. Nullable because most Iraqi banks are
     not listed, and matched against the curated roster — never a copy of it. */
  ticker        text unique,

  /* Licensing is a fact about the bank, and it has a source like any other,
     so it carries its own verification rather than being assumed. */
  cbi_licensed  boolean,
  licence_source_id bigint references public.data_sources(id),
  licence_verified_at date,

  is_active     boolean not null default true,

  /* How far the research on this bank actually got.
     `researched`         we read the bank's own published material
     `source_unreachable` the bank's site does not resolve or serves nothing
                          from where we run — Rasheed and TBI both do this
     `not_researched`     nobody has looked yet
     Without this, a bank with no products looks identical whether we checked
     and found nothing published or never checked at all, and the page would
     say the same thing about both. */
  research_state text not null default 'not_researched'
    check (research_state in ('researched','source_unreachable','not_researched')),
  research_note  text,
  research_checked_at date,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.banks is
  'Durable identity of an Iraqi bank. Commercial terms live in bank_products / product_facts; market data stays in the existing company tables and is reached through `ticker`.';

create index if not exists banks_active on public.banks (is_active, bank_type);

-- ── Fact vocabulary and freshness policy ───────────────────────────────────
-- One universal 90-day timer would be wrong in both directions: a profit rate
-- goes stale in weeks, a SWIFT code does not go stale at all. Freshness is a
-- property of the FIELD, so it lives in a table the views can join.

create table if not exists public.fact_policy (
  field_key     text primary key,
  /* What the value is, so the reader and the validator agree on its shape. */
  value_type    text not null check (value_type in ('number','text','boolean')),
  unit          text,
  fact_class    text not null check (fact_class in ('fast','medium','slow','identity')),
  max_age_days  int  not null,
  label_ar      text not null,
  label_en      text not null
);

comment on table public.fact_policy is
  'The controlled vocabulary of product facts, with the re-verification interval for each. A fact whose key is absent here cannot be stored.';

insert into public.fact_policy (field_key, value_type, unit, fact_class, max_age_days, label_ar, label_en) values
  -- fast · commercial terms that move
  ('rate',                'number','percent','fast',   30,'نسبة الفائدة أو الربح','Interest / profit rate'),
  ('rate_basis',          'text',  null,     'fast',   30,'أساس الاحتساب','Rate basis'),
  ('min_amount',          'number','iqd',    'fast',   30,'أقل مبلغ','Minimum amount'),
  ('max_amount',          'number','iqd',    'fast',   30,'أعلى مبلغ','Maximum amount'),
  ('min_salary',          'number','iqd',    'fast',   30,'أقل راتب','Minimum salary'),
  ('admin_fee',           'number','iqd',    'fast',   30,'رسوم إدارية','Administrative fee'),
  ('admin_fee_pct',       'number','percent','fast',   30,'رسوم إدارية (نسبة)','Administrative fee (percent)'),
  -- medium · eligibility and structure
  ('min_term_months',     'number','months', 'medium', 60,'أقل مدة','Minimum term'),
  ('max_term_months',     'number','months', 'medium', 60,'أطول مدة','Maximum term'),
  ('min_age',             'number','years',  'medium', 60,'أقل عمر','Minimum age'),
  ('max_age',             'number','years',  'medium', 60,'أعلى عمر','Maximum age'),
  ('down_payment_pct',    'number','percent','medium', 60,'الدفعة الأولى','Down payment'),
  ('guarantor_required',  'boolean',null,    'medium', 60,'يتطلب كفيل','Guarantor required'),
  ('collateral_required', 'boolean',null,    'medium', 60,'يتطلب ضماناً','Collateral required'),
  ('collateral_type',     'text',  null,     'medium', 60,'نوع الضمان','Collateral type'),
  ('salary_domiciliation_required','boolean',null,'medium',60,'توطين الراتب','Salary domiciliation required'),
  ('max_instalment_pct_of_income','number','percent','medium',60,'أعلى نسبة قسط من الدخل','Maximum instalment as share of income'),
  ('early_repayment',     'text',  null,     'medium', 60,'السداد المبكر','Early repayment'),
  ('eligibility_note',    'text',  null,     'medium', 60,'ملاحظة الأهلية','Eligibility note'),
  ('required_documents',  'text',  null,     'medium', 60,'المستندات المطلوبة','Required documents'),
  ('application_method',  'text',  null,     'medium', 60,'طريقة التقديم','How to apply'),
  -- deposits
  ('term_months',         'number','months', 'medium', 60,'مدة الوديعة','Deposit term'),
  ('early_break_penalty', 'text',  null,     'medium', 60,'كسر الوديعة','Early withdrawal')
on conflict (field_key) do nothing;

-- ── Condition vocabulary ───────────────────────────────────────────────────
-- Conditions drive eligibility matching later, so they are a domain model, not
-- a notes field. Field and operator are both constrained; a condition naming
-- anything outside these tables cannot be inserted.

create table if not exists public.condition_field (
  field_key   text primary key,
  value_type  text not null check (value_type in ('number','text','boolean')),
  unit        text,
  allowed     text[],          -- for enumerated fields; null means free value
  label_ar    text not null,
  label_en    text not null
);

insert into public.condition_field (field_key, value_type, unit, allowed, label_ar, label_en) values
  ('salary',            'number','iqd',  null, 'الراتب الشهري','Monthly salary'),
  ('salary_domiciled',  'boolean',null,  null, 'توطين الراتب','Salary domiciled'),
  ('employment_type',   'text',  null,   array['government','private','mixed','self_employed','retired'], 'نوع الوظيفة','Employment type'),
  ('employment_months', 'number','months',null,'مدة الخدمة','Months employed'),
  ('age',               'number','years',null, 'العمر','Age'),
  ('has_guarantor',     'boolean',null,  null, 'وجود كفيل','Has guarantor'),
  ('has_collateral',    'boolean',null,  null, 'وجود ضمان','Has collateral'),
  ('collateral_type',   'text',  null,   array['vehicle_lien','property','gold','deposit','mastercard'], 'نوع الضمان','Collateral type'),
  ('purpose',           'text',  null,   array['purchase','build','renovate','land','vehicle','business','personal'], 'الغرض','Purpose'),
  ('deposit_amount',    'number','iqd',  null, 'مبلغ الوديعة','Deposit amount'),
  /* Added after the pilot: Rafidain's deposit rates differ by TERM first and
     amount second. Without this the tiers could only be expressed on the
     amount, which implied a six-month deposit of 60 million pays the two-year
     rate — something the bank does not say. */
  ('term_months',       'number','months',null,'مدة المنتج','Product term')
on conflict (field_key) do nothing;

create table if not exists public.condition_operator (
  op       text primary key,
  arity    text not null check (arity in ('scalar','set'))
);

insert into public.condition_operator (op, arity) values
  ('eq','scalar'), ('ne','scalar'),
  ('gt','scalar'), ('gte','scalar'), ('lt','scalar'), ('lte','scalar'),
  ('in','set'), ('not_in','set')
on conflict (op) do nothing;

-- ── Products · durable identity, not commercial terms ──────────────────────

create table if not exists public.bank_products (
  id             bigint generated always as identity primary key,
  bank_id        bigint not null references public.banks(id) on delete cascade,
  slug           text not null,
  kind           text not null check (kind in (
                   'deposit_savings','deposit_term','account_current',
                   'loan_personal','loan_auto','loan_home','loan_business','advance')),
  name_ar        text not null,
  name_en        text not null,
  currency       text not null default 'IQD',
  /* Islamic products are priced as profit, not interest. Keeping this at
     product level means a comparison never puts a murabaha profit rate in the
     same column as an interest rate without saying so. */
  financing_type text not null default 'conventional' check (financing_type in ('conventional','islamic')),
  is_active      boolean not null default true,
  effective_from date,
  effective_to   date,
  created_at     timestamptz not null default now(),
  unique (bank_id, slug)
);

create index if not exists bank_products_kind on public.bank_products (kind, is_active);

-- ── Facts · one row per value, with its own provenance ─────────────────────

create table if not exists public.product_facts (
  id             bigint generated always as identity primary key,
  product_id     bigint not null references public.bank_products(id) on delete cascade,
  field_key      text   not null references public.fact_policy(field_key),

  value_num      numeric,
  value_text     text,
  value_bool     boolean,
  unit           text,

  /* Five states, and the distinctions matter more than the values.
       KNOWN               published, recorded, sourced
       UNKNOWN             we read the bank's page and it does not publish this
       SOURCE_UNAVAILABLE  we tried and could not read the source
       NOT_APPLICABLE      the field has no meaning for this product
       UNVERIFIED          recorded but not yet checked
     A missing row is a sixth thing: nobody looked. UNKNOWN was carrying two of
     these at once, which would have let the page tell a reader "the bank does
     not publish its rate" when the truth was "we could not open the site". */
  state          text not null check (state in ('KNOWN','UNKNOWN','NOT_APPLICABLE','UNVERIFIED','SOURCE_UNAVAILABLE')),

  /* Conditions that qualify this value. `condition_hash` is the canonical
     fingerprint of the attached condition set — '' when unconditional — and is
     what makes "one current value per product per field per condition set"
     expressible as an index rather than as a hope. */
  condition_hash text not null default '',

  -- provenance
  source_id      bigint references public.data_sources(id),
  source_url     text,
  source_excerpt text,
  source_page    int,
  content_hash   text,
  effective_date date,
  retrieved_at   timestamptz,
  verified_at    date,
  verified_by    text,
  confidence     numeric,
  note           text,

  /* Append-only. A rate moving 6% → 7% stamps the old row and inserts a new
     one; nothing is ever updated in place. */
  superseded_at  timestamptz,
  created_at     timestamptz not null default now(),

  /* A KNOWN commercial claim without a source and a verification date is
     exactly the unsourced financial data this whole model exists to prevent. */
  constraint product_facts_known_needs_provenance check (
    state <> 'KNOWN' or (source_id is not null and verified_at is not null)
  ),
  /* A KNOWN fact has to have a value; the other states must not. */
  constraint product_facts_known_has_value check (
    state <> 'KNOWN' or (value_num is not null or value_text is not null or value_bool is not null)
  ),
  constraint product_facts_unknown_has_no_value check (
    state = 'KNOWN' or (value_num is null and value_text is null and value_bool is null)
  )
);

/* At most one live value per product / field / condition set. */
create unique index if not exists product_facts_one_current
  on public.product_facts (product_id, field_key, condition_hash)
  where superseded_at is null;

create index if not exists product_facts_lookup
  on public.product_facts (product_id, field_key) where superseded_at is null;

-- ── Conditions · attached to a fact, drawn from the vocabulary ─────────────

create table if not exists public.product_conditions (
  id         bigint generated always as identity primary key,
  fact_id    bigint not null references public.product_facts(id) on delete cascade,
  field_key  text not null references public.condition_field(field_key),
  op         text not null references public.condition_operator(op),
  value_num  numeric,
  value_text text,
  value_bool boolean,
  value_set  text[],
  note_ar    text,
  constraint product_conditions_has_value check (
    value_num is not null or value_text is not null or value_bool is not null or value_set is not null
  )
);

create index if not exists product_conditions_fact on public.product_conditions (fact_id);

comment on table public.product_conditions is
  'field / operator / value, both sides drawn from condition_field and condition_operator. Free-form JSON was rejected: these rows will drive eligibility matching, so an uncontrolled key is a silent matching failure later.';

-- ── Services · three states, never a bare boolean ──────────────────────────

create table if not exists public.bank_services (
  id           bigint generated always as identity primary key,
  bank_id      bigint not null references public.banks(id) on delete cascade,
  service_key  text not null check (service_key in (
                 'atm','mobile_banking','internet_banking','cards',
                 'usd_account','international_transfer','salary_domiciliation')),
  /* `false` must never mean "we found no evidence". Unchecked is its own
     state and renders as unchecked. */
  availability text not null check (availability in ('available','unavailable','unknown')),
  source_id    bigint references public.data_sources(id),
  source_url   text,
  source_excerpt text,
  verified_at  date,
  note         text,
  superseded_at timestamptz,
  created_at   timestamptz not null default now(),
  constraint bank_services_available_needs_provenance check (
    availability = 'unknown' or (source_id is not null and verified_at is not null)
  )
);

create unique index if not exists bank_services_one_current
  on public.bank_services (bank_id, service_key) where superseded_at is null;

-- ═══════════════════════════════════════════════════════════════════════════
-- READ LAYER
-- Storage is flexible; reads must not be. Nothing in the application should
-- pivot EAV rows on every request.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view public.product_facts_current as
select
  f.id, f.product_id, f.field_key, f.value_num, f.value_text, f.value_bool,
  coalesce(f.unit, p.unit) as unit,
  f.state, f.condition_hash,
  (f.condition_hash <> '') as is_conditional,
  f.source_id, s.key as source_key, s.name_ar as source_name_ar, s.name_en as source_name_en,
  f.source_url, f.source_excerpt, f.source_page, f.effective_date, f.verified_at, f.note,
  p.fact_class, p.max_age_days, p.label_ar, p.label_en,
  (f.verified_at + p.max_age_days) as stale_after,
  /* Field-sensitive, not one global timer: a rate is stale in 30 days, a SWIFT
     code effectively never. */
  (f.state = 'KNOWN' and f.verified_at is not null
     and (f.verified_at + p.max_age_days) < current_date) as is_stale
from public.product_facts f
join public.fact_policy p on p.field_key = f.field_key
left join public.data_sources s on s.id = f.source_id
where f.superseded_at is null;

comment on view public.product_facts_current is
  'Live facts only. Superseded rows are unreachable from here by construction.';


drop view if exists public.bank_products_current;
create view public.bank_products_current as
select
  pr.id, pr.bank_id, b.slug as bank_slug, b.name_ar as bank_name_ar, b.name_en as bank_name_en,
  b.bank_type, b.ownership, b.ticker,
  pr.slug, pr.kind, pr.name_ar, pr.name_en, pr.currency, pr.financing_type, pr.is_active,
  max(f.value_num) filter (where f.field_key = 'rate'            and f.state='KNOWN' and f.condition_hash='') as rate,
  max(f.value_text) filter (where f.field_key = 'rate_basis'     and f.state='KNOWN' and f.condition_hash='') as rate_basis,
  max(f.value_num) filter (where f.field_key = 'min_amount'      and f.state='KNOWN' and f.condition_hash='') as min_amount,
  max(f.value_num) filter (where f.field_key = 'max_amount'      and f.state='KNOWN' and f.condition_hash='') as max_amount,
  max(f.value_num) filter (where f.field_key = 'min_salary'      and f.state='KNOWN' and f.condition_hash='') as min_salary,
  max(f.value_num) filter (where f.field_key = 'min_term_months' and f.state='KNOWN' and f.condition_hash='') as min_term_months,
  max(f.value_num) filter (where f.field_key = 'max_term_months' and f.state='KNOWN' and f.condition_hash='') as max_term_months,
  max(f.value_num) filter (where f.field_key = 'term_months'     and f.state='KNOWN' and f.condition_hash='') as term_months,
  bool_or(f.value_bool) filter (where f.field_key = 'salary_domiciliation_required' and f.state='KNOWN' and f.condition_hash='') as salary_domiciliation_required,
  bool_or(f.value_bool) filter (where f.field_key = 'guarantor_required'  and f.state='KNOWN' and f.condition_hash='') as guarantor_required,
  bool_or(f.value_bool) filter (where f.field_key = 'collateral_required' and f.state='KNOWN' and f.condition_hash='') as collateral_required,

  /* Across ALL known values of the key, conditional or not. `*_from` / `*_to`
     is the band a reader would actually be quoted; the scalars above stay the
     unconditional case so nothing silently merges the two. */
  min(f.value_num) filter (where f.field_key = 'rate'       and f.state='KNOWN') as rate_from,
  max(f.value_num) filter (where f.field_key = 'rate'       and f.state='KNOWN') as rate_to,
  min(f.value_num) filter (where f.field_key = 'max_amount' and f.state='KNOWN') as max_amount_from,
  max(f.value_num) filter (where f.field_key = 'max_amount' and f.state='KNOWN') as max_amount_to,
  count(*) filter (where f.field_key = 'rate' and f.state='KNOWN' and f.condition_hash <> '') as conditional_rates,

  bool_or(f.is_conditional)                                   as has_conditions,
  count(*) filter (where f.state = 'KNOWN')                   as known_facts,
  count(*) filter (where f.state = 'UNKNOWN')                 as unknown_facts,
  count(*) filter (where f.is_stale)                          as stale_facts,
  max(f.verified_at)                                          as last_verified
from public.bank_products pr
join public.banks b on b.id = pr.bank_id
left join public.product_facts_current f on f.product_id = pr.id
group by pr.id, b.slug, b.name_ar, b.name_en, b.bank_type, b.ownership, b.ticker;

comment on view public.bank_products_current is
  'Typed, one row per product. Only UNCONDITIONAL known values are pivoted; `has_conditions` tells the caller a flat comparison would mislead.';

drop view if exists public.bank_facts_stale;
drop view if exists public.bank_services_current;
create view public.bank_services_current as
select bs.bank_id, b.slug as bank_slug, bs.service_key, bs.availability,
       bs.source_id, bs.source_url, bs.verified_at
from public.bank_services bs
join public.banks b on b.id = bs.bank_id
where bs.superseded_at is null;

/* The stale report, as a query rather than a screen. */
create view public.bank_facts_stale as
select b.slug as bank_slug, pr.slug as product_slug, f.field_key,
       f.fact_class, f.verified_at, f.stale_after,
       (current_date - f.stale_after) as days_overdue
from public.product_facts_current f
join public.bank_products pr on pr.id = f.product_id
join public.banks b on b.id = pr.bank_id
where f.is_stale
order by days_overdue desc;

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Public reference data: readable by anyone, writable only by the service role
-- (which bypasses RLS). No table ships with RLS off.

alter table public.banks              enable row level security;
alter table public.bank_products      enable row level security;
alter table public.product_facts      enable row level security;
alter table public.product_conditions enable row level security;
alter table public.bank_services      enable row level security;
alter table public.fact_policy        enable row level security;
alter table public.condition_field    enable row level security;
alter table public.condition_operator enable row level security;

do $$
declare t text;
begin
  foreach t in array array['banks','bank_products','product_facts','product_conditions',
                           'bank_services','fact_policy','condition_field','condition_operator']
  loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select using (true)', t, t);
  end loop;
end $$;

grant select on
  public.banks, public.bank_products, public.product_facts, public.product_conditions,
  public.bank_services, public.fact_policy, public.condition_field, public.condition_operator,
  public.product_facts_current, public.bank_products_current, public.bank_services_current,
  public.bank_facts_stale
to anon, authenticated;
-- Services and identity get freshness too, from the SAME table, so the policy
-- is defined once and joined rather than restated in a loader or a component.
insert into public.fact_policy (field_key, value_type, unit, fact_class, max_age_days, label_ar, label_en) values
  ('svc:atm',                    'boolean',null,'slow',    90,'صراف آلي','ATM'),
  ('svc:mobile_banking',         'boolean',null,'slow',    90,'تطبيق الهاتف','Mobile banking'),
  ('svc:internet_banking',       'boolean',null,'slow',    90,'الخدمات المصرفية عبر الإنترنت','Internet banking'),
  ('svc:cards',                  'boolean',null,'slow',    90,'البطاقات','Cards'),
  ('svc:usd_account',            'boolean',null,'slow',    90,'حساب بالدولار','USD account'),
  ('svc:international_transfer', 'boolean',null,'slow',    90,'الحوالات الخارجية','International transfers'),
  ('svc:salary_domiciliation',   'boolean',null,'slow',    90,'توطين الراتب','Salary domiciliation'),
  ('id:founded',                 'number', null,'identity',3650,'سنة التأسيس','Founded'),
  ('id:hq_city',                 'text',   null,'identity',3650,'المقر','Headquarters'),
  ('id:swift',                   'text',   null,'identity',3650,'سويفت','SWIFT / BIC')
on conflict (field_key) do nothing;

drop view if exists public.bank_facts_stale;
drop view if exists public.bank_services_current;
create view public.bank_services_current as
select bs.bank_id, b.slug as bank_slug, bs.service_key, bs.availability,
       bs.source_id, bs.source_url, bs.source_excerpt, bs.verified_at,
       p.fact_class, p.max_age_days, p.label_ar, p.label_en,
       (bs.verified_at + p.max_age_days) as stale_after,
       (bs.availability <> 'unknown' and bs.verified_at is not null
          and (bs.verified_at + p.max_age_days) < current_date) as is_stale
from public.bank_services bs
join public.banks b on b.id = bs.bank_id
left join public.fact_policy p on p.field_key = 'svc:' || bs.service_key
where bs.superseded_at is null;

grant select on public.bank_services_current to anon, authenticated;

-- The stale report covers services as well as product facts.
create view public.bank_facts_stale as
select b.slug as bank_slug, pr.slug as product_slug, f.field_key,
       f.fact_class, f.verified_at, f.stale_after,
       (current_date - f.stale_after) as days_overdue
from public.product_facts_current f
join public.bank_products pr on pr.id = f.product_id
join public.banks b on b.id = pr.bank_id
where f.is_stale
union all
select s.bank_slug, null, 'svc:' || s.service_key, s.fact_class, s.verified_at, s.stale_after,
       (current_date - s.stale_after)
from public.bank_services_current s
where s.is_stale
order by days_overdue desc;

grant select on public.bank_facts_stale to anon, authenticated;
