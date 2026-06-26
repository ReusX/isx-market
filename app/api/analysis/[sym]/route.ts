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

// ── Extract embedded JPEG images from a scanned PDF buffer ───────────────────
function extractJpegsFromPdf(buffer: Buffer): Buffer[] {
  const jpegs: Buffer[] = []
  let i = 0
  while (i < buffer.length - 3) {
    // JPEG SOI marker: FF D8 FF
    if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8 && buffer[i + 2] === 0xFF) {
      const start = i
      let j = i + 2
      while (j < buffer.length - 1) {
        // JPEG EOI marker: FF D9
        if (buffer[j] === 0xFF && buffer[j + 1] === 0xD9) {
          const jpeg = buffer.slice(start, j + 2)
          if (jpeg.length > 30000) jpegs.push(jpeg) // skip thumbnails
          i = j + 2
          break
        }
        j++
      }
      if (j >= buffer.length - 1) break
    } else {
      i++
    }
  }
  return jpegs
}

// ── Download a PDF and extract its JPEG pages as base64 ──────────────────────
async function downloadPdfPages(pdfUrl: string): Promise<string[]> {
  const pdfRes = await fetch(pdfUrl, { signal: AbortSignal.timeout(12000) })
  if (!pdfRes.ok) throw new Error(`PDF download failed: ${pdfRes.status}`)
  const buf = Buffer.from(await pdfRes.arrayBuffer())
  const jpegs = extractJpegsFromPdf(buf)
  // Skip page 1 (usually a cover page), send pages 2-4 which have financial tables
  const pages = jpegs.length > 1 ? jpegs.slice(1, 4) : jpegs.slice(0, 3)
  return pages.map(b => b.toString('base64'))
}

// ── Use Llama 4 Scout (vision) to read all filing pages in one call ───────────
async function extractFinancialData(
  reports: ReportPeriod[],
): Promise<string> {
  // Download all PDFs in parallel
  const pdfPagesResults = await Promise.allSettled(
    reports.map(r => downloadPdfPages(r.url).then(pages => ({ label: r.label, pages })))
  )

  const imageContent: any[] = []
  const labelsFound: string[] = []

  for (const result of pdfPagesResults) {
    if (result.status === 'fulfilled') {
      const { label, pages } = result.value
      labelsFound.push(label)
      // Add section header as text
      imageContent.push({ type: 'text', text: `\n--- ${label} filing pages: ---` })
      // Add up to 2 pages per PDF to keep request manageable
      for (const b64 of pages.slice(0, 2)) {
        imageContent.push({
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${b64}` },
        })
      }
    } else {
      console.warn('PDF download failed:', result.reason?.message)
    }
  }

  if (imageContent.length === 0) return ''

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `These are pages from official Iraq Stock Exchange (ISX) financial reports. Documents are in Arabic.

For EACH filing period shown, extract ALL financial figures:
- Revenue / الإيرادات with period dates
- Net profit or loss / صافي الربح أو الخسارة
- Operating expenses / المصروفات التشغيلية
- Total assets / إجمالي الموجودات
- Total liabilities / إجمالي الخصوم
- Shareholders equity / حقوق المساهمين
- EPS / ربحية السهم
- Any other key metrics visible

Format output as:
PERIOD: [period label and dates]
- [Arabic label] / [English label]: [current value] vs [prior period value if shown]

Be precise. Include every number visible. Use the exact values shown in the tables.`,
          },
          ...imageContent,
        ],
      }],
      temperature: 0.1,
      max_tokens: 2500,
    }),
    signal: AbortSignal.timeout(40000),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`Groq vision ${res.status}: ${err.slice(0, 300)}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// ── ISC: fetch 2 most recent report periods ───────────────────────────────────
interface ReportPeriod { label: string; url: string }

async function fetchISCReports(sym: string): Promise<ReportPeriod[]> {
  try {
    const mapPath = path.join(process.cwd(), 'public', 'data', 'isc-map.json')
    const iscMap: Record<string, number> = JSON.parse(fs.readFileSync(mapPath, 'utf-8'))
    const iscId = iscMap[sym]
    if (!iscId) return []

    const res = await fetch(`https://api.isc.gov.iq/api/companies/${iscId}/reports`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []

    const rows: Array<{
      year: string
      q1?: { url: string } | null
      q2?: { url: string } | null
      q3?: { url: string } | null
      q4?: { url: string } | null
      annual?: { url: string } | null
    }> = await res.json()

    const periods: ReportPeriod[] = []
    for (const row of rows) {
      const yr = row.year
      if (row.q3?.url) periods.push({ label: `Q3 ${yr}`, url: row.q3.url })
      else if (row.q2?.url) periods.push({ label: `Q2 ${yr}`, url: row.q2.url })
      else if (row.q1?.url) periods.push({ label: `Q1 ${yr}`, url: row.q1.url })
      if (row.annual?.url) periods.push({ label: `FY ${yr}`, url: row.annual.url })
      if (periods.length >= 2) break
    }
    return periods.slice(0, 2)
  } catch {
    return []
  }
}

// ── Prompt ────────────────────────────────────────────────────────────────────
function buildPrompt(
  co: { sym: string; en: string; ar: string; sec: string; mcap: number },
  price: number,
  pct: number,
  filingText: string,
): string {
  const sec   = SECTOR[co.sec] ?? { en: co.sec, ar: co.sec }
  const mcapB = (co.mcap / 1000).toFixed(2)

  return `You are a senior financial analyst covering the Iraq Stock Exchange (ISX).

COMPANY: ${co.en} (${co.sym}) · ${co.ar}
SECTOR: ${sec.en}
CURRENT PRICE: ${price > 0 ? price.toFixed(3) + ' IQD' : 'N/A'}
MARKET CAP: ${mcapB}B IQD
RECENT CHANGE: ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%

ACTUAL FINANCIAL DATA (extracted via OCR from official ISC filings):
${filingText || 'No filings retrieved · use your training knowledge of this company.'}

TASK: Write an investment analysis grounded in the ACTUAL NUMBERS above.

STRICT RULES:
1. Use ONLY numbers that appear in the filing data above · never invent figures
2. Always state the period (e.g. "Q3 2025", "H1 2025 vs H1 2024")
3. Express IQD values in millions (M) or billions (B) · convert raw numbers accordingly
4. For banks: include capital adequacy, NPL ratio, deposit growth
5. For telecoms: include ARPU, subscriber count, EBITDA margin if available
6. For industrials: include gross margin, production volumes if available
7. Verdict must be exactly one of: "Very Bullish" / "Bullish" / "Mildly Bullish" / "Neutral" / "Mildly Bearish" / "Bearish" / "Very Bearish"
8. If a specific metric isn't in the filings, omit that KPI rather than inventing it

Return ONLY valid JSON, no markdown:

{
  "en": {
    "headline": "8-12 word headline with a specific number from the filings",
    "summary": "3-4 sentences with exact IQD figures and YoY % changes from the actual filings",
    "kpis": [
      {"label": "Revenue", "value": "X.X B IQD", "change": "+X% YoY"},
      {"label": "Net Profit", "value": "X.X B IQD", "change": "+X% YoY"},
      {"label": "Most relevant sector metric", "value": "X", "change": "vs prior period"}
    ],
    "bullCase": [
      {"title": "Title with specific number from filing", "body": "2-3 sentences citing exact figures"},
      {"title": "Second bull point with data", "body": "2-3 sentences with specific data"},
      {"title": "Third bull point with data", "body": "2-3 sentences with specific data"}
    ],
    "bearCase": [
      {"title": "Risk title with specific figure", "body": "2-3 sentences with specific risk figures"},
      {"title": "Second risk", "body": "2-3 sentences with data"},
      {"title": "Third risk", "body": "2-3 sentences with data"}
    ],
    "verdict": "Bullish",
    "verdictBody": "2-3 sentences citing the single most compelling data point from the filings",
    "themes": ["Theme with filing number", "Theme 2", "Theme 3", "Theme 4"],
    "outlook": "2 sentences on near-term outlook based on filing trends or stated guidance"
  },
  "ar": {
    "headline": "عنوان 8-12 كلمة بأرقام حقيقية من التقارير",
    "summary": "3-4 جمل بأرقام من التقارير الرسمية مع مقارنة سنوية",
    "kpis": [
      {"label": "الإيرادات", "value": "X.X مليار دينار", "change": "+X% سنوياً"},
      {"label": "صافي الربح", "value": "X.X مليار دينار", "change": "+X% سنوياً"},
      {"label": "أهم مؤشر للقطاع", "value": "X", "change": "مقارنة بالفترة السابقة"}
    ],
    "bullCase": [
      {"title": "عنوان إيجابي بأرقام من التقرير", "body": "2-3 جمل بأرقام حقيقية"},
      {"title": "النقطة الإيجابية الثانية", "body": "2-3 جمل بأرقام محددة"},
      {"title": "النقطة الإيجابية الثالثة", "body": "2-3 جمل بأرقام محددة"}
    ],
    "bearCase": [
      {"title": "عنوان مخاطرة بأرقام من التقرير", "body": "2-3 جمل بأرقام مخاطر محددة"},
      {"title": "المخاطرة الثانية", "body": "2-3 جمل بأرقام"},
      {"title": "المخاطرة الثالثة", "body": "2-3 جمل بأرقام"}
    ],
    "verdict": "إيجابي",
    "verdictBody": "2-3 جمل تقييم شامل مع أهم رقم من التقارير",
    "themes": ["موضوع بأرقام من التقرير", "موضوع 2", "موضوع 3", "موضوع 4"],
    "outlook": "جملتان عن التوقعات بناءً على أرقام التقارير"
  }
}`
}

// ── Groq text (analysis) ──────────────────────────────────────────────────────
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
          content: 'You are a senior financial analyst. Use ONLY numbers explicitly stated in the filing data. Never invent or estimate figures. Return valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
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

    // Step 1: Get 2 most recent PDF URLs from ISC
    const reports = await fetchISCReports(sym)
    console.log(`[${sym}] ISC reports found:`, reports.map(r => r.label))

    // Step 2: Download PDFs + extract financial data with Llama 4 Scout vision
    let filingText = ''
    if (reports.length > 0) {
      try {
        filingText = await extractFinancialData(reports)
        console.log(`[${sym}] Extracted ${filingText.length} chars from filings`)
      } catch (e: any) {
        console.warn(`[${sym}] Vision extraction failed:`, e.message)
      }
    }

    // Step 3: Analyze with Groq LLaMA 3.3 70B
    const prompt = buildPrompt(co, price, pct, filingText)
    const result = await callGroq(prompt)
    const generated_at = new Date().toISOString()

    // Step 4: Cache
    try {
      await supabase
        .from('company_analysis')
        .upsert({ sym, en: result.en, ar: result.ar, generated_at }, { onConflict: 'sym' })
    } catch (e) { console.error('Supabase write:', e) }

    return NextResponse.json({
      en: result.en,
      ar: result.ar,
      generated_at,
      sources: reports.map(r => r.label),
    })
  } catch (err: any) {
    console.error('Analysis error:', err)
    return NextResponse.json({ error: err.message ?? 'Generation failed' }, { status: 500 })
  }
}
