import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const { fiscal_year, target_type, target_value } = body;
    const fiscalYear = fiscal_year || new Date().getFullYear();

    const fin = await prisma.financialStatement.findFirst({ where: { companyId: user.companyId, fiscalYear, dataType: "annual" } });
    if (!fin) return NextResponse.json({ error: { code: "NOT_FOUND", message: "決算データが必要です" } }, { status: 404 });

    const f = JSON.parse(JSON.stringify(fin, (_k, v) => typeof v === "bigint" ? Number(v) : v)) as Record<string, number>;
    const revenue = f.revenue || 0;

    const cogsKeys = ["cogsSalary","cogsBonus","cogsStatutoryWelfare","cogsSubcontract","cogsWasteDisposal","cogsPower","cogsShipping","cogsTravel","cogsConsumables","cogsOfficeSupplies","cogsRepair","cogsUtilities","cogsMembership","cogsDepreciation","cogsTax","cogsInsurance","cogsProfessionalFee","cogsLease","cogsMisc"];
    const cogsTotal = cogsKeys.reduce((s, k) => s + (f[k] || 0), 0);
    const sgaKeys = ["sgaExecutiveCompensation","sgaSalary","sgaBonus","sgaStatutoryWelfare","sgaWelfare","sgaSubcontract","sgaAdvertising","sgaEntertainment","sgaMeeting","sgaTravel","sgaCommunication","sgaConsumables","sgaOfficeConsumables","sgaRepair","sgaUtilities","sgaMembership","sgaCommission","sgaRent","sgaLease","sgaInsurance","sgaTax","sgaProfessionalFee","sgaDepreciation","sgaBadDebt","sgaManagement","sgaMisc"];
    const sgaTotal = sgaKeys.reduce((s, k) => s + (f[k] || 0), 0);
    const grossProfit = revenue - cogsTotal + (f.wipEnding || 0);
    const operatingProfit = grossProfit - sgaTotal;
    const grossMarginRate = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    const employees = await prisma.employee.findMany({ where: { companyId: user.companyId, fiscalYear, deletedAt: null } });
    const equipment = await prisma.equipment.findMany({ where: { companyId: user.companyId, fiscalYear, deletedAt: null, equipmentType: "heavy_machine" } });
    const employeeCount = employees.length;
    const machineCount = equipment.length;
    const revenuePerEmployee = employeeCount > 0 ? revenue / employeeCount : 0;
    const operatorCount = employees.filter(e => e.jobCategory === "operator").length;
    const machinePerOperator = operatorCount > 0 ? machineCount / operatorCount : 1;

    let result;

    if (target_type === "revenue") {
      // Revenue target reverse calculation
      const targetRevenue = target_value;
      const cogsRatio = revenue > 0 ? cogsTotal / revenue : 0;
      const projectedCogs = Math.round(targetRevenue * cogsRatio);
      const projectedGross = targetRevenue - projectedCogs;
      const projectedOp = projectedGross - sgaTotal;
      const neededEmployees = revenuePerEmployee > 0 ? Math.ceil(targetRevenue / revenuePerEmployee) : employeeCount;
      const neededOperators = Math.ceil(neededEmployees * (operatorCount / Math.max(employeeCount, 1)));
      const neededMachines = Math.ceil(neededOperators * machinePerOperator);

      result = {
        type: "revenue",
        current: { revenue, cogsTotal, grossProfit, sgaTotal, operatingProfit, grossMarginRate: Math.round(grossMarginRate * 100) / 100, employeeCount, machineCount },
        projected: {
          revenue: targetRevenue, cogsTotal: projectedCogs,
          grossProfit: projectedGross, grossMarginRate: targetRevenue > 0 ? Math.round((projectedGross / targetRevenue) * 10000) / 100 : 0,
          sgaTotal, operatingProfit: projectedOp,
          operatingMarginRate: targetRevenue > 0 ? Math.round((projectedOp / targetRevenue) * 10000) / 100 : 0,
          neededEmployees, neededMachines, additionalEmployees: neededEmployees - employeeCount, additionalMachines: neededMachines - machineCount,
        },
      };
    } else {
      // Profit margin target reverse calculation
      const targetGrossMarginRate = target_value;
      const allowableCogs = Math.round(revenue * (1 - targetGrossMarginRate / 100));
      const reductionNeeded = cogsTotal - allowableCogs;
      const costItems = cogsKeys.map(k => ({ key: k, value: f[k] || 0, ratio: revenue > 0 ? ((f[k] || 0) / revenue) * 100 : 0 })).sort((a, b) => b.value - a.value);
      // Proportional reduction
      const targetItems = costItems.map(item => ({
        ...item,
        targetValue: reductionNeeded > 0 ? Math.round(item.value * (allowableCogs / cogsTotal)) : item.value,
        reduction: reductionNeeded > 0 ? Math.round(item.value - item.value * (allowableCogs / cogsTotal)) : 0,
      }));

      result = {
        type: "profit_margin",
        current: { revenue, cogsTotal, grossProfit, grossMarginRate: Math.round(grossMarginRate * 100) / 100, sgaTotal, operatingProfit },
        projected: {
          targetGrossMarginRate, allowableCogs, reductionNeeded: Math.max(reductionNeeded, 0),
          projectedGrossProfit: revenue - allowableCogs, projectedOperatingProfit: revenue - allowableCogs - sgaTotal,
          costItems: targetItems,
        },
      };
    }

    return NextResponse.json({ data: result });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/simulations/target-reverse error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "逆算に失敗しました" } }, { status: 500 });
  }
}
