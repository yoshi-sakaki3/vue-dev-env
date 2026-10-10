<#
  Vue 開発環境の操作コマンド（PowerShell）
  使い方:  .\dev.ps1 <コマンド> [引数]
  一覧:    .\dev.ps1 help
#>
param(
    [Parameter(Position = 0)][string]$Command = 'help',
    [Parameter(Position = 1, ValueFromRemainingArguments = $true)][string[]]$Rest
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

function Invoke-Compose { docker compose @args; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }

function Test-Docker {
    docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Docker が起動していません。Docker Desktop を起動してから、もう一度実行してください。' -ForegroundColor Yellow
        exit 1
    }
}

switch ($Command) {
    'setup' {
        if (-not (Test-Path .env)) { Copy-Item env.example .env; Write-Host '.env を作成しました。' }
        Test-Docker
        Invoke-Compose build
        Invoke-Compose run --rm --no-deps app pnpm install
        Invoke-Compose run --rm --no-deps web pnpm install
        Invoke-Compose up -d db
        Invoke-Compose run --rm app pnpm db:seed
        Invoke-Compose up -d
        Write-Host ''
        Write-Host '準備ができました。' -ForegroundColor Green
        & $PSCommandPath urls
    }
    'up'      { Test-Docker; Invoke-Compose up -d; & $PSCommandPath urls }
    'down'    { Invoke-Compose down }
    'restart' { Invoke-Compose restart }
    'rebuild' { Test-Docker; Invoke-Compose build --no-cache; Invoke-Compose up -d }
    'status'  { Invoke-Compose ps }
    'logs'    { Invoke-Compose logs -f --tail 100 @Rest }
    'sh'      { Invoke-Compose exec app bash }
    'pnpm'    { Invoke-Compose exec app pnpm @Rest }
    'web'     { Invoke-Compose exec web pnpm @Rest }
    'test'    { Invoke-Compose exec app pnpm test; Invoke-Compose exec web pnpm test }
    'check'   { Invoke-Compose exec app pnpm check; Invoke-Compose exec web pnpm check }
    'build'   { Invoke-Compose exec web pnpm build }
    'seed'    { Invoke-Compose exec app pnpm db:seed }
    'db'      { Invoke-Compose exec db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"' }
    'urls' {
        Write-Host '  Vue の画面 http://localhost:5175'
        Write-Host '  API        http://localhost:3300'
        Write-Host '  Mailpit    http://localhost:8031'
        Write-Host '  DB         localhost:5438（ユーザー app / パスワード app）'
    }
    'clean' {
        $ans = Read-Host 'DB と node_modules を含めて全部消します。よろしいですか？ (yes/no)'
        if ($ans -eq 'yes') { Invoke-Compose down -v --rmi local }
    }
    default {
        @'
使い方: .\dev.ps1 <コマンド>

  setup        初回の準備（.env 作成・ビルド・pnpm install・見本データ・起動）
  up / down    起動 / 停止
  restart      再起動
  rebuild      イメージを作り直して起動（Dockerfile を変えたとき）
  status       動いているサービスの一覧
  logs [名前]  ログを見る（例: .\dev.ps1 logs app）
  sh           アプリのコンテナの中に入る
  pnpm ...     API 側の pnpm コマンド（例: .\dev.ps1 pnpm add zod）
  web ...      Vue 側の pnpm コマンド（例: .\dev.ps1 web add @vueuse/core）
  test         テストを実行（API 側と Vue 側の Vitest。API はテスト用の DB を使う）
  check        型チェック・コード検査・テストを両方まとめて実行
  build        Vue の本番用ビルドを試す
  seed         見本データを入れる（予約が 1 件もないときだけ）
  db           PostgreSQL に接続
  urls         各画面の URL を表示
  clean        データごと全部消す（確認あり）
'@ | Write-Host
    }
}
