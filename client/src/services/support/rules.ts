export interface BotReply {
  reply: string
  category?: string
  escalate?: boolean
  suggestions?: string[]
}

interface Rule {
  category: string
  keywords: string[]
  replies: string[]
  escalate?: boolean
  suggestions?: string[]
}

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

export const greetingSuggestions = ['Track my order', 'Request a refund', 'My delivery is late', 'Talk to a human']

const RULES: Rule[] = [
  {
    category: 'human',
    keywords: ['human', 'agent', 'person', 'staff', 'talk to someone', 'real person', 'live agent', 'reward', 'escalate', 'nguoi', 'nhan vien'],
    replies: [
      "I can log you with our support team. One second, I'm opening a ticket for you.",
      'I understand — some things need a person. I’ll raise a ticket for the team right away.',
    ],
    escalate: true,
  },
  {
    category: 'refund',
    keywords: ['refund', 'money back', 'repay', 'refund money', 'hoan', 'tra lai', 'hoàn tiền'],
    replies: [
      'Sorry about that. Refund requests are reviewed by our finance team within 24h. I can raise a refund ticket for you — everything you say here stays in the thread.',
      'For your refund: keep your reservation code handy. I can log the request now and the team will confirm via email.',
    ],
    escalate: true,
    suggestions: ['Send refund ticket'],
  },
  {
    category: 'wrong_item',
    keywords: ['wrong item', 'wrong order', 'received wrong', 'not what i ordered', 'wrong dish', 'sai'],
    replies: [
      'Sorry for the mix-up! We take these seriously — our merchant team re-checks the order and you can get a replacement or refund.',
      'A wrong item is recorded on our side. I’ll flag this reservation so support can process a replacement.',
    ],
    escalate: true,
  },
  {
    category: 'missing_item',
    keywords: ['missing', 'thieu', 'thiếu', 'not included', "didn't get", 'no order', 'never arrived'],
    replies: [
      'A missing item is on us. Please confirm the reservation code and our team will re-route or compensate within 24h.',
      'Sorry — missing items are investigated right away. I’ll escalate this for you.',
    ],
    escalate: true,
  },
  {
    category: 'quality',
    keywords: ['mold', 'stale', 'rotten', 'poor quality', 'not fresh', 'expired', 'spoiled', 'bad food', 'tasted old', 'hu', 'hong', 'hỏng'],
    replies: [
      'Food quality matters. We flag that store and the deal — you also gain a refund option. Escalating now.',
      'We log a quality complaint against the deal, which lowers its trust score until it’s re-verified.',
    ],
    escalate: true,
  },
  {
    category: 'delivery',
    keywords: ['where is my order', 'where is my food', 'delivery', 'delay', 'late', 'stuck', 'shipping', 'still not here', 'giao', 'chua toi', 'chậm'],
    replies: [
      'Let me check — most pickups in a radius of 5 km under 45 minutes. If it’s past the window I can raise it to our logistics team for you.',
      'A late delivery is tracked in real time. I can not follow up directly.',
    ],
    escalate: true,
  },
  {
    category: 'payment',
    keywords: ['payment', 'pay', 'charged', 'card', 'momo', 'zalopay', 'vnpay', 'stripe', 'failed payment', 'thanh toan', 'thanh toán'],
    replies: [
      'Payments on Foodly are only deducted once your pickup is confirmed. If you see a hold, it clears within 24h.',
      'For payment issues, I’d recommend logging a ticket so billing can look at the exact transaction.',
    ],
    escalate: true,
  },
  {
    category: 'cancel',
    keywords: ['cancel', 'cancel order', 'change my mind', 'no longer want', 'huy', 'hủy'],
    replies: [
      'You can cancel any active reservation from My Reservations — free of charge before the pickup deadline.',
      'Cancelling is handled in My Reservations. If the deadline has passed, a ticket with our team is the next step.',
    ],
  },
  {
    category: 'order_status',
    keywords: ['status', 'track', 'tracking', 'where', 'reservation', 'order', 'code', 'my deal', 'check my', 'đơn', 'daga'],
    replies: [
      'Open My Reservations to see live status of each order — reserved, confirmed, or expired.',
      'You can track reservations and payment status from My Reservations. Need a specific order code?',
    ],
  },
  {
    category: 'deals',
    keywords: ['deal', 'voucher', 'coupon', 'discount', 'promo', 'sale', 'offer', 'near', 'nearby', 'store', 'ma', 'km'],
    replies: [
      'Deals are live on Home and the real-time Map. Best sellers refresh every minute as stores mark down surplus.',
      'Head to Explore to sort deals by category, distance, and discount — verified deals are flagged automatically.',
    ],
  },
  {
    category: 'address',
    keywords: ['address', 'deliver to', 'delivery address', 'change address', 'home', 'drop off', 'dia chi', 'địa chỉ'],
    replies: [
      'Your delivery address is saved on your Profile and shown at the top of Home. Edit it anytime and it updates instantly.',
      'You can change your "Deliver to" location from Profile > Delivery address. I’ll use the latest one on pickup.',
    ],
  },
  {
    category: 'hours',
    keywords: ['hour', 'open', 'open at', 'opening', 'close', 'minutes', 'when do you', 'moba','mở cửa'],
    replies: [
      'Partner stores set their own pickup windows — each deal card shows the live pickup window. Most run from 18:00 to 21:00.',
      'You’ll see exact pickup hours on every deal. Outside windows, stores mark deals as expired automatically.',
    ],
  },
  {
    category: 'greeting',
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'xin chao', 'chao', 'chào', 'hello foodly', 'yo'],
    replies: [
      'Hi there! I’m Foodie, Foodly’s support assistant. Ask about your order, refunds, or where to find the best deals near you.',
      'Hey! How can I help today — order status, refunds, or live deals?',
    ],
  },
  {
    category: 'thanks',
    keywords: ['thanks', 'thank you', 'thank', 'cam on', 'cam ơn', 'cảm ơn', 'got it', 'appreciate'],
    replies: ['Happy to help! Anything else I can do for you?', "You're welcome! Just ping me anytime."],
  },
  {
    category: 'goodbye',
    keywords: ['bye', 'goodbye', 'see you', 'quit', 'exit', 'tam biet', 'tạm biệt', 'later'],
    replies: ['Goodbye! Your exchanges are saved — I’ll be here if you need me.', 'Take care! Come back if you need a fresh deal.'],
  },
  {
    category: 'help',
    keywords: ['help', 'assist', 'support', 'what can you do', 'can you', 'guide', 'help me'],
    replies: [
      'I can answer order status, refunds, delivery, payments, and point you to live deals. Just type your question — you can also request a human at any time.',
      'Here to help with orders, refunds, and everything food-related. Ask away!',
    ],
  },
]

export function getBotReply(input: string): BotReply {
  const text = input.toLowerCase().trim()
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return {
        reply: pick(rule.replies),
        category: rule.category,
        escalate: rule.escalate,
        suggestions: rule.suggestions,
      }
    }
  }
  return {
    reply:
      "I'm not sure about that one yet. Try asking about your order status, a refund, delivery, or where to find deals — or just say “talk to a human”.",
    category: 'fallback',
    suggestions: CHAT_SUGGESTIONS,
  }
}

export const CHAT_SUGGESTIONS = ['Track my order', 'Missing item', 'Refund', 'Talk to a human']