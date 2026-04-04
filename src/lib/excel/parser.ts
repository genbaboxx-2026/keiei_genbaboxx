import * as XLSX from "xlsx";

const JOB_CATEGORY_MAP: Record<string, string> = {
  "責任者": "manager", "オペレーター": "operator", "手元": "fieldWorker",
  "運転手": "driver", "ガス工": "gasCutter", "その他": "other",
};

export interface ParsedEmployee {
  employeeNo: number;
  nameOrTitle: string;
  jobCategory: string;
  monthlyGrossSalary: number;
  monthlyHealthInsurance: number;
  monthlyPension: number;
  monthlyDcPension: number;
  monthlySafetyFund: number;
  monthlyOther: number;
  _errors: string[];
}

export function parseEmployeeExcel(buffer: ArrayBuffer): ParsedEmployee[] {
  const wb = XLSX.read(buffer);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 }) as unknown[][];

  if (rows.length < 2) return [];

  const results: ParsedEmployee[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[0]) continue;

    const errors: string[] = [];
    const no = Number(row[0]) || i;
    const name = String(row[1] || "");
    if (!name) errors.push("名前が空です");

    const jobRaw = String(row[2] || "その他");
    const jobCategory = JOB_CATEGORY_MAP[jobRaw] || "other";

    results.push({
      employeeNo: no,
      nameOrTitle: name,
      jobCategory,
      monthlyGrossSalary: Number(row[3]) || 0,
      monthlyHealthInsurance: Number(row[4]) || 0,
      monthlyPension: Number(row[5]) || 0,
      monthlyDcPension: Number(row[6]) || 0,
      monthlySafetyFund: Number(row[7]) || 0,
      monthlyOther: Number(row[8]) || 0,
      _errors: errors,
    });
  }
  return results;
}

export interface ParsedEquipment {
  equipmentType: string;
  name: string;
  spec: string;
  sizeCategory: string;
  attachmentType: string;
  insuranceLiability: number;
  insuranceProperty: number;
  insuranceVehicle: number;
  insuranceCompulsory: number;
  vehicleTax: number;
  annualInspection: number;
  repairMaintenance: number;
  depreciationAmount: number;
  leaseAmount: number;
  isLeased: boolean;
  isFixedAsset: boolean;
  _errors: string[];
}

export function parseEquipmentExcel(buffer: ArrayBuffer): ParsedEquipment[] {
  const wb = XLSX.read(buffer);
  const results: ParsedEquipment[] = [];

  // Parse each sheet
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 }) as unknown[][];
    if (rows.length < 2) continue;

    let eqType = "vehicle";
    if (sheetName.includes("重機")) eqType = "heavy_machine";
    else if (sheetName.includes("アタッチメント")) eqType = "attachment";

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row[0]) continue;

      if (eqType === "vehicle") {
        results.push({
          equipmentType: "vehicle", name: String(row[0] || ""), spec: String(row[1] || ""),
          sizeCategory: "", attachmentType: "",
          insuranceLiability: Number(row[2]) || 0, insuranceProperty: Number(row[3]) || 0,
          insuranceVehicle: Number(row[4]) || 0, insuranceCompulsory: Number(row[5]) || 0,
          vehicleTax: Number(row[6]) || 0, annualInspection: Number(row[7]) || 0,
          repairMaintenance: Number(row[8]) || 0, depreciationAmount: Number(row[9]) || 0,
          leaseAmount: Number(row[10]) || 0,
          isLeased: String(row[11] || "").includes("はい"), isFixedAsset: String(row[12] || "").includes("はい"),
          _errors: [],
        });
      } else if (eqType === "heavy_machine") {
        results.push({
          equipmentType: "heavy_machine", name: String(row[0] || ""), sizeCategory: String(row[1] || ""),
          spec: String(row[2] || ""), attachmentType: "",
          insuranceLiability: 0, insuranceProperty: Number(row[3]) || 0,
          insuranceVehicle: 0, insuranceCompulsory: 0, vehicleTax: 0, annualInspection: 0,
          repairMaintenance: Number(row[4]) || 0, depreciationAmount: Number(row[5]) || 0,
          leaseAmount: Number(row[6]) || 0,
          isLeased: String(row[7] || "").includes("はい"), isFixedAsset: String(row[8] || "").includes("はい"),
          _errors: [],
        });
      } else {
        results.push({
          equipmentType: "attachment", name: String(row[2] || ""), sizeCategory: String(row[0] || ""),
          attachmentType: String(row[1] || ""), spec: String(row[3] || ""),
          insuranceLiability: 0, insuranceProperty: 0, insuranceVehicle: 0,
          insuranceCompulsory: 0, vehicleTax: 0, annualInspection: 0,
          repairMaintenance: Number(row[4]) || 0, depreciationAmount: Number(row[5]) || 0,
          leaseAmount: 0, isLeased: false, isFixedAsset: false, _errors: [],
        });
      }
    }
  }
  return results;
}
