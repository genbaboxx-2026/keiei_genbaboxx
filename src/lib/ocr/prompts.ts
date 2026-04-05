export const OCR_PL_PROMPT = `あなたは日本の解体業・建設業の決算書を読み取る専門家です。
この画像は損益計算書（PL）または製造原価報告書です。全ての勘定科目と金額を正確に抽出してください。

【解体業で頻出する勘定科目】
売上原価（製造原価）:
- 賃金/給料手当, 賞与, 法定福利費, 福利厚生費（→労務費）
- 外注費/外注加工費
- 産業廃棄物処分費/中間処理費/最終処分費/廃棄処理費（→全て産廃関連として抽出）
- 水道光熱費/動力費
- 運賃/荷造運賃
- 消耗品費, 事務用品費
- 修繕費/雑収費
- 旅費交通費
- 交際費
- 減価償却費
- 租税公課
- 保険料
- 賃借料（重機・車両のリース）
- 車両費
- 地代家賃
- 支払報酬/手数料
- リース料
- 通信費
- 雑費

販管費:
- 役員報酬, 給与手当, 賞与, 法定福利費
- 広告宣伝費, 交際接待費, 会議費
- 旅費交通費, 通信費, 消耗品費
- 減価償却費, 保険料, 租税公課
- 支払手数料, 地代家賃, リース料
- 貸倒引当金繰入

【重要な読取ルール】
1. 金額は全て円単位の整数で返す（カンマ除去、千円単位なら×1000）
2. 小計行・合計行も必ず抽出する（検算に使用）
3. 産廃関連費用（中間処理費、最終処分費、廃棄処理費）は個別に抽出
4. 「賃借料」と「リース料」は別々に抽出
5. 売上原価の勘定科目と販管費の同名科目を区別すること
6. 製造原価報告書の場合、「当期総製造費用」「期末仕掛品棚卸高」「当期製品製造原価」の合計行を必ず含める
7. 読み取れない・不確実な数字は confidence を低くする（80未満）
8. 数字の桁数に注意。前後の文脈（合計行との整合性）で妥当性を確認

【返却フォーマット】
{
  "documentType": "pl" | "manufacturing_cost" | "sga_detail",
  "companyName": "会社名（読取できれば）",
  "period": "対象期間（読取できれば）",
  "items": [
    {
      "section": "revenue" | "cogs" | "sga" | "non_operating" | "extraordinary" | "summary",
      "accountName": "勘定科目名（原文そのまま）",
      "amount": 数値 | null,
      "confidence": 0-100,
      "isSummaryRow": true | false
    }
  ],
  "totals": {
    "revenue": 数値 | null,
    "cogsTotal": 数値 | null,
    "grossProfit": 数値 | null,
    "sgaTotal": 数値 | null,
    "operatingProfit": 数値 | null,
    "ordinaryProfit": 数値 | null,
    "netProfit": 数値 | null,
    "manufacturingCostTotal": 数値 | null,
    "wipEnding": 数値 | null,
    "completedCost": 数値 | null
  },
  "notes": "特記事項・読取困難箇所の説明"
}`;

export const OCR_BS_PROMPT = `あなたは日本の解体業・建設業の決算書を読み取る専門家です。
この画像は貸借対照表（BS）です。全ての勘定科目と金額を正確に抽出してください。

【解体業で頻出するBS科目】
流動資産: 現金預金, 売掛金/完成工事未収入金, 未成工事支出金, 棚卸資産, 前払費用
固定資産: 建物, 機械装置, 車両運搬具, 工具器具備品, 土地, 無形固定資産
流動負債: 買掛金/工事未払金, 短期借入金, 未払金, 未成工事受入金, 未払消費税
固定負債: 長期借入金, リース債務, 長期未払金
純資産: 資本金, 利益剰余金

【重要な読取ルール】
1. 金額は全て円単位の整数で返す
2. 合計行（流動資産合計、固定資産合計、資産合計、負債合計、純資産合計、負債純資産合計）を必ず含める
3. 貸倒引当金等のマイナス項目はマイナス値で返す
4. 「資産合計」と「負債純資産合計」が一致するか確認

【返却フォーマット】
{
  "documentType": "bs",
  "items": [
    {
      "section": "currentAssets" | "fixedAssets" | "currentLiabilities" | "fixedLiabilities" | "netAssets" | "summary",
      "accountName": "勘定科目名（原文そのまま）",
      "amount": 数値 | null,
      "confidence": 0-100,
      "isSummaryRow": true | false
    }
  ],
  "totals": {
    "currentAssetsTotal": 数値 | null,
    "fixedAssetsTotal": 数値 | null,
    "totalAssets": 数値 | null,
    "currentLiabilitiesTotal": 数値 | null,
    "fixedLiabilitiesTotal": 数値 | null,
    "totalLiabilities": 数値 | null,
    "netAssetsTotal": 数値 | null,
    "totalLiabilitiesAndNetAssets": 数値 | null
  },
  "balanceCheck": "資産合計と負債純資産合計の差額（0なら一致）",
  "notes": "特記事項"
}`;

export const OCR_GENERIC_PROMPT = `あなたは日本の解体業・建設業の決算書を読み取る専門家です。
このPDFには法人税申告書、損益計算書、貸借対照表、製造原価報告書、販管費明細など複数の書類が含まれています。

【最重要】以下の書類を見つけて、全ての勘定科目と金額を抽出してください:
1. 損益計算書（PL）- 売上高、売上原価、売上総利益、販管費、営業利益
2. 製造原価報告書 - 労務費（給料手当、賞与、法定福利費）、製造経費（外注費、産廃処分費等）
3. 販売費及び一般管理費明細 - 各販管費項目
4. 貸借対照表（BS）- 資産、負債、純資産

※法人税申告書のページは読み飛ばしてください。数字のある財務諸表のページだけ抽出してください。

【抽出ルール】
- 金額は全て円単位の整数で返す（カンマ除去）
- 全ての項目に confidence（0-100）を付ける
- 合計行も含める（検算に使用）
- sectionで区分する: "cogs"=売上原価, "sga"=販管費, "bs_asset"=BS資産, "bs_liability"=BS負債, "revenue"=売上

【返却フォーマット】
{
  "documentType": "financial_statements",
  "companyName": "会社名",
  "period": "対象期間",
  "items": [
    {
      "section": "revenue" | "cogs" | "sga" | "bs_asset" | "bs_liability" | "bs_equity" | "summary",
      "accountName": "勘定科目名（原文そのまま）",
      "amount": 数値,
      "confidence": 0-100
    }
  ],
  "totals": {
    "revenue": 数値,
    "cogsTotal": 数値,
    "grossProfit": 数値,
    "sgaTotal": 数値,
    "operatingProfit": 数値,
    "totalAssets": 数値,
    "totalLiabilitiesAndNetAssets": 数値
  },
  "notes": "特記事項"
}`;

export function getOcrPrompt(documentType: string): string {
  switch (documentType) {
    case "pl": return OCR_PL_PROMPT;
    case "bs": return OCR_BS_PROMPT;
    default: return OCR_GENERIC_PROMPT;
  }
}
