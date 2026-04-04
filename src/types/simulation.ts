export type SimulationTargetType = "revenue" | "profit_margin" | "what_if";

export interface GrowthRates {
  laborCost: number;
  fuelCost: number;
  wasteCost: number;
  subcontractCost: number;
  cpi: number;
  revenueGrowth: number;
}

export interface SimulationInput {
  revenue: number;
  gbCost: number;
  nonGbCost: number;
  sgaTotal: number;
  cashoutCapex: number;
  cashoutLoanRepayment: number;
  cashoutOther: number;
  targetOperatingProfit: number;
  targetGrossMargin: number;
}

export interface SimulationResult {
  fixedSga: number;
  totalCashout: number;
  requiredGrossProfit: number;
  targetGrossMarginRate: number;
  requiredRevenue: number;
  currentGrossMarginRate: number;
  requiredMarginAtCurrentRevenue: number;
  gapToTarget: number;
}

export interface FutureProjection {
  year: number;
  projectedRevenue: number;
  projectedCogsTotal: number;
  projectedSga: number;
  projectedCashout: number;
  projectedGrossProfit: number;
  projectedGrossMarginRate: number;
  projectedOperatingProfit: number;
  projectedOperatingMarginRate: number;
}

export interface WhatIfScenario {
  type:
    | "add_employees"
    | "change_ownership"
    | "reduce_subcontract"
    | "cost_increase"
    | "custom";
  params: Record<string, unknown>;
}
