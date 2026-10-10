import pg from 'pg'

// DATE 型は、タイムゾーンでずれないように文字列（YYYY-MM-DD）のまま受け取る
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value)

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 })

/**
 * テーブルを用意する（何度実行しても同じ結果になる）。
 * 同じ日・同じ時間の予約は、取り消していないものを 1 件だけに限る（部分ユニークインデックス）。
 * アプリ側の確認だけだと、同時に 2 人が送ったときに二重予約になるため、DB で防ぐ。
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS reservations (
  id         serial PRIMARY KEY,
  date       date         NOT NULL,
  slot       char(5)      NOT NULL,
  name       varchar(50)  NOT NULL,
  phone      varchar(20),
  email      varchar(255),
  note       varchar(500),
  status     varchar(10)  NOT NULL DEFAULT 'booked',
  created_at timestamptz  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS reservations_slot_unique
  ON reservations (date, slot) WHERE status = 'booked';
`

let ready: Promise<void> | undefined

export function ensureSchema(): Promise<void> {
  ready ??= pool.query(SCHEMA).then(() => undefined)
  return ready
}
