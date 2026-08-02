import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import { DealStatus } from '../deals/entities/deal.entity'

const FOOD_CATEGORIES: Record<string, { category: string; keywords: string[] }> = {
  produce: {
    category: 'Fresh Produce',
    keywords: ['vegetable', 'fruit', 'salad', 'lettuce', 'tomato', 'apple', 'banana', 'orange', 'broccoli', 'carrot', 'onion', 'avocado', 'mango'],
  },
  bakery: {
    category: 'Bakery',
    keywords: ['bread', 'pastry', 'cake', 'croissant', 'baguette', 'muffin', 'donut', 'bun', 'loaf', 'bagel'],
  },
  dairy: {
    category: 'Dairy',
    keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'milk'],
  },
  meat: {
    category: 'Meat & Seafood',
    keywords: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'steak', 'sausage', 'bacon', 'lamb', 'seafood', 'shrimp', 'tuna'],
  },
  prepared: {
    category: 'Prepared Meals',
    keywords: ['sandwich', 'wrap', 'sushi', 'pizza', 'pasta', 'burger', 'noodle', 'rice', 'pho', 'ramen', 'fried rice', 'burrito', 'taco', 'meal', 'lunch', 'dinner', 'banh mi'],
  },
  beverage: {
    category: 'Beverages',
    keywords: ['juice', 'soda', 'water', 'coffee', 'tea', 'smoothie', 'drink', 'milkshake', 'latte', 'cola'],
  },
  snack: {
    category: 'Snacks',
    keywords: ['chip', 'cookie', 'chocolate', 'candy', 'nut', 'granola', 'snack', 'bar', 'popcorn', 'ice cream'],
  },
}

const GEMINI_MODEL = process.env.AI_VISION_MODEL || 'gemini-2.0-flash'
const OPENAI_MODEL = process.env.MODEL_ID || process.env.AI_VISION_MODEL || 'gpt-4o-mini'
const OPENAI_BASE_URL = (process.env.MODEL_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const VISION_PROMPT = `You are a food recognition assistant. Look at the food image and respond with ONLY valid JSON using this exact schema:
{
  "foodName": "short food name, e.g. 'Pepperoni Pizza'",
  "description": "one sentence describing the dish",
  "tags": ["3 to 6 concise tags, lowercase, e.g. 'pizza', 'cheese', 'fast food'"],
  "category": "one of: Fresh Produce | Bakery | Dairy | Meat & Seafood | Prepared Meals | Beverages | Snacks",
  "confidence": 0.0
}
confidence must be between 0 and 1 reflecting how certain you are about the food.`

interface VisionResult {
  foodName: string
  description: string
  tags: string[]
  category: string
  confidence: number
  provider: 'gemini' | 'openai' | 'heuristic'
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)

  constructor(
    private supabaseService: SupabaseService,
  ) {}

  private get supabase() {
    return this.supabaseService.client
  }

  async searchByImage(imageBuffer: Buffer, filename: string) {
    const vision = await this.detectWithVision(imageBuffer, filename)
    const heuristic = this.detectHeuristic(filename)

    const detection = vision ?? heuristic
    const categoryKey = this.matchCategoryKey(detection.tags, detection.category)
    const keywords = detection.tags
    const matches = await this.findMatchingDeals(categoryKey, keywords, 6)

    return {
      detectedCategory: detection.category,
      foodName: detection.foodName,
      description: detection.description,
      confidence: Math.round(detection.confidence * 100) / 100,
      matchedKeywords: keywords.slice(0, 5),
      categoryKey,
      provider: detection.provider,
      matches,
    }
  }

  private async detectWithVision(imageBuffer: Buffer, filename: string): Promise<VisionResult | null> {
    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey) {
      try {
        return await this.geminiVision(imageBuffer, filename, geminiKey)
      } catch (err) {
        this.logger.warn(`Gemini vision failed: ${(err as Error).message}`)
      }
    }

    const openaiKey = process.env.MODEL_API_KEY || process.env.OPENAI_API_KEY
    if (openaiKey) {
      try {
        return await this.openaiVision(imageBuffer, filename, openaiKey)
      } catch (err) {
        this.logger.warn(`OpenAI vision failed: ${(err as Error).message}`)
      }
    }

    return null
  }

  private async geminiVision(imageBuffer: Buffer, filename: string, apiKey: string): Promise<VisionResult> {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: VISION_PROMPT },
            { inline_data: { mime_type: this.mimeFromFilename(filename), data: imageBuffer.toString('base64') } },
          ],
        }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    })

    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
    const json = await res.json()
    const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Gemini returned empty result')
    return { provider: 'gemini', ...this.parseVisionJson(text) }
  }

  private async openaiVision(imageBuffer: Buffer, filename: string, apiKey: string): Promise<VisionResult> {
    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: VISION_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:${this.mimeFromFilename(filename)};base64,${imageBuffer.toString('base64')}` },
            },
          ],
        }],
        response_format: { type: 'json_object' },
        max_completion_tokens: 300,
      }),
    })

    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
    const json = await res.json()
    const text: string | undefined = json?.choices?.[0]?.message?.content
    if (!text) throw new Error('OpenAI returned empty result')
    return { provider: 'openai', ...this.parseVisionJson(text) }
  }

  private parseVisionJson(text: string): Omit<VisionResult, 'provider'> {
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned) as {
      foodName?: string
      description?: string
      tags?: string[]
      category?: string
      confidence?: number
    }

    return {
      foodName: parsed.foodName?.trim() || 'Food',
      description: parsed.description?.trim() || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 8) : [],
      category: parsed.category?.trim() || 'Prepared Meals',
      confidence: Math.min(Math.max(Number(parsed.confidence) || 0.5, 0), 1),
    }
  }

  private detectHeuristic(filename: string): VisionResult {
    const filenameLower = filename.toLowerCase()
    let matchedCategory = 'Fresh Produce'
    let matchedKeywords: string[] = []
    let confidence = 0.55

    for (const [, value] of Object.entries(FOOD_CATEGORIES)) {
      for (const keyword of value.keywords) {
        if (filenameLower.includes(keyword.toLowerCase())) {
          matchedCategory = value.category
          matchedKeywords = value.keywords
          confidence = Math.min(0.9, 0.6 + Math.random() * 0.3)
          break
        }
      }
      if (matchedKeywords.length > 0) break
    }

    const foodName = this.foodNameFromFilename(filename)

    return {
      foodName,
      description: `Detected via filename keyword analysis. Rename the image or configure an AI vision API key for higher accuracy.`,
      tags: matchedKeywords.slice(0, 6),
      category: matchedCategory,
      confidence,
      provider: 'heuristic',
    }
  }

  private foodNameFromFilename(filename: string): string {
    const base = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
    if (!base) return 'Food item'
    return base.charAt(0).toUpperCase() + base.slice(1)
  }

  private matchCategoryKey(tags: string[], category: string): string {
    const all = [...tags.map(t => t.toLowerCase()), category.toLowerCase()]
    let bestKey = 'prepared'
    let bestScore = 0
    for (const [key, value] of Object.entries(FOOD_CATEGORIES)) {
      let score = 0
      const haystack = value.category.toLowerCase() + ' ' + value.keywords.join(' ')
      for (const tag of all) {
        if (haystack.includes(tag)) score += 2
        else if (value.keywords.some(k => tag.includes(k) || k.includes(tag))) score += 1
      }
      if (score > bestScore) {
        bestScore = score
        bestKey = key
      }
    }
    return bestKey
  }

  private async findMatchingDeals(categoryKey: string, keywords: string[], limit: number) {
    const { data: deals, error } = await this.supabase
      .from('deals')
      .select('id,title,description,discount_price,original_price,remaining_quantity,images,tags,verified,latitude,longitude, store:stores(name,address)')
      .eq('status', DealStatus.ACTIVE)
      .limit(200)

    if (error) throw error

    const scored = (deals || []).map((deal: any) => {
      const text = [
        deal.title || '',
        deal.description || '',
        (deal.store?.name) || '',
        Array.isArray(deal.tags) ? deal.tags.join(' ') : '',
      ].join(' ').toLowerCase()

      let score = 0
      const category = FOOD_CATEGORIES[categoryKey]
      if (category) {
        for (const kw of category.keywords) {
          if (text.includes(kw.toLowerCase())) score += 3
        }
      }
      for (const kw of keywords) {
        const k = kw.toLowerCase()
        if (text.includes(k)) score += 4
      }
      if (deal.verified) score += 1
      return { ...deal, score }
    })

    return scored
      .filter((d: any) => d.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, ...rest }: any) => rest)
  }

  private mimeFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    const map: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      bmp: 'image/bmp',
    }
    return map[ext] || 'image/jpeg'
  }
}
