import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { ITEM_KEY_TO_FIELD } from "@/lib/constants/default-cost-classifications";

function serializeBigInt(obj: unknown): unknown {
  return JSON.parse(JSON.stringify(obj, (_k, v) => typeof v === "bigint" ? Number(v) : v));
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const fiscalYear = Number(request.nextUrl.searchParams.get("fiscal_year") || new Date().getFullYear());

    const [financial, prevFinancial, balanceSheet, costMasters, targets, employees, employeeProfiles, classifications, simulation] = await Promise.all([
      prisma.financialStatement.findFirst({ where: { companyId: user.companyId, fiscalYear, dataType: "annual" } }),
      prisma.financialStatement.findFirst({ where: { companyId: user.companyId, fiscalYear: fiscalYear - 1, dataType: "annual" } }),
      prisma.balanceSheet.findFirst({ where: { companyId: user.companyId, fiscalYear } }),
      prisma.costMaster.findMany({ where: { companyId: user.companyId, fiscalYear }, orderBy: [{ category: "asc" }, { subCategory: "asc" }] }),
      prisma.companyTarget.findFirst({ where: { companyId: user.companyId, fiscalYear } }),
      prisma.employee.findMany({ where: { companyId: user.companyId, fiscalYear, deletedAt: null } }),
      prisma.employeeProfile.findMany({ where: { companyId: user.companyId } }),
      prisma.costClassification.findMany({ where: { companyId: user.companyId, fiscalYear } }),
      prisma.simulation.findFirst({ where: { companyId: user.companyId, fiscalYear, name: "5ステップ分析" } }),
    ]);

    // Computed summaries
    const fin = financial ? serializeBigInt(financial) as Record<string, number> : null;
    const prevFin = prevFinancial ? serializeBigInt(prevFinancial) as Record<string, number> : null;
    const bs = balanceSheet ? serializeBigInt(balanceSheet) as Record<string, number> : null;
    const tgt = targets ? serializeBigInt(targets) as Record<string, number | null> : null;

    let cogsTotal = 0, sgaTotal = 0, laborTotal = 0, subcontract = 0, waste = 0, lease = 0;
    let gbCostTotal = 0, nonGbCostTotal = 0;

    if (fin) {
      const cogsFields = ["cogsSalary","cogsBonus","cogsStatutoryWelfare","cogsSubcontract","cogsWasteDisposal","cogsPower","cogsShipping","cogsTravel","cogsConsumables","cogsOfficeSupplies","cogsRepair","cogsUtilities","cogsMembership","cogsDepreciation","cogsTax","cogsInsurance","cogsProfessionalFee","cogsLease","cogsMisc"];
      cogsFields.forEach(f => cogsTotal += (fin[f] || 0));
      laborTotal = (fin.cogsSalary || 0) + (fin.cogsBonus || 0) + (fin.cogsStatutoryWelfare || 0);
      subcontract = fin.cogsSubcontract || 0;
      waste = fin.cogsWasteDisposal || 0;
      lease = fin.cogsLease || 0;

      const sgaFields = ["sgaExecutiveCompensation","sgaSalary","sgaBonus","sgaStatutoryWelfare","sgaWelfare","sgaSubcontract","sgaAdvertising","sgaEntertainment","sgaMeeting","sgaTravel","sgaCommunication","sgaConsumables","sgaOfficeConsumables","sgaRepair","sgaUtilities","sgaMembership","sgaCommission","sgaRent","sgaLease","sgaInsurance","sgaTax","sgaProfessionalFee","sgaDepreciation","sgaBadDebt","sgaManagement","sgaMisc"];
      sgaFields.forEach(f => sgaTotal += (fin[f] || 0));

      // GB cost classification
      for (const cls of classifications) {
        const fieldName = ITEM_KEY_TO_FIELD[cls.itemKey];
        if (!fieldName) continue;
        const val = fin[fieldName] || 0;
        if (cls.isGbCost) gbCostTotal += val; else nonGbCostTotal += val;
      }
    }

    const revenue = fin?.revenue || 0;
    const grossProfit = revenue - cogsTotal + (fin?.wipEnding || 0);
    const grossMarginRate = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const operatingProfit = grossProfit - sgaTotal;
    const operatingMarginRate = revenue > 0 ? (operatingProfit / revenue) * 100 : 0;

    const prevRevenue = prevFin?.revenue || 0;
    const revenueYoY = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null;

    // Employee stats
    const employeeCount = employees.length;
    const revenuePerEmployee = employeeCount > 0 ? revenue / employeeCount : 0;

    // Next retirement
    const now = new Date();
    const currentYear = now.getFullYear();
    let nextRetirement: { name: string; year: number } | null = null;
    for (const emp of employees) {
      const profile = employeeProfiles.find(p => p.employeeId === emp.id);
      if (profile?.birthDate) {
        const birthYear = new Date(profile.birthDate).getFullYear();
        const retireYear = birthYear + (profile.retirementAge || 65);
        if (retireYear > currentYear && (!nextRetirement || retireYear < nextRetirement.year)) {
          nextRetirement = { name: emp.nameOrTitle, year: retireYear };
        }
      }
    }

    // BS indicators
    let bsIndicators = null;
    if (bs) {
      const currentAssets = (bs.cashAndDeposits||0)+(bs.notesReceivable||0)+(bs.accountsReceivable||0)+(bs.inventory||0)+(bs.prepaidExpenses||0)+(bs.currentAssetsOther||0);
      const fixedAssets = (bs.buildings||0)+(bs.machinery||0)+(bs.vehicles||0)+(bs.toolsAndEquipment||0)+(bs.land||0)+(bs.intangibleAssets||0)+(bs.investmentsAndOther||0);
      const totalAssets = currentAssets + fixedAssets;
      const currentLiabilities = (bs.notesPayable||0)+(bs.accountsPayable||0)+(bs.shortTermLoans||0)+(bs.accruedExpenses||0)+(bs.incomeTaxPayable||0)+(bs.currentLiabilitiesOther||0);
      const fixedLiabilities = (bs.longTermLoans||0)+(bs.leaseObligations||0)+(bs.fixedLiabilitiesOther||0);
      const totalLiabilities = currentLiabilities + fixedLiabilities;
      const netAssets = (bs.capitalStock||0)+(bs.capitalSurplus||0)+(bs.retainedEarnings||0)+(bs.netAssetsOther||0);
      const totalDebt = (bs.shortTermLoans||0) + (bs.longTermLoans||0);

      bsIndicators = {
        equityRatio: totalAssets > 0 ? (netAssets / totalAssets) * 100 : 0,
        currentRatio: currentLiabilities > 0 ? (currentAssets / currentLiabilities) * 100 : 0,
        fixedRatio: netAssets > 0 ? (fixedAssets / netAssets) * 100 : 0,
        roe: netAssets > 0 ? (operatingProfit / netAssets) * 100 : 0,
        roa: totalAssets > 0 ? (operatingProfit / totalAssets) * 100 : 0,
        assetTurnover: totalAssets > 0 ? revenue / totalAssets : 0,
        debtRepaymentYears: operatingProfit > 0 ? totalDebt / operatingProfit : 0,
        debtRatio: totalAssets > 0 ? (totalDebt / totalAssets) * 100 : 0,
      };
    }

    return NextResponse.json({
      financial: {
        revenue, grossProfit, grossMarginRate: Math.round(grossMarginRate * 100) / 100,
        operatingProfit, operatingMarginRate: Math.round(operatingMarginRate * 100) / 100,
        cogsTotal, sgaTotal, laborTotal, subcontract, waste, lease,
        otherCogs: cogsTotal - laborTotal - subcontract - waste - lease,
        revenueYoY: revenueYoY != null ? Math.round(revenueYoY * 100) / 100 : null,
        gbCostTotal, nonGbCostTotal,
      },
      targets: tgt,
      costMasters,
      employees: { count: employeeCount, revenuePerEmployee: Math.round(revenuePerEmployee), nextRetirement, profileCount: employeeProfiles.length },
      bsIndicators,
      fiveStepResult: simulation?.resultData || null,
      lastUpdated: financial?.updatedAt || null,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("GET /api/dashboard error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } }, { status: 500 });
  }
}
