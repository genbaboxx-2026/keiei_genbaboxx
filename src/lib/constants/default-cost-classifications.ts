/**
 * Default GB cost classifications per 02_DATA_MODEL.md
 */
export interface DefaultClassification {
  itemKey: string;
  label: string;
  isGbCost: boolean;
}

export const DEFAULT_CLASSIFICATIONS: DefaultClassification[] = [
  // TRUE = GB原価（変動費）
  { itemKey: "cogs_salary", label: "給料手当", isGbCost: true },
  { itemKey: "cogs_bonus", label: "賞与", isGbCost: true },
  { itemKey: "cogs_subcontract", label: "外注加工費", isGbCost: true },
  { itemKey: "cogs_waste_disposal", label: "産業廃棄物処分費", isGbCost: true },
  { itemKey: "cogs_repair", label: "修繕費", isGbCost: true },
  { itemKey: "cogs_depreciation", label: "減価償却費", isGbCost: true },
  { itemKey: "cogs_insurance", label: "保険料", isGbCost: true },
  { itemKey: "cogs_lease", label: "リース料", isGbCost: true },
  // FALSE = 固定的製造経費
  { itemKey: "cogs_statutory_welfare", label: "法定福利費", isGbCost: false },
  { itemKey: "cogs_power", label: "動力費", isGbCost: false },
  { itemKey: "cogs_shipping", label: "荷造発送費", isGbCost: false },
  { itemKey: "cogs_travel", label: "旅費交通費", isGbCost: false },
  { itemKey: "cogs_consumables", label: "消耗品費", isGbCost: false },
  { itemKey: "cogs_office_supplies", label: "事務用品費", isGbCost: false },
  { itemKey: "cogs_utilities", label: "水道光熱費", isGbCost: false },
  { itemKey: "cogs_membership", label: "諸会費", isGbCost: false },
  { itemKey: "cogs_tax", label: "租税公課", isGbCost: false },
  { itemKey: "cogs_professional_fee", label: "支払報酬", isGbCost: false },
  { itemKey: "cogs_misc", label: "雑費", isGbCost: false },
];

/**
 * Map from itemKey (snake_case DB) to camelCase field name on FinancialStatement
 */
export const ITEM_KEY_TO_FIELD: Record<string, string> = {
  cogs_salary: "cogsSalary",
  cogs_bonus: "cogsBonus",
  cogs_statutory_welfare: "cogsStatutoryWelfare",
  cogs_subcontract: "cogsSubcontract",
  cogs_waste_disposal: "cogsWasteDisposal",
  cogs_power: "cogsPower",
  cogs_shipping: "cogsShipping",
  cogs_travel: "cogsTravel",
  cogs_consumables: "cogsConsumables",
  cogs_office_supplies: "cogsOfficeSupplies",
  cogs_repair: "cogsRepair",
  cogs_utilities: "cogsUtilities",
  cogs_membership: "cogsMembership",
  cogs_depreciation: "cogsDepreciation",
  cogs_tax: "cogsTax",
  cogs_insurance: "cogsInsurance",
  cogs_professional_fee: "cogsProfessionalFee",
  cogs_lease: "cogsLease",
  cogs_misc: "cogsMisc",
};
