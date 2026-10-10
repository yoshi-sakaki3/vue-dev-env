<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError, fetchSlots, type FieldErrors, type Slot } from '@/api'
import { formatJa, isIsoDate, todayInTokyo } from '@/lib/date'
import { useReservationStore } from '@/stores/reservations'

/** 予約の登録フォーム。空いている時間だけ選べる。誤りは各欄の下に出し、入力した値は消さない */
const route = useRoute()
const router = useRouter()
const store = useReservationStore()

const today = todayInTokyo()
const form = reactive({
  date: isIsoDate(route.query.date) && route.query.date >= today ? route.query.date : today,
  time: '',
  name: '',
  phone: '',
  email: '',
  note: '',
})

const slots = ref<Slot[]>([])
const slotsError = ref('')
const errors = ref<FieldErrors>({})
const formError = ref('')
const saving = ref(false)

const availableCount = computed(() => slots.value.filter((s) => s.available).length)

async function loadSlots() {
  const target = form.date
  slotsError.value = ''
  if (!isIsoDate(target)) {
    slots.value = []
    return
  }
  try {
    const result = await fetchSlots(target)
    if (form.date !== target) return
    slots.value = result
    // 選んでいた時間が埋まっていたら、選び直してもらう
    if (!result.some((s) => s.time === form.time && s.available)) form.time = ''
  } catch (e) {
    if (form.date !== target) return
    slots.value = []
    slotsError.value = `空き状況を読み込めませんでした：${e instanceof Error ? e.message : String(e)}`
  }
}

watch(() => form.date, loadSlots, { immediate: true })

async function submit() {
  saving.value = true
  errors.value = {}
  formError.value = ''
  try {
    await store.create({ ...form })
    await router.push({ name: 'day', query: form.date === today ? {} : { date: form.date } })
  } catch (e) {
    if (e instanceof ApiError) {
      errors.value = e.fieldErrors
      formError.value = e.message
      // ほかの人に先に取られたとき（409）は、空き状況を取り直す
      if (e.status === 409) await loadSlots()
    } else {
      formError.value = `登録できませんでした：${e instanceof Error ? e.message : String(e)}`
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page-head">
    <h1>新しい予約</h1>
  </div>

  <form class="card form" novalidate @submit.prevent="submit">
    <p v-if="formError" role="alert" class="error">{{ formError }}</p>

    <div class="field">
      <label for="date">日付 <span class="req">必須</span></label>
      <input id="date" v-model="form.date" type="date" :min="today" required />
      <p v-if="errors.date" class="error">{{ errors.date }}</p>
    </div>

    <div class="field">
      <label for="time">時間 <span class="req">必須</span></label>
      <select id="time" v-model="form.time" required>
        <option value="" disabled>選んでください</option>
        <option v-for="s in slots" :key="s.time" :value="s.time" :disabled="!s.available">
          {{ s.time }}{{ s.available ? '' : '（予約済み）' }}
        </option>
      </select>
      <p v-if="errors.time" class="error">{{ errors.time }}</p>
      <p v-else-if="slotsError" class="error">{{ slotsError }}</p>
      <p v-else-if="isIsoDate(form.date)" class="mute">
        {{ formatJa(form.date) }}：空き {{ availableCount }} 枠
      </p>
    </div>

    <div class="field">
      <label for="name">お名前 <span class="req">必須</span></label>
      <input id="name" v-model="form.name" maxlength="50" autocomplete="off" required />
      <p v-if="errors.name" class="error">{{ errors.name }}</p>
    </div>

    <div class="field">
      <label for="phone">電話番号</label>
      <input
        id="phone"
        v-model="form.phone"
        type="tel"
        inputmode="tel"
        placeholder="090-0000-0000"
      />
      <p v-if="errors.phone" class="error">{{ errors.phone }}</p>
    </div>

    <div class="field">
      <label for="email">メールアドレス</label>
      <input id="email" v-model="form.email" type="email" autocomplete="off" />
      <p v-if="errors.email" class="error">{{ errors.email }}</p>
      <p v-else class="mute">入力すると、確認メールを送ります。</p>
    </div>

    <div class="field">
      <label for="note">メモ</label>
      <textarea id="note" v-model="form.note" rows="3" maxlength="500"></textarea>
      <p v-if="errors.note" class="error">{{ errors.note }}</p>
    </div>

    <div class="form-actions">
      <button type="submit" class="btn btn-primary" :disabled="saving">
        {{ saving ? '登録中…' : '予約を登録する' }}
      </button>
      <RouterLink :to="{ name: 'day', query: { date: form.date } }" class="btn"
        >一覧に戻る</RouterLink
      >
    </div>
  </form>
</template>
