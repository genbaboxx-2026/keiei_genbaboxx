export interface BsItem {
  key: string;
  label: string;
  section: "currentAssets" | "fixedAssets" | "currentLiabilities" | "fixedLiabilities" | "netAssets";
  isEditable: boolean;
  isSummary?: boolean;
}

export const BS_SECTIONS = [
  { id: "currentAssets", label: "流動資産", side: "assets" },
  { id: "fixedAssets", label: "固定資産", side: "assets" },
  { id: "currentLiabilities", label: "流動負債", side: "liabilities" },
  { id: "fixedLiabilities", label: "固定負債", side: "liabilities" },
  { id: "netAssets", label: "純資産", side: "equity" },
] as const;

export const BS_ITEMS: BsItem[] = [
  // 流動資産
  { key: "cashAndDeposits", label: "現金及び預金", section: "currentAssets", isEditable: true },
  { key: "notesReceivable", label: "受取手形", section: "currentAssets", isEditable: true },
  { key: "accountsReceivable", label: "売掛金", section: "currentAssets", isEditable: true },
  { key: "inventory", label: "棚卸資産", section: "currentAssets", isEditable: true },
  { key: "prepaidExpenses", label: "前払費用", section: "currentAssets", isEditable: true },
  { key: "currentAssetsOther", label: "その他", section: "currentAssets", isEditable: true },
  { key: "_currentAssetsTotal", label: "流動資産合計", section: "currentAssets", isEditable: false, isSummary: true },
  // 固定資産
  { key: "buildings", label: "建物", section: "fixedAssets", isEditable: true },
  { key: "machinery", label: "機械装置", section: "fixedAssets", isEditable: true },
  { key: "vehicles", label: "車両運搬具", section: "fixedAssets", isEditable: true },
  { key: "toolsAndEquipment", label: "工具器具備品", section: "fixedAssets", isEditable: true },
  { key: "land", label: "土地", section: "fixedAssets", isEditable: true },
  { key: "intangibleAssets", label: "無形固定資産", section: "fixedAssets", isEditable: true },
  { key: "investmentsAndOther", label: "投資その他", section: "fixedAssets", isEditable: true },
  { key: "_fixedAssetsTotal", label: "固定資産合計", section: "fixedAssets", isEditable: false, isSummary: true },
  { key: "_totalAssets", label: "資産合計", section: "fixedAssets", isEditable: false, isSummary: true },
  // 流動負債
  { key: "notesPayable", label: "支払手形", section: "currentLiabilities", isEditable: true },
  { key: "accountsPayable", label: "買掛金", section: "currentLiabilities", isEditable: true },
  { key: "shortTermLoans", label: "短期借入金", section: "currentLiabilities", isEditable: true },
  { key: "accruedExpenses", label: "未払金", section: "currentLiabilities", isEditable: true },
  { key: "incomeTaxPayable", label: "未払法人税等", section: "currentLiabilities", isEditable: true },
  { key: "currentLiabilitiesOther", label: "その他", section: "currentLiabilities", isEditable: true },
  { key: "_currentLiabilitiesTotal", label: "流動負債合計", section: "currentLiabilities", isEditable: false, isSummary: true },
  // 固定負債
  { key: "longTermLoans", label: "長期借入金", section: "fixedLiabilities", isEditable: true },
  { key: "leaseObligations", label: "リース債務", section: "fixedLiabilities", isEditable: true },
  { key: "fixedLiabilitiesOther", label: "その他", section: "fixedLiabilities", isEditable: true },
  { key: "_fixedLiabilitiesTotal", label: "固定負債合計", section: "fixedLiabilities", isEditable: false, isSummary: true },
  { key: "_totalLiabilities", label: "負債合計", section: "fixedLiabilities", isEditable: false, isSummary: true },
  // 純資産
  { key: "capitalStock", label: "資本金", section: "netAssets", isEditable: true },
  { key: "capitalSurplus", label: "資本剰余金", section: "netAssets", isEditable: true },
  { key: "retainedEarnings", label: "利益剰余金", section: "netAssets", isEditable: true },
  { key: "netAssetsOther", label: "その他", section: "netAssets", isEditable: true },
  { key: "_netAssetsTotal", label: "純資産合計", section: "netAssets", isEditable: false, isSummary: true },
  { key: "_totalLiabilitiesAndNetAssets", label: "負債及び純資産合計", section: "netAssets", isEditable: false, isSummary: true },
];

export const BS_EDITABLE_KEYS = BS_ITEMS.filter((i) => i.isEditable).map((i) => i.key);
