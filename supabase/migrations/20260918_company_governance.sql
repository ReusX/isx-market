-- Auditor's report + board report fields per annual filing, extracted from the
-- ISC PDF. One row per (ticker, fiscal_year). `raw` keeps the model's full
-- answer for audit; the typed columns are what pages read.
create table if not exists company_governance (
  ticker text not null,
  fiscal_year int not null,
  report_id int references financial_reports(id),
  auditor_firm text,
  audit_opinion text check (audit_opinion in ('unqualified','qualified','adverse','disclaimer','unknown')),
  emphasis_of_matter text,
  going_concern boolean,
  dividend_per_share numeric,        -- IQD per share, proposed/approved for the year
  dividend_total numeric,            -- IQD
  dividend_note text,
  capital_change text,
  branches int,
  employees int,
  top_shareholders jsonb,            -- [{name, pct}]
  chairman text,
  managing_director text,
  confidence numeric,
  model text,
  raw jsonb,
  extracted_at timestamptz default now(),
  reviewed boolean default false,
  primary key (ticker, fiscal_year)
);
alter table company_governance enable row level security;
create policy "public read reviewed governance" on company_governance for select using (true);
grant select on company_governance to anon, authenticated;

-- routine key-audit-matters kept apart from a real emphasis paragraph
alter table company_governance add column if not exists key_audit_matters text;
