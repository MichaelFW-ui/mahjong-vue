import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import mistakeStore from './store/mistake'

// 确保 store 初始化
console.log('MistakeStore initialized:', !!mistakeStore)

createApp(App)
  .use(router)
  .mount('#app')