-- Push notifications for the IQWealth app (Firebase Cloud Messaging).
--
-- Alerts belong to the DEVICE, not to an account: most readers never sign in,
-- and a price alert should work the moment the app is installed. The FCM
-- registration token is the device's identity here; it is long, random and
-- held only by that phone, which is also what the API checks before letting a
-- caller read or change a device's topics and alerts.
--
-- All three tables are server-only: RLS on, no policies, so the anon key can
-- neither read tokens nor enumerate alerts. Every access goes through
-- app/api/push (service role).

create table if not exists public.push_devices (
  token       text primary key check (char_length(token) between 64 and 4096),
  platform    text not null check (platform in ('android', 'ios')),
  topics      text[] not null default '{}',
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  -- set when FCM reports the token dead (app uninstalled, data cleared)
  disabled_at timestamptz
);

create table if not exists public.push_alerts (
  id              uuid primary key default gen_random_uuid(),
  device_token    text not null references public.push_devices(token) on delete cascade,
  kind            text not null check (kind in ('fx', 'gold', 'stock')),
  symbol          text check (kind <> 'stock' or symbol is not null),
  op              text not null check (op in ('above', 'below')),
  target          numeric not null check (target > 0),
  created_at      timestamptz not null default now(),
  -- one-shot: set when the alert fires, never re-armed automatically
  triggered_at    timestamptz,
  triggered_value numeric
);
create index if not exists push_alerts_live on public.push_alerts (kind) where triggered_at is null;
create index if not exists push_alerts_device on public.push_alerts (device_token);

-- What the checker last sent, so a 15-minute cron never repeats itself:
-- e.g. key 'fx' → {"date": "2026-09-25", "value": 157750}
create table if not exists public.push_state (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.push_devices enable row level security;
alter table public.push_alerts  enable row level security;
alter table public.push_state   enable row level security;
