<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'

const router = useRouter()
const auth = useAuthStore()

const form = ref({ email: '', username: '', password: '', confirmPassword: '', firstName: '', lastName: '', role: 'user' as 'user' | 'merchant' })
const fieldErrors = ref<Record<string, string>>({})
const error = ref('')
const isSubmitting = ref(false)

function validate(): boolean {
  const errors: Record<string, string> = {}
  if (!form.value.firstName.trim()) errors.firstName = 'First name is required'
  if (!form.value.lastName.trim()) errors.lastName = 'Last name is required'
  if (!form.value.email.trim()) errors.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim())) errors.email = 'Enter a valid email address'
  if (!form.value.username.trim()) errors.username = 'Username is required'
  else if (form.value.username.trim().length < 3) errors.username = 'Username must be at least 3 characters'
  else if (/\s/.test(form.value.username)) errors.username = 'Username cannot contain spaces'
  if (!form.value.password) errors.password = 'Password is required'
  else if (form.value.password.length < 8) errors.password = 'Password must be at least 8 characters'
  if (!form.value.confirmPassword) errors.confirmPassword = 'Please repeat your password'
  else if (form.value.confirmPassword !== form.value.password) errors.confirmPassword = 'Passwords do not match'
  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

function clearFieldError(name: string) {
  if (fieldErrors.value[name]) {
    const next = { ...fieldErrors.value }
    delete next[name]
    fieldErrors.value = next
  }
}

function clearPasswordErrors() {
  clearFieldError('password')
  clearFieldError('confirmPassword')
}

async function handleSubmit() {
  if (!validate()) return
  isSubmitting.value = true
  error.value = ''
  try {
    await auth.register(
      form.value.email,
      form.value.username,
      form.value.password,
      form.value.firstName,
      form.value.lastName,
      form.value.role
    )
    router.push('/explore')
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Registration failed'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h1>Create your account</h1>
        <p>Join the community reducing food waste</p>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div v-if="error" class="auth-error" role="alert">{{ error }}</div>

        <div class="row g-3">
          <div class="col-12 col-md-6">
            <div class="field">
              <label for="firstName">First Name</label>
              <input
                id="firstName"
                v-model="form.firstName"
                type="text"
                placeholder="John"
                :class="{ invalid: fieldErrors.firstName }"
                :aria-invalid="fieldErrors.firstName ? 'true' : undefined"
                aria-describedby="firstName-error"
                @input="clearFieldError('firstName')"
              />
              <span v-if="fieldErrors.firstName" id="firstName-error" class="field-error">{{
                fieldErrors.firstName
              }}</span>
            </div>
          </div>
          <div class="col-12 col-md-6">
            <div class="field">
              <label for="lastName">Last Name</label>
              <input
                id="lastName"
                v-model="form.lastName"
                type="text"
                placeholder="Smith"
                :class="{ invalid: fieldErrors.lastName }"
                :aria-invalid="fieldErrors.lastName ? 'true' : undefined"
                aria-describedby="lastName-error"
                @input="clearFieldError('lastName')"
              />
              <span v-if="fieldErrors.lastName" id="lastName-error" class="field-error">{{
                fieldErrors.lastName
              }}</span>
            </div>
          </div>
        </div>

        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="you@example.com"
            required
            :class="{ invalid: fieldErrors.email }"
            :aria-invalid="fieldErrors.email ? 'true' : undefined"
            aria-describedby="email-error"
            @input="clearFieldError('email')"
          />
          <span v-if="fieldErrors.email" id="email-error" class="field-error">{{ fieldErrors.email }}</span>
        </div>

        <div class="field">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            placeholder="yourusername"
            required
            :class="{ invalid: fieldErrors.username }"
            :aria-invalid="fieldErrors.username ? 'true' : undefined"
            aria-describedby="username-error"
            @input="clearFieldError('username')"
          />
          <span v-if="fieldErrors.username" id="username-error" class="field-error">{{ fieldErrors.username }}</span>
        </div>

        <div class="field">
          <label>I am a…</label>
          <div class="role-picker" role="radiogroup" aria-label="Account type">
            <button
              type="button"
              class="role-option"
              :class="{ active: form.role === 'user' }"
              role="radio"
              :aria-checked="form.role === 'user'"
              @click="form.role = 'user'"
            >
              <strong>Customer</strong>
              <small>Browse and reserve deals</small>
            </button>
            <button
              type="button"
              class="role-option"
              :class="{ active: form.role === 'merchant' }"
              role="radio"
              :aria-checked="form.role === 'merchant'"
              @click="form.role = 'merchant'"
            >
              <strong>Merchant</strong>
              <small>Post and manage deals</small>
            </button>
          </div>
        </div>

        <div class="row g-3">
          <div class="col-12 col-md-6">
            <div class="field">
              <label for="password">Password</label>
              <input
                id="password"
                v-model="form.password"
                type="password"
                placeholder="Min 8 characters"
                required
                minlength="8"
                :class="{ invalid: fieldErrors.password }"
                :aria-invalid="fieldErrors.password ? 'true' : undefined"
                aria-describedby="password-error"
                @input="clearPasswordErrors"
              />
              <span v-if="fieldErrors.password" id="password-error" class="field-error">{{
                fieldErrors.password
              }}</span>
            </div>
          </div>
          <div class="col-12 col-md-6">
            <div class="field">
              <label for="confirmPassword">Confirm</label>
              <input
                id="confirmPassword"
                v-model="form.confirmPassword"
                type="password"
                placeholder="Repeat password"
                required
                :class="{ invalid: fieldErrors.confirmPassword }"
                :aria-invalid="fieldErrors.confirmPassword ? 'true' : undefined"
                aria-describedby="confirmPassword-error"
                @input="clearFieldError('confirmPassword')"
              />
              <span v-if="fieldErrors.confirmPassword" id="confirmPassword-error" class="field-error">{{
                fieldErrors.confirmPassword
              }}</span>
            </div>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-lg auth-submit" :disabled="isSubmitting">
          <span v-if="isSubmitting" class="spinner" aria-hidden="true"></span>
          {{ isSubmitting ? 'Creating account...' : 'Create account' }}
        </button>
      </form>

      <p class="auth-alt">Already have an account? <router-link to="/login">Sign in</router-link></p>
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
  max-width: 480px;
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
.field input.invalid {
  border-color: var(--color-error);
}
.field input.invalid:focus {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}
.role-picker {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.role-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-family);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.role-option strong {
  font-size: 0.9375rem;
}
.role-option small {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}
.role-option:hover {
  border-color: var(--color-accent);
}
.role-option.active {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}
.role-option.active strong {
  color: var(--color-accent);
}
.field-error {
  display: block;
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--color-error);
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
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
