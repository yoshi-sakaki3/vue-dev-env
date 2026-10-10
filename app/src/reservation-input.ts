import { z } from 'zod'
import { isRealDate, SLOTS, todayInTokyo } from './slots.js'

const optional = <T extends z.ZodType<string, string>>(schema: T) =>
  z
    .string()
    .trim()
    .transform((s) => (s === '' ? null : s))
    .pipe(schema.nullable())

/** 予約の入力チェック。today は「今日より前の日は予約できない」の判定に使う（テストで固定できる） */
export function reservationInput(today = todayInTokyo()) {
  return z.object({
    date: z
      .string()
      .refine(isRealDate, '日付は 2026-10-10 の形で入力してください')
      .refine((d) => d >= today, '過ぎた日は予約できません'),
    time: z.string().refine((t) => SLOTS.includes(t), '時間を一覧から選んでください'),
    name: z.string().trim().min(1, 'お名前を入力してください').max(50, 'お名前は50文字以内です'),
    phone: optional(
      z.string().regex(/^[0-9-]{10,13}$/, '電話番号は数字とハイフンで入力してください'),
    ).default(null),
    email: optional(z.email('メールアドレスの形が正しくありません').max(255)).default(null),
    note: optional(z.string().max(500, 'メモは500文字以内です')).default(null),
  })
}

export type ReservationInput = z.output<ReturnType<typeof reservationInput>>
export type FieldErrors = Partial<Record<keyof ReservationInput, string>>

/** エラーを「項目ごとに最初の1つ」にまとめる（画面の各欄の下に出す用） */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof ReservationInput
    result[key] ??= issue.message
  }
  return result
}
