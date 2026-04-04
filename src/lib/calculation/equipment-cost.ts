import type { EquipmentType } from "@/types/equipment";

interface EquipmentCostInput {
  equipmentType: EquipmentType;
  insuranceLiability?: number;
  insuranceProperty?: number;
  insuranceVehicle?: number;
  insuranceCompulsory?: number;
  vehicleTax?: number;
  annualInspection?: number;
  repairMaintenance?: number;
  depreciationAmount?: number;
  leaseAmount?: number;
}

export function calculateEquipmentDailyCost(
  equipment: EquipmentCostInput,
  annualWorkingDays: number
): { annualTotalCost: number; dailyCost: number } {
  let annualCost = 0;

  switch (equipment.equipmentType) {
    case "vehicle":
      annualCost =
        (equipment.insuranceLiability || 0) +
        (equipment.insuranceProperty || 0) +
        (equipment.insuranceVehicle || 0) +
        (equipment.insuranceCompulsory || 0) +
        (equipment.vehicleTax || 0) +
        (equipment.annualInspection || 0) +
        (equipment.repairMaintenance || 0) +
        (equipment.depreciationAmount || 0) +
        (equipment.leaseAmount || 0);
      break;

    case "heavy_machine":
      annualCost =
        (equipment.insuranceProperty || 0) +
        (equipment.repairMaintenance || 0) +
        (equipment.depreciationAmount || 0) +
        (equipment.leaseAmount || 0);
      break;

    case "attachment":
      annualCost =
        (equipment.depreciationAmount || 0) +
        (equipment.repairMaintenance || 0);
      break;
  }

  return {
    annualTotalCost: annualCost,
    dailyCost: Math.round(annualCost / annualWorkingDays),
  };
}
