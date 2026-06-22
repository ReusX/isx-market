-- Portfolio holdings + price alerts: per-user JSONB on profiles.
-- The app works fully on localStorage without these columns; once present,
-- signed-in users get cloud persistence + cross-device sync (see
-- lib/portfolio.ts useSyncedList). Additive and idempotent.
--
-- portfolio:    Lot[]   = [{ id, sym, qty, price, date?, note? }]
-- price_alerts: Alert[] = [{ id, sym, dir, target, createdAt, basePrice, triggeredAt? }]
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio    jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS price_alerts jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Existing RLS on profiles already restricts each user to their own row, so
-- these columns inherit the same protection — no extra policy needed.
