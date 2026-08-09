<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import { rewardsService } from '../services/api'

const auth = useAuthStore()
const router = useRouter()

const impact = ref<{ bags: number; foodKg: number; co2Kg: number; moneySaved: number } | null>(null)
const balance = ref(0)

const editingAddress = ref(false)
const addressInput = ref('')
const savingAddress = ref(false)
const addressNote = ref('')

function startEditing() {
  addressInput.value = auth.deliveryAddress || ''
  editingAddress.value = true
  addressNote.value = ''
}

async function saveAddress() {
  if (!addressInput.value.trim()) {
    addressNote.value = 'Enter an address to save.'
    return
  }
  savingAddress.value = true
  const synced = await auth.saveDeliveryAddress(addressInput.value)
  savingAddress.value = false
  editingAddress.value = false
  addressNote.value = synced ? '' : 'Saved on this device. Server sync is unavailable.'
}

onMounted(async () => {
  try {
    const [imp, bal] = await Promise.all([rewardsService.getImpact(), rewardsService.getBalance()])
    impact.value = imp
    balance.value = bal.balance
  } catch {
    // rewards unavailable for this user
  }
})

function logout() {
  auth.logout()
  router.push('/')
}
</script>

<template>
  <div class="profile-page">
    <div class="container-narrow">
      <div class="profile-card">
        <div class="profile-avatar">{{ auth.user?.username?.charAt(0).toUpperCase() || '?' }}</div>
        <h1>{{ auth.user?.firstName || auth.user?.username }}</h1>
        <p class="profile-email">{{ auth.user?.email }}</p>
        <div class="profile-meta">
          <span class="meta-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
              />
            </svg>
            Trust Score: {{ auth.user?.trustScore || 'N/A' }}
          </span>
          <span class="meta-badge">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
            </svg>
            {{ auth.user?.role }}
          </span>
        </div>
      </div>

      <div class="profile-card" id="delivery">
        <div class="delivery-header">
          <span class="delivery-icon">📍</span>
          <div>
            <h2 class="delivery-title">Delivery address</h2>
            <small class="delivery-sub">Where should Foodly drop off your orders?</small>
          </div>
        </div>
        <div v-if="!editingAddress" class="delivery-preview">
          <span class="delivery-value">{{ auth.deliveryAddress || 'Home' }}</span>
          <button type="button" class="btn btn-outline btn-sm" @click="startEditing">Edit</button>
        </div>
        <div v-else class="delivery-form">
          <input
            v-model="addressInput"
            class="delivery-input"
            type="text"
            maxlength="255"
            placeholder="e.g. 123 Nguyen Hue, District 1, HCMC"
            @keyup.enter="saveAddress"
          />
          <div class="delivery-actions">
            <button type="button" class="btn btn-outline btn-sm" @click="editingAddress = false">Cancel</button>
            <button type="button" class="btn btn-primary btn-sm" :disabled="savingAddress" @click="saveAddress">
              {{ savingAddress ? 'Saving…' : 'Save address' }}
            </button>
          </div>
          <small v-if="addressNote" class="delivery-note">{{ addressNote }}</small>
        </div>
      </div>

      <div class="row g-3 rewards-row">
        <div class="col-12 col-md-6">
          <router-link to="/spin" class="reward-card coins-card h-100">
            <div class="reward-icon">🪙</div>
            <div>
              <strong class="reward-value">{{ balance }} <span class="reward-unit">xu</span></strong>
              <small>Earn on every purchase · spin daily</small>
            </div>
            <span class="link-arrow">→</span>
          </router-link>
        </div>
        <div class="col-12 col-md-6">
          <div v-if="impact" class="reward-card impact-card h-100">
            <div class="reward-icon">🍀</div>
            <div>
              <strong class="reward-value">{{ impact.foodKg }} kg</strong>
              <small>food saved · {{ impact.co2Kg }} kg CO₂e</small>
            </div>
          </div>
        </div>
      </div>

      <div class="profile-links">
        <router-link to="/profile/deals" class="profile-link-card">
          <span class="link-icon">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </span>
          <span class="link-text">
            <strong>My Deals</strong>
            <small>Manage your listings</small>
          </span>
          <span class="link-arrow">→</span>
        </router-link>
        <router-link to="/profile/reservations" class="profile-link-card">
          <span class="link-icon">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
              />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </span>
          <span class="link-text">
            <strong>My Reservations</strong>
            <small>View your reserved items</small>
          </span>
          <span class="link-arrow">→</span>
        </router-link>
        <router-link to="/deals/new" class="profile-link-card">
          <span class="link-icon">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          <span class="link-text">
            <strong>Post a Deal</strong>
            <small>Share discounted food</small>
          </span>
          <span class="link-arrow">→</span>
        </router-link>
      </div>

      <button class="btn btn-outline logout-btn" @click="logout">Sign Out</button>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  padding: 40px 0;
  animation: fade-in 0.4s ease;
}
.profile-card {
  text-align: center;
  padding: 40px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  margin-bottom: 24px;
}
.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--color-accent-light);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  margin: 0 auto 16px;
}
.profile-card h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 4px;
}
.profile-email {
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}
.profile-meta {
  display: flex;
  gap: 8px;
  justify-content: center;
}
.delivery-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  text-align: left;
}
.delivery-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--color-accent-light);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}
.delivery-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 2px;
}
.delivery-sub {
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
}
.delivery-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  text-align: left;
}
.delivery-value {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.delivery-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.delivery-input {
  width: 100%;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text);
  font-size: 0.9375rem;
}
.delivery-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 4px rgba(238, 77, 45, 0.08);
}
.delivery-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.delivery-note {
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  text-align: left;
}
.meta-badge {
  padding: 4px 12px;
  background: var(--color-bg-tertiary);
  border-radius: 100px;
  font-size: 0.8125rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.profile-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}
.rewards-row {
  margin-bottom: 24px;
}
.reward-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: var(--color-text);
  transition: all var(--transition-fast);
}
a.reward-card:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.reward-icon {
  font-size: 1.75rem;
}
.reward-card > div:nth-child(2) {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.reward-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-accent);
}
.reward-unit {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  font-weight: 600;
}
.reward-card small {
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
}
.impact-card .reward-value {
  color: #166534;
}
.profile-link-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text);
  transition: all var(--transition-fast);
}
.profile-link-card:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
  transform: translateX(2px);
}
.link-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--color-accent-light);
  color: var(--color-accent);
  flex-shrink: 0;
}
.link-text {
  flex: 1;
}
.link-text strong {
  display: block;
  font-size: 1rem;
  margin-bottom: 2px;
}
.link-text small {
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
}
.link-arrow {
  color: var(--color-text-tertiary);
  font-size: 1.25rem;
}
.logout-btn {
  width: 100%;
}
</style>
