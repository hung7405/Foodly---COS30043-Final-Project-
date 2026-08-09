<script setup lang="ts">
import { ref, computed } from 'vue'
import { SITE_NAME } from '../utils/constants'

const firstName = ref('')
const lastName = ref('')
const selectedMode = ref('Food Rescue')

const fullName = computed(() => {
  if (!firstName.value && !lastName.value) return ''
  return `${firstName.value} ${lastName.value}`.trim()
})

const currentImage = computed(() => {
  return selectedMode.value === 'Food Rescue'
    ? {
        src: 'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=800&q=80',
        alt: 'Food rescue volunteers sorting fresh produce',
      }
    : {
        src: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80',
        alt: 'Community support and food sharing',
      }
})
</script>

<template>
  <div class="about-page">
    <section class="section about-hero">
      <div class="container">
        <div class="about-header">
          <h1 class="section-title">About {{ SITE_NAME }}</h1>
          <p class="section-subtitle">
            A real-time platform connecting communities with discounted and near-expiry food. We believe no good food
            should go to waste.
          </p>
        </div>
      </div>
    </section>

    <!-- Dynamic Greeting Section -->
    <section class="section greeting-section" aria-label="Dynamic greeting">
      <div class="container-narrow">
        <div class="greeting-card">
          <div class="row g-3 greeting-inputs">
            <div class="col-12 col-sm-6">
              <div class="input-group">
                <label for="firstName" class="input-label">First Name</label>
                <input
                  id="firstName"
                  v-model="firstName"
                  type="text"
                  class="form-input"
                  placeholder="Enter your first name"
                  aria-describedby="greeting-message"
                />
              </div>
            </div>
            <div class="col-12 col-sm-6">
              <div class="input-group">
                <label for="lastName" class="input-label">Last Name</label>
                <input
                  id="lastName"
                  v-model="lastName"
                  type="text"
                  class="form-input"
                  placeholder="Enter your last name"
                  aria-describedby="greeting-message"
                />
              </div>
            </div>
          </div>
          <div id="greeting-message" class="greeting-message" :class="{ 'has-name': fullName }" aria-live="polite">
            <template v-if="fullName">
              <span class="greeting-wave" aria-hidden="true">👋</span>
              Welcome, <strong>{{ fullName }}</strong>
            </template>
            <template v-else> Enter your name above for a personalised greeting </template>
          </div>
        </div>
      </div>
    </section>

    <!-- Radio Button Section -->
    <section class="section mode-section">
      <div class="container-narrow">
        <div class="mode-selector">
          <h2 class="mode-label">Choose Your View</h2>
          <div class="radio-group" role="radiogroup" aria-label="Content mode selection">
            <label
              v-for="mode in ['Food Rescue', 'Community Support']"
              :key="mode"
              class="radio-card"
              :class="{ active: selectedMode === mode }"
            >
              <input type="radio" :value="mode" v-model="selectedMode" class="radio-input sr-only" name="mode" />
              <svg
                v-if="mode === 'Food Rescue'"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                <line x1="6" y1="1" x2="6" y2="4" />
                <line x1="10" y1="1" x2="10" y2="4" />
                <line x1="14" y1="1" x2="14" y2="4" />
              </svg>
              <svg
                v-else
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span class="radio-text">{{ mode }}</span>
              <span v-if="selectedMode === mode" class="radio-check" aria-hidden="true">✓</span>
            </label>
          </div>
        </div>

        <!-- Dynamic Image Section -->
        <div class="dynamic-image-wrapper">
          <transition name="fade" mode="out-in">
            <div class="dynamic-image-card" :key="currentImage.src">
              <img :src="currentImage.src" :alt="currentImage.alt" />
              <div class="image-caption">
                <h3>{{ selectedMode }}</h3>
                <p>
                  {{
                    selectedMode === 'Food Rescue'
                      ? 'Volunteers sorting rescued produce for community distribution'
                      : 'Community members sharing meals and supporting each other'
                  }}
                </p>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </section>

    <!-- Project Description Section -->
    <section class="section description-section">
      <div class="container-narrow">
        <h2 class="section-title">Our Mission</h2>
        <div class="description-content">
          <p>
            {{ SITE_NAME }} was created to address two critical challenges: food waste and food insecurity. Every year,
            millions of tonnes of perfectly good food are discarded simply because it approaches its expiry date.
            Meanwhile, many community members struggle to access affordable, fresh food.
          </p>
          <p>
            Our platform leverages real-time technology to bridge this gap. By enabling stores and community members to
            instantly share discounted, near-expiry food, we create a sustainable ecosystem where everyone benefits —
            stores reduce waste, members save money, and our community grows stronger together.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.about-page {
  animation: fade-in 0.5s ease;
}

.about-header {
  text-align: center;
  max-width: 640px;
  margin: 0 auto;
}

.greeting-card {
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 40px;
}

.greeting-inputs {
  margin-bottom: 24px;
}

.input-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-family);
  font-size: 0.9375rem;
  background: var(--color-bg);
  color: var(--color-text);
  transition: border-color var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.greeting-message {
  text-align: center;
  font-size: 1.25rem;
  color: var(--color-text-secondary);
  padding: 20px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  transition: all var(--transition-base);
}

.greeting-message.has-name {
  background: var(--color-accent-light);
  color: var(--color-accent);
  font-size: 1.5rem;
}

.greeting-wave {
  margin-right: 8px;
}

.mode-selector {
  text-align: center;
  margin-bottom: 32px;
}

.mode-label {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--color-text);
}

.radio-group {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.radio-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  background: var(--color-card-bg);
  position: relative;
  min-width: 200px;
  justify-content: center;
}

.radio-card:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}

.radio-card.active {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.radio-text {
  font-weight: 600;
  font-size: 0.9375rem;
}

.radio-check {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

.dynamic-image-wrapper {
  max-width: 700px;
  margin: 0 auto;
}

.dynamic-image-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
}

.dynamic-image-card img {
  width: 100%;
  height: 400px;
  object-fit: cover;
  display: block;
}

.image-caption {
  padding: 24px;
}

.image-caption h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 8px;
}

.image-caption p {
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.description-content p {
  font-size: 1.0625rem;
  color: var(--color-text-secondary);
  line-height: 1.8;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .radio-group {
    flex-direction: column;
    align-items: center;
  }
  .radio-card {
    width: 100%;
    max-width: 300px;
  }
  .dynamic-image-card img {
    height: 250px;
  }
}
</style>
