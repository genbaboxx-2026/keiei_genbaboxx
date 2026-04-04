import { describe, it, expect } from "vitest";
import { calculateEquipmentDailyCost } from "@/lib/calculation/equipment-cost";

describe("calculateEquipmentDailyCost", () => {
  it("車両の年間コストと日割りが正しく計算される", () => {
    const result = calculateEquipmentDailyCost(
      {
        equipmentType: "vehicle",
        insuranceLiability: 102960,
        insuranceProperty: 0,
        insuranceVehicle: 0,
        insuranceCompulsory: 0,
        vehicleTax: 24600,
        annualInspection: 89050,
        repairMaintenance: 89000,
        depreciationAmount: 0,
        leaseAmount: 0,
      },
      278
    );

    expect(result.annualTotalCost).toBe(305610);
    expect(result.dailyCost).toBe(Math.round(305610 / 278));
  });

  it("重機の計算では車両固有項目を含まない", () => {
    const result = calculateEquipmentDailyCost(
      {
        equipmentType: "heavy_machine",
        insuranceLiability: 100000, // 無視されるべき
        insuranceProperty: 50000,
        repairMaintenance: 200000,
        depreciationAmount: 500000,
        leaseAmount: 0,
      },
      278
    );

    expect(result.annualTotalCost).toBe(750000); // 50000+200000+500000
  });

  it("アタッチメントは償却と修繕のみ", () => {
    const result = calculateEquipmentDailyCost(
      {
        equipmentType: "attachment",
        depreciationAmount: 100000,
        repairMaintenance: 27000,
      },
      278
    );

    expect(result.annualTotalCost).toBe(127000);
  });
});
