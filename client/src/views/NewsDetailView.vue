<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { NewsArticle } from '../types/news.types'

const route = useRoute()
const article = ref<NewsArticle | null>(null)
const isLoading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const response = await fetch('/data/news.json')
    const data: NewsArticle[] = await response.json()
    const found = data.find((a) => a.id === Number(route.params.id))
    if (found) {
      article.value = found
    } else {
      error.value = 'Article not found'
    }
  } catch {
    error.value = 'Failed to load article'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="news-detail-page">
    <div class="container-narrow">
      <template v-if="isLoading">
        <div class="skeleton-detail">
          <div class="skeleton skeleton-image"></div>
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text short"></div>
        </div>
      </template>

      <template v-else-if="error">
        <div class="empty-state">
          <h3>{{ error }}</h3>
          <p>The article you're looking for doesn't exist.</p>
          <router-link to="/news" class="btn btn-outline" style="margin-top: 16px">Back to News</router-link>
        </div>
      </template>

      <template v-else-if="article">
        <article class="article-detail">
          <router-link to="/news" class="back-link">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to News
          </router-link>

          <div class="article-header">
            <span class="article-category">{{ article.category }}</span>
            <h1 class="article-title">{{ article.title }}</h1>
            <time class="article-date" :datetime="article.publishedDate">
              {{
                new Date(article.publishedDate).toLocaleDateString('en-AU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              }}
            </time>
          </div>

          <img v-if="article.imageUrl" :src="article.imageUrl" :alt="article.title" class="article-image" />

          <div class="article-content">
            <p>{{ article.content }}</p>
          </div>
        </article>
      </template>
    </div>
  </div>
</template>

<style scoped>
.news-detail-page {
  padding: 40px 0 80px;
  animation: fade-in 0.5s ease;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  margin-bottom: 32px;
  font-weight: 500;
}

.back-link:hover {
  color: var(--color-accent);
}

.article-header {
  margin-bottom: 32px;
}

.article-category {
  display: inline-block;
  padding: 4px 12px;
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-radius: 100px;
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.article-title {
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.03em;
  margin-bottom: 12px;
  color: var(--color-text);
}

.article-date {
  font-size: 0.9375rem;
  color: var(--color-text-tertiary);
}

.article-image {
  width: 100%;
  max-height: 450px;
  object-fit: cover;
  border-radius: var(--radius-lg);
  margin-bottom: 32px;
}

.article-content p {
  font-size: 1.125rem;
  line-height: 1.8;
  color: var(--color-text-secondary);
}

.skeleton-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-image {
  height: 400px;
  border-radius: var(--radius-lg);
}

.skeleton-title {
  height: 40px;
  width: 70%;
}

.skeleton-text {
  height: 20px;
}

.skeleton-text.short {
  width: 50%;
}

@media (max-width: 768px) {
  .article-title {
    font-size: 1.625rem;
  }
}
</style>
