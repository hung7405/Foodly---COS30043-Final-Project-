<script setup lang="ts">
import { ref } from 'vue'

const file = ref<File | null>(null)
const preview = ref('')
const result = ref<any>(null)
const isLoading = ref(false)

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    file.value = input.files[0]
    preview.value = URL.createObjectURL(input.files[0])
    result.value = null
  }
}

async function handleSearch() {
  if (!file.value) return
  isLoading.value = true
  await new Promise(r => setTimeout(r, 1500))
  result.value = {
    detectedCategory: 'Fresh Produce',
    confidence: 0.92,
    matchedKeywords: ['vegetable', 'salad', 'lettuce', 'tomato'],
  }
  isLoading.value = false
}

function reset() {
  file.value = null
  preview.value = ''
  result.value = null
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
          {{ isLoading ? 'Analysing...' : '🔍 Search Matching Deals' }}
        </button>
      </div>

      <transition name="fade">
        <div v-if="isLoading" class="loading-analysis">
          <div class="skeleton" style="height:80px;border-radius:var(--radius-md)"></div>
          <div class="skeleton" style="height:60px;border-radius:var(--radius-md);width:60%"></div>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="result" class="result-card">
          <div class="result-header">
            <h3>Analysis Complete</h3>
            <div class="confidence-badge">
              {{ (result.confidence * 100).toFixed(0) }}% confidence
            </div>
          </div>
          <div class="result-body">
            <div class="result-row">
              <span class="result-label">Detected Category</span>
              <span class="result-value">{{ result.detectedCategory }}</span>
            </div>
            <div class="result-row">
              <span class="result-label">Matched Keywords</span>
              <div class="keyword-chips">
                <span v-for="kw in result.matchedKeywords" :key="kw" class="keyword-chip">{{ kw }}</span>
              </div>
            </div>
          </div>
          <div class="result-actions">
            <router-link to="/explore" class="btn btn-primary">
              Browse {{ result.detectedCategory }} Deals
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
.result-card { margin-top: 32px; background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
.result-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--color-border); }
.result-header h3 { font-size: 1.125rem; font-weight: 600; }
.confidence-badge { padding: 4px 12px; border-radius: 100px; background: var(--color-accent-light); color: var(--color-accent); font-size: 0.8125rem; font-weight: 600; }
.result-body { padding: 20px 24px; }
.result-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; }
.result-row + .result-row { border-top: 1px solid var(--color-border); }
.result-label { font-size: 0.9375rem; color: var(--color-text-secondary); }
.result-value { font-size: 1rem; font-weight: 600; color: var(--color-text); }
.keyword-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.keyword-chip { padding: 4px 10px; background: var(--color-bg-tertiary); border-radius: 100px; font-size: 0.8125rem; }
.result-actions { display: flex; gap: 12px; padding: 20px 24px; border-top: 1px solid var(--color-border); }
.spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
