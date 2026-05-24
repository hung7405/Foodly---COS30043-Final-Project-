<script setup lang="ts">
</script>

<template>
  <div class="skeleton-card" role="status" aria-label="Loading content">
    <div class="skeleton skeleton-image-bar"></div>
    <div class="skeleton-card-body">
      <div class="skeleton skeleton-line w-40"></div>
      <div class="skeleton skeleton-line w-80"></div>
      <div class="skeleton skeleton-line w-60"></div>
    </div>
    <span class="sr-only">Loading...</span>
  </div>
</template>

<style scoped>
.skeleton-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-card-bg);
}

.skeleton-image-bar {
  height: 200px;
  border-radius: 0;
}

.skeleton-card-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-line {
  height: 16px;
  border-radius: 4px;
}

.w-40 { width: 40%; }
.w-60 { width: 60%; }
.w-80 { width: 80%; }
</style>
