import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useReservationStore } from '@/stores/reservations'
import { json, mockFetch, setupApp } from '@/__tests__/helpers'
import NewView from '../NewView.vue'

const slots = [
  { time: '09:00', available: false },
  { time: '09:30', available: true },
  { time: '10:00', available: true },
]

async function mountForm() {
  const { pinia, router } = await setupApp('/new?date=2030-01-15')
  const wrapper = mount(NewView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, router }
}

afterEach(() => vi.unstubAllGlobals())

describe('予約の登録フォーム', () => {
  it('その日の空き状況を出し、埋まっている時間は選べない', async () => {
    mockFetch({ 'GET /api/slots?date=2030-01-15': () => json({ slots }) })
    const { wrapper } = await mountForm()

    expect(wrapper.text()).toContain('空き 2 枠')
    const options = wrapper.findAll('#time option')
    expect(options[1]!.text()).toBe('09:00（予約済み）')
    expect(options[1]!.attributes('disabled')).toBeDefined()
    expect(options[2]!.attributes('disabled')).toBeUndefined()
  })

  it('登録すると、その日の一覧に戻り、お知らせを出す準備をする', async () => {
    const fetchFn = mockFetch({
      'GET /api/slots?date=2030-01-15': () => json({ slots }),
      'POST /api/reservations': () =>
        json(
          { id: 7, date: '2030-01-15', time: '09:30', name: '見本 太郎', status: 'booked' },
          201,
        ),
      'GET /api/reservations?date=2030-01-15': () => json({ reservations: [] }),
    })
    const { wrapper, router } = await mountForm()

    await wrapper.find('#time').setValue('09:30')
    await wrapper.find('#name').setValue('見本 太郎')
    await wrapper.find('#email').setValue('taro@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const sent = JSON.parse(String(fetchFn.mock.calls[1]?.[1]?.body))
    expect(sent).toMatchObject({
      date: '2030-01-15',
      time: '09:30',
      name: '見本 太郎',
      email: 'taro@example.com',
    })
    expect(router.currentRoute.value.name).toBe('day')
    expect(router.currentRoute.value.query.date).toBe('2030-01-15')
    expect(useReservationStore().notice).toBe('見本 太郎 様の予約（09:30）を登録しました。')
  })

  it('API が返した誤りを各欄の下に出し、入力した値は消さない', async () => {
    mockFetch({
      'GET /api/slots?date=2030-01-15': () => json({ slots }),
      'POST /api/reservations': () =>
        json(
          {
            errors: {
              name: 'お名前を入力してください',
              phone: '電話番号は数字とハイフンで入力してください',
            },
          },
          400,
        ),
    })
    const { wrapper, router } = await mountForm()

    await wrapper.find('#time').setValue('10:00')
    await wrapper.find('#phone').setValue('abc')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('お名前を入力してください')
    expect(wrapper.text()).toContain('電話番号は数字とハイフンで入力してください')
    expect((wrapper.find('#phone').element as HTMLInputElement).value).toBe('abc')
    expect(router.currentRoute.value.name).toBe('new')
  })

  it('先に取られたとき（409）は、空き状況を取り直して選び直してもらう', async () => {
    let call = 0
    const fetchFn = mockFetch({
      'GET /api/slots?date=2030-01-15': () =>
        json({
          slots: call++ === 0 ? slots : slots.map((s) => ({ ...s, available: s.time === '10:00' })),
        }),
      'POST /api/reservations': () =>
        json(
          {
            errors: {
              time: 'この時間は、たった今ほかの予約が入りました。別の時間を選んでください',
            },
          },
          409,
        ),
    })
    const { wrapper } = await mountForm()

    await wrapper.find('#time').setValue('09:30')
    await wrapper.find('#name').setValue('見本 花子')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('たった今ほかの予約が入りました')
    expect(fetchFn).toHaveBeenCalledTimes(3)
    // 取られた 09:30 は選べなくなり、選択も外れる
    expect((wrapper.find('#time').element as HTMLSelectElement).value).toBe('')
    expect(wrapper.findAll('#time option')[2]!.attributes('disabled')).toBeDefined()
  })
})
