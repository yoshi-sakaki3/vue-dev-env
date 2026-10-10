import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// 開発サーバー（http://localhost:5175）の設定
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: true,
    // Windows のフォルダを監視するときに必要（保存したら画面がすぐ変わる）
    watch: { usePolling: true, interval: 500 },
    // 画面からの /api/... を API サーバーに転送する（Docker では app コンテナ）
    proxy: { '/api': process.env.API_TARGET ?? 'http://localhost:3300' },
  },
})
