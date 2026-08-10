<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getSocket } from '../services/socket/socket'
import api from '../services/api/axios'

interface Activity {
  id: number
  type: string
  message: string
  user: string
  time: Date
}
const activities = ref<Activity[]>([])
const isConnected = ref(false)
let activitySeq = 0

const FEED_ICONS: Record<string, string> = {
  deal: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  reservation:
    '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  verification:
    '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
  default: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
}

function iconInnerHtml(type: string) {
  return FEED_ICONS[type] || FEED_ICONS.default
}

onMounted(async () => {
  try {
    const { data: history } = await api.get('/feed', { params: { limit: 30 } })
    activities.value = (history || []).map((item: any) => ({
      id: item.id,
      type: item.type || 'default',
      message: item.message || 'New activity',
      user: item.user || 'Community Member',
      time: new Date(item.time),
    }))
    if (activities.value.length) {
      activitySeq = Math.max(...activities.value.map((a) => a.id), 0)
    }
  } catch {
    // feed works without history — live events still apply
  }

  const socket = getSocket()
  isConnected.value = socket.connected

  socket.on('connect', () => {
    isConnected.value = true
  })
  socket.on('disconnect', () => {
    isConnected.value = false
  })
  socket.on('feed:activity', (data: any) => {
    activities.value.unshift({
      id: ++activitySeq,
      type: data.type || 'activity',
      message: data.message || 'New activity',
      user: data.user || 'Community Member',
      time: new Date(),
    })
    if (activities.value.length > 50) activities.value.pop()
  })
  socket.emit('feed:join')
})

onUnmounted(() => {
  const socket = getSocket()
  socket.emit('feed:leave')
  socket.off('feed:activity')
})
</script>

<template>
  <div class="feed-page">
    <div class="container">
      <div class="feed-header">
        <h1 class="section-title">Community Feed</h1>
        <div class="live-indicator" :class="{ active: isConnected }">
          <span class="live-dot" aria-hidden="true"></span>
          {{ isConnected ? 'LIVE' : 'Connecting...' }}
        </div>
      </div>

      <div class="feed-stream">
        <div v-for="activity in activities" :key="activity.id" class="feed-item" :style="{ animationDelay: '0s' }">
          <div class="feed-icon" :class="activity.type">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              v-html="iconInnerHtml(activity.type)"
            ></svg>
          </div>
          <div class="feed-body">
            <p>
              <strong>{{ activity.user }}</strong>
              {{ activity.message }}
            </p>
            <span class="feed-time">{{ Math.floor((Date.now() - activity.time.getTime()) / 60000) }}m ago</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feed-page {
  padding: 40px 0;
  animation: fade-in 0.4s ease;
}
.feed-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
}
.live-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
}
.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ccc;
}
.live-indicator.active .live-dot {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
.feed-stream {
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.feed-item {
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  animation: fade-in 0.3s ease both;
}
.feed-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-bg-secondary);
  flex-shrink: 0;
}
.feed-icon.deal {
  background: #fff3e0;
  color: #ee4d2d;
}
.feed-icon.reservation {
  background: #e3f2fd;
  color: #3b82f6;
}
.feed-icon.verification {
  background: #e8f5e9;
  color: #00b14f;
}
.feed-icon.default {
  background: #f3e5f5;
  color: #8b5cf6;
}
[data-theme='dark'] .feed-icon.deal {
  background: #3a2417;
  color: #ff8a6a;
}
[data-theme='dark'] .feed-icon.reservation {
  background: #16233a;
  color: #60a5fa;
}
[data-theme='dark'] .feed-icon.verification {
  background: #12291d;
  color: #34d399;
}
[data-theme='dark'] .feed-icon.default {
  background: #251a35;
  color: #a78bfa;
}
.feed-body {
  flex: 1;
}
.feed-body p {
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}
.feed-time {
  font-size: 0.8125rem;
  color: var(--color-text-tertiary);
}
</style>
