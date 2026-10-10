import { Hono } from 'hono'
import { ensureSchema, pool } from './db.js'
import { sendConfirmation } from './mail.js'
import { reservationInput, toFieldErrors } from './reservation-input.js'
import { cancel, create, listByDate, SlotTakenError, slotsOf } from './reservations.js'
import { isRealDate, todayInTokyo } from './slots.js'

/**
 * 予約管理の API（Vue の画面 http://localhost:5175 から使う）。
 * 注意：見本なのでログインがない。本番では、一覧・取り消しの前に必ずログインと権限を確かめる。
 */
export const app = new Hono()

/** 確認メールの送り方。テストでは差し替えて、実際には送らない */
export const deps = { sendConfirmation }

app.get('/api/health', async (c) => {
  try {
    await ensureSchema()
    const res = await pool.query<{ version: string }>('SELECT version()')
    return c.json({
      status: 'ok',
      node: process.version,
      db: res.rows[0]?.version.split(' on ')[0] ?? '',
      today: todayInTokyo(),
    })
  } catch (e) {
    return c.json({ status: 'ng', error: e instanceof Error ? e.message : String(e) }, 503)
  }
})

function dateQuery(value: string | undefined): string | null {
  const date = value ?? todayInTokyo()
  return isRealDate(date) ? date : null
}

app.get('/api/reservations', async (c) => {
  const date = dateQuery(c.req.query('date'))
  if (!date) return c.json({ error: '日付は 2026-10-10 の形で指定してください' }, 400)
  return c.json({ date, reservations: await listByDate(date) })
})

app.get('/api/slots', async (c) => {
  const date = dateQuery(c.req.query('date'))
  if (!date) return c.json({ error: '日付は 2026-10-10 の形で指定してください' }, 400)
  return c.json({ date, slots: await slotsOf(date) })
})

app.post('/api/reservations', async (c) => {
  const body: unknown = await c.req.json().catch(() => null)
  const parsed = reservationInput().safeParse(body)
  if (!parsed.success) return c.json({ errors: toFieldErrors(parsed.error) }, 400)

  try {
    const reservation = await create(parsed.data)
    // メールが送れなくても、予約そのものは成立させる（ログに残して担当者が気づけるようにする）
    await deps.sendConfirmation(reservation).catch((e: unknown) => {
      console.error('確認メールを送れませんでした', e)
    })
    return c.json(reservation, 201)
  } catch (e) {
    if (e instanceof SlotTakenError) {
      return c.json(
        {
          errors: { time: 'この時間は、たった今ほかの予約が入りました。別の時間を選んでください' },
        },
        409,
      )
    }
    throw e
  }
})

app.post('/api/reservations/:id/cancel', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isSafeInteger(id) || id <= 0) return c.json({ error: '予約が見つかりません' }, 404)
  const reservation = await cancel(id)
  if (!reservation) return c.json({ error: '予約が見つからないか、すでに取り消されています' }, 404)
  return c.json(reservation)
})

app.get('/', (c) =>
  c.html(`<!doctype html><html lang="ja"><meta charset="utf-8"><title>予約管理 API</title>
<body style="font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:0 1rem;line-height:1.7">
<h1 style="font-size:1.3rem">予約管理 API（見本）</h1>
<ul>
<li>画面（Vue）：<a href="http://localhost:5175">http://localhost:5175</a></li>
<li>稼働確認：<a href="/api/health">/api/health</a></li>
<li>今日の予約：<a href="/api/reservations">/api/reservations</a></li>
<li>今日の空き：<a href="/api/slots">/api/slots</a></li>
<li>メール確認：<a href="http://localhost:8031">Mailpit</a></li>
</ul></body></html>`),
)
