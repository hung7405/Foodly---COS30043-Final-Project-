export interface User {
  id: string
  email: string
  username: string
  firstName?: string
  lastName?: string
  role: 'guest' | 'user' | 'moderator' | 'admin' | 'merchant'
  trustScore: number
  reputationPoints: number
  avatarUrl?: string
  deliveryAddress?: string
  isActive: boolean
  createdAt: string
  lastLogin?: string
}

export interface Deal {
  id: string
  userId: string
  storeId?: string
  title: string
  description?: string
  originalPrice: number
  discountPrice: number
  currency: string
  remainingQuantity: number
  originalQuantity: number
  status: 'active' | 'reserved' | 'expired' | 'removed'
  verified: boolean
  verifiedById?: string
  latitude: number
  longitude: number
  address?: string
  images: string[]
  expiresAt: string
  tags: string[]
  metadata?: Record<string, any>
  version: number
  likeCount: number
  bookmarkCount: number
  commentCount: number
  createdAt: string
  updatedAt: string
  user?: User
  store?: Store
  comments?: Comment[]
}

export interface Store {
  id: string
  name: string
  address?: string
  latitude: number
  longitude: number
  category?: string
  avgTrustScore: number
  totalDeals: number
  isActive: boolean
}

export interface Reservation {
  id: string
  dealId: string
  userId: string
  status: 'active' | 'confirmed' | 'cancelled' | 'expired'
  reservedAt: string
  expiresAt: string
  confirmedAt?: string
  reservationCode?: string
  quantityReserved: number
  deal?: Deal
}

export interface Comment {
  id: string
  dealId: string
  userId: string
  parentId?: string
  content: string
  likeCount: number
  status: 'active' | 'hidden' | 'flagged'
  createdAt: string
  user?: User
  replies?: Comment[]
}

export interface NewsArticle {
  id: number
  title: string
  content: string
  category: string
  imageUrl: string
  publishedDate: string
}

export interface Payment {
  id: string
  userId: string
  reservationId: string
  amount: number
  currency: string
  provider: 'mock' | 'momo' | 'vnpay'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'expired'
  providerTransactionId?: string
  paymentUrl?: string
  qrCodeUrl?: string
  paidAt?: string
  failureReason?: string
  reservation?: Reservation
  createdAt: string
}

export interface LiveMetrics {
  activeUsers: number
  reservationsPerMinute: number
  dealsPerMinute: number
  verificationsTotal: number
  commentsTotal: number
  timestamp: string
}
