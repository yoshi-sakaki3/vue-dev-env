import nodemailer from 'nodemailer'
import type { Reservation } from './reservations.js'

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'mailpit',
  port: Number(process.env.SMTP_PORT ?? 1025),
})

/** 予約した人に確認メールを送る（開発中は Mailpit に届く。外部には送られない） */
export async function sendConfirmation(r: Reservation): Promise<void> {
  if (!r.email) return
  await transport.sendMail({
    from: '予約受付（見本） <noreply@example.com>',
    to: r.email,
    subject: `ご予約を受け付けました（${r.date} ${r.time}）`,
    text: [
      `${r.name} 様`,
      '',
      'ご予約を受け付けました。',
      '',
      `日時：${r.date} ${r.time}`,
      `受付番号：${r.id}`,
      '',
      '※このメールは自動で送信しています。',
      '※お心当たりがない場合は、このメールを破棄してください。',
    ].join('\n'),
  })
}
