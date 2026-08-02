import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

const MODEL_ID = process.env.MODEL_ID || process.env.AI_VISION_MODEL || 'gpt-4o-mini'
const BASE_URL = (process.env.MODEL_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
const API_KEY = process.env.MODEL_API_KEY || process.env.OPENAI_API_KEY
const UA = 'FoodlyImageRefresher/1.0 (contact: dev@foodly.app)'
const BAD_EXT = /\.(pdf|svg|ogg|ogv|webm|tif|tiff|gif|eps|psd|mp3|wav|txt|djvu)$/i

interface Verdict {
  match: boolean
  bestIndex: number
  confidence: number
}

const LIMIT = Number(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || 500)
const DELAY = 350

async function chat(prompt: string, images: string[] = []): Promise<string> {
  const content: any[] = [{ type: 'text', text: prompt }]
  for (const url of images) content.push({ type: 'image_url', image_url: { url } })
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL_ID,
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' },
      max_completion_tokens: 160,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
  const json = await res.json()
  const text: string | undefined = json?.choices?.[0]?.message?.content
  if (!text) throw new Error('Empty model response')
  return text.replace(/```json|```/g, '').trim()
}

async function translateQuery(title: string): Promise<string> {
  const prompt = `Translate this food product name into concise English keywords (3-8 words) best suited for an image search. If it is a Vietnamese dish, use the common English/Vietnamese name people search for. Respond ONLY valid JSON: {"query":"english keywords"}.\nProduct: "${title}"`
  try {
    const parsed = JSON.parse(await chat(prompt)) as { query?: string }
    return parsed.query?.trim() || title
  } catch {
    return title
  }
}

async function searchOpenFoodFacts(query: string): Promise<string[]> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=6&fields=product_name,image_front_url`
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) return []
    const json = await res.json()
    return (json.products || [])
      .map((p: any) => p.image_front_url)
      .filter((u: string) => typeof u === 'string' && u.startsWith('http'))
  } catch {
    return []
  }
}

async function searchCommons(query: string): Promise<string[]> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url&iiurlwidth=600&gsrsearch=${encodeURIComponent(query)}`
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) return []
    const json = await res.json()
    const pages = json?.query?.pages ? Object.values(json.query.pages) : []
    return pages
      .filter((p: any) => {
        const title: string = p.title || ''
        const url: string = p.imageinfo?.[0]?.thumburl || ''
        if (BAD_EXT.test(title) || BAD_EXT.test(url)) return false
        if (!url.includes('wikipedia/commons')) return false
        if (/djvu|archive\.org|scan/i.test(url + ' ' + title)) return false
        if (/\bIA\b|newspaper|La Stampa/i.test(title)) return false
        return true
      })
      .map((p: any) => p.imageinfo[0].thumburl)
  } catch {
    return []
  }
}

async function verifyImages(title: string, urls: string[]): Promise<Verdict> {
  const prompt = `You are a strict product-photo reviewer. I will send ${urls.length} candidate images and one product name. Choose the SINGLE best image that clearly shows that product.

Product: "${title}"

Rules:
- Look at EVERY image carefully. Only pick one that unambiguously shows the product.
- For a packaged/branded item (beer, chips, milk tea, noodles, soda, snacks...), only accept an image showing that exact product or its packaging. Reject generic food photos, logos, posters, documents, book scans, or anything unrelated.
- For a prepared dish (banh mi, bun cha, pho, bento...), accept a clear photo of the dish itself. Reject book scans, newspaper pages, menus, or non-food images.
- If NONE of the images clearly shows the product, respond match:false. Returning match:false is ALWAYS better than guessing wrong.
Respond ONLY valid JSON: {"match":true,"bestIndex":0,"confidence":0.9}
- match: true only if a clear match exists.
- bestIndex: 0-based index of the best image, -1 if no good match.
- confidence: 0 to 1, how sure the chosen image depicts the product.`
  try {
    const parsed = JSON.parse(await chat(prompt, urls)) as Partial<Verdict>
    const idx = Number(parsed.bestIndex)
    return {
      match: Boolean(parsed.match),
      bestIndex: Number.isInteger(idx) && idx >= 0 && idx < urls.length ? idx : -1,
      confidence: Math.min(Math.max(Number(parsed.confidence) || 0, 0), 1),
    }
  } catch {
    return { match: false, bestIndex: -1, confidence: 0 }
  }
}

async function main() {
  if (!API_KEY) {
    console.error('No MODEL_API_KEY / OPENAI_API_KEY set. Vision verification unavailable.')
    process.exit(1)
  }

  const { data: deals, error } = await supabase
    .from('deals')
    .select('id,title,images,tags')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(LIMIT)

  if (error) throw error
  const list = deals || []
  console.log(`Refreshing images for ${list.length} active deals (model=${MODEL_ID})`)

  let updated = 0
  let skippedNoMatch = 0
  let failed = 0

  for (let i = 0; i < list.length; i++) {
    const deal = list[i]
    try {
      const query = await translateQuery(deal.title)
      const [off, commons] = await Promise.all([searchOpenFoodFacts(query), searchCommons(query)])
      const candidates = Array.from(new Set([...off.slice(0, 4), ...commons.slice(0, 4)])).slice(0, 6)

      if (candidates.length === 0) {
        skippedNoMatch++
        if ((i + 1) % 10 === 0 || i === list.length - 1) console.log(`  [${i + 1}/${list.length}] ${deal.title} -> no candidates`)
        await new Promise(r => setTimeout(r, DELAY))
        continue
      }

      const verdict = await verifyImages(deal.title, candidates)
      if (verdict.match && verdict.confidence >= 0.7 && verdict.bestIndex >= 0) {
        const newUrl = candidates[verdict.bestIndex]
        const current = Array.isArray(deal.images) ? deal.images[0] : null
        if (newUrl !== current) {
          await supabase.from('deals').update({ images: [newUrl] }).eq('id', deal.id)
          updated++
          console.log(`  [${i + 1}/${list.length}] UPDATED "${deal.title}" (${(verdict.confidence * 100).toFixed(0)}%): ${newUrl}`)
        } else {
          skippedNoMatch++
        }
      } else {
        skippedNoMatch++
        if ((i + 1) % 25 === 0) console.log(`  [${i + 1}/${list.length}] ${deal.title} -> no good match`)
      }
    } catch (err) {
      failed++
      console.error(`  [${i + 1}/${list.length}] ERROR "${deal.title}": ${(err as Error).message}`)
    }
    await new Promise(r => setTimeout(r, DELAY))
  }

  console.log(`\nDone. updated=${updated}, kept/skipped=${skippedNoMatch}, failed=${failed}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
