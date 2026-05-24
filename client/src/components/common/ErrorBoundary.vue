<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-boundary__content">
      <h2>Something went wrong</h2>
      <p>{{ errorMessage }}</p>
      <button class="error-boundary__btn" @click="reload">Reload page</button>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const hasError = ref(false)
const errorMessage = ref('An unexpected error occurred')

onErrorCaptured((err) => {
  hasError.value = true
  errorMessage.value = err?.message || 'An unexpected error occurred'
  return false
})

function reload() {
  window.location.reload()
}
</script>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
}
.error-boundary__content {
  text-align: center;
  max-width: 400px;
}
.error-boundary__content h2 {
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
}
.error-boundary__content p {
  color: var(--color-text-secondary, #666);
  margin-bottom: 1.5rem;
}
.error-boundary__btn {
  padding: 0.5rem 1.5rem;
  background: var(--color-primary, #2563eb);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
</style>
