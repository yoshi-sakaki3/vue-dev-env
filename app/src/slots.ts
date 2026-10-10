/** 予約できる時間帯：9:00〜17:30 の 30 分きざみ（18 枠） */
export const SLOTS: readonly string[] = Array.from({ length: 18 }, (_, i) => {
  const minutes = 9 * 60 + i * 30
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return `${h}:${m}`
})

/** 日本時間の今日の日付（YYYY-MM-DD） */
export function todayInTokyo(now = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now)
}

/** YYYY-MM-DD の形で、実在する日付か */
export function isRealDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s)
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
