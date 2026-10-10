import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { vi } from 'vitest'
import DayView from '@/views/DayView.vue'
import NewView from '@/views/NewView.vue'

/** テスト用：決まった答えを返す fetch に差し替える（API サーバーなしでテストできる） */
export function mockFetch(routes: Record<string, () => Response>) {
  const fn = vi.fn<typeof fetch>(async (input, init) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`
    const route = routes[key]
    if (!route) throw new Error(`想定外の呼び出し: ${key}`)
    return route()
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

/** テスト用のルーターと Pinia（本物と同じ画面の割り当てで、URL だけメモリ上に持つ） */
export async function setupApp(path: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'day', component: DayView },
      { path: '/new', name: 'new', component: NewView },
    ],
  })
  await router.push(path)
  await router.isReady()
  return { pinia, router }
}
