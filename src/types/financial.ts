export interface FinancialStatementData {
  fiscalYear: number;
  revenue: number;
  // 売上原価
  cogsSalary: number;
  cogsBonus: number;
  cogsStatutoryWelfare: number;
  cogsSubcontract: number;
  cogsWasteDisposal: number;
  cogsPower: number;
  cogsShipping: number;
  cogsTravel: number;
  cogsConsumables: number;
  cogsOfficeSupplies: number;
  cogsRepair: number;
  cogsUtilities: number;
  cogsMembership: number;
  cogsDepreciation: number;
  cogsTax: number;
  cogsInsurance: number;
  cogsProfessionalFee: number;
  cogsLease: number;
  cogsMisc: number;
  wipEnding: number;
  // 販管費
  sgaExecutiveCompensation: number;
  sgaSalary: number;
  sgaBonus: number;
  sgaStatutoryWelfare: number;
  sgaWelfare: number;
  sgaSubcontract: number;
  sgaAdvertising: number;
  sgaEntertainment: number;
  sgaMeeting: number;
  sgaTravel: number;
  sgaCommunication: number;
  sgaConsumables: number;
  sgaOfficeConsumables: number;
  sgaRepair: number;
  sgaUtilities: number;
  sgaMembership: number;
  sgaCommission: number;
  sgaRent: number;
  sgaLease: number;
  sgaInsurance: number;
  sgaTax: number;
  sgaProfessionalFee: number;
  sgaDepreciation: number;
  sgaBadDebt: number;
  sgaManagement: number;
  sgaMisc: number;
  // PL外キャッシュアウト
  cashoutCapex: number;
  cashoutLoanRepayment: number;
  cashoutOther: number;
}

export interface CostBreakdown {
  gbCost: number;
  nonGbCost: number;
  statutoryWelfare: number;
  miscExpenses: number;
}

export interface CostClassificationItem {
  itemKey: string;
  label: string;
  isGbCost: boolean;
}

export const DEFAULT_COST_CLASSIFICATIONS: CostClassificationItem[] = [
  { itemKey: "cogs_salary", label: "給料手当", isGbCost: true },
  { itemKey: "cogs_bonus", label: "賞与", isGbCost: true },
  { itemKey: "cogs_statutory_welfare", label: "法定福利費", isGbCost: false },
  { itemKey: "cogs_subcontract", label: "外注加工費", isGbCost: true },
  { itemKey: "cogs_waste_disposal", label: "産業廃棄物処分費", isGbCost: true },
  { itemKey: "cogs_power", label: "動力費", isGbCost: false },
  { itemKey: "cogs_shipping", label: "荷造発送費", isGbCost: false },
  { itemKey: "cogs_travel", label: "旅費交通費", isGbCost: false },
  { itemKey: "cogs_consumables", label: "消耗品費", isGbCost: false },
  { itemKey: "cogs_office_supplies", label: "事務用品費", isGbCost: false },
  { itemKey: "cogs_repair", label: "修繕費", isGbCost: true },
  { itemKey: "cogs_utilities", label: "水道光熱費", isGbCost: false },
  { itemKey: "cogs_membership", label: "諸会費", isGbCost: false },
  { itemKey: "cogs_depreciation", label: "減価償却費", isGbCost: true },
  { itemKey: "cogs_tax", label: "租税公課", isGbCost: false },
  { itemKey: "cogs_insurance", label: "保険料", isGbCost: true },
  { itemKey: "cogs_professional_fee", label: "支払報酬", isGbCost: false },
  { itemKey: "cogs_lease", label: "リース料", isGbCost: true },
  { itemKey: "cogs_misc", label: "雑費", isGbCost: false },
];
