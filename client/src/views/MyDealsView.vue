<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { dealsService } from '../services/api'
import type { Deal } from '../types'
import { formatVND } from '../utils/currency'

const router = useRouter()
const deals = ref<Deal[]>([])
const isLoading = ref(true)
const error = ref('')

onMounted(loadDeals)

async function loadDeals() {
  isLoading.value = true
  error.value = ''
  try {
    const result = await dealsService.findMine()
    deals.value = result.deals || []
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Could not load your deals.'
  } finally {
    isLoading.value = false
  }
}

function editDeal(id: string) {
  router.push(`/deals/${id}/edit`)
}

async function deleteDeal(id: string) {
  try {
    await dealsService.remove(id)
    deals.value = deals.value.filter((deal) => deal.id !== id)
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Could not remove this deal.'
  }
}
</script>

<template>
  <div class="my-deals-page">
    <div class="container-narrow">
      <div class="page-header">
        <h1>My Deals</h1>
        <router-link to="/deals/new" class="btn btn-primary">New Deal</router-link>
      </div>

      <div v-if="error" class="error-box">{{ error }}</div>

      <div v-if="isLoading" class="deals-list">
        <div v-for="n in 3" :key="n" class="skeleton skeleton-row"></div>
      </div>

      <div v-else-if="deals.length === 0" class="empty-state">
        <h3>No deals yet</h3>
        <p>Post your first listing to test create, map marker, reservation, and moderation flow.</p>
        <router-link to="/deals/new" class="btn btn-primary" style="margin-top: 16px">Post a Deal</router-link>
      </div>

      <div v-else class="deals-list">
        <article v-for="deal in deals" :key="deal.id" class="deal-row">
          <img
            :src="deal.images?.[0] || 'https://images.unsplash.com/photo-1586999768265-24af89630739?w=300&q=80'"
            :alt="deal.title"
          />
          <div class="deal-row-info">
            <h3>{{ deal.title }}</h3>
            <div class="deal-row-meta">
              <span :class="deal.verified ? 'verified' : 'unverified'">{{
                deal.verified ? 'Verified' : 'Pending review'
              }}</span>
              <span>{{ formatVND(Number(deal.discountPrice)) }}</span>
              <span>{{ deal.remainingQuantity }} left</span>
              <span>{{ deal.status }}</span>
            </div>
          </div>
          <div class="deal-row-actions">
            <button class="btn btn-outline" @click="router.push(`/deals/${deal.id}`)">View</button>
            <button class="btn btn-outline" @click="editDeal(deal.id)">Edit</button>
            <button class="btn btn-ghost danger" @click="deleteDeal(deal.id)">Remove</button>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-deals-page {
  padding: 40px 0 60px;
  animation: fade-in 0.4s ease;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}
.page-header h1 {
  font-size: 1.55rem;
  font-weight: 700;
}
.error-box {
  padding: 14px 16px;
  background: #fff7ed;
  color: #9a3412;
  border: 1px solid #fdba74;
  border-radius: var(--radius-sm);
  margin-bottom: 18px;
}
.deals-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.skeleton-row {
  height: 112px;
  border-radius: var(--radius-md);
}
.deal-row {
  display: grid;
  grid-template-columns: 96px 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.deal-row img {
  width: 96px;
  height: 76px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}
.deal-row-info h3 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--color-text);
}
.deal-row-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 0.86rem;
  color: var(--color-text-secondary);
}
.deal-row-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.verified {
  color: var(--color-success);
  font-weight: 700;
}
.unverified {
  color: var(--color-warning);
  font-weight: 700;
}
.danger {
  color: var(--color-error);
}
@media (max-width: 760px) {
  .deal-row {
    grid-template-columns: 1fr;
  }
  .deal-row img {
    width: 100%;
    height: 180px;
  }
  .deal-row-actions {
    justify-content: stretch;
  }
  .deal-row-actions .btn {
    flex: 1;
  }
}
</style>
