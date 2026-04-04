import type { CostBreakdown } from "@/types/financial";
import type { SimulationResult } from "@/types/simulation";

interface CostClassification {
  itemKey: string;
  isGbCost: boolean;
}

interface CogsItem {
  key: string;
  value: number;
}

export function classifyCosts(
  cogsItems: CogsItem[],
  classifications: CostClassification[],
  statutoryWelfareValue: number
): CostBreakdown {
  let gbCost = 0;
  let nonGbCost = 0;

  for (const item of cogsItems) {
    const classification = classifications.find((c) => c.itemKey === item.key);
    if (classification?.isGbCost) {
      gbCost += item.value;
    } else {
      nonGbCost += item.value;
    }
  }

  return {
    gbCost,
    nonGbCost,
    statutoryWelfare: statutoryWelfareValue,
    miscExpenses: nonGbCost - statutoryWelfareValue,
  };
}

interface FiveStepInput {
  revenue: number;
  costBreakdown: CostBreakdown;
  sgaTotal: number;
  cashoutCapex: number;
  cashoutLoanRepayment: number;
  cashoutOther: number;
  targetOperatingProfit: number;
  targetGrossMargin: number;
}

export function runFiveStepAnalysis(input: FiveStepInput): SimulationResult {
  const fixedSga = input.sgaTotal;

  const totalCashout =
    input.cashoutCapex + input.cashoutLoanRepayment + input.cashoutOther;

  const requiredGrossProfit =
    fixedSga + totalCashout + input.targetOperatingProfit;

  const requiredRevenue = Math.round(
    requiredGrossProfit / (input.targetGrossMargin / 100)
  );

  const totalCogs =
    input.costBreakdown.gbCost + input.costBreakdown.nonGbCost;
  const currentGrossProfit = input.revenue - totalCogs;
  const currentGrossMarginRate = (currentGrossProfit / input.revenue) * 100;

  const requiredMarginAtCurrentRevenue =
    (requiredGrossProfit / input.revenue) * 100;

  return {
    fixedSga,
    totalCashout,
    requiredGrossProfit,
    targetGrossMarginRate: input.targetGrossMargin,
    requiredRevenue,
    currentGrossMarginRate,
    requiredMarginAtCurrentRevenue,
    gapToTarget: requiredMarginAtCurrentRevenue - currentGrossMarginRate,
  };
}
