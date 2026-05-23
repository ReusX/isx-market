import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import fs   from 'fs'
import path from 'path'

// ── Increase function timeout (Vercel Pro: up to 300s) ────────────────────────
export const maxDuration = 60

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

const SECTOR: Record<string, { en: string; ar: string }> = {
  BANK: { en: 'Banking & Finance',  ar: 'البنوك والمالية'  },
  IND:  { en: 'Industrial',         ar: 'الصناعة'          },
  SVC:  { en: 'Services',           ar: 'الخدمات'          },
  HTL:  { en: 'Hotels & Tourism',   ar: 'الفنادق والسياحة' },
  TEL:  { en: 'Telecommunications', ar: 'الاتصالات'        },
  AGR:  { en: 'Agriculture',        ar: 'الزراعة'          },
  INS:  { en: 'Insurance',          ar: 'التأمين'          },
  INV:  { en: 'Investment',         ar: 'الاستثمار'        },
}

// ── Build prompt (single call → both EN + AR) ─────────────────────────────────
function buildPrompt(
  co: { sym: string; en: string; ar: string; sec: string; mcap: number },
  price: number,
  pct: number,
): string {
  const sec  = SECTOR[co.sec] ?? { en: co.sec, ar: co.sec }
  const mcapB = (co.mcap / 1000).toFixed(2)
  const priceStr = price > 0 ? `${price.toFixed(3)} IQD` : 'N/A'
  const pctStr   = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`

  return `You are a senior financial analyst specializing in the Iraq Stock Exchange (ISX) and Iraqi capital markets.

COMPANY DATA:
- Ticker: ${co.sym}
- English name: ${co.en}
- Arabic name: ${co.ar}
- Sector: ${sec.en} (${sec.ar})
- Current Price: ${priceStr}
- Market Cap: ${mcapB}B IQD
- Recent Change: ${pctStr}

CONTEXT:
The Iraq Stock Exchange (ISX) operates under the Iraq Securities Commission (ISC). Iraqi listed companies file semi-annual and annual reports. Use your knowledge of this company's most recent available financial filings (compare the latest two reporting periods if possible — revenue trends, profit/loss, capital adequacy for banks, operational metrics). Iraqi companies are affected by oil revenue cycles, reconstruction spending, USD/IQD exchange rates, and sector-specific dynamics.

Generate a bilingual investment analysis. Return ONLY valid JSON with this exact structure — no markdown, no explanation, just the JSON:

{
  "en": {
    "summary": "3-4 sentence executive summary comparing recent filing periods and current investment case",
    "bullCase": [
      {"title": "Short positive title (5-7 words)", "body": "2-3 sentences with specific financial reasoning"},
      {"title": "Second bull point title", "body": "2-3 sentences with specific data or trend"},
      {"title": "Third bull point title", "body": "2-3 sentences with specific reasoning"}
    ],
    "bearCase": [
      {"title": "Short risk title (5-7 words)", "body": "2-3 sentences with specific risk details"},
      {"title": "Second bear point title", "body": "2-3 sentences"},
      {"title": "Third bear point title", "body": "2-3 sentences"}
    ],
    "themes": ["Theme 1", "Theme 2", "Theme 3", "Theme 4"],
    "outlook": "2 sentences on near-term outlook based on recent filings and market conditions"
  },
  "ar": {
    "summary": "ملخص تنفيذي 3-4 جمل يقارن آخر فترتين ماليتين والحالة الاستثمارية الراهنة",
    "bullCase": [
      {"title": "عنوان إيجابي قصير 5-7 كلمات", "body": "2-3 جمل بمبررات مالية محددة"},
      {"title": "عنوان النقطة الإيجابية الثانية", "body": "2-3 جمل"},
      {"title": "عنوان النقطة الإيجابية الثالثة", "body": "2-3 جمل"}
    ],
    "bearCase": [
      {"title": "عنوان مخاطرة قصير 5-7 كلمات", "body": "2-3 جمل بتفاصيل المخاطرة"},
      {"title": "عنوان المخاطرة الثانية", "body": "2-3 جمل"},
      {"title": "عنوان المخاطرة الثالثة", "body": "2-3 جمل"}
    ],
    "themes": ["موضوع 1", "موضوع 2", "موضوع 3", "موضوع 4"],
    "outlook": "جملتان عن التوقعات قصيرة المدى بناءً على آخر البيانات المالية"
  }
}`
}

// ── Call Groq (LLaMA 3.3 70B, OpenAI-compatible) ─────────────────────────────
async function callGroq(prompt: string): Promise<{ en: any; ar: any }> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a senior financial analyst specializing in the Iraq Stock Exchange (ISX). Always respond with valid JSON only — no markdown, no explanation.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.65,
      max_tokens: 2048,
    }),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Groq ${res.status}: ${txt.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Empty response from Groq')

  return JSON.parse(text) as { en: any; ar: any }
}

// ── GET: return cached ────────────────────────────────────────────────────────
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
        return NextResponse.json({ en: data.en, ar: data.ar, generated_at: data.generated_at })
      }
    }
  } catch (_) { /* table may not exist */ }

  return NextResponse.json({ error: 'not_found' }, { status: 404 })
}

// ── POST: generate + cache ────────────────────────────────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: { sym: string } },
) {
  const sym = params.sym.toUpperCase()

  try {
    // Load company meta
    const companiesPath = path.join(process.cwd(), 'public', 'data', 'companies.json')
    const companies: any[] = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'))
    const co = companies.find(c => c.sym === sym)
    if (!co) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Live price (best-effort)
    let price = 0, pct = 0
    try {
      const livePath = path.join(process.cwd(), 'public', 'data', 'live.json')
      const live: any = JSON.parse(fs.readFileSync(livePath, 'utf-8'))
      const st = live.stocks?.find((s: any) => s.code === sym)
      if (st) { price = st.close ?? 0; pct = st.pct ?? 0 }
    } catch (_) { /* use defaults */ }

    // Single Groq call → both languages
    const result = await callGroq(buildPrompt(co, price, pct))

    const generated_at = new Date().toISOString()

    // Cache
    try {
      await supabase
        .from('company_analysis')
        .upsert({ sym, en: result.en, ar: result.ar, generated_at }, { onConflict: 'sym' })
    } catch (e) {
      console.error('Supabase write error:', e)
    }

    return NextResponse.json({ en: result.en, ar: result.ar, generated_at })

  } catch (err: any) {
    console.error('Analysis generation error:', err)
    return NextResponse.json({ error: err.message ?? 'Generation failed' }, { status: 500 })
  }
}
