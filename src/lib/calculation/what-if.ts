export interface WhatIfResult {
  label: string;
  beforeValue: number;
  afterValue: number;
  difference: number;
  percentageChange: number;
}

export function whatIfAddEmployees(
  currentLaborCost: number,
  currentSubcontractCost: number,
  avgDailyCostPerEmployee: number,
  annualWorkingDays: number,
  addCount: number,
  subcontractReductionRate: number
): WhatIfResult[] {
  const additionalAnnualCost =
    avgDailyCostPerEmployee * annualWorkingDays * addCount;
  const subcontractReduction =
    currentSubcontractCost * (subcontractReductionRate / 100);

  return [
    {
      label: "人件費",
      beforeValue: currentLaborCost,
      afterValue: currentLaborCost + additionalAnnualCost,
      difference: additionalAnnualCost,
      percentageChange: (additionalAnnualCost / currentLaborCost) * 100,
    },
    {
      label: "外注費",
      beforeValue: currentSubcontractCost,
      afterValue: currentSubcontractCost - subcontractReduction,
      difference: -subcontractReduction,
      percentageChange: (-subcontractReduction / currentSubcontractCost) * 100,
    },
    {
      label: "ネット効果",
      beforeValue: 0,
      afterValue: subcontractReduction - additionalAnnualCost,
      difference: subcontractReduction - additionalAnnualCost,
      percentageChange: 0,
    },
  ];
}

export function whatIfReduceSubcontract(
  revenue: number,
  currentSubcontractRate: number,
  targetSubcontractRate: number,
  selfCostRatio: number = 0.7
): WhatIfResult[] {
  const currentSubcontract = revenue * (currentSubcontractRate / 100);
  const targetSubcontract = revenue * (targetSubcontractRate / 100);
  const subcontractReduction = currentSubcontract - targetSubcontract;
  const additionalSelfCost = subcontractReduction * selfCostRatio;

  return [
    {
      label: "外注費削減",
      beforeValue: currentSubcontract,
      afterValue: targetSubcontract,
      difference: -subcontractReduction,
      percentageChange:
        (-subcontractReduction / currentSubcontract) * 100,
    },
    {
      label: "自社コスト増",
      beforeValue: 0,
      afterValue: additionalSelfCost,
      difference: additionalSelfCost,
      percentageChange: 0,
    },
    {
      label: "ネット節約",
      beforeValue: 0,
      afterValue: subcontractReduction - additionalSelfCost,
      difference: subcontractReduction - additionalSelfCost,
      percentageChange: 0,
    },
  ];
}
