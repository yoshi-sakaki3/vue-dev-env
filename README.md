# Vue 開発環境（予約管理の見本つき・Docker Compose + Dev Containers）

Docker Compose と VS Code Dev Containers で動く、Vue の開発環境です。
コマンド1つで、Vue の画面（Vite）・API（Node.js + Hono）・PostgreSQL・メール確認がそろいます。Windows（PowerShell）向けの操作コマンド `dev.ps1` 付き。

動作確認済み（2026-10-10）：Windows 11 + Docker Desktop で、予約の一覧・日付の移動・登録（入力チェック）・確認メール（Mailpit）・取り消し・保存時の画面の即時反映・スマホ幅の表示・テスト（API はテスト用 DB）・型チェック・コード検査・本番ビルド。

| 画面 | URL | 内容 |
|---|---|---|
| 予約の一覧 | http://localhost:5175 | 1日分の予約。前の日・次の日・日付指定で移動、取り消し（確認つき） |
| 新しい予約 | http://localhost:5175/new | 空いている時間だけ選べる登録フォーム。誤りは各欄の下に表示 |
| API | http://localhost:3300 | `/api/reservations`・`/api/slots`・`/api/health` |
| Mailpit | http://localhost:8031 | アプリが送ったメールを受け止めて表示（外部には送られない） |

## 入っているもの

- 画面：Vue 3（Composition API・`<script setup>`）＋ Vite 8 ＋ TypeScript、Vue Router、Pinia
- API：Node.js 24 ＋ Hono、PostgreSQL 17（`pg`）、Zod（入力チェック）、メール送信（`nodemailer` → Mailpit）
- 品質チェック：Vitest（API は DB を使うテスト、画面は Vue Test Utils）、vue-tsc（型チェック）、ESLint ＋ oxlint、Prettier
- テスト用の DB（`app_test`）を開発用とは別に用意。テストで開発中のデータが消えない
- 画面からの `/api/...` は、Vite が API のコンテナに転送する（CORS の設定がいらない）

### 見本（予約管理）で気を付けていること

- **二重予約を DB で防ぐ**：同じ日・同じ時間の予約は、取り消していないものを 1 件だけに限る制約（部分ユニークインデックス）を付けています。画面やアプリ側の確認だけだと、同時に 2 人が送ったときに両方通ってしまうためです。「同時に 5 人が同じ時間を送っても、通るのは 1 人だけ」をテストで確かめています。
- 先に取られたとき（409）は、空き状況を取り直して、別の時間を選び直してもらいます。
- 日付は URL（`?date=2026-10-10`）で持つので、URL を共有しても、読み込み直しても、同じ日が開きます。
- 日付は日本時間で判定します（サーバーの時計が世界標準時でも、日付がずれない）。
- 取り消しは 1 回のクリックでは実行せず、その場で確認を出します。
- 確認メールが送れなくても、予約そのものは成立させます（ログに残す）。
- テストは、テスト用以外の DB につながっていたら、データを消す前に止まります。

> 見本にはログインがありません。予約者の名前や連絡先を扱うので、本番では一覧・取り消しの前に必ずログインと権限の確認を足してください。

## 初回だけの準備

1. Docker Desktop を起動する（初めての PC は、先に管理者の PowerShell で `wsl --install` と再起動が必要）
2. このフォルダで準備コマンドを実行する
   ```powershell
   cd vue-dev-env
   .\dev.ps1 setup
   ```
   見本データ（8件。名前は架空）の投入まで自動で行います。終わったら http://localhost:5175 を開いてください。

> PowerShell で「スクリプトの実行が無効」と出たら：`powershell -ExecutionPolicy Bypass -File .\dev.ps1 setup`

## 普段の使い方

```powershell
.\dev.ps1 up              # 起動
.\dev.ps1 down            # 停止
.\dev.ps1 check           # 型チェック・コード検査・テストを、API と画面の両方まとめて実行
.\dev.ps1 build           # 画面の本番用ビルドを試す
.\dev.ps1 pnpm add xxx    # API 側にライブラリを追加
.\dev.ps1 web add xxx     # 画面側にライブラリを追加
.\dev.ps1 help            # コマンド一覧
```

ソースを保存すると、画面は読み込み直さずに変わり（入力中の内容も残ります）、API は自動で再起動します。

## VS Code で開発する（おすすめ）

VS Code でこのフォルダを開き、「コンテナーで再度開く（Reopen in Container）」を選ぶと、コンテナの中で補完・コード検査・Prettier・テストがそのまま使えます（拡張機能「Dev Containers」が必要）。
「API」と「画面」の2つの設定があるので、作業する側を選んでください。

## お客さまのソースを扱うときの注意

- お客さまのソースや個人情報を AI（Claude など）に渡す前に、秘密保持契約で外部の AI サービスの利用が認められているかを確認する
- 本物の予約データや連絡先を開発環境に持ち込まない（見本データか、匿名化したデータを使う）
- `.env` には本番のパスワードや API キーを入れない（この環境はローカル専用の値で動く）

## フォルダ構成

```
vue-dev-env/
├─ compose.yaml          … どのサービスを起動するか
├─ env.example           … 設定の見本（setup で .env にコピーされる）
├─ dev.ps1               … 操作コマンド
├─ docker/               … Node.js のイメージ、テスト用 DB を作る SQL
├─ web/                  … Vue の画面
│  ├─ src/views/         … 画面（一覧・登録フォーム）
│  ├─ src/stores/        … 画面どうしで共有する状態（Pinia）
│  ├─ src/api.ts         … API を呼ぶ関数
│  └─ src/**/__tests__/  … 画面のテスト
├─ app/                  … API
│  ├─ src/app.ts         … API の入口
│  ├─ src/reservations.ts … 予約の読み書き
│  ├─ src/db.ts          … テーブルの定義と DB 接続
│  └─ src/*.test.ts      … テスト
└─ .devcontainer/        … VS Code Dev Containers の設定
```
