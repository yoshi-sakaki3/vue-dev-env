/** 日本時間の今日の日付（YYYY-MM-DD） */
export function todayInTokyo(now = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now)
}

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s)
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const jaDate = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})

/** 2026-10-10 → 2026年10月10日(土) */
export function formatJa(isoDate: string): string {
  return jaDate.format(new Date(`${isoDate}T00:00:00Z`))
}
