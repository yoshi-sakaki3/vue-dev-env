<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { addDays, formatJa, isIsoDate, todayInTokyo } from '@/lib/date'
import { useReservationStore } from '@/stores/reservations'

/** 1日分の予約の一覧（日付の移動・取り消し） */
const route = useRoute()
const router = useRouter()
const store = useReservationStore()

const today = todayInTokyo()
const date = computed(() => (isIsoDate(route.query.date) ? route.query.date : today))

const notice = ref('')
const actionError = ref('')
/** 取り消しの確認を出している予約の ID（1件ずつ確認する） */
const confirmingId = ref<number | null>(null)
const cancellingId = ref<number | null>(null)

watch(
  date,
  (d) => {
    confirmingId.value = null
    actionError.value = ''
    notice.value = store.takeNotice()
    void store.load(d)
  },
  { immediate: true },
)

function go(target: string) {
  void router.push({ name: 'day', query: target === today ? {} : { date: target } })
}

function onPick(event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (isIsoDate(value)) go(value)
}

async function cancel(id: number) {
  cancellingId.value = id
  actionError.value = ''
  try {
    await store.cancel(id)
    notice.value = store.takeNotice()
  } catch (e) {
    actionError.value = `取り消せませんでした：${e instanceof Error ? e.message : String(e)}`
  } finally {
    cancellingId.value = null
    confirmingId.value = null
  }
}
</script>

<template>
  <div class="page-head">
    <h1>{{ formatJa(date) }} の予約</h1>
    <RouterLink :to="{ name: 'new', query: { date } }" class="btn btn-primary"
      >新しい予約</RouterLink
    >
  </div>

  <div class="date-nav">
    <button type="button" class="btn" @click="go(addDays(date, -1))">← 前の日</button>
    <button type="button" class="btn" :disabled="date === today" @click="go(today)">今日</button>
    <button type="button" class="btn" @click="go(addDays(date, 1))">次の日 →</button>
    <label class="date-pick">
      <span>日付を選ぶ</span>
      <input type="date" :value="date" @change="onPick" />
    </label>
  </div>

  <p v-if="notice" role="status" class="notice">{{ notice }}</p>
  <p v-if="store.error || actionError" role="alert" class="error">
    {{ store.error || actionError }}
  </p>

  <p v-if="store.loading" class="mute">読み込み中…</p>
  <p v-else-if="store.items.length === 0 && !store.error" class="empty">
    この日の予約はまだありません。
  </p>
  <template v-else-if="store.items.length > 0">
    <p class="mute">予約 {{ store.bookedCount }} 件（取り消し済みを除く）</p>
    <ul class="reservations">
      <li
        v-for="r in store.items"
        :key="r.id"
        :class="{ cancelled: r.status === 'cancelled' }"
        :data-testid="`reservation-${r.id}`"
      >
        <div class="time">{{ r.time }}</div>
        <div class="who">
          <strong>{{ r.name }}</strong>
          <span v-if="r.status === 'cancelled'" class="badge">取り消し済み</span>
          <div class="mute">
            <span v-if="r.phone">{{ r.phone }}</span>
            <span v-if="r.email">{{ r.email }}</span>
            <span v-if="r.note">メモ：{{ r.note }}</span>
          </div>
        </div>
        <div v-if="r.status === 'booked'" class="actions">
          <template v-if="confirmingId === r.id">
            <span class="confirm-text">取り消しますか？</span>
            <button
              type="button"
              class="btn btn-danger"
              :disabled="cancellingId === r.id"
              @click="cancel(r.id)"
            >
              {{ cancellingId === r.id ? '取り消し中…' : 'はい、取り消す' }}
            </button>
            <button type="button" class="btn" @click="confirmingId = null">やめる</button>
          </template>
          <button v-else type="button" class="btn" @click="confirmingId = r.id">取り消す</button>
        </div>
      </li>
    </ul>
  </template>
</template>
