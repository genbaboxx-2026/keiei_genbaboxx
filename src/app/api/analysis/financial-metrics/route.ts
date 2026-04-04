import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";

function computeMetrics(bs: Record<string, number>, fin: Record<string, number>) {
  const currentAssets = (bs.cashAndDeposits||0)+(bs.notesReceivable||0)+(bs.accountsReceivable||0)+(bs.inventory||0)+(bs.prepaidExpenses||0)+(bs.currentAssetsOther||0);
  const fixedAssets = (bs.buildings||0)+(bs.machinery||0)+(bs.vehicles||0)+(bs.toolsAndEquipment||0)+(bs.land||0)+(bs.intangibleAssets||0)+(bs.investmentsAndOther||0);
  const totalAssets = currentAssets + fixedAssets;
  const currentLiabilities = (bs.notesPayable||0)+(bs.accountsPayable||0)+(bs.shortTermLoans||0)+(bs.accruedExpenses||0)+(bs.incomeTaxPayable||0)+(bs.currentLiabilitiesOther||0);
  const fixedLiabilities = (bs.longTermLoans||0)+(bs.leaseObligations||0)+(bs.fixedLiabilitiesOther||0);
  const netAssets = (bs.capitalStock||0)+(bs.capitalSurplus||0)+(bs.retainedEarnings||0)+(bs.netAssetsOther||0);
  const totalDebt = (bs.shortTermLoans||0) + (bs.longTermLoans||0);

  const revenue = fin.revenue || 0;
  const cogsKeys = ["cogsSalary","cogsBonus","cogsStatutoryWelfare","cogsSubcontract","cogsWasteDisposal","cogsPower","cogsShipping","cogsTravel","cogsConsumables","cogsOfficeSupplies","cogsRepair","cogsUtilities","cogsMembership","cogsDepreciation","cogsTax","cogsInsurance","cogsProfessionalFee","cogsLease","cogsMisc"];
  const cogsTotal = cogsKeys.reduce((s, k) => s + (fin[k] || 0), 0);
  const grossProfit = revenue - cogsTotal + (fin.wipEnding || 0);
  const sgaKeys = ["sgaExecutiveCompensation","sgaSalary","sgaBonus","sgaStatutoryWelfare","sgaWelfare","sgaSubcontract","sgaAdvertising","sgaEntertainment","sgaMeeting","sgaTravel","sgaCommunication","sgaConsumables","sgaOfficeConsumables","sgaRepair","sgaUtilities","sgaMembership","sgaCommission","sgaRent","sgaLease","sgaInsurance","sgaTax","sgaProfessionalFee","sgaDepreciation","sgaBadDebt","sgaManagement","sgaMisc"];
  const sgaTotal = sgaKeys.reduce((s, k) => s + (fin[k] || 0), 0);
  const operatingProfit = grossProfit - sgaTotal;
  const depreciation = (fin.cogsDepreciation || 0) + (fin.sgaDepreciation || 0);

  const r = (v: number) => Math.round(v * 100) / 100;
  return {
    equityRatio: totalAssets > 0 ? r((netAssets / totalAssets) * 100) : 0,
    currentRatio: currentLiabilities > 0 ? r((currentAssets / currentLiabilities) * 100) : 0,
    fixedRatio: netAssets > 0 ? r((fixedAssets / netAssets) * 100) : 0,
    roe: netAssets > 0 ? r((operatingProfit / netAssets) * 100) : 0,
    roa: totalAssets > 0 ? r((operatingProfit / totalAssets) * 100) : 0,
    assetTurnover: totalAssets > 0 ? r(revenue / totalAssets) : 0,
    debtRepaymentYears: (operatingProfit + depreciation) > 0 ? r(totalDebt / (operatingProfit + depreciation)) : 0,
    debtRatio: totalAssets > 0 ? r((totalDebt / totalAssets) * 100) : 0,
    // Raw values for display
    totalAssets, currentAssets, fixedAssets, currentLiabilities, fixedLiabilities, netAssets, totalDebt, operatingProfit, depreciation,
  };
}

function serializeBigInt(obj: unknown): Record<string, number> | null {
  if (!obj) return null;
  return JSON.parse(JSON.stringify(obj, (_k, v) => typeof v === "bigint" ? Number(v) : v));
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const fiscalYear = Number(request.nextUrl.searchParams.get("fiscal_year") || new Date().getFullYear());

    const [bs, prevBs, fin, prevFin, targets] = await Promise.all([
      prisma.balanceSheet.findFirst({ where: { companyId: user.companyId, fiscalYear } }),
      prisma.balanceSheet.findFirst({ where: { companyId: user.companyId, fiscalYear: fiscalYear - 1 } }),
      prisma.financialStatement.findFirst({ where: { companyId: user.companyId, fiscalYear, dataType: "annual" } }),
      prisma.financialStatement.findFirst({ where: { companyId: user.companyId, fiscalYear: fiscalYear - 1, dataType: "annual" } }),
      prisma.companyTarget.findFirst({ where: { companyId: user.companyId, fiscalYear } }),
    ]);

    const bsData = serializeBigInt(bs);
    const finData = serializeBigInt(fin);
    const prevBsData = serializeBigInt(prevBs);
    const prevFinData = serializeBigInt(prevFin);
    const tgtData = targets ? JSON.parse(JSON.stringify(targets, (_k, v) => typeof v === "bigint" ? Number(v) : v)) : null;

    const current = bsData && finData ? computeMetrics(bsData, finData) : null;
    const previous = prevBsData && prevFinData ? computeMetrics(prevBsData, prevFinData) : null;

    return NextResponse.json({ current, previous, targets: tgtData, hasBs: !!bs, hasFin: !!fin });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } }, { status: 500 });
  }
}
