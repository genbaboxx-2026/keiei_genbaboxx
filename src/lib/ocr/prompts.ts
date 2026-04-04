export const OCR_PL_PROMPT = `あなたは日本の建設・解体業の会計書類を読み取る専門家です。
この画像は損益計算書（PL）です。以下の項目を抽出してJSON形式で返してください。

【抽出ルール】
- 金額は全て円単位の整数で返す（カンマや「千円」単位は除去）
- 読み取れない項目は null にする
- 各項目にconfidence（0-100の整数）を付ける
- 売上原価の部と販管費の部を区別すること（同名勘定科目に注意）

【返却フォーマット】
{
  "documentType": "pl",
  "items": [
    { "section": "cogs"|"sga"|"cashout", "accountName": "勘定科目名（原文通り）", "amount": 数値|null, "confidence": 0-100 }
  ],
  "revenue": { "amount": 数値|null, "confidence": 0-100 },
  "notes": "特記事項（読取困難な箇所の説明等）"
}`;

export const OCR_BS_PROMPT = `あなたは日本の建設・解体業の会計書類を読み取る専門家です。
この画像は貸借対照表（BS）です。以下の項目を抽出してJSON形式で返してください。

【抽出ルール】
- 金額は全て円単位の整数で返す
- 読み取れない項目は null にする
- 各項目にconfidence（0-100の整数）を付ける

【返却フォーマット】
{
  "documentType": "bs",
  "items": [
    { "section": "currentAssets"|"fixedAssets"|"currentLiabilities"|"fixedLiabilities"|"netAssets", "accountName": "勘定科目名", "amount": 数値|null, "confidence": 0-100 }
  ],
  "notes": "特記事項"
}`;

export const OCR_GENERIC_PROMPT = `あなたは日本の建設・解体業の会計書類を読み取る専門家です。
この画像の書類の種類を判定し、記載されている全ての数値データを抽出してJSON形式で返してください。

【返却フォーマット】
{
  "documentType": "pl"|"bs"|"depreciation"|"payroll"|"other",
  "detectedTitle": "書類タイトル",
  "items": [
    { "label": "項目名", "value": "値（テキスト）", "numericValue": 数値|null, "confidence": 0-100 }
  ],
  "notes": "特記事項"
}`;

export function getOcrPrompt(documentType: string): string {
  switch (documentType) {
    case "pl": return OCR_PL_PROMPT;
    case "bs": return OCR_BS_PROMPT;
    default: return OCR_GENERIC_PROMPT;
  }
}
