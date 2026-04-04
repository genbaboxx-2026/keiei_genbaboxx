export interface PlItem {
  key: string;
  label: string;
  section: "revenue" | "cogs" | "sga" | "cashout";
  isEditable: boolean;
  isSummary?: boolean;
  indent?: number;
  summaryOf?: string[]; // keys to sum for auto-calc
}

export const PL_ITEMS: PlItem[] = [
  // ── 売上高 ──
  { key: "revenue", label: "売上高", section: "revenue", isEditable: true },

  // ── 売上原価の部 ──
  { key: "cogsSalary", label: "給料手当", section: "cogs", isEditable: true, indent: 1 },
  { key: "cogsBonus", label: "賞与", section: "cogs", isEditable: true, indent: 1 },
  { key: "cogsStatutoryWelfare", label: "法定福利費", section: "cogs", isEditable: true, indent: 1 },
  { key: "_laborTotal", label: "労務費合計", section: "cogs", isEditable: false, isSummary: true, indent: 1, summaryOf: ["cogsSalary", "cogsBonus", "cogsStatutoryWelfare"] },
  { key: "cogsSubcontract", label: "外注加工費", section: "cogs", isEditable: true, indent: 1 },
  { key: "cogsWasteDisposal", label: "産業廃棄物処分費", section: "cogs", isEditable: true, indent: 1 },
  { key: "cogsPower", label: "動力費", section: "cogs", isEditable: true, indent: 1 },
  { key: "cogsShipping", label: "荷造発送費", section: "cogs", isEditable: true, indent: 1 },
  { key: "cogsTravel", label: "旅費交通費", section: "cogs", isEditable: true, indent: 1 },
  { key: "cogsConsumables", label: "消耗品費", section: "cogs", isEditable: true, indent: 1 },
  { key: "cogsOfficeSupplies", label: "事務用品費", section: "cogs", isEditable: true, indent: 1 },
  { key: "cogsRepair", label: "修繕費", section: "cogs", isEditable: true, indent: 1 },
  { key: "cogsUtilities", label: "水道光熱費", section: "cogs", isEditable: true, indent: 1 },
  { key: "cogsMembership", label: "諸会費", section: "cogs", isEditable: true, indent: 1 },
  { key: "cogsDepreciation", label: "減価償却費", section: "cogs", isEditable: true, indent: 1 },
  { key: "cogsTax", label: "租税公課", section: "cogs", isEditable: true, indent: 1 },
  { key: "cogsInsurance", label: "保険料", section: "cogs", isEditable: true, indent: 1 },
  { key: "cogsProfessionalFee", label: "支払報酬", section: "cogs", isEditable: true, indent: 1 },
  { key: "cogsLease", label: "リース料", section: "cogs", isEditable: true, indent: 1 },
  { key: "cogsMisc", label: "雑費", section: "cogs", isEditable: true, indent: 1 },
  { key: "_mfgExpenseTotal", label: "製造経費合計", section: "cogs", isEditable: false, isSummary: true, indent: 1, summaryOf: ["cogsSubcontract", "cogsWasteDisposal", "cogsPower", "cogsShipping", "cogsTravel", "cogsConsumables", "cogsOfficeSupplies", "cogsRepair", "cogsUtilities", "cogsMembership", "cogsDepreciation", "cogsTax", "cogsInsurance", "cogsProfessionalFee", "cogsLease", "cogsMisc"] },
  { key: "_totalMfgCost", label: "総製造費用", section: "cogs", isEditable: false, isSummary: true, summaryOf: ["_laborTotal", "_mfgExpenseTotal"] },
  { key: "wipEnding", label: "期末仕掛品棚卸高", section: "cogs", isEditable: true, indent: 1 },
  { key: "_cogTotal", label: "当期製品製造原価", section: "cogs", isEditable: false, isSummary: true },

  // ── 売上総利益 ──
  { key: "_grossProfit", label: "売上総利益", section: "cogs", isEditable: false, isSummary: true },

  // ── 販管費の部 ──
  { key: "sgaExecutiveCompensation", label: "役員報酬", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaSalary", label: "給料手当", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaBonus", label: "賞与", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaStatutoryWelfare", label: "法定福利費", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaWelfare", label: "福利厚生費", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaSubcontract", label: "外注費", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaAdvertising", label: "広告宣伝", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaEntertainment", label: "接待交際費", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaMeeting", label: "会議費", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaTravel", label: "旅費交通費", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaCommunication", label: "通信費", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaConsumables", label: "消耗品費", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaOfficeConsumables", label: "事務用消耗品費", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaRepair", label: "修繕費", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaUtilities", label: "水道光熱費", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaMembership", label: "諸会費", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaCommission", label: "支払手数料", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaRent", label: "地代家賃", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaLease", label: "リース料", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaInsurance", label: "保険料", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaTax", label: "租税公課", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaProfessionalFee", label: "支払報酬料", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaDepreciation", label: "減価償却費", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaBadDebt", label: "貸倒引当繰入金", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaManagement", label: "管理費", section: "sga", isEditable: true, indent: 1 },
  { key: "sgaMisc", label: "雑費", section: "sga", isEditable: true, indent: 1 },
  { key: "_sgaTotal", label: "販管費合計", section: "sga", isEditable: false, isSummary: true },

  // ── 営業利益 ──
  { key: "_operatingProfit", label: "営業利益", section: "sga", isEditable: false, isSummary: true },

  // ── PL外キャッシュアウト ──
  { key: "cashoutCapex", label: "年間設備投資額", section: "cashout", isEditable: true, indent: 1 },
  { key: "cashoutLoanRepayment", label: "借入金返済額", section: "cashout", isEditable: true, indent: 1 },
  { key: "cashoutOther", label: "その他", section: "cashout", isEditable: true, indent: 1 },
];

// All editable field keys (keys that map to DB columns)
export const EDITABLE_FIELD_KEYS = PL_ITEMS
  .filter((i) => i.isEditable)
  .map((i) => i.key);
