import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { getCoefficient, type CurveBracket } from "@/lib/constants/performance-curves";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const fiscalYear = Number(request.nextUrl.searchParams.get("fiscal_year") || new Date().getFullYear());

    const [employees, profiles, curves, financial] = await Promise.all([
      prisma.employee.findMany({ where: { companyId: user.companyId, fiscalYear, deletedAt: null } }),
      prisma.employeeProfile.findMany({ where: { companyId: user.companyId } }),
      prisma.performanceCurve.findMany({ where: { companyId: user.companyId } }),
      prisma.financialStatement.findFirst({ where: { companyId: user.companyId, fiscalYear, dataType: "annual" } }),
    ]);

    const revenue = Number(financial?.revenue || 0n);
    const now = new Date();
    const currentYear = now.getFullYear();
    const profileMap = new Map(profiles.map(p => [p.employeeId, p]));
    const curvesData: CurveBracket[] = curves.map(c => ({ position: c.position, ageFrom: c.ageFrom, ageTo: c.ageTo, coefficient: Number(c.coefficient) }));

    // Employee details with age and coefficient
    const employeeDetails = employees.map(emp => {
      const prof = profileMap.get(emp.id);
      const birthYear = prof?.birthDate ? new Date(prof.birthDate).getFullYear() : null;
      const age = birthYear ? currentYear - birthYear : null;
      const position = prof?.position || "その他";
      const coefficient = age != null ? getCoefficient(curvesData, position, age, prof?.performanceOverride ? Number(prof.performanceOverride) : null) : null;
      const retireAge = prof?.retirementAge || 65;
      const retireYear = birthYear ? birthYear + retireAge : null;

      return {
        id: emp.id, name: emp.nameOrTitle, jobCategory: emp.jobCategory,
        dailyCost: emp.dailyCost, age, position, department: prof?.department || null,
        coefficient, retireYear, retireAge,
        birthDate: prof?.birthDate ? new Date(prof.birthDate).toISOString().slice(0, 10) : null,
      };
    });

    // KPIs
    const totalCount = employeeDetails.length;
    const withAge = employeeDetails.filter(e => e.age != null);
    const avgAge = withAge.length > 0 ? withAge.reduce((s, e) => s + e.age!, 0) / withAge.length : null;
    const totalPower = employeeDetails.reduce((s, e) => s + (e.coefficient || 0), 0);
    const maxPower = totalCount;
    const powerRate = maxPower > 0 ? (totalPower / maxPower) * 100 : 0;
    const revenuePerEmployee = totalCount > 0 ? revenue / totalCount : 0;

    // Power projection (15 years)
    const powerProjection = [];
    const revenuePerPower = totalPower > 0 ? revenue / totalPower : 0;

    for (let y = 0; y <= 15; y++) {
      const projYear = currentYear + y;
      let yearPower = 0;
      let activeCount = 0;

      for (const emp of employeeDetails) {
        if (emp.age == null) continue;
        const futureAge = emp.age + y;
        if (emp.retireYear && projYear >= emp.retireYear) continue; // retired
        const coeff = getCoefficient(curvesData, emp.position, futureAge);
        yearPower += coeff;
        activeCount++;
      }

      // Target revenue with 5% growth
      const targetRevenue = revenue * Math.pow(1.05, y);
      const requiredPower = revenuePerPower > 0 ? targetRevenue / revenuePerPower : 0;

      powerProjection.push({ year: projYear, power: Math.round(yearPower * 100) / 100, activeCount, requiredPower: Math.round(requiredPower * 100) / 100 });
    }

    // Retirement alerts (next 5 years)
    const retirementAlerts = employeeDetails
      .filter(e => e.retireYear && e.retireYear > currentYear && e.retireYear <= currentYear + 5)
      .sort((a, b) => a.retireYear! - b.retireYear!)
      .map(e => ({ name: e.name, year: e.retireYear!, age: e.retireAge, position: e.position, coefficient: e.coefficient }));

    return NextResponse.json({
      kpi: { totalCount, avgAge: avgAge ? Math.round(avgAge * 10) / 10 : null, totalPower: Math.round(totalPower * 10) / 10, maxPower, powerRate: Math.round(powerRate), revenuePerEmployee: Math.round(revenuePerEmployee) },
      employees: employeeDetails,
      powerProjection,
      retirementAlerts,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("GET /api/workforce/dashboard error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } }, { status: 500 });
  }
}
