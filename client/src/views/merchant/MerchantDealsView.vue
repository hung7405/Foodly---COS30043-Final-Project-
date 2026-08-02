<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { merchantService } from '../../services/api'
import { useUiStore } from '../../stores/ui.store'
import MerchantNavBar from '../../components/merchant/MerchantNavBar.vue'
import { formatVND } from '../../utils/currency'

const uiStore = useUiStore()
const deals = ref<any[]>([])
const isLoading = ref(true)
const error = ref('')
const togglingId = ref<string | null>(null)

onMounted(loadDeals)

async function loadDeals() {
  isLoading.value = true
  error.value = ''
  try {
    deals.value = await merchantService.getDeals()
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Could not load deals.'
  } finally {
    isLoading.value = false
  }
}

async function toggleDeal(deal: any) {
  togglingId.value = deal.id
  const nextActive = deal.status !== 'active'
  try {
    await merchantService.setDealActive(deal.id, nextActive)
    deal.status = nextActive ? 'active' : 'removed'
    uiStore.addToast(nextActive ? 'Deal activated' : 'Deal paused', 'success')
  } catch (err: any) {
    uiStore.addToast(err.response?.data?.message || 'Could not update deal', 'error')
  } finally {
    togglingId.value = null
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="merchant-page">
    <div class="container">
      <div class="merchant-header">
        <h1>Deal Management</h1>
        <span class="merchant-subtitle">Pause or reactivate listings</span>
      </div>

      <MerchantNavBar />

      <div v-if="error" class="error-box">{{ error }}</div>

      <div v-if="isLoading" class="deals-list">
        <div v-for="n in 5" :key="n" class="skeleton skeleton-card"></div>
      </div>

      <div v-else-if="deals.length === 0" class="empty-state">
        <h3>No deals</h3>
        <p>Deals created for your stores will appear here.</p>
      </div>

      <div v-else class="deals-list">
        <article v-for="deal in deals" :key="deal.id" class="deal-card">
          <img v-if="deal.image" :src="deal.image" alt="" class="deal-thumb" />
          <div class="deal-info">
            <div class="deal-top">
              <h3>{{ deal.title }}</h3>
              <span :class="['status-badge', deal.status]">{{ deal.status }}</span>
            </div>
            <p class="deal-meta">{{ deal.storeName || 'Your store' }} · {{ formatDate(deal.createdAt) }}</p>
            <div class="deal-stats">
              <span class="deal-price">
                <strong>{{ formatVND(deal.discountPrice) }}</strong>
                <s>{{ formatVND(deal.originalPrice) }}</s>
              </span>
              <span class="deal-stock">{{ deal.remainingQuantity }}/{{ deal.originalQuantity }} left</span>
            </div>
          </div>
          <div class="deal-actions">
            <button
              class="btn"
              :class="deal.status === 'active' ? 'btn-outline' : 'btn-primary'"
              :disabled="togglingId === deal.id"
              @click="toggleDeal(deal)"
            >
              {{ togglingId === deal.id ? 'Updating...' : deal.status === 'active' ? 'Pause' : 'Activate' }}
            </button>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.merchant-page { padding: 40px 0 60px; animation: fade-in 0.4s ease; }
.merchant-header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.merchant-header h1 { font-size: 1.75rem; font-weight: 700; }
.merchant-subtitle { color: var(--color-text-tertiary); font-size: 0.9rem; }
.error-box { padding: 14px 16px; background: #fff7ed; color: #9a3412; border: 1px solid #fdba74; border-radius: var(--radius-sm); margin-bottom: 18px; }

.deals-list { display: flex; flex-direction: column; gap: 12px; }
.skeleton-card { height: 120px; border-radius: var(--radius-md); }
.deal-card { display: flex; gap: 16px; align-items: center; padding: 16px; background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.deal-thumb { width: 72px; height: 72px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; }
.deal-info { flex: 1; min-width: 0; }
.deal-top { display: flex; align-items: center; gap: 12px; justify-content: space-between; }
.deal-top h3 { font-size: 0.98rem; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.deal-meta { color: var(--color-text-secondary); font-size: 0.82rem; margin: 4px 0 8px; }
.deal-stats { display: flex; align-items: center; gap: 16px; }
.deal-price { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; }
.deal-price s { color: var(--color-text-tertiary); font-size: 0.82rem; }
.deal-stock { font-size: 0.8rem; color: var(--color-text-secondary); }
.deal-actions { flex-shrink: 0; }

.status-badge { padding: 4px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; background: var(--color-bg-tertiary); }
.status-badge.active { background: #dcfce7; color: #166534; }
.status-badge.removed { background: #f1f5f9; color: #64748b; }
.empty-state { text-align: center; padding: 60px 0; color: var(--color-text-secondary); }

@media (max-width: 640px) {
  .deal-card { flex-wrap: wrap; }
  .deal-actions { width: 100%; }
  .deal-actions .btn { width: 100%; }
}
</style>
