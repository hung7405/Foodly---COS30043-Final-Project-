<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getSocket } from '../services/socket/socket'

interface Activity {
  id: number
  type: string
  message: string
  user: string
  time: Date
}

const activities = ref<Activity[]>([])
const isConnected = ref(false)

onMounted(() => {
  const socket = getSocket()
  isConnected.value = socket.connected

  socket.on('connect', () => { isConnected.value = true })
  socket.on('disconnect', () => { isConnected.value = false })
  socket.on('feed:activity', (data: any) => {
    activities.value.unshift({
      id: Date.now(),
      type: data.type || 'activity',
      message: data.message || 'New activity',
      user: data.user || 'Community Member',
      time: new Date(),
    })
  })
  socket.emit('feed:join')

  // Seed some activities
  const seedActivities = [
    { id: 1, type: 'deal', message: 'posted a new deal: Fresh Sandwiches', user: 'Express Mart', time: new Date(Date.now() - 120000) },
    { id: 2, type: 'reservation', message: 'reserved Veggie Box', user: 'sarah_k', time: new Date(Date.now() - 300000) },
    { id: 3, type: 'verification', message: 'verified a deal at Green Grocer', user: 'moderator_1', time: new Date(Date.now() - 600000) },
  ]
  activities.value = seedActivities
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
            {{ activity.type === 'deal' ? '🛒' : activity.type === 'reservation' ? '📦' : activity.type === 'verification' ? '✅' : '💬' }}
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
.feed-page { padding: 40px 0; animation: fade-in 0.4s ease; }
.feed-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
.live-indicator { display: flex; align-items: center; gap: 8px; font-size: 0.8125rem; font-weight: 600; color: var(--color-text-tertiary); }
.live-dot { width: 8px; height: 8px; border-radius: 50%; background: #ccc; }
.live-indicator.active .live-dot { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,0.5); animation: pulse 2s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
.feed-stream { max-width: 700px; margin: 0 auto; display: flex; flex-direction: column; gap: 8px; }
.feed-item { display: flex; gap: 16px; padding: 16px 20px; background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); animation: fade-in 0.3s ease both; }
.feed-icon { font-size: 1.5rem; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--color-bg-secondary); flex-shrink: 0; }
.feed-body { flex: 1; }
.feed-body p { font-size: 0.9375rem; color: var(--color-text-secondary); line-height: 1.5; }
.feed-time { font-size: 0.8125rem; color: var(--color-text-tertiary); }
</style>
