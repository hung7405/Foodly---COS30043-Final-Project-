<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { NewsArticle, NewsFilters } from '../types/news.types'
import { CATEGORIES, PAGE_SIZE } from '../utils/constants'
import SkeletonLoader from '../components/common/SkeletonLoader.vue'
import EmptyState from '../components/common/EmptyState.vue'

const articles = ref<NewsArticle[]>([])
const isLoading = ref(true)
const filters = ref<NewsFilters>({
  search: '',
  category: 'All',
  page: 1,
  pageSize: PAGE_SIZE,
})

async function loadNews() {
  isLoading.value = true
  try {
    const response = await fetch('/data/news.json')
    const data = await response.json()
    articles.value = data
  } catch (error) {
    console.error('Failed to load news:', error)
    articles.value = []
  } finally {
    isLoading.value = false
  }
}

loadNews()

const filteredArticles = computed(() => {
  return articles.value.filter((article) => {
    const search = filters.value.search.toLowerCase()
    const matchesSearch =
      !search ||
      article.title.toLowerCase().includes(search) ||
      article.content.toLowerCase().includes(search) ||
      article.publishedDate.includes(search) ||
      article.category.toLowerCase().includes(search)

    const matchesCategory = filters.value.category === 'All' || article.category === filters.value.category

    return matchesSearch && matchesCategory
  })
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredArticles.value.length / PAGE_SIZE))
})

const paginatedArticles = computed(() => {
  const start = (filters.value.page - 1) * PAGE_SIZE
  const end = start + PAGE_SIZE
  return filteredArticles.value.slice(start, end)
})

watch(
  () => filters.value.search,
  () => {
    filters.value.page = 1
  }
)

watch(
  () => filters.value.category,
  () => {
    filters.value.page = 1
  }
)

function goToPage(page: number) {
  filters.value.page = page
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function setCategory(category: string) {
  filters.value.category = category
}
</script>

<template>
  <div class="news-page">
    <section class="section news-hero">
      <div class="container">
        <div class="news-header">
          <h1 class="section-title">News & Updates</h1>
          <p class="section-subtitle">Stay informed about food waste, community initiatives, and sustainability.</p>
        </div>
      </div>
    </section>

    <!-- Search Section -->
    <section class="news-controls" aria-label="News search and filters">
      <div class="container">
        <div class="search-bar">
          <svg
            class="search-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            v-model="filters.search"
            type="search"
            class="search-input"
            placeholder="Search by title, content, date, or category..."
            aria-label="Search news articles"
          />
        </div>

        <div class="category-filters" role="tablist" aria-label="Filter by category">
          <button
            v-for="category in CATEGORIES"
            :key="category"
            class="category-chip"
            :class="{ active: filters.category === category }"
            @click="setCategory(category)"
            role="tab"
            :aria-selected="filters.category === category"
          >
            {{ category }}
          </button>
        </div>
      </div>
    </section>

    <!-- Articles Section -->
    <section class="section articles-section" aria-label="News articles">
      <div class="container">
        <template v-if="isLoading">
          <div class="row g-4">
            <div v-for="n in 6" :key="n" class="col-12 col-sm-6 col-lg-4">
              <SkeletonLoader />
            </div>
          </div>
        </template>

        <template v-else-if="paginatedArticles.length === 0">
          <EmptyState
            title="No articles found"
            message="Try adjusting your search or filters to find what you're looking for."
          />
        </template>

        <template v-else>
          <div class="row g-4">
            <div
              v-for="article in paginatedArticles"
              :key="article.id"
              class="col-12 col-sm-6 col-lg-4 d-flex news-col"
            >
              <article class="article-card card h-100">
                <div class="article-image">
                  <img :src="article.imageUrl" :alt="article.title" loading="lazy" />
                  <span class="article-category">{{ article.category }}</span>
                </div>
                <div class="card-body">
                  <time class="article-date" :datetime="article.publishedDate">
                    {{
                      new Date(article.publishedDate).toLocaleDateString('en-AU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    }}
                  </time>
                  <h2 class="article-title">
                    <router-link :to="`/news/${article.id}`">
                      {{ article.title }}
                    </router-link>
                  </h2>
                  <p class="article-excerpt">
                    {{ article.content.length > 150 ? article.content.substring(0, 150) + '...' : article.content }}
                  </p>
                  <router-link :to="`/news/${article.id}`" class="article-read-more">
                    Read more
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </router-link>
                </div>
              </article>
            </div>
          </div>

          <!-- Pagination -->
          <nav v-if="totalPages > 1" class="pagination" aria-label="Article pagination">
            <button
              class="pagination-btn"
              :disabled="filters.page <= 1"
              @click="goToPage(filters.page - 1)"
              aria-label="Previous page"
            >
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
              Previous
            </button>

            <div class="pagination-pages" role="group" aria-label="Page numbers">
              <button
                v-for="page in totalPages"
                :key="page"
                class="pagination-page"
                :class="{ active: filters.page === page }"
                @click="goToPage(page)"
                :aria-label="`Page ${page}`"
                :aria-current="filters.page === page ? 'page' : undefined"
              >
                {{ page }}
              </button>
            </div>

            <button
              class="pagination-btn"
              :disabled="filters.page >= totalPages"
              @click="goToPage(filters.page + 1)"
              aria-label="Next page"
            >
              Next
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
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </nav>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.news-page {
  animation: fade-in 0.5s ease;
}

.news-header {
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

.news-controls {
  padding: 0 0 24px;
}

.search-bar {
  position: relative;
  max-width: 600px;
  margin: 0 auto 24px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 14px 16px 14px 48px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-family);
  font-size: 0.9375rem;
  background: var(--color-card-bg);
  color: var(--color-text);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.category-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.category-chip {
  padding: 8px 20px;
  border-radius: 100px;
  border: 1.5px solid var(--color-border);
  background: var(--color-card-bg);
  color: var(--color-text-secondary);
  font-family: var(--font-family);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.category-chip:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.category-chip.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

.article-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  animation: fade-in-up 0.5s ease both;
}

.news-col:nth-child(2) .article-card {
  animation-delay: 0.1s;
}
.news-col:nth-child(3) .article-card {
  animation-delay: 0.2s;
}
.news-col:nth-child(4) .article-card {
  animation-delay: 0.3s;
}
.news-col:nth-child(5) .article-card {
  animation-delay: 0.4s;
}
.news-col:nth-child(6) .article-card {
  animation-delay: 0.5s;
}

.article-image {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.article-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.article-card:hover .article-image img {
  transform: scale(1.05);
}

.article-category {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 600;
  backdrop-filter: blur(4px);
}

.article-date {
  display: block;
  font-size: 0.8125rem;
  color: var(--color-text-tertiary);
  margin-bottom: 8px;
}

.article-title {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 8px;
}

.article-title a {
  color: var(--color-text);
  text-decoration: none;
}

.article-title a:hover {
  color: var(--color-accent);
}

.article-excerpt {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
  flex: 1;
}

.article-read-more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-accent);
  margin-top: 16px;
  text-decoration: none;
}

.article-read-more:hover {
  gap: 8px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 48px;
}

.pagination-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-card-bg);
  color: var(--color-text);
  font-family: var(--font-family);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.pagination-btn:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-pages {
  display: flex;
  gap: 4px;
}

.pagination-page {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--color-border);
  background: var(--color-card-bg);
  color: var(--color-text-secondary);
  font-family: var(--font-family);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.pagination-page:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.pagination-page.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

@media (max-width: 768px) {
  .pagination {
    flex-wrap: wrap;
  }
}
</style>
