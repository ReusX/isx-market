/**
 * AI Analysis API
 *
 * Supabase table (run once in your Supabase SQL editor):
 *
 *   CREATE TABLE IF NOT EXISTS company_analysis (
 *     sym          TEXT PRIMARY KEY,
 *     en           JSONB NOT NULL,
 *     ar           JSONB NOT NULL,
 *     generated_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import fs   from 'fs'
import path from 'path'

// ── Supabase (server-side only, service role) ─────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

// ── Sector labels ─────────────────────────────────────────────────────────────
const SECTOR: Record<string, { en: string; ar: string }> = {
  BANK: { en: 'Banking & Finance',   ar: 'البنوك والمالية'       },
  IND:  { en: 'Industrial',          ar: 'الصناعة'               },
  SVC:  { en: 'Services',            ar: 'الخدمات'               },
  HTL:  { en: 'Hotels & Tourism',    ar: 'الفنادق والسياحة'      },
  TEL:  { en: 'Telecommunications',  ar: 'الاتصالات'             },
  AGR:  { en: 'Agriculture',         ar: 'الزراعة'               },
  INS:  { en: 'Insurance',           ar: 'التأمين'               },
  INV:  { en: 'Investment',          ar: 'الاستثمار'             },
}

// ── Build Gemini prompt ───────────────────────────────────────────────────────
function buildPrompt(
  co: { sym: string; en: string; ar: string; sec: string; mcap: number },
  price: number,
  pct: number,
  lang: 'en' | 'ar',
): string {
  const sec = SECTOR[co.sec] ?? { en: co.sec, ar: co.sec }
  const mcapB = (co.mcap / 1000).toFixed(2)

  if (lang === 'ar') {
    return `أنت محلل مالي متخصص في بورصة العراق (ISX) وأسواق المال العراقية.

بيانات الشركة:
- الشركة: ${co.ar} (${co.en})
- الرمز: ${co.sym}
- القطاع: ${sec.ar}
- السعر الحالي: ${price > 0 ? price.toFixed(3) + ' دينار عراقي' : 'غير متوفر'}
- القيمة السوقية: ${mcapB} مليار دينار
- التغيّر الأخير: ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%

بورصة العراق (ISX) تعمل تحت إشراف هيئة الأوراق المالية العراقية. الشركات العراقية تتأثر بالاعتماد على النفط وجهود إعادة الإعمار واستقرار الدينار مقابل الدولار.

أنشئ تحليلاً استثمارياً شاملاً. أعد JSON فقط بهذا الشكل الدقيق بدون أي نص إضافي:
{
  "summary": "ملخص تنفيذي 2-3 جمل يوضح الوضع الاستثماري الراهن للشركة",
  "bullCase": [
    {"title": "عنوان إيجابي قصير", "body": "شرح مفصل 2-3 جمل للنقطة الإيجابية"},
    {"title": "عنوان إيجابي ثانٍ", "body": "شرح مفصل 2-3 جمل للنقطة الثانية"},
    {"title": "عنوان إيجابي ثالث", "body": "شرح مفصل 2-3 جمل للنقطة الثالثة"}
  ],
  "bearCase": [
    {"title": "عنوان مخاطرة قصير", "body": "شرح مفصل 2-3 جمل للمخاطرة"},
    {"title": "عنوان مخاطرة ثانٍ", "body": "شرح مفصل 2-3 جمل"},
    {"title": "عنوان مخاطرة ثالث", "body": "شرح مفصل 2-3 جمل"}
  ],
  "themes": ["موضوع1", "موضوع2", "موضوع3", "موضوع4"],
  "outlook": "جملة أو جملتان عن التوقعات المستقبلية للشركة"
}`
  }

  return `You are a financial analyst specializing in the Iraq Stock Exchange (ISX) and Iraqi capital markets.

Company Data:
- Company: ${co.en} (${co.ar})
- Ticker: ${co.sym}
- Sector: ${sec.en}
- Current Price: ${price > 0 ? price.toFixed(3) + ' IQD' : 'N/A'}
- Market Cap: ${mcapB}B IQD
- Recent Change: ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%

The Iraq Stock Exchange (ISX) operates under the Iraq Securities Commission. Iraqi companies are subject to oil revenue dependence, reconstruction momentum, and IQD/USD dynamics.

Generate a comprehensive investment analysis. Return ONLY valid JSON, no extra text:
{
  "summary": "2-3 sentence executive summary of the company's current investment case",
  "bullCase": [
    {"title": "Short positive title", "body": "2-3 sentence detailed explanation"},
    {"title": "Second positive title", "body": "2-3 sentence detailed explanation"},
    {"title": "Third positive title", "body": "2-3 sentence detailed explanation"}
  ],
  "bearCase": [
    {"title": "Short risk title", "body": "2-3 sentence detailed explanation"},
    {"title": "Second risk title", "body": "2-3 sentence detailed explanation"},
    {"title": "Third risk title", "body": "2-3 sentence detailed explanation"}
  ],
  "themes": ["theme1", "theme2", "theme3", "theme4"],
  "outlook": "1-2 sentence forward-looking statement"
}`
}

// ── Call Gemini ───────────────────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<any> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
          maxOutputTokens: 1500,
        },
      }),
    },
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini ${res.status}: ${err}`)
  }
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty Gemini response')
  return JSON.parse(text)
}

// ── GET: return cached analysis ───────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { sym: string } },
) {
  const sym = params.sym.toUpperCase()

  try {
    const { data, error } = await supabase
      .from('company_analysis')
      .select('en, ar, generated_at')
      .eq('sym', sym)
      .single()

    if (!error && data) {
      const age = Date.now() - new Date(data.generated_at).getTime()
      if (age < CACHE_TTL_MS) {
        return NextResponse.json({
          en: data.en,
          ar: data.ar,
          generated_at: data.generated_at,
        })
      }
    }
  } catch (_e) {
    // table may not exist yet — treat as miss
  }

  return NextResponse.json({ error: 'not_found' }, { status: 404 })
}

// ── POST: generate (and cache) ────────────────────────────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: { sym: string } },
) {
  const sym = params.sym.toUpperCase()

  // Load company meta from public/data/companies.json
  const companiesPath = path.join(process.cwd(), 'public', 'data', 'companies.json')
  const companies: any[] = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'))
  const co = companies.find(c => c.sym === sym)
  if (!co) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  // Try to get live price
  let price = 0, pct = 0
  try {
    const livePath = path.join(process.cwd(), 'public', 'data', 'live.json')
    const live: any = JSON.parse(fs.readFileSync(livePath, 'utf-8'))
    const st = live.stocks?.find((s: any) => s.code === sym)
    if (st) { price = st.close ?? 0; pct = st.pct ?? 0 }
  } catch (_e) { /* live data unavailable */ }

  // Generate EN + AR in parallel
  const [en, ar] = await Promise.all([
    callGemini(buildPrompt(co, price, pct, 'en')),
    callGemini(buildPrompt(co, price, pct, 'ar')),
  ])

  const generated_at = new Date().toISOString()

  // Cache in Supabase (best-effort)
  try {
    await supabase
      .from('company_analysis')
      .upsert({ sym, en, ar, generated_at }, { onConflict: 'sym' })
  } catch (_e) {
    console.error('Analysis cache write failed — did you create the table?')
  }

  return NextResponse.json({ en, ar, generated_at })
}
