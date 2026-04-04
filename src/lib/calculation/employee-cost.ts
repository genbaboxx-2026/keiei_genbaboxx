import type { EmployeeCostInput, EmployeeCalculated } from "@/types/employee";

interface CompanySettings {
  annualWorkingDays: number;
  bonusCount: number;
}

export function calculateEmployeeCost(
  employee: EmployeeCostInput,
  settings: CompanySettings
): EmployeeCalculated {
  const monthlySubtotal =
    employee.monthlyGrossSalary +
    employee.monthlyHealthInsurance +
    employee.monthlyPension +
    employee.monthlyDcPension +
    employee.monthlySafetyFund +
    employee.monthlyOther;

  const annualTotal = monthlySubtotal * (12 + settings.bonusCount);

  const dailyCost = Math.round(annualTotal / settings.annualWorkingDays);

  return { monthlySubtotal, annualTotal, dailyCost };
}
