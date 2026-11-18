import { createApp } from 'vue'

import App from './App.vue'
import router from './router'

createApp(App)
  .use(router)
  .mount('#app')

// 开发环境保留热更新；正式构建完整缓存三个页面的静态资源。
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  const registerOffline = () => {
    navigator.serviceWorker.register(`${process.env.BASE_URL}service-worker.js`, { scope: process.env.BASE_URL })
      .catch(() => { /* 网络或存储受限时，正常记分和本地保存继续可用。 */ })
  }
  if (document.readyState === 'complete') registerOffline()
  else window.addEventListener('load', registerOffline, { once: true })
}
