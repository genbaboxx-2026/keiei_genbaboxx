import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const { fiscal_year, scenarios, save_name } = body;
    const fiscalYear = fiscal_year || new Date().getFullYear();

    const [fin, employees, costMasters] = await Promise.all([
      prisma.financialStatement.findFirst({ where: { companyId: user.companyId, fiscalYear, dataType: "annual" } }),
      prisma.employee.findMany({ where: { companyId: user.companyId, fiscalYear, deletedAt: null } }),
      prisma.costMaster.findMany({ where: { companyId: user.companyId, fiscalYear } }),
    ]);
    if (!fin) return NextResponse.json({ error: { code: "NOT_FOUND", message: "決算データが必要です" } }, { status: 404 });

    const f = JSON.parse(JSON.stringify(fin, (_k, v) => typeof v === "bigint" ? Number(v) : v)) as Record<string, number>;
    const company = await prisma.company.findUnique({ where: { id: user.companyId }, select: { annualWorkingDays: true } });
    const workDays = company?.annualWorkingDays || 278;

    const cogsKeys = ["cogsSalary","cogsBonus","cogsStatutoryWelfare","cogsSubcontract","cogsWasteDisposal","cogsPower","cogsShipping","cogsTravel","cogsConsumables","cogsOfficeSupplies","cogsRepair","cogsUtilities","cogsMembership","cogsDepreciation","cogsTax","cogsInsurance","cogsProfessionalFee","cogsLease","cogsMisc"];
    const sgaKeys = ["sgaExecutiveCompensation","sgaSalary","sgaBonus","sgaStatutoryWelfare","sgaWelfare","sgaSubcontract","sgaAdvertising","sgaEntertainment","sgaMeeting","sgaTravel","sgaCommunication","sgaConsumables","sgaOfficeConsumables","sgaRepair","sgaUtilities","sgaMembership","sgaCommission","sgaRent","sgaLease","sgaInsurance","sgaTax","sgaProfessionalFee","sgaDepreciation","sgaBadDebt","sgaManagement","sgaMisc"];

    const revenue = f.revenue || 0;
    const cogsTotal = cogsKeys.reduce((s, k) => s + (f[k] || 0), 0);
    const sgaTotal = sgaKeys.reduce((s, k) => s + (f[k] || 0), 0);
    const grossProfit = revenue - cogsTotal + (f.wipEnding || 0);
    const operatingProfit = grossProfit - sgaTotal;

    // Apply scenarios
    let adjustedCogs = cogsTotal;
    let adjustedRevenue = revenue;
    const effects: { label: string; amount: number }[] = [];

    for (const sc of (scenarios || [])) {
      if (sc.type === "add_employees") {
        const avgCost = costMasters.find(m => m.category === "labor" && m.subCategory === sc.jobCategory)?.avgDailyCost || 20000;
        const addCost = avgCost * workDays * (sc.count || 1);
        adjustedCogs += addCost;
        effects.push({ label: `人員追加(${sc.count}名)`, amount: addCost });

        if (sc.subcontractReduction) {
          const reduction = Math.round((f.cogsSubcontract || 0) * (sc.subcontractReduction / 100));
          adjustedCogs -= reduction;
          effects.push({ label: `外注費削減(${sc.subcontractReduction}%)`, amount: -reduction });
        }
      } else if (sc.type === "reduce_subcontract") {
        const currentSub = f.cogsSubcontract || 0;
        const targetSub = Math.round(revenue * (sc.targetRate / 100));
        const reduction = currentSub - targetSub;
        const selfCostIncrease = Math.round(reduction * (sc.selfCostRatio || 0.7));
        adjustedCogs -= reduction;
        adjustedCogs += selfCostIncrease;
        effects.push({ label: `外注費削減`, amount: -reduction });
        effects.push({ label: `自社コスト増`, amount: selfCostIncrease });
      } else if (sc.type === "cost_increase") {
        for (const [key, rate] of Object.entries(sc.changes || {})) {
          const fieldMap: Record<string, string> = { waste: "cogsWasteDisposal", fuel: "cogsPower", subcontract: "cogsSubcontract" };
          const field = fieldMap[key];
          if (field) {
            const increase = Math.round((f[field] || 0) * ((rate as number) / 100));
            adjustedCogs += increase;
            effects.push({ label: `${key}上昇(${rate}%)`, amount: increase });
          }
        }
      } else if (sc.type === "custom") {
        for (const [key, value] of Object.entries(sc.changes || {})) {
          const diff = (value as number) - (f[key] || 0);
          if (cogsKeys.includes(key)) adjustedCogs += diff;
          else if (key === "revenue") adjustedRevenue = value as number;
          effects.push({ label: `${key}変更`, amount: diff });
        }
      }
    }

    const adjustedGross = adjustedRevenue - adjustedCogs + (f.wipEnding || 0);
    const adjustedOp = adjustedGross - sgaTotal;
    const netEffect = effects.reduce((s, e) => s + e.amount, 0);

    const result = {
      before: {
        revenue, cogsTotal, grossProfit, sgaTotal, operatingProfit,
        grossMarginRate: revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0,
        operatingMarginRate: revenue > 0 ? Math.round((operatingProfit / revenue) * 10000) / 100 : 0,
      },
      after: {
        revenue: adjustedRevenue, cogsTotal: adjustedCogs, grossProfit: adjustedGross, sgaTotal, operatingProfit: adjustedOp,
        grossMarginRate: adjustedRevenue > 0 ? Math.round((adjustedGross / adjustedRevenue) * 10000) / 100 : 0,
        operatingMarginRate: adjustedRevenue > 0 ? Math.round((adjustedOp / adjustedRevenue) * 10000) / 100 : 0,
      },
      effects,
      netEffect,
    };

    let savedId = null;
    if (save_name) {
      const sim = await prisma.simulation.create({
        data: {
          companyId: user.companyId, fiscalYear, name: save_name,
          targetType: "what_if", simulationYears: 1,
          whatIfParams: { scenarios }, resultData: result,
        },
      });
      savedId = sim.id;
    }

    return NextResponse.json({ data: { ...result, savedId } });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/simulations/what-if error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "シミュレーションに失敗しました" } }, { status: 500 });
  }
}
