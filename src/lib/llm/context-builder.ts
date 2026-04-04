import { prisma } from "@/lib/db/prisma";
import { ITEM_KEY_TO_FIELD } from "@/lib/constants/default-cost-classifications";
import { getCoefficient, type CurveBracket } from "@/lib/constants/performance-curves";

export type ContextScope = "financials" | "cost_masters" | "analysis" | "simulations" | "workforce" | "targets";

export interface LlmContext {
  company: { name: string; industrySubType: string; annualWorkingDays: number; employeeCount: number };
  financialSummary?: {
    fiscalYear: number; revenue: string; cogsTotal: string;
    cogsBreakdown: { laborCost: string; subcontractCost: string; wasteDisposalCost: string; otherCogs: string };
    grossProfit: string; grossMarginRate: string; sgaTotal: string;
    operatingProfit: string; operatingMarginRate: string;
  };
  costMasterSummary?: { laborCosts: { category: string; avgDailyCost: string; count: number }[]; machineCosts: { size: string; avgDailyCost: string; count: number }[] };
  analysisResult?: { gbCostTotal: string; gbCostRatio: string; fixedExpenses: string; requiredGrossProfit: string; currentGrossMarginRate: string; requiredMarginAtCurrentRevenue: string };
  simulationSummary?: string;
  workforceSummary?: { totalCount: number; avgAge: string; totalPower: string; powerRate: string; revenuePerEmployee: string; retirementAlerts: string[] };
  targets?: { targetRevenue: string; targetGrossMarginRate: string; targetOperatingMarginRate: string };
}

function yen(v: number): string { return v >= 100000000 ? `${(v / 100000000).toFixed(2)}億円` : v >= 10000 ? `${(v / 10000).toFixed(0)}万円` : `${v}円`; }
function pct(v: number): string { return `${v.toFixed(2)}%`; }

export async function buildLlmContext(companyId: string, fiscalYear: number, scope: ContextScope[]): Promise<LlmContext> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const employees = await prisma.employee.findMany({ where: { companyId, fiscalYear, deletedAt: null } });

  const ctx: LlmContext = {
    company: { name: company?.name || "", industrySubType: company?.industrySubType || "解体業", annualWorkingDays: company?.annualWorkingDays || 278, employeeCount: employees.length },
  };

  if (scope.includes("financials")) {
    const fin = await prisma.financialStatement.findFirst({ where: { companyId, fiscalYear, dataType: "annual" } });
    if (fin) {
      const f = JSON.parse(JSON.stringify(fin, (_k, v) => typeof v === "bigint" ? Number(v) : v)) as Record<string, number>;
      const cogsKeys = ["cogsSalary","cogsBonus","cogsStatutoryWelfare","cogsSubcontract","cogsWasteDisposal","cogsPower","cogsShipping","cogsTravel","cogsConsumables","cogsOfficeSupplies","cogsRepair","cogsUtilities","cogsMembership","cogsDepreciation","cogsTax","cogsInsurance","cogsProfessionalFee","cogsLease","cogsMisc"];
      const sgaKeys = ["sgaExecutiveCompensation","sgaSalary","sgaBonus","sgaStatutoryWelfare","sgaWelfare","sgaSubcontract","sgaAdvertising","sgaEntertainment","sgaMeeting","sgaTravel","sgaCommunication","sgaConsumables","sgaOfficeConsumables","sgaRepair","sgaUtilities","sgaMembership","sgaCommission","sgaRent","sgaLease","sgaInsurance","sgaTax","sgaProfessionalFee","sgaDepreciation","sgaBadDebt","sgaManagement","sgaMisc"];
      const revenue = f.revenue || 0;
      const cogsTotal = cogsKeys.reduce((s, k) => s + (f[k] || 0), 0);
      const labor = (f.cogsSalary || 0) + (f.cogsBonus || 0) + (f.cogsStatutoryWelfare || 0);
      const sgaTotal = sgaKeys.reduce((s, k) => s + (f[k] || 0), 0);
      const grossProfit = revenue - cogsTotal + (f.wipEnding || 0);
      const opProfit = grossProfit - sgaTotal;

      ctx.financialSummary = {
        fiscalYear, revenue: yen(revenue), cogsTotal: yen(cogsTotal),
        cogsBreakdown: { laborCost: yen(labor), subcontractCost: yen(f.cogsSubcontract || 0), wasteDisposalCost: yen(f.cogsWasteDisposal || 0), otherCogs: yen(cogsTotal - labor - (f.cogsSubcontract || 0) - (f.cogsWasteDisposal || 0)) },
        grossProfit: yen(grossProfit), grossMarginRate: pct(revenue > 0 ? (grossProfit / revenue) * 100 : 0),
        sgaTotal: yen(sgaTotal), operatingProfit: yen(opProfit), operatingMarginRate: pct(revenue > 0 ? (opProfit / revenue) * 100 : 0),
      };
    }
  }

  if (scope.includes("cost_masters")) {
    const masters = await prisma.costMaster.findMany({ where: { companyId, fiscalYear } });
    ctx.costMasterSummary = {
      laborCosts: masters.filter(m => m.category === "labor").map(m => ({ category: m.subCategory, avgDailyCost: `¥${m.avgDailyCost.toLocaleString()}`, count: m.itemCount })),
      machineCosts: masters.filter(m => m.category === "heavy_machine").map(m => ({ size: m.subCategory, avgDailyCost: `¥${m.avgDailyCost.toLocaleString()}`, count: m.itemCount })),
    };
  }

  if (scope.includes("analysis")) {
    const sim = await prisma.simulation.findFirst({ where: { companyId, fiscalYear, name: "5ステップ分析" } });
    if (sim?.resultData) {
      const r = sim.resultData as Record<string, Record<string, number>>;
      if (r.step1 && r.step5) {
        ctx.analysisResult = {
          gbCostTotal: yen(r.step1.gb_cost_total), gbCostRatio: pct(r.step1.gb_cost_ratio),
          fixedExpenses: yen(r.step2?.fixed_expenses || 0), requiredGrossProfit: yen(r.step5.required_gross_profit),
          currentGrossMarginRate: pct(r.step5.current_gross_margin_rate), requiredMarginAtCurrentRevenue: pct(r.step5.required_margin_at_current_revenue),
        };
      }
    }
  }

  if (scope.includes("simulations")) {
    const sims = await prisma.simulation.findMany({ where: { companyId, fiscalYear }, orderBy: { createdAt: "desc" }, take: 3 });
    if (sims.length > 0) {
      ctx.simulationSummary = sims.map(s => `${s.name}(${s.targetType})`).join(", ");
    }
  }

  if (scope.includes("workforce")) {
    const profiles = await prisma.employeeProfile.findMany({ where: { companyId } });
    const curves = await prisma.performanceCurve.findMany({ where: { companyId } });
    const curvesData: CurveBracket[] = curves.map(c => ({ position: c.position, ageFrom: c.ageFrom, ageTo: c.ageTo, coefficient: Number(c.coefficient) }));
    const profileMap = new Map(profiles.map(p => [p.employeeId, p]));
    const currentYear = new Date().getFullYear();
    const revenue = Number((await prisma.financialStatement.findFirst({ where: { companyId, fiscalYear, dataType: "annual" }, select: { revenue: true } }))?.revenue || 0n);

    let totalPower = 0; let ageSum = 0; let ageCount = 0;
    const alerts: string[] = [];
    for (const emp of employees) {
      const prof = profileMap.get(emp.id);
      if (prof?.birthDate) {
        const age = currentYear - new Date(prof.birthDate).getFullYear();
        ageSum += age; ageCount++;
        const coeff = getCoefficient(curvesData, prof.position || "その他", age, prof.performanceOverride ? Number(prof.performanceOverride) : null);
        totalPower += coeff;
        const retireYear = new Date(prof.birthDate).getFullYear() + (prof.retirementAge || 65);
        if (retireYear > currentYear && retireYear <= currentYear + 5) {
          alerts.push(`${emp.nameOrTitle}(${prof.position || emp.jobCategory})が${retireYear}年に退職予定(${age}歳)`);
        }
      }
    }

    ctx.workforceSummary = {
      totalCount: employees.length,
      avgAge: ageCount > 0 ? `${(ageSum / ageCount).toFixed(1)}歳` : "不明",
      totalPower: `${totalPower.toFixed(1)}/${employees.length}`,
      powerRate: employees.length > 0 ? pct((totalPower / employees.length) * 100) : "0%",
      revenuePerEmployee: employees.length > 0 ? yen(revenue / employees.length) : "0",
      retirementAlerts: alerts,
    };
  }

  if (scope.includes("targets")) {
    const tgt = await prisma.companyTarget.findFirst({ where: { companyId, fiscalYear } });
    if (tgt) {
      const t = JSON.parse(JSON.stringify(tgt, (_k, v) => typeof v === "bigint" ? Number(v) : v)) as Record<string, number | null>;
      ctx.targets = {
        targetRevenue: t.targetRevenue != null ? yen(t.targetRevenue) : "未設定",
        targetGrossMarginRate: t.targetGrossMarginRate != null ? `${t.targetGrossMarginRate}%` : "未設定",
        targetOperatingMarginRate: t.targetOperatingMarginRate != null ? `${t.targetOperatingMarginRate}%` : "未設定",
      };
    }
  }

  return ctx;
}
