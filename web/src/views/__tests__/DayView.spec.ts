import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { json, mockFetch, setupApp } from '@/__tests__/helpers'
import DayView from '../DayView.vue'

const reservation = (over: Record<string, unknown> = {}) => ({
  id: 1,
  date: '2030-01-15',
  time: '10:00',
  name: '見本 太郎',
  phone: null,
  email: null,
  note: null,
  status: 'booked',
  createdAt: '2030-01-01T00:00:00.000Z',
  ...over,
})

async function mountDay(path = '/?date=2030-01-15') {
  const { pinia, router } = await setupApp(path)
  const wrapper = mount(DayView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, router }
}

afterEach(() => vi.unstubAllGlobals())

describe('予約の一覧', () => {
  it('URL の日付の予約を時間つきで表示する', async () => {
    mockFetch({
      'GET /api/reservations?date=2030-01-15': () =>
        json({
          reservations: [
            reservation(),
            reservation({ id: 2, time: '11:30', name: '見本 花子', status: 'cancelled' }),
          ],
        }),
    })
    const { wrapper } = await mountDay()

    expect(wrapper.find('h1').text()).toBe('2030年1月15日(火) の予約')
    expect(wrapper.text()).toContain('予約 1 件')
    expect(wrapper.find('[data-testid="reservation-1"]').text()).toContain('見本 太郎')
    // 取り消し済みには「取り消す」ボタンを出さない
    expect(wrapper.find('[data-testid="reservation-2"]').text()).toContain('取り消し済み')
    expect(wrapper.find('[data-testid="reservation-2"] button').exists()).toBe(false)
  })

  it('予約がない日は、その旨を表示する', async () => {
    mockFetch({ 'GET /api/reservations?date=2030-01-15': () => json({ reservations: [] }) })
    const { wrapper } = await mountDay()
    expect(wrapper.text()).toContain('この日の予約はまだありません。')
  })

  it('取り消しは確認してから行い、結果を一覧に反映する', async () => {
    const fetchFn = mockFetch({
      'GET /api/reservations?date=2030-01-15': () => json({ reservations: [reservation()] }),
      'POST /api/reservations/1/cancel': () => json(reservation({ status: 'cancelled' })),
    })
    const { wrapper } = await mountDay()
    const row = () => wrapper.find('[data-testid="reservation-1"]')

    // 1回押しただけでは取り消さない
    await row().find('button').trigger('click')
    expect(row().text()).toContain('取り消しますか？')
    expect(fetchFn).toHaveBeenCalledTimes(1)

    await row().find('button.btn-danger').trigger('click')
    await flushPromises()

    expect(row().text()).toContain('取り消し済み')
    expect(wrapper.find('[role="status"]').text()).toContain(
      '見本 太郎 様の予約（10:00）を取り消しました。',
    )
  })

  it('「次の日」で URL の日付が変わり、その日の予約を読み直す', async () => {
    const fetchFn = mockFetch({
      'GET /api/reservations?date=2030-01-15': () => json({ reservations: [reservation()] }),
      'GET /api/reservations?date=2030-01-16': () => json({ reservations: [] }),
    })
    const { wrapper, router } = await mountDay()

    await wrapper.findAll('.date-nav button')[2]!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.date).toBe('2030-01-16')
    expect(wrapper.find('h1').text()).toBe('2030年1月16日(水) の予約')
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('API のエラーを画面に出す', async () => {
    mockFetch({
      'GET /api/reservations?date=2030-01-15': () => json({ error: 'DB に接続できません' }, 500),
    })
    const { wrapper } = await mountDay()
    expect(wrapper.find('[role="alert"]').text()).toContain('DB に接続できません')
  })
})
