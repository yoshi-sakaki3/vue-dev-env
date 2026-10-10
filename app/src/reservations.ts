import { ensureSchema, pool } from './db.js'
import type { ReservationInput } from './reservation-input.js'
import { SLOTS } from './slots.js'

export type Reservation = {
  id: number
  date: string
  time: string
  name: string
  phone: string | null
  email: string | null
  note: string | null
  status: 'booked' | 'cancelled'
  createdAt: string
}

type Row = {
  id: number
  date: string
  slot: string
  name: string
  phone: string | null
  email: string | null
  note: string | null
  status: 'booked' | 'cancelled'
  created_at: Date
}

const COLUMNS = 'id, date, slot, name, phone, email, note, status, created_at'

const toReservation = (r: Row): Reservation => ({
  id: r.id,
  date: r.date,
  time: r.slot,
  name: r.name,
  phone: r.phone,
  email: r.email,
  note: r.note,
  status: r.status,
  createdAt: r.created_at.toISOString(),
})

/** その時間にはすでに予約が入っている */
export class SlotTakenError extends Error {}

export async function listByDate(date: string): Promise<Reservation[]> {
  await ensureSchema()
  const res = await pool.query<Row>(
    `SELECT ${COLUMNS} FROM reservations WHERE date = $1 ORDER BY slot, id`,
    [date],
  )
  return res.rows.map(toReservation)
}

/** その日の時間帯ごとの空き状況 */
export async function slotsOf(date: string): Promise<{ time: string; available: boolean }[]> {
  await ensureSchema()
  const res = await pool.query<{ slot: string }>(
    `SELECT slot FROM reservations WHERE date = $1 AND status = 'booked'`,
    [date],
  )
  const taken = new Set(res.rows.map((r) => r.slot))
  return SLOTS.map((time) => ({ time, available: !taken.has(time) }))
}

export async function create(input: ReservationInput): Promise<Reservation> {
  await ensureSchema()
  try {
    const res = await pool.query<Row>(
      `INSERT INTO reservations (date, slot, name, phone, email, note)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLUMNS}`,
      [input.date, input.time, input.name, input.phone, input.email, input.note],
    )
    return toReservation(res.rows[0]!)
  } catch (e) {
    // 23505 = 一意制約の違反。同じ日・同じ時間の予約が先に入っていた
    if (e instanceof Error && 'code' in e && e.code === '23505') throw new SlotTakenError()
    throw e
  }
}

/** 予約を取り消す。該当がない・すでに取り消し済みなら undefined */
export async function cancel(id: number): Promise<Reservation | undefined> {
  await ensureSchema()
  const res = await pool.query<Row>(
    `UPDATE reservations SET status = 'cancelled'
     WHERE id = $1 AND status = 'booked' RETURNING ${COLUMNS}`,
    [id],
  )
  return res.rows[0] && toReservation(res.rows[0])
}
