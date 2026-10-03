-- «سعر IQWealth» · the parallel dollar rate as the median of three public
-- Baghdad Telegram channels (lib/rates.ts combineChannels). Observations of
-- the median are recorded under 'iqwealth', each input quote kept in the
-- row's raw_excerpt; the two new channels are registered for provenance.
insert into public.data_sources (key, name_ar, name_en, url, kind, reliability, notes) values
  ('iqwealth', 'سعر IQWealth', 'IQWealth rate', 'https://iraqsm.com/fx', 'market', 'medium',
   'Median of the latest Baghdad (Kifah) quote from each public channel posted within 3 hours of the newest; each channel checked for age and a 3% jump. Inputs listed in raw_excerpt.'),
  ('dollariraqi-tg', 'سعر الدولار في العراق (تلغرام)', 'Dollar in Iraq (Telegram)', 'https://t.me/dollariraqi', 'market', 'medium',
   'Public channel posting Samawal, Kifah, Harthiya and the provinces several times a trading day; bid then ask, per 100 or per dollar.'),
  ('dollarprice-tg', 'سعر الدولار اليوم (تلغرام)', 'Dollar price today (Telegram)', 'https://t.me/dollar_price', 'market', 'medium',
   'Public channel posting Baghdad and the provinces about hourly; bid then ask.')
on conflict (key) do nothing;
