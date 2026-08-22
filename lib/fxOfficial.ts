/**
 * The CBI's official rate is a POLICY rate, not a market quote — it has sat at
 * 1,320 since February 2023 and moves only when the Central Bank decides it
 * does, so there is nothing to scrape. Hence a constant, but a single one, with
 * the date it was last checked. Update both together.
 *
 * It lives in its own leaf module because the client FX page needs it and
 * lib/fxCopy.ts also exports `getFx`, which pulls `lib/rates.ts` and from
 * there `next/headers` — server-only, and fatal the moment a client component
 * imports anything from that file.
 */
export const CBI_OFFICIAL_RATE = 1320
export const CBI_RATE_CONFIRMED = '2026-08-06'
