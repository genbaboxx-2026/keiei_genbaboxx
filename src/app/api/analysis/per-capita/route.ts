import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const fiscalYear = Number(request.nextUrl.searchParams.get("fiscal_year") || new Date().getFullYear());

    const [financial, employees, profiles, attributions] = await Promise.all([
      prisma.financialStatement.findFirst({ where: { companyId: user.companyId, fiscalYear, dataType: "annual" } }),
      prisma.employee.findMany({ where: { companyId: user.companyId, fiscalYear, deletedAt: null } }),
      prisma.employeeProfile.findMany({ where: { companyId: user.companyId } }),
      prisma.revenueAttribution.findMany({ where: { companyId: user.companyId, fiscalYear } }),
    ]);

    const revenue = Number(financial?.revenue || 0n);
    const cogsKeys = ["cogsSalary","cogsBonus","cogsStatutoryWelfare","cogsSubcontract","cogsWasteDisposal","cogsPower","cogsShipping","cogsTravel","cogsConsumables","cogsOfficeSupplies","cogsRepair","cogsUtilities","cogsMembership","cogsDepreciation","cogsTax","cogsInsurance","cogsProfessionalFee","cogsLease","cogsMisc"];
    const cogsTotal = financial ? cogsKeys.reduce((s, k) => s + Number((financial as Record<string, unknown>)[k] || 0n), 0) : 0;
    const grossProfit = revenue - cogsTotal + Number(financial?.wipEnding || 0n);

    const totalCount = employees.length;

    // Job category counts
    const categoryCounts: Record<string, number> = {};
    for (const emp of employees) {
      categoryCounts[emp.jobCategory] = (categoryCounts[emp.jobCategory] || 0) + 1;
    }

    // Profile-based counts
    const profileMap = new Map(profiles.map(p => [p.employeeId, p]));
    let salesCount = 0;
    let constructionCount = 0;
    const deptCounts: Record<string, number> = {};

    for (const emp of employees) {
      const profile = profileMap.get(emp.id);
      if (profile?.position === "営業") salesCount++;
      if (profile?.department === "工事部" || ["operator", "fieldWorker", "driver", "gasCutter"].includes(emp.jobCategory)) {
        constructionCount++;
      }
      const dept = profile?.department || emp.jobCategory;
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    }

    // If no sales profiles, estimate from job categories
    if (salesCount === 0 && categoryCounts["manager"]) {
      salesCount = categoryCounts["manager"];
    }
    if (constructionCount === 0) {
      constructionCount = (categoryCounts["operator"] || 0) + (categoryCounts["fieldWorker"] || 0) + (categoryCounts["driver"] || 0) + (categoryCounts["gasCutter"] || 0);
    }

    // Revenue attribution data
    const attrData = attributions.map(a => {
      const emp = employees.find(e => e.id === a.employeeId);
      return {
        employeeId: a.employeeId,
        name: emp?.nameOrTitle || "不明",
        revenue: Number(a.attributedRevenue),
        grossProfit: Number(a.attributedGrossProfit),
        projectCount: a.projectCount,
      };
    });

    // Dept productivity
    const deptProductivity = Object.entries(deptCounts).map(([dept, count]) => ({
      department: dept,
      headcount: count,
      revenuePerCapita: count > 0 ? Math.round(revenue / count) : 0,
    }));

    return NextResponse.json({
      perCapita: {
        revenuePerEmployee: totalCount > 0 ? Math.round(revenue / totalCount) : 0,
        grossProfitPerEmployee: totalCount > 0 ? Math.round(grossProfit / totalCount) : 0,
        revenuePerFieldWorker: constructionCount > 0 ? Math.round(revenue / constructionCount) : 0,
        revenuePerSales: salesCount > 0 ? Math.round(revenue / salesCount) : 0,
      },
      counts: { total: totalCount, sales: salesCount, construction: constructionCount, byCategory: categoryCounts },
      attributions: attrData,
      deptProductivity,
      hasProfiles: profiles.length > 0,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } }, { status: 500 });
  }
}
