import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'

const routes = [
  { path: '/', name: 'Home', component: () => import('../views/HomeView.vue') },
  { path: '/about', name: 'About', component: () => import('../views/AboutView.vue') },
  { path: '/news', name: 'News', component: () => import('../views/NewsView.vue') },
  { path: '/news/:id', name: 'NewsDetail', component: () => import('../views/NewsDetailView.vue') },
  { path: '/login', name: 'Login', component: () => import('../views/LoginView.vue') },
  { path: '/register', name: 'Register', component: () => import('../views/RegisterView.vue') },
  { path: '/explore', name: 'Explore', component: () => import('../views/ExploreView.vue') },
  {
    path: '/deals/:id',
    name: 'DealDetail',
    component: () => import('../views/DealDetailView.vue'),
  },
  {
    path: '/feed',
    name: 'CommunityFeed',
    component: () => import('../views/CommunityFeedView.vue'),
  },
  {
    path: '/payments/:reservationId',
    name: 'Payment',
    component: () => import('../views/PaymentView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/ai-search',
    name: 'AISearch',
    component: () => import('../views/AISearchView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/ProfileView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profile/deals',
    name: 'MyDeals',
    component: () => import('../views/MyDealsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profile/reservations',
    name: 'MyReservations',
    component: () => import('../views/MyReservationsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/deals/new',
    name: 'CreateDeal',
    component: () => import('../views/CreateDealView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/deals/:id/edit',
    name: 'EditDeal',
    component: () => import('../views/CreateDealView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/merchant',
    name: 'MerchantDashboard',
    component: () => import('../views/merchant/MerchantDashboardView.vue'),
    meta: { requiresAuth: true, role: ['merchant', 'admin'] },
  },
  {
    path: '/merchant/orders',
    name: 'MerchantOrders',
    component: () => import('../views/merchant/MerchantOrdersView.vue'),
    meta: { requiresAuth: true, role: ['merchant', 'admin'] },
  },
  {
    path: '/merchant/deals',
    name: 'MerchantDeals',
    component: () => import('../views/merchant/MerchantDealsView.vue'),
    meta: { requiresAuth: true, role: ['merchant', 'admin'] },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() { return { top: 0 } },
})

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()

  if (auth.token && !auth.user) {
    await auth.fetchProfile()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.role) {
    const allowed = Array.isArray(to.meta.role) ? to.meta.role : [to.meta.role]
    if (auth.user?.role && allowed.includes(auth.user.role)) {
      next()
    } else {
      next({ path: '/', query: { error: 'unauthorized' } })
    }
    return
  }

  next()
})

export default router
