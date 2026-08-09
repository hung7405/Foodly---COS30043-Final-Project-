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
  isSurprise: false,
  isFlash: false,
})

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1586999768265-24af89630739?w=900&q=80'
const MAX_IMAGES = 5
const images = ref<string[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

async function fileToDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const imgEl = new Image()
    await new Promise<void>((resolve, reject) => {
      imgEl.onload = () => resolve()
      imgEl.onerror = () => reject(new Error('Could not read image'))
      imgEl.src = url
    })
    const scale = Math.min(1, 640 / Math.max(imgEl.width, imgEl.height))
    const width = Math.max(1, Math.round(imgEl.width * scale))
    const height = Math.max(1, Math.round(imgEl.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unsupported')
    ctx.drawImage(imgEl, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', 0.75)
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function handleFiles(event: Event) {
  const files = (event.target as HTMLInputElement).files
  if (!files) return
  const room = MAX_IMAGES - images.value.length
  for (const file of Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, room)) {
    try {
      images.value.push(await fileToDataUrl(file))
    } catch {
      // skip unreadable image
    }
  }
  if (event.target) (event.target as HTMLInputElement).value = ''
}

function removeImage(index: number) {
  images.value.splice(index, 1)
}

onMounted(async () => {
  stores.value = await storesService.findAll()
  if (isEdit.value) {
    const deal = await dealsService.findById(String(route.params.id))
    hydrateForm(deal)
  }
})

watch(
  () => form.value.storeId,
  (storeId) => {
    const store = stores.value.find((item) => item.id === storeId)
    if (!store) return
    form.value.address = store.address || form.value.address
    form.value.latitude = Number(store.latitude)
    form.value.longitude = Number(store.longitude)
  }
)

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
    isSurprise:
      deal.tags.includes('surprise') || deal.metadata?.surprise_bag === true || deal.metadata?.surpriseBag === true,
    isFlash: deal.tags.includes('flash') || deal.metadata?.flash === true,
  }
  images.value = deal.images?.length ? [...deal.images] : []
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
  if (!Number.isFinite(form.value.discountPrice) || form.value.discountPrice <= 0)
    fe.discountPrice = 'Discount price must be greater than 0'
  if (!Number.isFinite(form.value.originalPrice) || form.value.originalPrice <= 0)
    fe.originalPrice = 'Original price is required'
  else if (form.value.originalPrice < form.value.discountPrice)
    fe.originalPrice = 'Original price must be greater than or equal to discounted price'
  if (!Number.isFinite(form.value.remainingQuantity) || form.value.remainingQuantity < 1)
    fe.remainingQuantity = 'Quantity must be at least 1'
  if (!form.value.address.trim()) fe.address = 'Address is required for pickup'
  if (!Number.isFinite(form.value.latitude) || form.value.latitude < -90 || form.value.latitude > 90)
    fe.latitude = 'Latitude must be between -90 and 90'
  if (!Number.isFinite(form.value.longitude) || form.value.longitude < -180 || form.value.longitude > 180)
    fe.longitude = 'Longitude must be between -180 and 180'
  if (!Number.isFinite(form.value.expiresIn) || form.value.expiresIn < 1 || form.value.expiresIn > 24)
    fe.expiresIn = 'Expiry must be between 1 and 24 hours'
  fieldErrors.value = fe
  if (Object.keys(fe).length) return

  const tags = form.value.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
  if (form.value.isSurprise && !tags.includes('surprise')) tags.push('surprise')
  if (form.value.isFlash && !tags.includes('flash')) tags.push('flash')

  const payload: Record<string, any> = {
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
    tags,
    images: images.value.length ? images.value : [FALLBACK_IMAGE],
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
            <input
              id="expires"
              v-model.number="form.expiresIn"
              type="number"
              min="1"
              max="24"
              :class="{ invalid: fieldErrors.expiresIn }"
              :aria-invalid="fieldErrors.expiresIn ? 'true' : undefined"
              aria-describedby="expires-error"
              @input="clearFieldError('expiresIn')"
            />
            <span v-if="fieldErrors.expiresIn" id="expires-error" class="field-error">{{ fieldErrors.expiresIn }}</span>
          </div>
        </div>

        <div class="form-group">
          <label for="title">Title</label>
          <input
            id="title"
            v-model="form.title"
            type="text"
            placeholder="e.g. Rescue Veggie Box"
            required
            :class="{ invalid: fieldErrors.title }"
            :aria-invalid="fieldErrors.title ? 'true' : undefined"
            aria-describedby="title-error"
            @input="clearFieldError('title')"
          />
          <span v-if="fieldErrors.title" id="title-error" class="field-error">{{ fieldErrors.title }}</span>
        </div>

        <div class="form-group">
          <label for="desc">Description</label>
          <textarea
            id="desc"
            v-model="form.description"
            rows="4"
            placeholder="What's included, pickup timing, freshness, best use..."
          ></textarea>
        </div>

        <div class="form-row three-col">
          <div class="form-group">
            <label for="origPrice">Original Price</label>
            <input
              id="origPrice"
              v-model.number="form.originalPrice"
              type="number"
              step="0.01"
              min="0"
              :class="{ invalid: fieldErrors.originalPrice }"
              :aria-invalid="fieldErrors.originalPrice ? 'true' : undefined"
              aria-describedby="origPrice-error"
              @input="clearFieldError('originalPrice')"
            />
            <span v-if="fieldErrors.originalPrice" id="origPrice-error" class="field-error">{{ fieldErrors.originalPrice }}</span>
          </div>
          <div class="form-group">
            <label for="discPrice">Discounted Price</label>
            <input
              id="discPrice"
              v-model.number="form.discountPrice"
              type="number"
              step="0.01"
              min="0"
              :class="{ invalid: fieldErrors.discountPrice }"
              :aria-invalid="fieldErrors.discountPrice ? 'true' : undefined"
              aria-describedby="discPrice-error"
              @input="clearFieldError('discountPrice')"
            />
            <span v-if="fieldErrors.discountPrice" id="discPrice-error" class="field-error">{{ fieldErrors.discountPrice }}</span>
          </div>
          <div class="form-group">
            <label for="qty">Quantity</label>
            <input
              id="qty"
              v-model.number="form.remainingQuantity"
              type="number"
              min="1"
              :class="{ invalid: fieldErrors.remainingQuantity }"
              :aria-invalid="fieldErrors.remainingQuantity ? 'true' : undefined"
              aria-describedby="qty-error"
              @input="clearFieldError('remainingQuantity')"
            />
            <span v-if="fieldErrors.remainingQuantity" id="qty-error" class="field-error">{{ fieldErrors.remainingQuantity }}</span>
          </div>
        </div>

        <div class="form-group">
          <label class="toggle-label">
            <input type="checkbox" v-model="form.isSurprise" class="toggle-input" />
            <span class="toggle-body">
              <strong>Surprise Bag</strong>
              <small>Giá thị trường không hiện trên thẻ. Người mua mở túi và nhận bất ngờ.</small>
            </span>
          </label>
        </div>

        <div class="form-group">
          <label class="toggle-label">
            <input type="checkbox" v-model="form.isFlash" class="toggle-input" />
            <span class="toggle-body">
              <strong>Flash Deal (giá giảm theo thời gian)</strong>
              <small>Giá tự động giảm dần mỗi vài phút khi càng gần hết giờ lấy.</small>
            </span>
          </label>
        </div>

        <div class="form-group">
          <label for="address">Pickup Address</label>
          <input
            id="address"
            v-model="form.address"
            type="text"
            placeholder="123 Collins St, Melbourne"
            :class="{ invalid: fieldErrors.address }"
            :aria-invalid="fieldErrors.address ? 'true' : undefined"
            aria-describedby="address-error"
            @input="clearFieldError('address')"
          />
          <span v-if="fieldErrors.address" id="address-error" class="field-error">{{ fieldErrors.address }}</span>
        </div>

        <div class="form-row three-col">
          <div class="form-group">
            <label for="lat">Latitude</label>
            <input
              id="lat"
              v-model.number="form.latitude"
              type="number"
              step="0.000001"
              :class="{ invalid: fieldErrors.latitude }"
              :aria-invalid="fieldErrors.latitude ? 'true' : undefined"
              aria-describedby="lat-error"
              @input="clearFieldError('latitude')"
            />
            <span v-if="fieldErrors.latitude" id="lat-error" class="field-error">{{ fieldErrors.latitude }}</span>
          </div>
          <div class="form-group">
            <label for="lng">Longitude</label>
            <input
              id="lng"
              v-model.number="form.longitude"
              type="number"
              step="0.000001"
              :class="{ invalid: fieldErrors.longitude }"
              :aria-invalid="fieldErrors.longitude ? 'true' : undefined"
              aria-describedby="lng-error"
              @input="clearFieldError('longitude')"
            />
            <span v-if="fieldErrors.longitude" id="lng-error" class="field-error">{{ fieldErrors.longitude }}</span>
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
          <label for="imageUpload">Photos ({{ images.length }}/5)</label>
          <input
            id="imageUpload"
            ref="fileInput"
            type="file"
            class="upload-input"
            accept="image/*"
            multiple
            aria-label="Deal photos, select up to 5 images from your device"
            @change="handleFiles"
          />
          <button type="button" class="btn btn-outline upload-trigger" @click="fileInput?.click()">
            Upload from device (up to 5)
          </button>
          <div v-if="images.length" class="img-grid">
            <div v-for="(img, i) in images" :key="i" class="img-cell">
              <img :src="img" :alt="'Uploaded photo ' + (i + 1)" />
              <button type="button" class="img-remove" :aria-label="'Remove photo ' + (i + 1)" @click="removeImage(i)">
                &times;
              </button>
            </div>
          </div>
          <p class="img-hint">JPG / PNG / WEBP. Photos are compressed automatically.</p>
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
.create-deal-page {
  padding: 40px 0 60px;
  animation: fade-in 0.4s ease;
}
.page-title {
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 4px;
}
.page-subtitle {
  color: var(--color-text-secondary);
  margin-bottom: 28px;
}
.info-box,
.error-box {
  padding: 16px;
  border-radius: var(--radius-sm);
  margin-bottom: 18px;
}
.info-box {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #86efac;
}
.error-box {
  background: #fff7ed;
  color: #9a3412;
  border: 1px solid #fdba74;
}
.deal-form {
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 30px;
  box-shadow: var(--shadow-sm);
}
.form-group {
  margin-bottom: 18px;
}
.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--color-text);
}
.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-family);
  font-size: 0.9375rem;
  background: var(--color-bg);
  color: var(--color-text);
}
.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
}
.form-group input.invalid {
  border-color: var(--color-error);
}
.form-group input.invalid:focus {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}
.field-error {
  display: block;
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--color-error);
}
.toggle-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  padding: 12px 14px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}
.toggle-label:hover {
  border-color: var(--color-accent);
}
.toggle-label:has(.toggle-input:checked) {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
}
.toggle-input {
  margin-top: 3px;
  accent-color: var(--color-accent);
  width: 18px;
  height: 18px;
}
.toggle-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.toggle-body small {
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  font-weight: 400;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.three-col {
  grid-template-columns: repeat(3, 1fr);
}
.locate-group {
  display: flex;
  flex-direction: column;
}
.locate-btn {
  width: 100%;
}
.upload-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
.upload-trigger {
  margin-top: 6px;
}
.img-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 10px;
  margin-top: 14px;
}
.img-cell {
  position: relative;
  border-radius: var(--radius-sm);
  overflow: hidden;
  aspect-ratio: 4 / 3;
  border: 1px solid var(--color-border);
}
.img-cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.img-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}
.img-hint {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  margin-top: 6px;
}
.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 26px;
}
@media (max-width: 768px) {
  .form-row,
  .three-col {
    grid-template-columns: 1fr;
  }
  .form-actions {
    flex-direction: column;
  }
}
</style>
