/**
 * The open-data envelope: every /data/*.json answer carries the same header
 * so a consumer (a person, a script, an AI agent) knows what it is holding,
 * how fresh it is, and how to credit it. Figures are session-end, never
 * real-time — the envelope says so in words, not just in a timestamp.
 */
export const OPEN_DATA = {
  publisher: 'IQWealth (iraqsm.com)',
  license: 'Free to use with attribution to IQWealth (iraqsm.com). Not real-time: figures are as of the session or reading stated in asOf.',
  docs: 'https://iraqsm.com/llms.txt',
}
export function envelope<T extends object>(kind: string, asOf: string | null, source: string, page: string, body: T) {
  return { kind, asOf, source, page: `https://iraqsm.com${page}`, ...OPEN_DATA, generatedAt: new Date().toISOString(), ...body }
}
export const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400' }
