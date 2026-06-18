<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const isSubmitting = ref(false)

async function handleSubmit() {
  if (!email.value || !password.value) return
  isSubmitting.value = true
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    const redirect = (route.query.redirect as string) || '/explore'
    router.push(redirect)
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Invalid email or password'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h1>Welcome back</h1>
        <p>Sign in to your Foodly account</p>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div v-if="error" class="auth-error" role="alert">
          {{ error }}
        </div>

        <div class="field">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" placeholder="you@example.com" required autocomplete="email" />
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input id="password" v-model="password" type="password" placeholder="Your password" required autocomplete="current-password" />
        </div>

        <button type="submit" class="btn btn-primary btn-lg auth-submit" :disabled="isSubmitting">
          <span v-if="isSubmitting" class="spinner" aria-hidden="true"></span>
          {{ isSubmitting ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>

      <p class="auth-alt">
        Don't have an account?
        <router-link to="/register">Create one</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 72px);
  padding: 40px 16px;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 40px;
  animation: scale-in 0.3s ease;
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.auth-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
}

.auth-header p {
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
}

.auth-error {
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-sm);
  color: var(--color-error);
  font-size: 0.875rem;
  margin-bottom: 20px;
}

.field {
  margin-bottom: 20px;
}

.field label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
}

.field input {
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-family);
  font-size: 0.9375rem;
  background: var(--color-bg);
  color: var(--color-text);
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
}

.field input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.auth-submit {
  width: 100%;
  margin-top: 8px;
}

.auth-alt {
  text-align: center;
  margin-top: 24px;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
