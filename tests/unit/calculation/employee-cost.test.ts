import { describe, it, expect } from "vitest";
import { calculateEmployeeCost } from "@/lib/calculation/employee-cost";

describe("calculateEmployeeCost", () => {
  it("工事部長の場合の日割り単価が正しく計算される", () => {
    const result = calculateEmployeeCost(
      {
        monthlyGrossSalary: 755000,
        monthlyHealthInsurance: 42675,
        monthlyPension: 59475,
        monthlyDcPension: 0,
        monthlySafetyFund: 2000,
        monthlyOther: 0,
      },
      {
        annualWorkingDays: 278,
        bonusCount: 0,
      }
    );

    expect(result.monthlySubtotal).toBe(859150);
    expect(result.annualTotal).toBe(859150 * 12);
    expect(result.dailyCost).toBe(37086);
  });

  it("賞与2回の場合、14ヶ月分で計算される", () => {
    const result = calculateEmployeeCost(
      {
        monthlyGrossSalary: 300000,
        monthlyHealthInsurance: 15000,
        monthlyPension: 27000,
        monthlyDcPension: 0,
        monthlySafetyFund: 0,
        monthlyOther: 0,
      },
      {
        annualWorkingDays: 278,
        bonusCount: 2,
      }
    );

    const monthlySubtotal = 342000;
    expect(result.monthlySubtotal).toBe(monthlySubtotal);
    expect(result.annualTotal).toBe(monthlySubtotal * 14);
  });
});
