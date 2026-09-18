import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { startMonitoring } from '@blog/monitoring'

import App from './app/App.vue'
import router from './app/router'
import './assets/styles/index.scss'

const app = createApp(App)
const monitoring = startMonitoring()

app.use(createPinia()).use(router).mount('#app')

if (typeof window !== 'undefined') {
  window.setTimeout(() => monitoring.collect(), 0)
}
