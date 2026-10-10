import { describe, expect, it } from 'vitest'
import { addDays, formatJa, isIsoDate, todayInTokyo } from '../date'

describe('日付の部品', () => {
  it('日本時間の日付を返す', () => {
    expect(todayInTokyo(new Date('2026-10-09T15:30:00Z'))).toBe('2026-10-10')
  })

  it('URL から来た値が正しい日付かを見分ける', () => {
    expect(isIsoDate('2026-10-10')).toBe(true)
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate(undefined)).toBe(false)
    expect(isIsoDate(['2026-10-10'])).toBe(false)
  })

  it('月をまたいで前後の日に移れる', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31')
  })

  it('曜日つきの日本語で表示する', () => {
    expect(formatJa('2026-10-10')).toBe('2026年10月10日(土)')
  })
})
