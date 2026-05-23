import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import fs   from 'fs'
import path from 'path'

export const maxDuration = 60

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

// ── Prompt ────────────────────────────────────────────────────────────────────
function buildPrompt(
  co: { sym: string; en: string; ar: string; sec: string; mcap: number },
  price: number,
  pct: number,
): string {
  const sec   = SECTOR[co.sec] ?? { en: co.sec, ar: co.sec }
  const mcapB = (co.mcap / 1000).toFixed(2)

  return `You are a senior financial analyst covering the Iraq Stock Exchange (ISX).

COMPANY: ${co.en} (${co.sym}) — ${co.ar}
SECTOR: ${sec.en}
CURRENT PRICE: ${price > 0 ? price.toFixed(3) + ' IQD' : 'N/A'}
MARKET CAP: ${mcapB}B IQD
RECENT CHANGE: ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%

TASK: Generate a data-driven investment analysis using your knowledge of this company's most recent financial filings and publicly available data.

STRICT RULES — EVERY SECTION MUST:
1. Include SPECIFIC numbers: actual revenue figures in IQD billions/millions, YoY % changes, net profit/loss, capital adequacy ratios (for banks), loan-to-deposit ratios, dividend yields, EPS — whatever is most relevant for this sector
2. Compare the TWO most recent reporting periods (e.g. H1 2024 vs H1 2023, or FY2023 vs FY2022)
3. NEVER write vague statements like "the company has strong growth" — always say "revenue grew X% YoY to Y billion IQD"
4. For banks: include capital adequacy ratio, non-performing loan ratio, deposit growth, net interest margin
5. For telecoms: include subscriber count, ARPU trends, EBITDA margin
6. For industrials: include production volumes, gross margin, capacity utilization
7. Verdict must be one of: "Very Bullish" / "Bullish" / "Mildly Bullish" / "Neutral" / "Mildly Bearish" / "Bearish" / "Very Bearish"

Return ONLY valid JSON, no markdown:

{
  "en": {
    "headline": "Punchy 8-12 word title summarizing the key financial story (like a newspaper headline)",
    "summary": "3-4 sentences packed with specific numbers: revenue figures, YoY growth rates, profit/loss amounts, and key metrics comparing the two most recent periods",
    "kpis": [
      {"label": "Revenue", "value": "X.X B IQD", "change": "+X% YoY"},
      {"label": "Net Profit", "value": "X.X B IQD", "change": "+X% YoY"},
      {"label": "Most relevant metric for this sector", "value": "X", "change": "vs prior period"}
    ],
    "bullCase": [
      {"title": "5-7 word title with a number if possible", "body": "2-3 sentences. MUST include at least one specific figure or % change. E.g. 'Net profit surged 34% YoY to 47B IQD in H1 2024, driven by...'"},
      {"title": "Second bull point", "body": "2-3 sentences with specific data"},
      {"title": "Third bull point", "body": "2-3 sentences with specific data"}
    ],
    "bearCase": [
      {"title": "5-7 word risk title with data", "body": "2-3 sentences with specific risk figures"},
      {"title": "Second risk", "body": "2-3 sentences with data"},
      {"title": "Third risk", "body": "2-3 sentences with data"}
    ],
    "verdict": "Bullish",
    "verdictBody": "2-3 sentences overall assessment with the most compelling data point driving the verdict",
    "themes": ["Theme with data", "Theme 2", "Theme 3", "Theme 4"],
    "outlook": "2 sentences on near-term outlook referencing specific guidance, upcoming catalysts, or macro factors with numbers"
  },
  "ar": {
    "headline": "عنوان صحفي 8-12 كلمة يلخص القصة المالية الرئيسية بأرقام محددة",
    "summary": "3-4 جمل مكثفة بأرقام محددة: إيرادات، نمو سنوي، أرباح/خسائر، مقارنة آخر فترتين ماليتين",
    "kpis": [
      {"label": "الإيرادات", "value": "X.X مليار دينار", "change": "+X% سنوياً"},
      {"label": "صافي الربح", "value": "X.X مليار دينار", "change": "+X% سنوياً"},
      {"label": "أهم مؤشر للقطاع", "value": "X", "change": "مقارنة بالفترة السابقة"}
    ],
    "bullCase": [
      {"title": "عنوان إيجابي 5-7 كلمات بأرقام", "body": "2-3 جمل تحتوي على رقم محدد أو نسبة نمو. مثال: ارتفع صافي الربح 34% سنوياً إلى 47 مليار دينار"},
      {"title": "النقطة الإيجابية الثانية", "body": "2-3 جمل بأرقام محددة"},
      {"title": "النقطة الإيجابية الثالثة", "body": "2-3 جمل بأرقام محددة"}
    ],
    "bearCase": [
      {"title": "عنوان مخاطرة 5-7 كلمات بأرقام", "body": "2-3 جمل بأرقام مخاطر محددة"},
      {"title": "المخاطرة الثانية", "body": "2-3 جمل بأرقام"},
      {"title": "المخاطرة الثالثة", "body": "2-3 جمل بأرقام"}
    ],
    "verdict": "إيجابي",
    "verdictBody": "2-3 جمل تقييم شامل مع أهم نقطة بيانات تدعم الحكم",
    "themes": ["موضوع بأرقام", "موضوع 2", "موضوع 3", "موضوع 4"],
    "outlook": "جملتان عن التوقعات مع أرقام محددة أو محفزات قادمة"
  }
}`
}

// ── Groq ──────────────────────────────────────────────────────────────────────
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
          content: 'You are a senior financial analyst covering the Iraq Stock Exchange. You ALWAYS use specific numbers, YoY comparisons, and actual financial data. Never write vague statements. Return valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 3000,
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

// ── GET: cached ───────────────────────────────────────────────────────────────
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
  } catch (_) {}
  return NextResponse.json({ error: 'not_found' }, { status: 404 })
}

// ── POST: generate + cache ────────────────────────────────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: { sym: string } },
) {
  const sym = params.sym.toUpperCase()
  try {
    const companiesPath = path.join(process.cwd(), 'public', 'data', 'companies.json')
    const companies: any[] = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'))
    const co = companies.find(c => c.sym === sym)
    if (!co) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

    let price = 0, pct = 0
    try {
      const livePath = path.join(process.cwd(), 'public', 'data', 'live.json')
      const live: any = JSON.parse(fs.readFileSync(livePath, 'utf-8'))
      const st = live.stocks?.find((s: any) => s.code === sym)
      if (st) { price = st.close ?? 0; pct = st.pct ?? 0 }
    } catch (_) {}

    const result = await callGroq(buildPrompt(co, price, pct))
    const generated_at = new Date().toISOString()

    try {
      await supabase
        .from('company_analysis')
        .upsert({ sym, en: result.en, ar: result.ar, generated_at }, { onConflict: 'sym' })
    } catch (e) { console.error('Supabase write:', e) }

    return NextResponse.json({ en: result.en, ar: result.ar, generated_at })
  } catch (err: any) {
    console.error('Analysis error:', err)
    return NextResponse.json({ error: err.message ?? 'Generation failed' }, { status: 500 })
  }
}
