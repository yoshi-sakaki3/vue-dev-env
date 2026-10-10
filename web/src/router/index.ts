import { createRouter, createWebHistory } from 'vue-router'
import DayView from '../views/DayView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 日付は ?date=2026-10-10 で持つ（URL を共有・再読み込みしても同じ日が開く）
    { path: '/', name: 'day', component: DayView },
    {
      path: '/new',
      name: 'new',
      // 登録フォームは、開いたときに読み込む（最初の表示を軽くする）
      component: () => import('../views/NewView.vue'),
    },
    { path: '/:pathMatch(.*)*', redirect: { name: 'day' } },
  ],
})

export default router
