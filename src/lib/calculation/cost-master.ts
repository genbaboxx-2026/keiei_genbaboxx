interface EmployeeForMaster {
  jobCategory: string;
  dailyCost: number;
}

interface EquipmentForMaster {
  equipmentType: string;
  sizeCategory?: string;
  attachmentType?: string;
  dailyCost: number;
}

export interface CostMasterEntry {
  ownership: "self" | "external";
  category: "labor" | "heavy_machine" | "attachment" | "transport";
  subCategory: string;
  avgDailyCost: number;
  itemCount: number;
}

function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  return items.reduce(
    (acc, item) => {
      const group = String(item[key]);
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

export function aggregateLaborCostMaster(
  employees: EmployeeForMaster[]
): CostMasterEntry[] {
  const grouped = groupBy(employees, "jobCategory");

  return Object.entries(grouped).map(([category, emps]) => ({
    ownership: "self" as const,
    category: "labor" as const,
    subCategory: category,
    avgDailyCost: Math.round(
      emps.reduce((sum, e) => sum + e.dailyCost, 0) / emps.length
    ),
    itemCount: emps.length,
  }));
}

export function aggregateHeavyMachineCostMaster(
  machines: EquipmentForMaster[]
): CostMasterEntry[] {
  const heavyMachines = machines.filter(
    (m) => m.equipmentType === "heavy_machine"
  );
  const grouped = groupBy(heavyMachines, "sizeCategory" as keyof EquipmentForMaster);

  return Object.entries(grouped).map(([size, items]) => ({
    ownership: "self" as const,
    category: "heavy_machine" as const,
    subCategory: size,
    avgDailyCost: Math.round(
      items.reduce((sum, e) => sum + e.dailyCost, 0) / items.length
    ),
    itemCount: items.length,
  }));
}

export function aggregateAttachmentCostMaster(
  attachments: EquipmentForMaster[]
): CostMasterEntry[] {
  const atts = attachments.filter((a) => a.equipmentType === "attachment");
  const results: CostMasterEntry[] = [];

  const grouped: Record<string, EquipmentForMaster[]> = {};
  for (const att of atts) {
    const key = `${att.sizeCategory || "unknown"}_${att.attachmentType || "unknown"}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(att);
  }

  for (const [key, items] of Object.entries(grouped)) {
    results.push({
      ownership: "self",
      category: "attachment",
      subCategory: key,
      avgDailyCost: Math.round(
        items.reduce((sum, e) => sum + e.dailyCost, 0) / items.length
      ),
      itemCount: items.length,
    });
  }

  return results;
}
