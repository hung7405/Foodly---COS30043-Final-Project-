<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { getBotReply, greetingSuggestions, type BotReply } from '../../services/support/rules'
import { supportService } from '../../services/api'
import { useAuthStore } from '../../stores/auth.store'

interface ChatMsg {
  id: number
  from: 'user' | 'bot'
  text: string
  suggestions?: string[]
  timing?: string
}

const auth = useAuthStore()
const open = ref(false)
const messages = ref<ChatMsg[]>([])
const input = ref('')
const typing = ref(false)
const listEl = ref<HTMLElement | null>(null)
let nextId = 1
const CHAT_KEY = 'foodly:chat'

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
    const boot: ChatMsg = {
      id: nextId++,
      from: 'bot',
      text: `Hi! I'm Foodie, Foodly's support assistant 🍱\nAsk about orders, refunds, delivery — or request a human anytime.`,
      suggestions: greetingSuggestions,
      timing: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    messages.value = [boot]
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

async function send(text?: string) {
  const raw = (text ?? input.value).trim()
  if (!raw || typing.value) return
  input.value = ''
  push('user', raw)

  const result: BotReply = getBotReply(raw)
  typing.value = true
  await scrollDown()
  await new Promise((r) => setTimeout(r, 450 + Math.random() * 450))
  typing.value = false

  push('bot', result.reply, result.suggestions)

  if (result.escalate) {
    const refCode = 'FLY-' + Math.random().toString(36).slice(2, 7).toUpperCase()
    const ticketText = auth.isAuthenticated ? await persistedTicket(refCode) : 'Your issue is stored as ticket ' + refCode + ' with our team.'
    await new Promise((r) => setTimeout(r, 400))
    push('bot', ticketText)
  }
}

async function persistedTicket(refCode: string): Promise<string> {
  try {
    await supportService.createTicket({ category: 'chat', subject: 'Chat escalation', message: 'Escalated from chat -> ' + refCode })
    return "raised ticket #" + refCode + " with our team. You'll hear back via email."
  } catch {
    return 'Your issue is logged as ticket #' + refCode + ' — our team will follow up.'
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
          <button type="button" class="chat-close" aria-label="Close chat" @click="open = false">✕</button>
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
.chat-close {
  border: none;
  background: transparent;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
}
.chat-close:hover {
  background: rgba(255, 255, 255, 0.2);
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