import { describe, expect, it } from 'vitest'
import { addDays, isRealDate, SLOTS, todayInTokyo } from './slots.js'

describe('時間帯と日付', () => {
  it('9:00〜17:30 の 30 分きざみで 18 枠ある', () => {
    expect(SLOTS).toHaveLength(18)
    expect(SLOTS[0]).toBe('09:00')
    expect(SLOTS[1]).toBe('09:30')
    expect(SLOTS.at(-1)).toBe('17:30')
  })

  it('日本時間の日付を返す（世界標準時では前日でも、日本では翌日）', () => {
    expect(todayInTokyo(new Date('2026-10-09T15:30:00Z'))).toBe('2026-10-10')
    expect(todayInTokyo(new Date('2026-10-09T14:59:00Z'))).toBe('2026-10-09')
  })

  it('実在しない日付を断る', () => {
    expect(isRealDate('2026-10-10')).toBe(true)
    expect(isRealDate('2026-02-30')).toBe(false)
    expect(isRealDate('2026/10/10')).toBe(false)
  })

  it('月をまたいで日付を進められる', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })
})
