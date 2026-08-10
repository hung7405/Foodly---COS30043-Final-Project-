<script setup lang="ts">
import { SITE_NAME } from '../../utils/constants'
import { useAuthStore } from '../../stores/auth.store'

const auth = useAuthStore()
</script>

<template>
  <footer class="app-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <router-link to="/" class="footer-logo">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
            <path d="M8 22V10l8 6-8 6z" fill="white" />
            <path d="M16 22V10l8 6-8 6z" fill="white" opacity="0.6" />
          </svg>
          <span>{{ SITE_NAME }}</span>
        </router-link>
        <p class="footer-tagline">Fresh deals, less waste. <br />Reserve & pick up today.</p>
      </div>
      <div class="footer-links">
        <div class="footer-col">
          <h4>Discover</h4>
          <router-link to="/explore">Explore Deals</router-link>
          <router-link to="/explore?category=drinks">Drinks</router-link>
          <router-link to="/explore?category=food">Food</router-link>
        </div>
        <div class="footer-col">
          <h4>Support</h4>
          <router-link to="/about">About Us</router-link>
          <router-link to="/news">News</router-link>
          <a href="#">FAQ</a>
        </div>
        <div class="footer-col">
          <h4>Community</h4>
          <router-link to="/feed">Feed</router-link>
          <router-link v-if="!auth.isAuthenticated" to="/register">Join Now</router-link>
          <router-link v-if="auth.isAuthenticated" to="/profile">My Profile</router-link>
        </div>
        <div class="footer-col">
          <h4>Connect</h4>
          <div class="social-links">
            <a href="https://zalo.me/0813815081" class="social-link" aria-label="Zalo" target="_blank" rel="noopener">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </a>
            <a href="#" class="social-link" aria-label="Facebook" target="_blank" rel="noopener">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
            <a href="#" class="social-link" aria-label="Instagram" target="_blank" rel="noopener">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; {{ new Date().getFullYear() }} {{ SITE_NAME }}. All rights reserved.</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  display: none;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  padding: 40px 16px 24px;
  margin-top: 48px;
  transition:
    background var(--transition-slow),
    border-color var(--transition-slow);
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
}

.footer-brand {
  margin-bottom: 28px;
}

.footer-logo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text);
  text-decoration: none;
  margin-bottom: 8px;
}

.footer-tagline {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 32px;
}

@media (min-width: 992px) {
  .footer-links {
    grid-template-columns: repeat(4, 1fr);
  }
}

.footer-col h4 {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.footer-col a {
  display: block;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  margin-bottom: 8px;
  transition: color var(--transition-fast);
}

.footer-col a:hover {
  color: var(--color-accent);
}

.social-links {
  display: flex;
  gap: 12px;
}

.social-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border);
  color: var(--color-text-secondary);
  background: var(--color-bg);
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.social-link:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}

.footer-bottom {
  border-top: 1px solid var(--color-border);
  padding-top: 16px;
  text-align: center;
}

.footer-bottom p {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

@media (min-width: 768px) {
  .app-footer {
    display: block;
  }
  .footer-inner {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 40px;
  }
  .footer-brand {
    margin-bottom: 0;
  }
  .footer-bottom {
    grid-column: 1 / -1;
  }
}
</style>
