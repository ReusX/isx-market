-- ISX monthly report tables — v2
-- Run this in Supabase SQL Editor (or psql)

-- ── foreign_flow_daily ───────────────────────────────────────────────────────
-- Non-Iraqi buy / sell per trading session
create table if not exists foreign_flow_daily (
    id          bigserial primary key,
    year        smallint  not null,
    month       smallint  not null,
    date        date      not null,
    side        text      not null check (side in ('buy','sell')),
    volume      numeric,
    value       numeric,
    trades      integer,
    companies   integer,
    created_at  timestamptz default now()
);
create unique index if not exists foreign_flow_daily_unique
    on foreign_flow_daily (date, side);

-- ── foreign_flow_sector ──────────────────────────────────────────────────────
-- Non-Iraqi buy / sell by sector for the month
create table if not exists foreign_flow_sector (
    id          bigserial primary key,
    year        smallint  not null,
    month       smallint  not null,
    sector      text      not null,
    side        text      not null check (side in ('buy','sell')),
    volume      numeric,
    value       numeric,
    trades      integer,
    companies   integer,
    listed      integer,
    created_at  timestamptz default now()
);
create unique index if not exists foreign_flow_sector_unique
    on foreign_flow_sector (year, month, sector, side);

-- ── company_caps_monthly ─────────────────────────────────────────────────────
-- Per-company listed shares, closing price, and market cap (Table 14)
create table if not exists company_caps_monthly (
    id          bigserial primary key,
    year        smallint  not null,
    month       smallint  not null,
    ticker      text      not null,
    name_en     text,
    capital     numeric,
    price       numeric,
    market_cap  numeric,
    created_at  timestamptz default now()
);
create unique index if not exists company_caps_monthly_unique
    on company_caps_monthly (year, month, ticker);

-- ── ownership_monthly ────────────────────────────────────────────────────────
-- Iraqi vs foreign share ownership per company (Table 38)
create table if not exists ownership_monthly (
    id                bigserial primary key,
    year              smallint  not null,
    month             smallint  not null,
    name_ar           text      not null,
    sector            text,
    capital           numeric,
    deposited_capital numeric,
    deposit_ratio     numeric,
    iraqi_shares      numeric,
    foreign_shares    numeric,
    iraqi_count       integer,
    foreign_count     integer,
    created_at        timestamptz default now()
);
create unique index if not exists ownership_monthly_unique
    on ownership_monthly (year, month, name_ar);

-- ── major_shareholders ───────────────────────────────────────────────────────
-- Top shareholders per company (Table 39)
create table if not exists major_shareholders (
    id               bigserial primary key,
    year             smallint  not null,
    month            smallint  not null,
    company_name_ar  text      not null,
    sector           text,
    rank             smallint  not null,
    name_ar          text,
    nationality      text      check (nationality in ('Iraqi','Foreign')),
    curr_shares      numeric,
    curr_pct         numeric,
    prev_shares      numeric,
    prev_pct         numeric,
    change_pct       numeric,
    created_at       timestamptz default now()
);
create unique index if not exists major_shareholders_unique
    on major_shareholders (year, month, company_name_ar, rank);

-- ── depository_monthly ───────────────────────────────────────────────────────
-- Deposited shares and depositor counts per company (Table 26)
create table if not exists depository_monthly (
    id                 bigserial primary key,
    year               smallint  not null,
    month              smallint  not null,
    name_ar            text      not null,
    sector             text,
    capital            numeric,
    deposited_shares   numeric,
    individual_iraqi   integer,
    individual_foreign integer,
    entity_iraqi       integer,
    entity_foreign     integer,
    created_at         timestamptz default now()
);
create unique index if not exists depository_monthly_unique
    on depository_monthly (year, month, name_ar);

-- ── capital_events ───────────────────────────────────────────────────────────
-- Capital increases, pledges, family/inheritance transfers (Tables 28/34)
create table if not exists capital_events (
    id           bigserial primary key,
    year         smallint  not null,
    month        smallint  not null,
    name_ar      text      not null,
    event_type   text,
    old_capital  numeric,
    new_shares   numeric,
    new_capital  numeric,
    count        integer,
    created_at   timestamptz default now()
);
create unique index if not exists capital_events_unique
    on capital_events (year, month, name_ar, event_type);

-- RLS: allow anon reads (same pattern as existing tables)
alter table foreign_flow_daily    enable row level security;
alter table foreign_flow_sector   enable row level security;
alter table company_caps_monthly  enable row level security;
alter table ownership_monthly     enable row level security;
alter table major_shareholders    enable row level security;
alter table depository_monthly    enable row level security;
alter table capital_events        enable row level security;

create policy "public read" on foreign_flow_daily    for select using (true);
create policy "public read" on foreign_flow_sector   for select using (true);
create policy "public read" on company_caps_monthly  for select using (true);
create policy "public read" on ownership_monthly     for select using (true);
create policy "public read" on major_shareholders    for select using (true);
create policy "public read" on depository_monthly    for select using (true);
create policy "public read" on capital_events        for select using (true);
