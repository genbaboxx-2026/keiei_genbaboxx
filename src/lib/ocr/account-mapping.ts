/**
 * Mapping from common Japanese account name variations to our DB field keys.
 * Tuned for demolition/construction industry (解体業).
 * Based on actual data from: 株式会社ダイコク, 株式会社クワバラ・パンぷキン
 */

interface AccountMapping {
  patterns: string[];
  mappedKey: string;
  section: "cogs" | "sga" | "cashout" | "bs_asset" | "bs_liability" | "bs_equity";
}

export const ACCOUNT_MAPPINGS: AccountMapping[] = [
  // ===== 売上原価（製造原価）=====
  { patterns: ["給料手当", "給料", "給与手当", "賃金"], mappedKey: "cogsSalary", section: "cogs" },
  { patterns: ["賞与"], mappedKey: "cogsBonus", section: "cogs" },
  { patterns: ["法定福利費", "法定福利"], mappedKey: "cogsStatutoryWelfare", section: "cogs" },
  { patterns: ["外注加工費", "外注費", "外注工賃"], mappedKey: "cogsSubcontract", section: "cogs" },
  // 産廃関連（解体業特有：複数科目を1つにマッピング）
  { patterns: ["産業廃棄物処分費", "産廃処分費", "廃棄物処分費", "産廃費"], mappedKey: "cogsWasteDisposal", section: "cogs" },
  { patterns: ["中間処理費", "中間処理"], mappedKey: "cogsWasteDisposal", section: "cogs" },
  { patterns: ["最終処分費", "最終処分"], mappedKey: "cogsWasteDisposal", section: "cogs" },
  { patterns: ["廃棄処理費", "廃棄処理"], mappedKey: "cogsWasteDisposal", section: "cogs" },
  // 動力・光熱
  { patterns: ["動力費", "動力用水光熱費"], mappedKey: "cogsPower", section: "cogs" },
  { patterns: ["水道光熱費"], mappedKey: "cogsPower", section: "cogs" },
  // 運賃・運搬
  { patterns: ["荷造発送費", "荷造運賃", "運賃"], mappedKey: "cogsShipping", section: "cogs" },
  // その他製造経費
  { patterns: ["旅費交通費", "旅費"], mappedKey: "cogsTravel", section: "cogs" },
  { patterns: ["消耗品費"], mappedKey: "cogsConsumables", section: "cogs" },
  { patterns: ["事務用品費", "事務用消耗品", "事務用消耗品費"], mappedKey: "cogsOfficeSupplies", section: "cogs" },
  { patterns: ["修繕費", "修理費", "雑収費"], mappedKey: "cogsRepair", section: "cogs" },
  { patterns: ["諸会費"], mappedKey: "cogsMembership", section: "cogs" },
  { patterns: ["交際費"], mappedKey: "cogsMembership", section: "cogs" },
  { patterns: ["減価償却費"], mappedKey: "cogsDepreciation", section: "cogs" },
  { patterns: ["租税公課"], mappedKey: "cogsTax", section: "cogs" },
  { patterns: ["保険料"], mappedKey: "cogsInsurance", section: "cogs" },
  { patterns: ["支払報酬", "支払報酬料", "支払報酬費"], mappedKey: "cogsProfessionalFee", section: "cogs" },
  // 解体業特有：賃借料・車両費・リース
  { patterns: ["リース料"], mappedKey: "cogsLease", section: "cogs" },
  { patterns: ["賃借料"], mappedKey: "cogsProfessionalFee", section: "cogs" },
  { patterns: ["車両費"], mappedKey: "cogsLease", section: "cogs" },
  // その他
  { patterns: ["雑費"], mappedKey: "cogsMisc", section: "cogs" },
  { patterns: ["通信費"], mappedKey: "cogsMisc", section: "cogs" },
  { patterns: ["手数料"], mappedKey: "cogsMisc", section: "cogs" },
  { patterns: ["地代家賃"], mappedKey: "cogsMisc", section: "cogs" },
  { patterns: ["福利厚生費"], mappedKey: "cogsMisc", section: "cogs" },
  { patterns: ["当期材料仕入高", "材料費", "材料品費"], mappedKey: "cogsMisc", section: "cogs" },
  { patterns: ["期末仕掛品棚卸高", "仕掛品", "期末仕掛工事高"], mappedKey: "wipEnding", section: "cogs" },

  // ===== 販管費 =====
  { patterns: ["役員報酬"], mappedKey: "sgaExecutiveCompensation", section: "sga" },
  { patterns: ["広告宣伝費", "広告宣伝"], mappedKey: "sgaAdvertising", section: "sga" },
  { patterns: ["接待交際費", "交際費", "交際接待費"], mappedKey: "sgaEntertainment", section: "sga" },
  { patterns: ["会議費"], mappedKey: "sgaMeeting", section: "sga" },
  { patterns: ["通信費"], mappedKey: "sgaCommunication", section: "sga" },
  { patterns: ["支払手数料", "手数料"], mappedKey: "sgaCommission", section: "sga" },
  { patterns: ["地代家賃", "賃借料"], mappedKey: "sgaRent", section: "sga" },
  { patterns: ["貸倒引当金繰入", "貸倒引当繰入金", "貸倒引当金繰入額"], mappedKey: "sgaBadDebt", section: "sga" },
  { patterns: ["管理費"], mappedKey: "sgaManagement", section: "sga" },
  { patterns: ["福利厚生費"], mappedKey: "sgaWelfare", section: "sga" },
  { patterns: ["退職金"], mappedKey: "sgaBonus", section: "sga" },
  // 解体業特有
  { patterns: ["車両費"], mappedKey: "sgaConsumables", section: "sga" },
  { patterns: ["車代替費"], mappedKey: "sgaRent", section: "sga" },
  { patterns: ["新聞図書費"], mappedKey: "sgaMisc", section: "sga" },
  { patterns: ["研修費"], mappedKey: "sgaMisc", section: "sga" },
  { patterns: ["寄付金"], mappedKey: "sgaMisc", section: "sga" },
];

/**
 * Map from SGA ambiguous items (same name in cogs and sga)
 */
const SGA_OVERRIDE_MAP: Record<string, string> = {
  cogsSalary: "sgaSalary",
  cogsBonus: "sgaBonus",
  cogsStatutoryWelfare: "sgaStatutoryWelfare",
  cogsRepair: "sgaRepair",
  cogsUtilities: "sgaUtilities",
  cogsMembership: "sgaMembership",
  cogsDepreciation: "sgaDepreciation",
  cogsTax: "sgaTax",
  cogsInsurance: "sgaInsurance",
  cogsLease: "sgaLease",
  cogsMisc: "sgaMisc",
  cogsTravel: "sgaTravel",
  cogsConsumables: "sgaConsumables",
  cogsProfessionalFee: "sgaProfessionalFee",
  cogsSubcontract: "sgaSubcontract",
  cogsOfficeSupplies: "sgaOfficeConsumables",
  cogsPower: "sgaUtilities",
};

/**
 * Try to map an OCR-extracted account name to a DB field key.
 * Returns null if no mapping found.
 */
export function mapAccountName(
  name: string,
  contextSection?: "cogs" | "sga"
): { mappedKey: string; section: string } | null {
  const normalized = name.replace(/\s+/g, "").trim();

  for (const mapping of ACCOUNT_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      if (normalized.includes(pattern) || pattern.includes(normalized)) {
        // If context is SGA and the mapping is for COGS, remap to SGA version
        if (contextSection === "sga" && mapping.section === "cogs") {
          const sgaKey = SGA_OVERRIDE_MAP[mapping.mappedKey];
          if (sgaKey) {
            return { mappedKey: sgaKey, section: "sga" };
          }
        }

        // If context matches or no context, use as-is
        if (!contextSection || mapping.section === contextSection) {
          return { mappedKey: mapping.mappedKey, section: mapping.section };
        }

        // Ambiguous: try SGA override
        if (contextSection === "sga") {
          const sgaKey = SGA_OVERRIDE_MAP[mapping.mappedKey];
          if (sgaKey) return { mappedKey: sgaKey, section: "sga" };
        }

        return { mappedKey: mapping.mappedKey, section: mapping.section };
      }
    }
  }
  return null;
}

/**
 * For waste disposal items that should be summed together
 */
export const WASTE_DISPOSAL_ACCOUNTS = [
  "産業廃棄物処分費", "産廃処分費", "廃棄物処分費",
  "中間処理費", "中間処理",
  "最終処分費", "最終処分",
  "廃棄処理費", "廃棄処理",
];

export function isWasteDisposalAccount(name: string): boolean {
  const normalized = name.replace(/\s+/g, "");
  return WASTE_DISPOSAL_ACCOUNTS.some(w => normalized.includes(w));
}
