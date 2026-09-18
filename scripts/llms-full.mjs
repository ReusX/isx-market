#!/usr/bin/env node
/* Regenerates public/llms-full.txt from public/data/companies.json — every
   ticker, its names and sector, and the three page URLs. Run after the
   company list changes:  node scripts/llms-full.mjs */
import { readFileSync, writeFileSync } from 'node:fs'
const cos = JSON.parse(readFileSync('public/data/companies.json', 'utf8'))
const SECTOR = { BANK: 'Banks', IND: 'Industry', SVC: 'Services', HTL: 'Hotels & Tourism', TEL: 'Telecom', AGR: 'Agriculture', INS: 'Insurance', INV: 'Investment' }
const by = new Map()
for (const c of cos) { const k = SECTOR[c.sec] ?? c.sec ?? 'Other'; if (!by.has(k)) by.set(k, []); by.get(k).push(c) }
const order = ['Banks', 'Industry', 'Services', 'Hotels & Tourism', 'Telecom', 'Agriculture', 'Insurance', 'Investment']
let out = `# IQWealth — iraqsm.com — Full Company Index

> Every company listed on the Iraq Stock Exchange (ISX), grouped by sector. Each has https://iraqsm.com/c/{TICKER} (last-session price, chart, financial facts, generated profile and FAQ), https://iraqsm.com/c/{TICKER}/financials (income statement, balance sheet, ratios by year and quarter), and, for filings with extracted figures, https://iraqsm.com/c/{TICKER}/results/{year}-{q1|q2|q3|q4|annual} (a written results report). English mirror under /en. Prices in Iraqi dinars (IQD), updated once per trading session.

Total: ${cos.length} companies. Generated from the site's company list on ${new Date().toISOString().slice(0, 10)}.
`
for (const sec of [...order, ...[...by.keys()].filter((k) => !order.includes(k))]) {
  const list = (by.get(sec) ?? []).sort((a, b) => a.sym.localeCompare(b.sym))
  if (!list.length) continue
  out += `\n## ${sec} (${list.length})\n\n`
  for (const c of list) {
    const name = [c.en, c.ar].filter(Boolean).join(' / ')
    out += `- [${c.sym} — ${name}](https://iraqsm.com/c/${c.sym}) · [financials](https://iraqsm.com/c/${c.sym}/financials)\n`
  }
}
writeFileSync('public/llms-full.txt', out)
console.log(`llms-full.txt: ${cos.length} companies, ${by.size} sectors`)
