import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const { fiscal_year, simulation_years, growth_rates, save_name } = body;
    const fiscalYear = fiscal_year || new Date().getFullYear();
    const years = simulation_years || 5;

    const fin = await prisma.financialStatement.findFirst({
      where: { companyId: user.companyId, fiscalYear, dataType: "annual" },
    });
    if (!fin) return NextResponse.json({ error: { code: "NOT_FOUND", message: "決算データが必要です" } }, { status: 404 });

    const f = JSON.parse(JSON.stringify(fin, (_k, v) => typeof v === "bigint" ? Number(v) : v)) as Record<string, number>;
    const rates = growth_rates || { laborCost: 2.5, fuelCost: 3.0, wasteCost: 4.0, subcontractCost: 2.0, cpi: 2.0, revenueGrowth: 5.0 };

    const projections = [];
    for (let y = 0; y <= years; y++) {
      const gf = (rate: number) => Math.pow(1 + rate / 100, y);

      const revenue = Math.round(f.revenue * gf(rates.revenueGrowth));
      const cogsSalary = Math.round((f.cogsSalary || 0) * gf(rates.laborCost));
      const cogsBonus = Math.round((f.cogsBonus || 0) * gf(rates.laborCost));
      const cogsWelfare = Math.round((f.cogsStatutoryWelfare || 0) * gf(rates.laborCost));
      const cogsSubcontract = Math.round((f.cogsSubcontract || 0) * gf(rates.subcontractCost));
      const cogsWaste = Math.round((f.cogsWasteDisposal || 0) * gf(rates.wasteCost));
      const cogsPower = Math.round((f.cogsPower || 0) * gf(rates.fuelCost));
      const cogsDepreciation = f.cogsDepreciation || 0;
      const cogsOther = Math.round(
        ((f.cogsShipping||0) + (f.cogsTravel||0) + (f.cogsConsumables||0) + (f.cogsOfficeSupplies||0) +
        (f.cogsRepair||0) + (f.cogsUtilities||0) + (f.cogsMembership||0) + (f.cogsTax||0) +
        (f.cogsInsurance||0) + (f.cogsProfessionalFee||0) + (f.cogsLease||0) + (f.cogsMisc||0)) * gf(rates.cpi)
      );

      const cogsTotal = cogsSalary + cogsBonus + cogsWelfare + cogsSubcontract + cogsWaste + cogsPower + cogsDepreciation + cogsOther;

      const sgaKeys = ["sgaExecutiveCompensation","sgaSalary","sgaBonus","sgaStatutoryWelfare","sgaWelfare","sgaSubcontract","sgaAdvertising","sgaEntertainment","sgaMeeting","sgaTravel","sgaCommunication","sgaConsumables","sgaOfficeConsumables","sgaRepair","sgaUtilities","sgaMembership","sgaCommission","sgaRent","sgaLease","sgaInsurance","sgaTax","sgaProfessionalFee","sgaDepreciation","sgaBadDebt","sgaManagement","sgaMisc"];
      const baseSga = sgaKeys.reduce((s, k) => s + (f[k] || 0), 0);
      const sgaTotal = Math.round(baseSga * gf(rates.cpi));

      const grossProfit = revenue - cogsTotal + (y === 0 ? (f.wipEnding || 0) : 0);
      const operatingProfit = grossProfit - sgaTotal;

      projections.push({
        year: fiscalYear + y,
        revenue, cogsTotal, grossProfit, sgaTotal, operatingProfit,
        cogsRatio: revenue > 0 ? Math.round((cogsTotal / revenue) * 10000) / 100 : 0,
        grossMarginRate: revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0,
        operatingMarginRate: revenue > 0 ? Math.round((operatingProfit / revenue) * 10000) / 100 : 0,
      });
    }

    // Save if name provided
    let savedId = null;
    if (save_name) {
      const sim = await prisma.simulation.create({
        data: {
          companyId: user.companyId, fiscalYear, name: save_name,
          targetType: "revenue", simulationYears: years,
          laborCostGrowthRate: rates.laborCost, fuelCostGrowthRate: rates.fuelCost,
          wasteCostGrowthRate: rates.wasteCost, subcontractGrowthRate: rates.subcontractCost,
          cpiGrowthRate: rates.cpi, resultData: { projections, growthRates: rates },
        },
      });
      savedId = sim.id;
    }

    return NextResponse.json({ data: { projections, savedId } });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/simulations/future-projection error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "シミュレーションに失敗しました" } }, { status: 500 });
  }
}
