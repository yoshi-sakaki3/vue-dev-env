import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { app, deps } from './app.js'
import { ensureSchema, pool } from './db.js'
import { addDays, todayInTokyo } from './slots.js'

// テスト用 DB（app_test）を使う。vitest.config.ts で DATABASE_URL を差し替えている

const date = addDays(todayInTokyo(), 1)

const post = (body: unknown) =>
  app.request('/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(async () => {
  // 安全装置：テスト用以外の DB につながっていたら、データを消す前に止める
  const db = await pool.query<{ name: string }>('SELECT current_database() AS name')
  if (db.rows[0]?.name !== 'app_test') {
    throw new Error(`テスト用の DB（app_test）ではなく「${db.rows[0]?.name}」につながっています`)
  }
  await ensureSchema()
  await pool.query('TRUNCATE reservations RESTART IDENTITY')
  // 確認メールは実際には送らず、呼ばれたことだけ記録する
  deps.sendConfirmation = vi.fn(async () => undefined)
})

afterAll(async () => {
  await pool.end()
})

describe('予約の API', () => {
  it('開発用ではなく、テスト用の DB につながっている', async () => {
    const res = await pool.query<{ name: string }>('SELECT current_database() AS name')
    expect(res.rows[0]?.name).toBe('app_test')
  })

  it('予約すると一覧と空き状況に反映され、確認メールを送る', async () => {
    const created = await post({
      date,
      time: '10:00',
      name: '見本 太郎',
      email: 'taro@example.com',
    })
    expect(created.status).toBe(201)
    expect(await created.json()).toMatchObject({ date, time: '10:00', status: 'booked' })
    expect(deps.sendConfirmation).toHaveBeenCalledOnce()

    const list = (await (await app.request(`/api/reservations?date=${date}`)).json()) as {
      reservations: { name: string }[]
    }
    expect(list.reservations.map((r) => r.name)).toEqual(['見本 太郎'])

    const slots = (await (await app.request(`/api/slots?date=${date}`)).json()) as {
      slots: { time: string; available: boolean }[]
    }
    expect(slots.slots.find((s) => s.time === '10:00')?.available).toBe(false)
    expect(slots.slots.find((s) => s.time === '10:30')?.available).toBe(true)
  })

  it('誤った入力は 400 で、項目ごとの理由を返す', async () => {
    const res = await post({ date, time: '10:15', name: '' })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      errors: { time: '時間を一覧から選んでください', name: 'お名前を入力してください' },
    })
  })

  it('同じ時間の予約は 409 で断る', async () => {
    expect((await post({ date, time: '11:00', name: '先の人' })).status).toBe(201)
    const second = await post({ date, time: '11:00', name: '後の人' })
    expect(second.status).toBe(409)
    expect(deps.sendConfirmation).toHaveBeenCalledOnce()
  })

  it('同時に 5 人が同じ時間を送っても、通るのは 1 人だけ', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) => post({ date, time: '14:00', name: `同時 ${i + 1}` })),
    )
    const statuses = results.map((r) => r.status).sort()
    expect(statuses).toEqual([201, 409, 409, 409, 409])

    const count = await pool.query<{ n: string }>(
      `SELECT count(*) AS n FROM reservations WHERE status = 'booked'`,
    )
    expect(Number(count.rows[0]?.n)).toBe(1)
  })

  it('取り消すと、その時間はもう一度予約できる', async () => {
    const created = (await (await post({ date, time: '15:00', name: '見本 花子' })).json()) as {
      id: number
    }
    const cancelled = await app.request(`/api/reservations/${created.id}/cancel`, {
      method: 'POST',
    })
    expect(cancelled.status).toBe(200)
    expect(await cancelled.json()).toMatchObject({ status: 'cancelled' })

    // 2 回目の取り消しと、存在しない予約は 404
    expect(
      (await app.request(`/api/reservations/${created.id}/cancel`, { method: 'POST' })).status,
    ).toBe(404)
    expect((await app.request('/api/reservations/99999/cancel', { method: 'POST' })).status).toBe(
      404,
    )

    expect((await post({ date, time: '15:00', name: '次の人' })).status).toBe(201)
  })

  it('メールが送れなくても、予約は成立する', async () => {
    deps.sendConfirmation = vi.fn(async () => {
      throw new Error('SMTP に接続できません')
    })
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const res = await post({ date, time: '16:00', name: '見本 次郎', email: 'jiro@example.com' })
    expect(res.status).toBe(201)
    expect(errorLog).toHaveBeenCalled()
    errorLog.mockRestore()
  })

  it('日付の形が違う問い合わせは 400', async () => {
    expect((await app.request('/api/reservations?date=2026-13-01')).status).toBe(400)
    expect((await app.request('/api/slots?date=abc')).status).toBe(400)
  })
})
