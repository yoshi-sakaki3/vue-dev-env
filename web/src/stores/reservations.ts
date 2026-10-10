import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  cancelReservation,
  createReservation,
  fetchReservations,
  type Reservation,
  type ReservationInput,
} from '@/api'

/** 1日分の予約と、画面に出すお知らせを持つ（一覧と登録フォームで共有する） */
export const useReservationStore = defineStore('reservations', () => {
  const date = ref('')
  const items = ref<Reservation[]>([])
  const loading = ref(false)
  const error = ref('')
  /** 画面をまたいで出すお知らせ（「予約しました」など）。一度表示したら消す */
  const notice = ref('')

  const bookedCount = computed(() => items.value.filter((r) => r.status === 'booked').length)

  async function load(target: string) {
    date.value = target
    loading.value = true
    error.value = ''
    try {
      const result = await fetchReservations(target)
      // 読み込み中に別の日へ移っていたら、古い結果で上書きしない
      if (date.value === target) items.value = result
    } catch (e) {
      if (date.value === target) {
        items.value = []
        error.value = `読み込めませんでした：${e instanceof Error ? e.message : String(e)}`
      }
    } finally {
      if (date.value === target) loading.value = false
    }
  }

  async function create(input: ReservationInput): Promise<Reservation> {
    const created = await createReservation(input)
    notice.value = `${created.name} 様の予約（${created.time}）を登録しました。`
    return created
  }

  async function cancel(id: number) {
    const cancelled = await cancelReservation(id)
    items.value = items.value.map((r) => (r.id === id ? cancelled : r))
    notice.value = `${cancelled.name} 様の予約（${cancelled.time}）を取り消しました。`
  }

  function takeNotice(): string {
    const message = notice.value
    notice.value = ''
    return message
  }

  return { date, items, loading, error, notice, bookedCount, load, create, cancel, takeNotice }
})
