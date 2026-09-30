/**
 * Gold, US dollars per troy ounce: the monthly average for JANUARY of each
 * year (the moment «شارع المال» imagines you walking in with your million).
 *
 * Snapshot of the open «gold-prices» dataset (github.com/datasets/gold-prices,
 * monthly.csv), taken 2026-09-30; its last row then was 2026-08 at 4411.000.
 * Only the past lives here: «today» always comes from the live /gold source.
 */
export const GOLD_USD_JAN: Record<number, number> = {
  2010: 1118,
  2011: 1360,
  2012: 1654,
  2013: 1672,
  2014: 1244,
  2015: 1251,
  2016: 1098,
  2017: 1192,
  2018: 1331,
  2019: 1292,
  2020: 1561,
  2021: 1867,
  2022: 1816,
  2023: 1898,
  2024: 2034,
  2025: 2710,
  2026: 4753,
}
export const GOLD_SOURCE = { name: 'datasets/gold-prices', url: 'https://github.com/datasets/gold-prices' }
