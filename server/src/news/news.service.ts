import { Injectable } from '@nestjs/common'

const newsData = [
  {
    id: 1, title: 'Community Food Rescue Program Saves 10,000 Meals',
    content: 'Our community food rescue program has successfully saved over 10,000 meals from going to waste this month...',
    category: 'Food Rescue',     imageUrl: 'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=800&q=80',
    publishedDate: '2026-06-01',
  },
  {
    id: 2, title: 'New Partnership with Local Farmers Market',
    content: 'Foodly is excited to announce a new partnership with the City Farmers Market...',
    category: 'Community Support', imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80',
    publishedDate: '2026-05-28',
  },
  {
    id: 3, title: '5 Tips to Reduce Food Waste at Home',
    content: 'Reducing food waste starts at home. Plan your meals weekly, store produce correctly...',
    category: 'Tips & Tricks',     imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80',
    publishedDate: '2026-05-25',
  },
  {
    id: 4, title: 'Sustainability Summit 2026: Key Takeaways',
    content: 'The annual Sustainability Summit brought together industry leaders...',
    category: 'Events', imageUrl: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=800&q=80',
    publishedDate: '2026-05-20',
  },
  {
    id: 5, title: 'How Real-Time Technology is Fighting Food Waste',
    content: 'Real-time technology platforms like Foodly are transforming how communities tackle food waste...',
    category: 'Sustainability',     imageUrl: 'https://images.unsplash.com/photo-1583258292688-dba3d89166d7?w=800&q=80',
    publishedDate: '2026-05-15',
  },
]

@Injectable()
export class NewsService {
  private articles = newsData

  async findAll(query: { page?: number; limit?: number; search?: string; category?: string }) {
    let filtered = [...this.articles]

    if (query.search) {
      const s = query.search.toLowerCase()
      filtered = filtered.filter(
        a =>
          a.title.toLowerCase().includes(s) ||
          a.content.toLowerCase().includes(s) ||
          a.category.toLowerCase().includes(s) ||
          a.publishedDate.includes(s),
      )
    }

    if (query.category && query.category !== 'All') {
      filtered = filtered.filter(a => a.category === query.category)
    }

    const page = query.page || 1
    const limit = query.limit || 6
    const total = filtered.length
    const start = (page - 1) * limit
    const articles = filtered.slice(start, start + limit)

    return { articles, total, page, totalPages: Math.ceil(total / limit) }
  }

  async findById(id: number) {
    return this.articles.find(a => a.id === id) || null
  }

  async getCategories() {
    const cats = [...new Set(this.articles.map(a => a.category))]
    return ['All', ...cats]
  }
}
