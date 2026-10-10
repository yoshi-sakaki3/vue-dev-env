// API（Hono・http://localhost:3300）を呼ぶ関数。開発中は Vite が /api を転送する

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

export type Slot = { time: string; available: boolean }

export type ReservationInput = {
  date: string
  time: string
  name: string
  phone: string
  email: string
  note: string
}

export type FieldErrors = Partial<Record<keyof ReservationInput, string>>

/** API が返したエラー。fieldErrors があれば、フォームの各欄の下に出す */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: FieldErrors

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

async function readJson<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T
  const data = (await res.json().catch(() => null)) as {
    error?: string
    errors?: FieldErrors
  } | null
  throw new ApiError(
    res.status,
    data?.error ?? (data?.errors ? '入力内容を確認してください' : `API エラー（${res.status}）`),
    data?.errors,
  )
}

export async function fetchReservations(date: string): Promise<Reservation[]> {
  const data = await readJson<{ reservations: Reservation[] }>(
    await fetch(`/api/reservations?date=${encodeURIComponent(date)}`),
  )
  return data.reservations
}

export async function fetchSlots(date: string): Promise<Slot[]> {
  const data = await readJson<{ slots: Slot[] }>(
    await fetch(`/api/slots?date=${encodeURIComponent(date)}`),
  )
  return data.slots
}

export async function createReservation(input: ReservationInput): Promise<Reservation> {
  const res = await fetch('/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return readJson<Reservation>(res)
}

export async function cancelReservation(id: number): Promise<Reservation> {
  return readJson<Reservation>(await fetch(`/api/reservations/${id}/cancel`, { method: 'POST' }))
}
