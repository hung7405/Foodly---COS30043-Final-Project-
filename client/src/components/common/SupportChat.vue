<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { getBotReply, greetingSuggestions, CHAT_SUGGESTIONS, type BotReply } from '../../services/support/rules'
import { supportService } from '../../services/api'
import { useAuthStore } from '../../stores/auth.store'

interface ChatMsg {
  id: number
  from: 'user' | 'bot'
  text: string
  suggestions?: string[]
  timing?: string
}

interface PendingEscalation {
  step: number
  category: string
  refCode: string
  orderRef: string
  issue: string
  resolution: string
}

const auth = useAuthStore()
const open = ref(false)
const messages = ref<ChatMsg[]>([])
const input = ref('')
const typing = ref(false)
const listEl = ref<HTMLElement | null>(null)
const pending = ref<PendingEscalation | null>(null)
const activeTickets = new Map<string, string>()
const ratingVisible = ref(false)
const rated = ref(false)
let lastFeedback = { category: '', refCode: '' }
let nextId = 1
const CHAT_KEY = 'foodly:chat'

function bootMessage(): ChatMsg {
  return {
    id: nextId++,
    from: 'bot',
    text: `Hi! I'm Foodie, Foodly's support assistant 🍱\nAsk about orders, refunds, delivery — or request a human anytime.`,
    suggestions: greetingSuggestions,
    timing: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}

function resetChat() {
  pending.value = null
  activeTickets.clear()
  ratingVisible.value = false
  rated.value = false
  messages.value = [bootMessage()]
  persist()
  scrollDown()
}

function closeChat() {
  open.value = false
  resetChat()
}

function parseStored(raw: string): ChatMsg[] | null {
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return null
    nextId = arr.reduce((m: number, x: ChatMsg) => Math.max(m, x.id || 0), 0) + 1
    return arr.slice(-30)
  } catch {
    return null
  }
}

onMounted(() => {
  const stored = localStorage.getItem(CHAT_KEY)
  if (stored) {
    const restored = parseStored(stored)
    if (restored?.length) messages.value = restored
  }
  if (!messages.value.length) {
    messages.value = [bootMessage()]
  }
})

function persist() {
  localStorage.setItem(CHAT_KEY, JSON.stringify(messages.value.slice(-30)))
}

async function scrollDown() {
  await nextTick()
  listEl.value?.scrollTo({ top: listEl.value.scrollHeight, behavior: 'smooth' })
}

function push(from: 'user' | 'bot', text: string, suggestions?: string[]) {
  messages.value.push({ id: nextId++, from, text, suggestions, timing: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
  persist()
  scrollDown()
}

async function botSay(text: string, suggestions?: string[]) {
  typing.value = true
  await scrollDown()
  await new Promise((r) => setTimeout(r, 450 + Math.random() * 450))
  typing.value = false
  push('bot', text, suggestions)
}

async function send(text?: string) {
  const raw = (text ?? input.value).trim()
  if (!raw || typing.value) return
  input.value = ''
  push('user', raw)

  if (pending.value) {
    await stepForm(raw)
    return
  }

  const result: BotReply = getBotReply(raw)

  if (!result.escalate) {
    await botSay(result.reply, result.suggestions)
    return
  }

  const already = result.category ? activeTickets.get(result.category) : undefined
  if (already) {
    await botSay("We've already opened ticket #" + already + ' for this — a human will follow up. Anything else I can help with?', CHAT_SUGGESTIONS)
    return
  }

  pending.value = {
    step: 0,
    category: result.category ?? 'chat',
    refCode: 'FLY-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
    orderRef: '',
    issue: '',
    resolution: '',
  }
  await botSay(
    result.reply + "\n\nTo get this to the right team, I just need 3 quick answers.\n1️⃣ Your order/reservation code (or type 'skip').",
  )
}

async function stepForm(raw: string) {
  const p = pending.value
  if (!p) return
  if (['cancel', 'quit', 'stop', 'huy', 'thoi', 'thôi'].includes(raw.toLowerCase())) {
    pending.value = null
    await botSay('No problem — I cancelled that form. Ask me anything else!', CHAT_SUGGESTIONS)
    return
  }
  if (p.step === 0) {
    p.orderRef = raw === 'skip' ? 'not provided' : raw
    p.step = 1
    await botSay("2️⃣ In 1-2 sentences, what happened? (e.g. 'order was missing one item')")
    return
  }
  if (p.step === 1) {
    p.issue = raw
    p.step = 2
    await botSay('3️⃣ How should we make it right?', ['Refund', 'Replacement', 'Just reporting'])
    return
  }
  if (p.step === 2) {
    p.resolution = raw
    p.step = 3
    await submitForm(p)
  }
}

async function submitForm(p: PendingEscalation) {
  pending.value = null
  activeTickets.set(p.category, p.refCode)
  lastFeedback = { category: p.category, refCode: p.refCode }
  const message =
    'Escalated from chat (' + p.refCode + ')\n' +
    'Topic: ' + p.category + '\n' +
    'Order ref: ' + p.orderRef + '\n' +
    'Issue: ' + p.issue + '\n' +
    'Requested: ' + p.resolution
  if (!auth.isAuthenticated) {
    await botSay("I couldn't file this yet because you're not signed in. Sign in and repeat your request — your answers are saved in this chat (ref " + p.refCode + ').')
    promptRating()
    return
  }
  try {
    await supportService.createTicket({ category: p.category, subject: 'Chat escalation ' + p.refCode, message })
    await botSay("raised ticket #" + p.refCode + ' — noted' + (p.orderRef === 'not provided' ? '' : ' (order ' + p.orderRef + ')') + ". You'll hear back via email within 24h.")
  } catch {
    await botSay('Your issue is logged as ticket #' + p.refCode + ' — our team will follow up.')
  }
  promptRating()
}

function promptRating() {
  if (rated.value) return
  rated.value = true
  ratingVisible.value = true
  push('bot', 'One last thing — how was my help? Tap a star to rate 1–5:')
}

async function rate(n: number) {
  ratingVisible.value = false
  push('user', '★'.repeat(n) + '☆'.repeat(5 - n) + ' (' + n + '/5)')
  supportService.createFeedback({ rating: n, category: lastFeedback.category, refCode: lastFeedback.refCode }).catch(() => {})
  if (n >= 4) {
    await botSay("Yay, I'm glad I could help! 🎉 Thanks for the feedback — I'll clear this conversation so we start fresh next time.")
    await new Promise((r) => setTimeout(r, 2500))
    resetChat()
  } else {
    await botSay("I'm sorry I couldn't fully resolve this today. Our customer care team will follow up with you within 24 hours.")
  }
}
</script>

<template>
  <div class="support-chat">
    <Transition name="chat-scale">
      <div v-if="open" class="chat-panel" role="dialog" aria-modal="true" aria-label="Foodly support chat"
        @keydown.esc="open = false">
        <header class="chat-header">
          <span class="chat-avatar" aria-hidden="true">🍱</span>
          <div class="chat-text">
            <strong>Foodie · Support</strong>
            <small>Online now · replies instantly</small>
          </div>
          <div class="chat-actions">
            <button type="button" class="chat-clear" aria-label="Clear chat" title="Clear chat" @click="resetChat()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
            <button type="button" class="chat-close" aria-label="Close chat" @click="closeChat()">✕</button>
          </div>
        </header>
        <div ref="listEl" class="chat-body" tabindex="0">
          <div v-for="m in messages" :key="m.id" class="msg-row" :class="m.from">
            <div class="msg-bubble">
              <span class="msg-time">{{ m.timing }}</span>
              <p>{{ m.text }}</p>
              <div v-if="m.suggestions?.length" class="msg-chips">
                <button v-for="s in m.suggestions" :key="s" type="button" class="chip" @click="send(s)">{{ s }}</button>
              </div>
            </div>
          </div>
          <div v-if="typing" class="msg-row bot">
            <div class="msg-bubble typing">Foodie is typing<span>…</span></div>
          </div>
          <div v-if="ratingVisible" class="msg-row bot">
            <div class="msg-bubble">
              <div class="star-row" role="radiogroup" aria-label="Rate your experience">
                <button v-for="n in 5" :key="n" type="button" class="star" :aria-label="n + ' out of 5 stars'" @click="rate(n)">★</button>
              </div>
            </div>
          </div>
        </div>
        <footer class="chat-input-row">
          <input v-model="input" class="chat-input" type="text" maxlength="2000" placeholder="Type a message…"
            aria-label="Chat message" @keyup.enter="send()" />
          <button type="button" class="chat-send" aria-label="Send message" @click="send()">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </footer>
      </div>
    </Transition>

    <button v-if="!open" type="button" class="chat-launcher" aria-label="Open support chat" @click="open = true">
      <span class="launcher-icon" aria-hidden="true">💬</span>
    </button>
  </div>
</template>

<style scoped>
.support-chat {
  position: fixed;
  right: 1rem;
  bottom: calc(1rem + var(--bottom-nav-height, 0px));
  z-index: 9200;
}
@media (min-width: 768px) {
  .support-chat {
    bottom: 1.5rem;
  }
}
.chat-launcher {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: none;
  background: var(--color-accent, #ee4d2d);
  color: #fff;
  box-shadow: 0 8px 24px rgba(238, 77, 45, 0.4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease;
}
.chat-launcher:hover {
  transform: translateY(-2px) scale(1.04);
}
.launcher-icon {
  font-size: 1.4rem;
  line-height: 1;
}
.chat-panel {
  position: fixed;
  right: 0.75rem;
  bottom: calc(1rem + var(--bottom-nav-height, 0px));
  width: min(380px, calc(100vw - 1.5rem));
  height: min(520px, calc(100vh - 7rem));
  background: var(--color-card-bg, #fff);
  border: 1px solid var(--color-border, #e2e2e2);
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  outline: none;
}
.chat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: linear-gradient(135deg, var(--color-accent, #ee4d2d), #f0703a);
  color: #fff;
}
.chat-avatar {
  font-size: 1.4rem;
}
.chat-text {
  flex: 1;
}
.chat-text strong {
  display: block;
  font-size: 0.95rem;
}
.chat-text small {
  font-size: 0.72rem;
  opacity: 0.9;
}
.chat-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.chat-clear,
.chat-close {
  border: none;
  background: transparent;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.chat-clear:hover,
.chat-close:hover {
  background: rgba(255, 255, 255, 0.2);
}
.star-row {
  display: flex;
  gap: 4px;
}
.star {
  border: none;
  background: transparent;
  font-size: 1.5rem;
  line-height: 1;
  color: #d8b45a;
  cursor: pointer;
  padding: 2px;
  transition: transform 0.15s ease;
}
.star:hover {
  transform: scale(1.2);
}
.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.msg-row {
  display: flex;
}
.msg-row.user {
  justify-content: flex-end;
}
.msg-bubble {
  max-width: 82%;
  padding: 9px 12px;
  border-radius: 14px;
  background: var(--color-bg-tertiary, #f3f3f3);
  font-size: 0.86rem;
  line-height: 1.45;
  position: relative;
}
.msg-row.user .msg-bubble {
  background: var(--color-accent, #ee4d2d);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.msg-row.bot .msg-bubble {
  border-bottom-left-radius: 4px;
}
.msg-bubble p {
  margin: 0;
  white-space: pre-wrap;
}
.msg-timing {
  display: block;
  font-size: 0.66rem;
  opacity: 0.6;
  margin-top: 4px;
}
.msg-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.chip {
  border: 1px solid var(--color-accent, #ee4d2d);
  color: var(--color-accent, #ee4d2d);
  background: transparent;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.78rem;
  cursor: pointer;
}
.chip:hover {
  background: rgba(238, 77, 45, 0.08);
}
.typing {
  color: var(--color-text-secondary, #666);
  font-style: italic;
}
.chat-input-row {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--color-border, #eee);
}
.chat-input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1.5px solid var(--color-border, #ddd);
  background: var(--color-bg-secondary, #fff);
  color: var(--color-text, #111);
  font-size: 0.88rem;
}
.chat-input:focus {
  outline: none;
  border-color: var(--color-accent, #ee4d2d);
}
.chat-send {
  width: 40px;
  border: none;
  border-radius: 10px;
  background: var(--color-accent, #ee4d2d);
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.chat-scale-enter-active,
.chat-scale-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.chat-scale-enter-from,
.chat-scale-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>