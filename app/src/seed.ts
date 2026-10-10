import { ensureSchema, pool } from './db.js'
import { addDays, todayInTokyo } from './slots.js'

/**
 * 見本データを入れる（予約が 1 件もないときだけ）。
 * 名前はすべて架空。メールアドレスは example.com（予約済みの見本用ドメイン）だけを使う。
 */
await ensureSchema()

const count = await pool.query<{ n: string }>('SELECT count(*) AS n FROM reservations')
if (Number(count.rows[0]?.n) > 0) {
  console.log('すでに予約があるので、見本データは入れませんでした')
} else {
  const today = todayInTokyo()
  const rows: [string, string, string, string | null, string | null, string | null, string][] = [
    [today, '09:00', '見本 太郎', '090-0000-0001', 'taro@example.com', '初めての利用', 'booked'],
    [today, '10:30', '見本 花子', null, 'hanako@example.com', null, 'booked'],
    [today, '13:00', '見本 次郎', '090-0000-0002', null, '車で来店', 'booked'],
    [today, '15:30', '見本 三郎', null, null, null, 'cancelled'],
    [today, '16:00', '見本 さくら', '090-0000-0003', 'sakura@example.com', null, 'booked'],
    [addDays(today, 1), '09:30', '見本 一郎', null, 'ichiro@example.com', null, 'booked'],
    [addDays(today, 1), '14:00', '見本 みどり', '090-0000-0004', null, '付き添い 1 名', 'booked'],
    [addDays(today, 2), '11:00', '見本 健太', null, null, null, 'booked'],
  ]
  for (const row of rows) {
    await pool.query(
      'INSERT INTO reservations (date, slot, name, phone, email, note, status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      row,
    )
  }
  console.log(`見本データを ${rows.length} 件入れました`)
}
await pool.end()
