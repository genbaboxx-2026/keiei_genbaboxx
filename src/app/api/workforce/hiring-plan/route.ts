import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { getCoefficient, type CurveBracket } from "@/lib/constants/performance-curves";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const { fiscal_year, simulation_years = 15, growth_rate = 5, ideal_revenue: idealRev, subcontract_ratio = 16.5, salary_growth = 2, hiring_costs: hiringCostsInput } = body;
    const fiscalYear = fiscal_year || new Date().getFullYear();

    const [employees, profiles, curves, financial] = await Promise.all([
      prisma.employee.findMany({ where: { companyId: user.companyId, fiscalYear, deletedAt: null } }),
      prisma.employeeProfile.findMany({ where: { companyId: user.companyId } }),
      prisma.performanceCurve.findMany({ where: { companyId: user.companyId } }),
      prisma.financialStatement.findFirst({ where: { companyId: user.companyId, fiscalYear, dataType: "annual" } }),
    ]);

    const revenue = Number(financial?.revenue || 0n);
    const currentYear = new Date().getFullYear();
    const profileMap = new Map(profiles.map(p => [p.employeeId, p]));
    const curvesData: CurveBracket[] = curves.map(c => ({ position: c.position, ageFrom: c.ageFrom, ageTo: c.ageTo, coefficient: Number(c.coefficient) }));
    const idealRevenuePerPerson = idealRev || 250000000; // 2.5億
    const hiringCosts: Record<string, number> = hiringCostsInput || { "営業": 1500000, "重機オペレーター": 800000, "手元作業員": 400000, "現場管理者": 1500000, "運転手": 400000 };

    const empData = employees.map(emp => {
      const prof = profileMap.get(emp.id);
      const birthYear = prof?.birthDate ? new Date(prof.birthDate).getFullYear() : null;
      return {
        name: emp.nameOrTitle, birthYear, retireAge: prof?.retirementAge || 65,
        position: prof?.position || "その他", dailyCost: emp.dailyCost,
      };
    });

    const rows = [];
    for (let y = 0; y <= simulation_years; y++) {
      const projYear = currentYear + y;
      const targetRevenue = Math.round(revenue * Math.pow(1 + growth_rate / 100, y));

      // Active employees
      let activeCount = 0;
      let totalPower = 0;
      const ages: { name: string; age: number }[] = [];

      for (const emp of empData) {
        if (!emp.birthYear) { activeCount++; continue; }
        const age = projYear - emp.birthYear;
        if (age >= emp.retireAge) continue;
        activeCount++;
        totalPower += getCoefficient(curvesData, emp.position, age);
        ages.push({ name: emp.name, age });
      }

      const revenuePerPerson = activeCount > 0 ? targetRevenue / activeCount : 0;
      const neededCurrent = revenuePerPerson > 0 ? Math.ceil(targetRevenue / revenuePerPerson) : activeCount;
      const neededIdeal = Math.ceil(targetRevenue / idealRevenuePerPerson);

      // Retirements this year
      const retirees = empData.filter(e => e.birthYear && (projYear - e.birthYear) === e.retireAge).length;
      // New hires needed (simplified)
      const hireNeed = Math.max(0, neededIdeal - activeCount);
      const hireCost = hireNeed * (hiringCosts["営業"] || 1000000);

      rows.push({
        year: projYear, targetRevenue, activeCount, totalPower: Math.round(totalPower * 100) / 100,
        revenuePerPerson: Math.round(revenuePerPerson), neededCurrent, idealRevenuePerPerson,
        neededIdeal, retirees, newHires: hireNeed, hiringCost: hireCost, ages,
      });
    }

    const totalHiringCost = rows.reduce((s, r) => s + r.hiringCost, 0);

    return NextResponse.json({ data: { rows, totalHiringCost, hiringCosts } });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/workforce/hiring-plan error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "計算に失敗しました" } }, { status: 500 });
  }
}
