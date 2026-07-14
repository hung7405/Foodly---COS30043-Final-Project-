<script setup lang="ts">
const props = withDefaults(defineProps<{
  rating?: number
  reviewCount?: number
  size?: 'sm' | 'md'
}>(), {
  size: 'sm',
})
</script>

<template>
  <div class="rating-row" v-if="rating">
    <div class="stars" :class="`stars--${size}`">
      <svg v-for="i in 5" :key="i" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
          :fill="i <= Math.round(rating) ? 'var(--color-rating)' : 'none'"
          :stroke="i <= Math.round(rating) ? 'var(--color-rating)' : 'var(--color-text-tertiary)'"
        />
      </svg>
    </div>
    <span class="rating-number">{{ rating.toFixed(1) }}</span>
    <span class="rating-count" v-if="reviewCount">({{ reviewCount }})</span>
  </div>
</template>

<style scoped>
.rating-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stars {
  display: flex;
  gap: 1px;
}

.stars--sm svg { width: 10px; height: 10px; }
.stars--md svg { width: 14px; height: 14px; }

.rating-number {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-rating);
}

.rating-count {
  font-size: 0.625rem;
  color: var(--color-text-tertiary);
}
</style>
