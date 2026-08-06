import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import router from './router'
import App from './App.vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './assets/styles/main.css'
import { vClickOutside, vFocus, vFocusTrap } from './directives'

registerSW({ immediate: true })

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.directive('click-outside', vClickOutside)
app.directive('focus', vFocus)
app.directive('focus-trap', vFocusTrap)
app.mount('#app')
