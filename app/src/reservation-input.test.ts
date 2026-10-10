import { describe, expect, it } from 'vitest'
import { reservationInput, toFieldErrors } from './reservation-input.js'

const today = '2026-10-10'
const valid = {
  date: '2026-10-12',
  time: '10:00',
  name: ' 見本 太郎 ',
  phone: '',
  email: '',
  note: '',
}

describe('予約の入力チェック', () => {
  it('正しい入力を通し、空欄は null にする', () => {
    expect(reservationInput(today).parse(valid)).toEqual({
      date: '2026-10-12',
      time: '10:00',
      name: '見本 太郎',
      phone: null,
      email: null,
      note: null,
    })
  })

  it('任意の項目は、送られてこなくてもよい', () => {
    const r = reservationInput(today).parse({ date: today, time: '09:00', name: '見本' })
    expect(r).toMatchObject({ phone: null, email: null, note: null })
  })

  it('誤りを項目ごとに返す', () => {
    const r = reservationInput(today).safeParse({
      ...valid,
      date: '2026-10-09',
      time: '10:15',
      name: '',
      phone: 'abc',
      email: 'not-an-email',
    })
    expect(r.success).toBe(false)
    if (r.success) return
    expect(toFieldErrors(r.error)).toEqual({
      date: '過ぎた日は予約できません',
      time: '時間を一覧から選んでください',
      name: 'お名前を入力してください',
      phone: '電話番号は数字とハイフンで入力してください',
      email: 'メールアドレスの形が正しくありません',
    })
  })
})
