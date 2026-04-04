# 四次元ポケット - 解体業経営シミュレーター

解体業の経営者が自社の財務データ・原価データを入力することで、
現状の原価構造を可視化し、将来予測とシナリオ分析を通じて
「目標利益を達成するために何が必要か」を明確にするWebアプリケーション。

## 技術スタック

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Charts**: Recharts (PieChart, LineChart, BarChart, ScatterChart, AreaChart)
- **ORM**: Prisma v6
- **Database**: PostgreSQL (Supabase)
- **AI**: Anthropic Claude API (Vision OCR + Chat Streaming)
- **Auth**: NextAuth.js v5 (Credentials Provider + JWT)
- **Excel**: SheetJS (xlsx)
- **PDF**: jsPDF

## セットアップ

```bash
# 1. 依存パッケージをインストール
npm install

# 2. 環境変数を設定
cp .env.example .env.local
# .env.local を編集して各環境変数を設定

# 3. Prismaクライアントを生成
npx prisma generate

# 4. データベースマイグレーション
npx prisma migrate dev

# 5. 開発サーバーを起動
npm run dev
```

## 環境変数

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL接続文字列（Supabase） | Yes |
| `NEXTAUTH_SECRET` | NextAuth.jsのシークレット | Yes |
| `NEXTAUTH_URL` | アプリのURL | Yes |
| `ANTHROPIC_API_KEY` | Claude APIキー（AI機能に必要） | AI機能利用時 |

## 主要機能

### Phase 1: データ入力・コストマスタ（MVP）
- 人工入力（スプレッドシートライクなインライン編集）
- 重機・車両・アタッチメント入力（タブ切替）
- 決算データ入力（PL全項目 + 自動計算）
- 貸借対照表入力（バランスチェック付き）
- コストマスタ自動生成（4タブ + Rechartsグラフ）
- OCR読取（Claude Vision API）
- Excel入出力（テンプレートDL + アップロード読込）
- 年度管理（コピー + 切替）

### Phase 2: 経営分析
- 5ステップ分析（GB原価分類 + 目標逆算 + ゲージチャート）
- 経営ダッシュボード（KPIカード + PieChart + 経営指標パネル）
- 事業ダッシュボード（実績vs目標 + ウォーターフォールチャート）
- PL詳細ビュー（前年比較 + ソート・フィルタ）
- 1人あたり分析（担当者別売上 + キャパ率）
- 経営指標詳細（安全性/収益性/財務力）

### Phase 3: シミュレーション・要員計画
- 将来予測（変動率設定 + LineChart + 警告）
- 目標逆算（売上目標/利益率目標の2タブ）
- What-if分析（人員追加/外注比率/コスト増加シナリオ）
- 要員計画ダッシュボード（ScatterChart + AreaChart + 退職アラート）
- 従業員タイムライン（ガントチャート風）
- 採用計画シミュレーション

### Phase 4: AI連携
- 経営インサイト自動生成（Claude API + JSON構造化出力）
- AIチャット相談（SSEストリーミング + マークダウン表示）
- 市場動向分析
- 要員計画AI相談

### Phase 5: レポート・仕上げ
- 経営レポートPDF出力（jsPDF）
- 分析データExcel出力（SheetJS）
- オンボーディングウィザード
- エラーハンドリング + ローディングUI

## デプロイ（Vercel + Supabase）

```bash
# 1. Supabaseでプロジェクトを作成し、DATABASE_URLを取得
# 2. Vercelにデプロイ
vercel deploy --prod

# 3. Vercelの環境変数にDATABASE_URL, NEXTAUTH_SECRET等を設定
# 4. DBマイグレーション
npx prisma migrate deploy
```

## npm scripts

```bash
npm run dev         # 開発サーバー
npm run build       # 本番ビルド
npm run start       # 本番サーバー
npm run lint        # ESLint
npm run test        # Vitest
npm run db:generate # Prismaクライアント生成
npm run db:migrate  # DBマイグレーション
npm run db:studio   # Prisma Studio
```
