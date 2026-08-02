<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { dealsService, storesService } from '../services/api'
import type { Deal, Store } from '../types'

const router = useRouter()
const route = useRoute()
const isEdit = computed(() => !!route.params.id)

const stores = ref<Store[]>([])
const isSubmitting = ref(false)
const isLocating = ref(false)
const message = ref('')
const errors = ref<string[]>([])
const fieldErrors = ref<Record<string, string>>({})

const form = ref({
  storeId: '',
  title: '',
  description: '',
  originalPrice: 120000,
  discountPrice: 50000,
  remainingQuantity: 3,
  address: '',
  latitude: 10.8231,
  longitude: 106.6297,
  expiresIn: 2,
  tags: 'food, rescue',
  imageUrl: 'https://images.unsplash.com/photo-1586999768265-24af89630739?w=900&q=80',
})

onMounted(async () => {
  stores.value = await storesService.findAll()
  if (isEdit.value) {
    const deal = await dealsService.findById(String(route.params.id))
    hydrateForm(deal)
  }
})

watch(() => form.value.storeId, storeId => {
  const store = stores.value.find(item => item.id === storeId)
  if (!store) return
  form.value.address = store.address || form.value.address
  form.value.latitude = Number(store.latitude)
  form.value.longitude = Number(store.longitude)
})

function hydrateForm(deal: Deal) {
  form.value = {
    storeId: deal.storeId || '',
    title: deal.title,
    description: deal.description || '',
    originalPrice: Number(deal.originalPrice),
    discountPrice: Number(deal.discountPrice),
    remainingQuantity: deal.remainingQuantity,
    address: deal.address || '',
    latitude: Number(deal.latitude),
    longitude: Number(deal.longitude),
    expiresIn: Math.max(Math.round((new Date(deal.expiresAt).getTime() - Date.now()) / 3600000), 1),
    tags: deal.tags.join(', '),
    imageUrl: deal.images?.[0] || form.value.imageUrl,
  }
}

async function useMyLocation() {
  if (!navigator.geolocation) return
  isLocating.value = true
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
    })
    form.value.latitude = Number(position.coords.latitude.toFixed(6))
    form.value.longitude = Number(position.coords.longitude.toFixed(6))
    message.value = 'Location captured. Add the pickup address text if needed.'
  } catch {
    message.value = 'Could not access browser location. You can still type coordinates manually.'
  } finally {
    isLocating.value = false
  }
}

function clearFieldError(name: string) {
  if (fieldErrors.value[name]) {
    const next = { ...fieldErrors.value }
    delete next[name]
    fieldErrors.value = next
  }
}

async function handleSubmit() {
  errors.value = []
  message.value = ''
  const fe: Record<string, string> = {}
  if (!form.value.title.trim()) fe.title = 'Title is required'
  if (!Number.isFinite(form.value.discountPrice) || form.value.discountPrice <= 0) fe.discountPrice = 'Discount price must be greater than 0'
  if (!Number.isFinite(form.value.originalPrice) || form.value.originalPrice <= 0) fe.originalPrice = 'Original price is required'
  else if (form.value.originalPrice < form.value.discountPrice) fe.originalPrice = 'Original price must be greater than or equal to discounted price'
  if (!Number.isFinite(form.value.remainingQuantity) || form.value.remainingQuantity < 1) fe.remainingQuantity = 'Quantity must be at least 1'
  if (!form.value.address.trim()) fe.address = 'Address is required for pickup'
  if (!Number.isFinite(form.value.latitude) || form.value.latitude < -90 || form.value.latitude > 90) fe.latitude = 'Latitude must be between -90 and 90'
  if (!Number.isFinite(form.value.longitude) || form.value.longitude < -180 || form.value.longitude > 180) fe.longitude = 'Longitude must be between -180 and 180'
  if (!Number.isFinite(form.value.expiresIn) || form.value.expiresIn < 1 || form.value.expiresIn > 24) fe.expiresIn = 'Expiry must be between 1 and 24 hours'
  fieldErrors.value = fe
  if (Object.keys(fe).length) return

  const payload = {
    storeId: form.value.storeId || undefined,
    title: form.value.title.trim(),
    description: form.value.description.trim(),
    originalPrice: form.value.originalPrice,
    discountPrice: form.value.discountPrice,
    remainingQuantity: form.value.remainingQuantity,
    address: form.value.address.trim(),
    latitude: form.value.latitude,
    longitude: form.value.longitude,
    expiresAt: new Date(Date.now() + form.value.expiresIn * 60 * 60 * 1000).toISOString(),
    tags: form.value.tags.split(',').map(tag => tag.trim()).filter(Boolean),
    images: form.value.imageUrl ? [form.value.imageUrl.trim()] : [],
  }

  isSubmitting.value = true
  try {
    if (isEdit.value) {
      await dealsService.update(String(route.params.id), payload)
      message.value = 'Deal updated successfully.'
    } else {
      await dealsService.create(payload)
      message.value = 'Deal posted successfully.'
    }
    router.push('/profile/deals')
  } catch (err: any) {
    errors.value = [err.response?.data?.message || 'Could not save the deal.']
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="create-deal-page">
    <div class="container-narrow">
      <h1 class="page-title">{{ isEdit ? 'Edit Deal' : 'Post a New Deal' }}</h1>
      <p class="page-subtitle">Create a live listing that appears on the map, nearby search, and reservation flow.</p>

      <div v-if="message" class="info-box">{{ message }}</div>
      <div v-if="errors.length" class="error-box">
        <p v-for="err in errors" :key="err">{{ err }}</p>
      </div>

      <form class="deal-form" @submit.prevent="handleSubmit">
        <div class="form-row">
          <div class="form-group">
            <label for="store">Store</label>
            <select id="store" v-model="form.storeId">
              <option value="">Independent / community post</option>
              <option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label for="expires">Expires in (hours)</label>
            <input id="expires" v-model.number="form.expiresIn" type="number" min="1" max="24" :class="{ invalid: fieldErrors.expiresIn }" @input="clearFieldError('expiresIn')" />
            <span v-if="fieldErrors.expiresIn" class="field-error">{{ fieldErrors.expiresIn }}</span>
          </div>
        </div>

        <div class="form-group">
          <label for="title">Title</label>
          <input id="title" v-model="form.title" type="text" placeholder="e.g. Rescue Veggie Box" required :class="{ invalid: fieldErrors.title }" @input="clearFieldError('title')" />
          <span v-if="fieldErrors.title" class="field-error">{{ fieldErrors.title }}</span>
        </div>

        <div class="form-group">
          <label for="desc">Description</label>
          <textarea id="desc" v-model="form.description" rows="4" placeholder="What's included, pickup timing, freshness, best use..."></textarea>
        </div>

        <div class="form-row three-col">
          <div class="form-group">
            <label for="origPrice">Original Price</label>
            <input id="origPrice" v-model.number="form.originalPrice" type="number" step="0.01" min="0" :class="{ invalid: fieldErrors.originalPrice }" @input="clearFieldError('originalPrice')" />
            <span v-if="fieldErrors.originalPrice" class="field-error">{{ fieldErrors.originalPrice }}</span>
          </div>
          <div class="form-group">
            <label for="discPrice">Discounted Price</label>
            <input id="discPrice" v-model.number="form.discountPrice" type="number" step="0.01" min="0" :class="{ invalid: fieldErrors.discountPrice }" @input="clearFieldError('discountPrice')" />
            <span v-if="fieldErrors.discountPrice" class="field-error">{{ fieldErrors.discountPrice }}</span>
          </div>
          <div class="form-group">
            <label for="qty">Quantity</label>
            <input id="qty" v-model.number="form.remainingQuantity" type="number" min="1" :class="{ invalid: fieldErrors.remainingQuantity }" @input="clearFieldError('remainingQuantity')" />
            <span v-if="fieldErrors.remainingQuantity" class="field-error">{{ fieldErrors.remainingQuantity }}</span>
          </div>
        </div>

        <div class="form-group">
          <label for="address">Pickup Address</label>
          <input id="address" v-model="form.address" type="text" placeholder="123 Collins St, Melbourne" :class="{ invalid: fieldErrors.address }" @input="clearFieldError('address')" />
          <span v-if="fieldErrors.address" class="field-error">{{ fieldErrors.address }}</span>
        </div>

        <div class="form-row three-col">
          <div class="form-group">
            <label for="lat">Latitude</label>
            <input id="lat" v-model.number="form.latitude" type="number" step="0.000001" :class="{ invalid: fieldErrors.latitude }" @input="clearFieldError('latitude')" />
            <span v-if="fieldErrors.latitude" class="field-error">{{ fieldErrors.latitude }}</span>
          </div>
          <div class="form-group">
            <label for="lng">Longitude</label>
            <input id="lng" v-model.number="form.longitude" type="number" step="0.000001" :class="{ invalid: fieldErrors.longitude }" @input="clearFieldError('longitude')" />
            <span v-if="fieldErrors.longitude" class="field-error">{{ fieldErrors.longitude }}</span>
          </div>
          <div class="form-group locate-group">
            <label>&nbsp;</label>
            <button type="button" class="btn btn-outline locate-btn" :disabled="isLocating" @click="useMyLocation">
              {{ isLocating ? 'Locating...' : 'Use My GPS' }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="tags">Tags</label>
          <input id="tags" v-model="form.tags" type="text" placeholder="produce, bakery, family" />
        </div>

        <div class="form-group">
          <label for="imageUrl">Image URL</label>
          <input id="imageUrl" v-model="form.imageUrl" type="url" placeholder="https://..." />
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-lg" :disabled="isSubmitting">
            {{ isSubmitting ? 'Saving...' : isEdit ? 'Update Deal' : 'Post Deal' }}
          </button>
          <router-link to="/profile/deals" class="btn btn-outline">Cancel</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.create-deal-page { padding: 40px 0 60px; animation: fade-in 0.4s ease; }
.page-title { font-size: 1.6rem; font-weight: 700; margin-bottom: 4px; }
.page-subtitle { color: var(--color-text-secondary); margin-bottom: 28px; }
.info-box, .error-box { padding: 16px; border-radius: var(--radius-sm); margin-bottom: 18px; }
.info-box { background: #f0fdf4; color: #166534; border: 1px solid #86efac; }
.error-box { background: #fff7ed; color: #9a3412; border: 1px solid #fdba74; }
.deal-form { background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 30px; box-shadow: var(--shadow-sm); }
.form-group { margin-bottom: 18px; }
.form-group label { display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--color-text); }
.form-group input, .form-group textarea, .form-group select { width: 100%; padding: 12px 16px; border: 1.5px solid var(--color-border); border-radius: var(--radius-sm); font-family: var(--font-family); font-size: 0.9375rem; background: var(--color-bg); color: var(--color-text); }
.form-group input:focus, .form-group textarea:focus, .form-group select:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(22,163,74,0.12); }
.form-group input.invalid { border-color: var(--color-error); }
.form-group input.invalid:focus { box-shadow: 0 0 0 3px rgba(220,38,38,0.1); }
.field-error { display: block; margin-top: 4px; font-size: 0.75rem; color: var(--color-error); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.three-col { grid-template-columns: repeat(3, 1fr); }
.locate-group { display: flex; flex-direction: column; }
.locate-btn { width: 100%; }
.form-actions { display: flex; gap: 12px; margin-top: 26px; }
@media (max-width: 768px) { .form-row, .three-col { grid-template-columns: 1fr; } .form-actions { flex-direction: column; } }
</style>
