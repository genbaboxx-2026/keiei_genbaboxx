/**
 * Mapping from common Japanese account name variations to our DB field keys.
 * Used to normalize OCR-extracted account names.
 */

interface AccountMapping {
  patterns: string[];
  mappedKey: string;
  section: "cogs" | "sga" | "cashout" | "bs_asset" | "bs_liability" | "bs_equity";
}

export const ACCOUNT_MAPPINGS: AccountMapping[] = [
  // === 売上原価 ===
  { patterns: ["給料手当", "給料", "給与手当"], mappedKey: "cogsSalary", section: "cogs" },
  { patterns: ["賞与"], mappedKey: "cogsBonus", section: "cogs" },
  { patterns: ["法定福利費", "法定福利"], mappedKey: "cogsStatutoryWelfare", section: "cogs" },
  { patterns: ["外注加工費", "外注費", "外注工賃"], mappedKey: "cogsSubcontract", section: "cogs" },
  { patterns: ["産業廃棄物処分費", "産廃処分費", "廃棄物処分費", "産廃費"], mappedKey: "cogsWasteDisposal", section: "cogs" },
  { patterns: ["動力費", "動力用水光熱費"], mappedKey: "cogsPower", section: "cogs" },
  { patterns: ["荷造発送費", "荷造運賃"], mappedKey: "cogsShipping", section: "cogs" },
  { patterns: ["旅費交通費", "旅費"], mappedKey: "cogsTravel", section: "cogs" },
  { patterns: ["消耗品費"], mappedKey: "cogsConsumables", section: "cogs" },
  { patterns: ["事務用品費", "事務用消耗品"], mappedKey: "cogsOfficeSupplies", section: "cogs" },
  { patterns: ["修繕費", "修理費"], mappedKey: "cogsRepair", section: "cogs" },
  { patterns: ["水道光熱費"], mappedKey: "cogsUtilities", section: "cogs" },
  { patterns: ["諸会費"], mappedKey: "cogsMembership", section: "cogs" },
  { patterns: ["減価償却費"], mappedKey: "cogsDepreciation", section: "cogs" },
  { patterns: ["租税公課"], mappedKey: "cogsTax", section: "cogs" },
  { patterns: ["保険料"], mappedKey: "cogsInsurance", section: "cogs" },
  { patterns: ["支払報酬", "支払報酬料"], mappedKey: "cogsProfessionalFee", section: "cogs" },
  { patterns: ["リース料"], mappedKey: "cogsLease", section: "cogs" },
  { patterns: ["雑費"], mappedKey: "cogsMisc", section: "cogs" },
  { patterns: ["期末仕掛品棚卸高", "仕掛品"], mappedKey: "wipEnding", section: "cogs" },

  // === 販管費 ===
  { patterns: ["役員報酬"], mappedKey: "sgaExecutiveCompensation", section: "sga" },
  { patterns: ["広告宣伝費", "広告宣伝"], mappedKey: "sgaAdvertising", section: "sga" },
  { patterns: ["接待交際費", "交際費"], mappedKey: "sgaEntertainment", section: "sga" },
  { patterns: ["会議費"], mappedKey: "sgaMeeting", section: "sga" },
  { patterns: ["通信費"], mappedKey: "sgaCommunication", section: "sga" },
  { patterns: ["支払手数料", "手数料"], mappedKey: "sgaCommission", section: "sga" },
  { patterns: ["地代家賃", "賃借料"], mappedKey: "sgaRent", section: "sga" },
  { patterns: ["貸倒引当金繰入", "貸倒引当繰入金"], mappedKey: "sgaBadDebt", section: "sga" },
  { patterns: ["管理費"], mappedKey: "sgaManagement", section: "sga" },
  { patterns: ["福利厚生費"], mappedKey: "sgaWelfare", section: "sga" },
];

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
        // If context section is provided, prefer matching section
        if (contextSection && mapping.section !== contextSection) {
          // For ambiguous items (給料手当, 賞与, etc.), use context
          const ambiguousKeys = ["給料手当", "賞与", "法定福利費", "修繕費", "水道光熱費", "諸会費", "減価償却費", "租税公課", "保険料", "リース料", "雑費", "旅費交通費", "消耗品費", "支払報酬"];
          if (ambiguousKeys.some((k) => normalized.includes(k))) {
            // Map to sga version if context is sga
            if (contextSection === "sga") {
              const sgaKey = "sga" + mapping.mappedKey.replace(/^cogs/, "").charAt(0).toUpperCase() + mapping.mappedKey.replace(/^cogs./, "").slice(1);
              // Check if sgaKey exists in our schema
              const sgaMappings: Record<string, string> = {
                cogsSalary: "sgaSalary", cogsBonus: "sgaBonus",
                cogsStatutoryWelfare: "sgaStatutoryWelfare",
                cogsRepair: "sgaRepair", cogsUtilities: "sgaUtilities",
                cogsMembership: "sgaMembership", cogsDepreciation: "sgaDepreciation",
                cogsTax: "sgaTax", cogsInsurance: "sgaInsurance",
                cogsLease: "sgaLease", cogsMisc: "sgaMisc",
                cogsTravel: "sgaTravel", cogsConsumables: "sgaConsumables",
                cogsProfessionalFee: "sgaProfessionalFee",
                cogsSubcontract: "sgaSubcontract",
              };
              if (sgaMappings[mapping.mappedKey]) {
                return { mappedKey: sgaMappings[mapping.mappedKey], section: "sga" };
              }
            }
            continue; // Skip non-matching section for ambiguous items
          }
        }
        return { mappedKey: mapping.mappedKey, section: mapping.section };
      }
    }
  }
  return null;
}
