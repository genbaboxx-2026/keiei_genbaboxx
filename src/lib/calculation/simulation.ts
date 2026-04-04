import type { GrowthRates, FutureProjection } from "@/types/simulation";

interface BaseFinancialData {
  fiscalYear: number;
  revenue: number;
  cogsSalary: number;
  cogsBonus: number;
  cogsStatutoryWelfare: number;
  cogsSubcontract: number;
  cogsWasteDisposal: number;
  cogsPower: number;
  cogsTravel: number;
  cogsConsumables: number;
  cogsRepair: number;
  cogsUtilities: number;
  cogsDepreciation: number;
  cogsLease: number;
  cogsOther: number;
  sgaTotal: number;
  cashoutTotal: number;
}

export function projectFutureCosts(
  baseData: BaseFinancialData,
  rates: GrowthRates,
  years: number
): FutureProjection[] {
  const projections: FutureProjection[] = [];

  for (let y = 1; y <= years; y++) {
    const growthFactor = (rate: number) => Math.pow(1 + rate / 100, y);

    // 各コスト項目に変動率を適用
    const projectedSalary = Math.round(
      baseData.cogsSalary * growthFactor(rates.laborCost)
    );
    const projectedBonus = Math.round(
      baseData.cogsBonus * growthFactor(rates.laborCost)
    );
    const projectedWelfare = Math.round(
      baseData.cogsStatutoryWelfare * growthFactor(rates.laborCost)
    );
    const projectedSubcontract = Math.round(
      baseData.cogsSubcontract * growthFactor(rates.subcontractCost)
    );
    const projectedWaste = Math.round(
      baseData.cogsWasteDisposal * growthFactor(rates.wasteCost)
    );
    const projectedPower = Math.round(
      baseData.cogsPower * growthFactor(rates.fuelCost)
    );
    const projectedOther = Math.round(
      (baseData.cogsTravel +
        baseData.cogsConsumables +
        baseData.cogsRepair +
        baseData.cogsUtilities +
        baseData.cogsLease +
        baseData.cogsOther) *
        growthFactor(rates.cpi)
    );
    const projectedDepreciation = baseData.cogsDepreciation; // 固定

    const projectedCogsTotal =
      projectedSalary +
      projectedBonus +
      projectedWelfare +
      projectedSubcontract +
      projectedWaste +
      projectedPower +
      projectedOther +
      projectedDepreciation;

    const projectedRevenue = Math.round(
      baseData.revenue * growthFactor(rates.revenueGrowth)
    );

    const projectedSga = Math.round(
      baseData.sgaTotal * growthFactor(rates.cpi)
    );

    const projectedGrossProfit = projectedRevenue - projectedCogsTotal;
    const projectedOperatingProfit = projectedGrossProfit - projectedSga;

    projections.push({
      year: baseData.fiscalYear + y,
      projectedRevenue,
      projectedCogsTotal,
      projectedSga,
      projectedCashout: baseData.cashoutTotal,
      projectedGrossProfit,
      projectedGrossMarginRate:
        (projectedGrossProfit / projectedRevenue) * 100,
      projectedOperatingProfit,
      projectedOperatingMarginRate:
        (projectedOperatingProfit / projectedRevenue) * 100,
    });
  }

  return projections;
}

export function calculateCAGR(values: number[]): number {
  const n = values.length - 1;
  if (n <= 0) return 0;
  return (Math.pow(values[n] / values[0], 1 / n) - 1) * 100;
}
