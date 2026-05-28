<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getAnalyticsSocket } from '../services/socket/socket'
import type { LiveMetrics } from '../types'

const metrics = ref<LiveMetrics>({
  activeUsers: 0, reservationsPerMinute: 0,
  dealsPerMinute: 0, verificationsTotal: 0,
  commentsTotal: 0, timestamp: new Date().toISOString(),
})
const history = ref<LiveMetrics[]>([])

const labels = ref<string[]>([])
const reservationData = ref<number[]>([])
const dealData = ref<number[]>([])

onMounted(() => {
  const socket = getAnalyticsSocket()

  socket.on('analytics:tick', (payload: { metrics: LiveMetrics; timestamp: string } | LiveMetrics) => {
    const data = 'metrics' in payload ? { ...payload.metrics, timestamp: payload.timestamp } : payload
    metrics.value = data
    history.value.push(data)
    if (history.value.length > 20) history.value.shift()

    const t = new Date(data.timestamp)
    labels.value.push(`${t.getHours()}:${t.getMinutes().toString().padStart(2, '0')}`)
    reservationData.value.push(data.reservationsPerMinute)
    dealData.value.push(data.dealsPerMinute)

    if (labels.value.length > 20) {
      labels.value.shift()
      reservationData.value.shift()
      dealData.value.shift()
    }
  })
})

onUnmounted(() => {
  getAnalyticsSocket().off('analytics:tick')
})
</script>

<template>
  <div class="dashboard-page">
    <div class="container">
      <div class="dash-header">
        <h1>Analytics Dashboard</h1>
        <div class="live-badge">● LIVE</div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">{{ metrics.activeUsers }}</div>
          <div class="metric-label">Active Users</div>
          <div class="metric-trend up">+12%</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{{ metrics.reservationsPerMinute }}</div>
          <div class="metric-label">Reservations/min</div>
          <div class="metric-trend up">+8%</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{{ metrics.dealsPerMinute }}</div>
          <div class="metric-label">Deals/min</div>
          <div class="metric-trend up">+5%</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{{ metrics.verificationsTotal }}</div>
          <div class="metric-label">Verifications</div>
          <div class="metric-trend neutral">0%</div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-card">
          <h3>Reservations Per Minute</h3>
          <div class="chart-container">
            <div v-for="(v, i) in reservationData" :key="i" class="chart-bar" :style="{ height: `${(v / Math.max(...reservationData, 1)) * 100}%` }" :title="`${v} reservations`"></div>
          </div>
        </div>
        <div class="chart-card">
          <h3>Deals Per Minute</h3>
          <div class="chart-container">
            <div v-for="(v, i) in dealData" :key="i" class="chart-bar bar-alt" :style="{ height: `${(v / Math.max(...dealData, 1)) * 100}%` }" :title="`${v} deals`"></div>
          </div>
        </div>
      </div>

      <div class="event-table-card">
        <h3>Recent Events</h3>
        <div class="event-table">
          <div class="event-row" v-for="(m, i) in [...history].reverse().slice(0, 10)" :key="i">
            <span class="event-time">{{ new Date(m.timestamp).toLocaleTimeString() }}</span>
            <span class="event-detail">{{ m.reservationsPerMinute }} reservations</span>
            <span class="event-detail">{{ m.dealsPerMinute }} deals</span>
            <span class="event-detail">{{ m.activeUsers }} users</span>
          </div>
          <div v-if="history.length === 0" class="event-empty">Waiting for data...</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page { padding: 40px 0; animation: fade-in 0.4s ease; }
.dash-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
.dash-header h1 { font-size: 1.75rem; font-weight: 700; }
.live-badge { padding: 4px 14px; background: #fef2f2; color: #dc2626; border-radius: 100px; font-size: 0.75rem; font-weight: 700; animation: pulse 2s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
.metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
.metric-card { padding: 24px; background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
.metric-value { font-size: 2.25rem; font-weight: 800; color: var(--color-text); margin-bottom: 4px; }
.metric-label { font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 8px; }
.metric-trend { font-size: 0.8125rem; font-weight: 600; }
.metric-trend.up { color: var(--color-success); }
.metric-trend.neutral { color: var(--color-text-tertiary); }
.charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px; }
.chart-card { padding: 24px; background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
.chart-card h3 { font-size: 1rem; font-weight: 600; margin-bottom: 16px; }
.chart-container { display: flex; align-items: flex-end; gap: 4px; height: 200px; }
.chart-bar { flex: 1; background: var(--color-accent); border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.5s ease; }
.chart-bar.bar-alt { background: #10b981; }
.event-table-card { padding: 24px; background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
.event-table-card h3 { font-size: 1rem; font-weight: 600; margin-bottom: 16px; }
.event-row { display: flex; gap: 24px; padding: 12px 0; border-bottom: 1px solid var(--color-border); font-size: 0.875rem; }
.event-time { color: var(--color-text-tertiary); width: 80px; }
.event-detail { color: var(--color-text-secondary); }
.event-empty { padding: 24px; text-align: center; color: var(--color-text-tertiary); }
@media (max-width: 768px) { .metrics-grid { grid-template-columns: 1fr 1fr; } .charts-grid { grid-template-columns: 1fr; } }
</style>
