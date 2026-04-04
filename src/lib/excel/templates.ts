import * as XLSX from "xlsx";

export function createEmployeeTemplate(): XLSX.WorkBook {
  const headers = [
    "No", "役職/名前", "職種（責任者/オペレーター/手元/運転手/ガス工/その他）",
    "総支給（円/月）", "健康保険（円/月）", "厚生年金（円/月）",
    "確定拠出年金（円/月）", "安心財団（円/月）", "その他（円/月）",
  ];
  const sample = [1, "工事部長", "責任者", 755000, 42675, 59475, 0, 2000, 0];

  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length * 2, 14) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "人工データ");

  // Add instruction sheet
  const instWs = XLSX.utils.aoa_to_sheet([
    ["人工データ入力テンプレート 使い方"],
    [""],
    ["1. 「人工データ」シートに従業員情報を入力してください"],
    ["2. 職種は次のいずれか: 責任者, オペレーター, 手元, 運転手, ガス工, その他"],
    ["3. 金額は全て円単位（カンマなし）で入力してください"],
    ["4. 月額合計・年間合計・日割りはシステムで自動計算されます"],
  ]);
  XLSX.utils.book_append_sheet(wb, instWs, "説明");
  return wb;
}

export function createEquipmentTemplate(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Vehicle sheet
  const vHeaders = ["名前", "性能", "対人対物（円/年）", "動産保険（円/年）", "車両保険（円/年）", "自賠（円/年）", "自動車税（円/年）", "車検（円/年）", "修繕費（円/年）", "減価償却（円/年）", "リース料（円/年）", "リース契約（はい/いいえ）", "固定資産（はい/いいえ）"];
  const vSample = ["川口410さ1593", "3tダンプ", 102960, 0, 0, 0, 24600, 89050, 89000, 0, 0, "いいえ", "はい"];
  const vWs = XLSX.utils.aoa_to_sheet([vHeaders, vSample]);
  XLSX.utils.book_append_sheet(wb, vWs, "車両");

  // Heavy machine sheet
  const mHeaders = ["名前", "サイズ（ミニ/0.25/0.45/0.7/1.2/1.6/3.2）", "性能", "動産保険（円/年）", "修繕費（円/年）", "減価償却（円/年）", "リース料（円/年）", "リース契約", "固定資産"];
  const mWs = XLSX.utils.aoa_to_sheet([mHeaders]);
  XLSX.utils.book_append_sheet(wb, mWs, "重機");

  // Attachment sheet
  const aHeaders = ["対応サイズ", "種類", "名前", "性能", "修繕費（円/年）", "減価償却（円/年）"];
  const aWs = XLSX.utils.aoa_to_sheet([aHeaders]);
  XLSX.utils.book_append_sheet(wb, aWs, "アタッチメント");

  return wb;
}

export function createFinancialTemplate(): XLSX.WorkBook {
  const rows = [
    ["項目", "金額（円）"],
    ["売上高", ""],
    ["── 売上原価 ──", ""],
    ["給料手当", ""], ["賞与", ""], ["法定福利費", ""],
    ["外注加工費", ""], ["産業廃棄物処分費", ""],
    ["動力費", ""], ["荷造発送費", ""], ["旅費交通費", ""],
    ["消耗品費", ""], ["事務用品費", ""], ["修繕費", ""],
    ["水道光熱費", ""], ["諸会費", ""], ["減価償却費", ""],
    ["租税公課", ""], ["保険料", ""], ["支払報酬", ""],
    ["リース料", ""], ["雑費", ""],
    ["期末仕掛品棚卸高", ""],
    ["── 販管費 ──", ""],
    ["役員報酬", ""], ["給料手当（販管費）", ""], ["賞与（販管費）", ""],
    ["法定福利費（販管費）", ""], ["福利厚生費", ""],
    ["外注費", ""], ["広告宣伝", ""], ["接待交際費", ""],
    ["会議費", ""], ["旅費交通費（販管費）", ""], ["通信費", ""],
    ["消耗品費（販管費）", ""], ["事務用消耗品費", ""],
    ["修繕費（販管費）", ""], ["水道光熱費（販管費）", ""],
    ["諸会費（販管費）", ""], ["支払手数料", ""], ["地代家賃", ""],
    ["リース料（販管費）", ""], ["保険料（販管費）", ""],
    ["租税公課（販管費）", ""], ["支払報酬料", ""],
    ["減価償却費（販管費）", ""], ["貸倒引当繰入金", ""],
    ["管理費", ""], ["雑費（販管費）", ""],
    ["── PL外 ──", ""],
    ["年間設備投資額", ""], ["借入金返済額", ""], ["その他", ""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 30 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "損益計算書");
  return wb;
}

export function createCostMasterExport(
  laborData: { label: string; avgDailyCost: number; count: number }[],
  machineData: { label: string; avgDailyCost: number; count: number }[],
  attachmentData: { subCategory: string; avgDailyCost: number }[],
  transportData: { label: string; avgDailyCost: number; count: number }[],
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const lWs = XLSX.utils.aoa_to_sheet([
    ["職種", "平均原価/日（円）", "人数"],
    ...laborData.map((d) => [d.label, d.avgDailyCost, d.count]),
  ]);
  XLSX.utils.book_append_sheet(wb, lWs, "人工");

  const mWs = XLSX.utils.aoa_to_sheet([
    ["サイズ", "平均原価/日（円）", "台数"],
    ...machineData.map((d) => [d.label, d.avgDailyCost, d.count]),
  ]);
  XLSX.utils.book_append_sheet(wb, mWs, "重機");

  const aWs = XLSX.utils.aoa_to_sheet([
    ["サイズ_種類", "平均原価/日（円）"],
    ...attachmentData.map((d) => [d.subCategory, d.avgDailyCost]),
  ]);
  XLSX.utils.book_append_sheet(wb, aWs, "アタッチメント");

  const tWs = XLSX.utils.aoa_to_sheet([
    ["トン数", "平均原価/日（円）", "台数"],
    ...transportData.map((d) => [d.label, d.avgDailyCost, d.count]),
  ]);
  XLSX.utils.book_append_sheet(wb, tWs, "運搬");

  return wb;
}
