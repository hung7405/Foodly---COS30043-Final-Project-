<script setup lang="ts">
import { SITE_NAME } from '../../utils/constants'
</script>

<template>
  <footer class="footer" role="contentinfo">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <h3 class="footer-title">{{ SITE_NAME }}</h3>
          <p class="footer-tagline">Real-Time Food Discovery &amp; Community Intelligence Platform</p>
        </div>
        <div class="footer-links">
          <h4 class="footer-heading">Platform</h4>
          <router-link to="/">Home</router-link>
          <router-link to="/news">News</router-link>
          <router-link to="/about">About</router-link>
          <router-link to="/explore">Explore</router-link>
        </div>
        <div class="footer-links">
          <h4 class="footer-heading">Community</h4>
          <a href="#help">Help Center</a>
          <a href="#guidelines">Guidelines</a>
          <a href="#safety">Safety</a>
        </div>
        <div class="footer-links">
          <h4 class="footer-heading">Legal</h4>
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; {{ new Date().getFullYear() }} {{ SITE_NAME }}. All rights reserved.</p>
        <p class="footer-made">Made with care for our community</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--color-border);
  padding: 48px 0 24px;
  background: var(--color-bg-secondary);
  transition: background-color var(--transition-base), border-color var(--transition-base);
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 40px;
  margin-bottom: 40px;
}

.footer-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
}

.footer-tagline {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  max-width: 280px;
  line-height: 1.6;
}

.footer-heading {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 16px;
}

.footer-links {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-links a {
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.footer-links a:hover {
  color: var(--color-accent);
}

.footer-bottom {
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  color: var(--color-text-tertiary);
}

@media (max-width: 768px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
  .footer-brand {
    grid-column: 1 / -1;
  }
  .footer-bottom {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
}
</style>
