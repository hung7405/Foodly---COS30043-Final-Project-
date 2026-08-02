<script setup lang="ts">
import { ref } from 'vue'
import { aiService } from '../services/api'
import { useUiStore } from '../stores/ui.store'
import { formatVND } from '../utils/currency'

const file = ref<File | null>(null)
const preview = ref('')
const result = ref<any>(null)
const isLoading = ref(false)
const error = ref('')
const ui = useUiStore()

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    file.value = input.files[0]
    preview.value = URL.createObjectURL(input.files[0])
    result.value = null
    error.value = ''
  }
}

async function handleSearch() {
  if (!file.value) return
  isLoading.value = true
  error.value = ''
  try {
    const data = await aiService.searchByImage(file.value)
    if (data?.error) {
      error.value = data.error
    } else {
      result.value = data
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Could not analyse the image.'
    ui.addToast(error.value, 'error')
  } finally {
    isLoading.value = false
  }
}

function discountPct(d: any) {
  return d.originalPrice && d.discountPrice ? Math.round((1 - d.discountPrice / d.originalPrice) * 100) : 0
}

function reset() {
  file.value = null
  preview.value = ''
  result.value = null
  error.value = ''
}
</script>

<template>
  <div class="ai-page">
    <div class="container-narrow">
      <div class="ai-header">
        <h1 class="section-title">AI Image Search</h1>
        <p class="section-subtitle">Upload a photo of food, and we'll find matching deals near you.</p>
      </div>

      <div class="upload-area" :class="{ 'has-file': preview }">
        <template v-if="!preview">
          <div class="upload-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <p>Drag & drop a food image, or <span class="browse-link">browse</span></p>
            <span class="upload-hint">Supports JPG, PNG, WEBP</span>
          </div>
          <input type="file" class="file-input" accept="image/*" @change="onFileChange" />
        </template>
        <template v-else>
          <div class="preview-wrapper">
            <img :src="preview" alt="Uploaded food" class="preview-img" />
            <button class="btn-remove" @click="reset" aria-label="Remove image">&times;</button>
          </div>
        </template>
      </div>

      <div class="ai-actions">
        <button v-if="preview && !result" class="btn btn-primary btn-lg" :disabled="isLoading" @click="handleSearch">
          <span v-if="isLoading" class="spinner"></span>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          {{ isLoading ? 'Analysing...' : 'Search Matching Deals' }}
        </button>
      </div>

      <div v-if="error" class="ai-error">{{ error }}</div>

      <transition name="fade">
        <div v-if="isLoading" class="loading-analysis">
          <div class="skeleton" style="height:80px;border-radius:var(--radius-md)"></div>
          <div class="skeleton" style="height:60px;border-radius:var(--radius-md);width:60%"></div>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="result" class="result-card">
          <div class="result-header">
            <h3>{{ result.foodName || 'Analysis Complete' }}</h3>
            <div class="confidence-badge">
              {{ (result.confidence * 100).toFixed(0) }}% confidence
            </div>
          </div>
          <div class="result-body">
            <p v-if="result.description" class="result-desc">{{ result.description }}</p>
            <div class="result-row">
              <span class="result-label">Detected Category</span>
              <span class="result-value">{{ result.detectedCategory }}</span>
            </div>
            <div class="result-row">
              <span class="result-label">Engine</span>
              <span class="result-value engine-badge" :class="result.provider">
                {{ result.provider === 'gemini' ? 'Gemini Vision' : result.provider === 'openai' ? 'OpenAI Vision' : 'Keyword heuristic' }}
              </span>
            </div>
            <div class="result-row">
              <span class="result-label">Matched Keywords</span>
              <div class="keyword-chips">
                <span v-for="kw in result.matchedKeywords" :key="kw" class="keyword-chip">{{ kw }}</span>
              </div>
            </div>
          </div>

          <div v-if="result.matches?.length" class="matches-section">
            <h4 class="matches-title">Matching deals near you</h4>
            <router-link v-for="deal in result.matches" :key="deal.id" :to="'/deals/' + deal.id" class="match-row">
              <div class="match-thumb">
                <img :src="deal.images?.[0] || 'https://images.unsplash.com/photo-1586999768265-24af89630739?w=100&q=80'" :alt="deal.title" loading="lazy" />
              </div>
              <div class="match-info">
                <span class="match-store">{{ deal.store?.name }}</span>
                <span class="match-name">{{ deal.title }}</span>
              </div>
              <div class="match-meta">
                <span class="match-price">{{ formatVND(deal.discountPrice) }}</span>
                <span v-if="discountPct(deal) > 0" class="match-discount">-{{ discountPct(deal) }}%</span>
              </div>
            </router-link>
          </div>
          <div v-else class="matches-section empty-matches">
            <p class="empty-matches-text">No active deals match this food right now. Try exploring nearby.</p>
          </div>

          <div class="result-actions">
            <router-link :to="'/explore?search=' + encodeURIComponent(result.matchedKeywords?.[0] || '')" class="btn btn-primary">
              Browse Related Deals
            </router-link>
            <button class="btn btn-outline" @click="reset">Try Another</button>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.ai-page { padding: 40px 0 80px; animation: fade-in 0.4s ease; }
.ai-header { text-align: center; margin-bottom: 40px; }
.ai-header .section-subtitle { margin: 0 auto; }
.upload-area { position: relative; border: 2px dashed var(--color-border); border-radius: var(--radius-lg); padding: 60px 24px; text-align: center; cursor: pointer; transition: all var(--transition-base); min-height: 200px; display: flex; align-items: center; justify-content: center; }
.upload-area:hover { border-color: var(--color-accent); background: var(--color-accent-light); }
.upload-area.has-file { border-style: solid; padding: 8px; cursor: default; }
.file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.upload-placeholder { color: var(--color-text-tertiary); }
.upload-placeholder svg { margin-bottom: 16px; color: var(--color-text-tertiary); }
.upload-placeholder p { font-size: 1rem; margin-bottom: 8px; color: var(--color-text-secondary); }
.browse-link { color: var(--color-accent); font-weight: 600; }
.upload-hint { font-size: 0.8125rem; }
.preview-wrapper { position: relative; width: 100%; }
.preview-img { max-height: 300px; border-radius: var(--radius-md); object-fit: contain; width: 100%; }
.btn-remove { position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; border-radius: 50%; border: none; background: rgba(0,0,0,0.6); color: white; font-size: 1.25rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.ai-actions { text-align: center; margin-top: 24px; }
.loading-analysis { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
.ai-error { margin-top: 20px; padding: 12px 16px; border-radius: var(--radius-sm); background: #fef2f2; color: #dc2626; font-size: 0.875rem; text-align: center; }
.result-card { margin-top: 32px; background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
.result-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--color-border); }
.result-header h3 { font-size: 1.125rem; font-weight: 600; }
.confidence-badge { padding: 4px 12px; border-radius: 100px; background: var(--color-accent-light); color: var(--color-accent); font-size: 0.8125rem; font-weight: 600; }
.result-body { padding: 20px 24px; }
.result-desc { color: var(--color-text-secondary); font-size: 0.9375rem; margin-bottom: 16px; line-height: 1.5; }
.result-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; }
.result-row + .result-row { border-top: 1px solid var(--color-border); }
.result-label { font-size: 0.9375rem; color: var(--color-text-secondary); }
.result-value { font-size: 1rem; font-weight: 600; color: var(--color-text); }
.engine-badge { font-size: 0.8125rem; font-weight: 600; padding: 4px 10px; border-radius: 100px; }
.engine-badge.gemini { background: #e0f2fe; color: #0369a1; }
.engine-badge.openai { background: #f0fdf4; color: #15803d; }
.engine-badge.heuristic { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }
.keyword-chips { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.keyword-chip { padding: 4px 10px; background: var(--color-bg-tertiary); border-radius: 100px; font-size: 0.8125rem; }
.matches-section { padding: 20px 24px; border-top: 1px solid var(--color-border); }
.matches-title { font-size: 0.9375rem; font-weight: 600; margin-bottom: 12px; color: var(--color-text); }
.match-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; text-decoration: none; border-bottom: 1px solid var(--color-border); transition: all var(--transition-fast); }
.match-row:last-child { border-bottom: none; }
.match-row:hover { opacity: 0.8; }
.match-thumb { width: 48px; height: 48px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: var(--color-bg-tertiary); }
.match-thumb img { width: 100%; height: 100%; object-fit: cover; }
.match-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.match-store { font-size: 0.7rem; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.04em; }
.match-name { font-size: 0.875rem; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.match-meta { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.match-price { font-size: 0.9375rem; font-weight: 700; color: var(--color-accent); }
.match-discount { font-size: 0.6875rem; padding: 2px 6px; background: var(--color-accent); color: white; border-radius: 4px; font-weight: 700; }
.empty-matches { padding-bottom: 8px; }
.empty-matches-text { color: var(--color-text-tertiary); font-size: 0.875rem; }
.result-actions { display: flex; gap: 12px; padding: 20px 24px; border-top: 1px solid var(--color-border); }
.spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
