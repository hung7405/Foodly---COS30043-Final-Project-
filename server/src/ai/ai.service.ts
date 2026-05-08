import { Injectable } from '@nestjs/common'

const FOOD_CATEGORIES: Record<string, { category: string; keywords: string[] }> = {
  produce: {
    category: 'Fresh Produce',
    keywords: ['vegetable', 'fruit', 'salad', 'lettuce', 'tomato', 'apple', 'banana', 'orange', 'broccoli', 'carrot'],
  },
  bakery: {
    category: 'Bakery',
    keywords: ['bread', 'pastry', 'cake', 'croissant', 'baguette', 'muffin', 'donut', 'bun', 'loaf'],
  },
  dairy: {
    category: 'Dairy',
    keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg'],
  },
  meat: {
    category: 'Meat & Seafood',
    keywords: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'steak', 'sausage', 'bacon', 'lamb'],
  },
  prepared: {
    category: 'Prepared Meals',
    keywords: ['sandwich', 'wrap', 'salad box', 'sushi', 'pizza', 'pasta', 'meal', 'dinner', 'lunch'],
  },
  beverage: {
    category: 'Beverages',
    keywords: ['juice', 'soda', 'water', 'coffee', 'tea', 'smoothie', 'drink'],
  },
  snack: {
    category: 'Snacks',
    keywords: ['chip', 'cookie', 'chocolate', 'candy', 'nut', 'granola', 'snack', 'bar'],
  },
}

@Injectable()
export class AiService {
  async searchByImage(imageBuffer: Buffer, filename: string) {
    // Simulate AI food detection
    const filename_lower = filename.toLowerCase()
    let detectedCategory = 'Fresh Produce'
    let confidence = 0.75
    let matchedKeywords: string[] = []

    for (const [, value] of Object.entries(FOOD_CATEGORIES)) {
      for (const keyword of value.keywords) {
        if (filename_lower.includes(keyword.toLowerCase())) {
          detectedCategory = value.category
          confidence = Math.min(0.95, 0.7 + Math.random() * 0.25)
          matchedKeywords = value.keywords
          break
        }
      }
      if (matchedKeywords.length > 0) break
    }

    return {
      detectedCategory,
      confidence: Math.round(confidence * 100) / 100,
      originalFilename: filename,
      matchedKeywords: matchedKeywords.slice(0, 5),
    }
  }
}
