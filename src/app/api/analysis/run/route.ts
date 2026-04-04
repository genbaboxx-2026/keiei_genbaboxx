import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { ITEM_KEY_TO_FIELD } from "@/lib/constants/default-cost-classifications";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const { fiscal_year, target_gross_margin, target_operating_profit } = body;
    const fiscalYear = fiscal_year || new Date().getFullYear();

    // 1. Get financial data
    const financial = await prisma.financialStatement.findFirst({
      where: { companyId: user.companyId, fiscalYear, dataType: "annual" },
    });
    if (!financial) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "決算データが見つかりません。先に決算データを入力してください。" } }, { status: 404 });
    }

    // 2. Get cost classifications
    const classifications = await prisma.costClassification.findMany({
      where: { companyId: user.companyId, fiscalYear },
    });

    // 3. Step1: Classify costs
    let gbCostTotal = BigInt(0);
    let nonGbCostTotal = BigInt(0);

    const finData = financial as Record<string, unknown>;
    for (const cls of classifications) {
      const fieldName = ITEM_KEY_TO_FIELD[cls.itemKey];
      if (!fieldName) continue;
      const value = BigInt(finData[fieldName] as bigint || 0n);
      if (cls.isGbCost) {
        gbCostTotal += value;
      } else {
        nonGbCostTotal += value;
      }
    }

    const revenue = Number(financial.revenue);
    const gbCostNum = Number(gbCostTotal);
    const nonGbCostNum = Number(nonGbCostTotal);
    const statutoryWelfare = Number(financial.cogsStatutoryWelfare);
    const miscExpenses = nonGbCostNum - statutoryWelfare;

    const gbCostRatio = revenue > 0 ? (gbCostNum / revenue) * 100 : 0;
    const nonGbCostRatio = revenue > 0 ? (nonGbCostNum / revenue) * 100 : 0;

    // 4. Step2: SGA total
    const sgaFields = [
      "sgaExecutiveCompensation", "sgaSalary", "sgaBonus", "sgaStatutoryWelfare",
      "sgaWelfare", "sgaSubcontract", "sgaAdvertising", "sgaEntertainment",
      "sgaMeeting", "sgaTravel", "sgaCommunication", "sgaConsumables",
      "sgaOfficeConsumables", "sgaRepair", "sgaUtilities", "sgaMembership",
      "sgaCommission", "sgaRent", "sgaLease", "sgaInsurance", "sgaTax",
      "sgaProfessionalFee", "sgaDepreciation", "sgaBadDebt", "sgaManagement", "sgaMisc",
    ];
    let sgaTotal = 0;
    for (const field of sgaFields) {
      sgaTotal += Number(finData[field] as bigint || 0n);
    }

    // 5. Step3: Cashout
    const cashoutCapex = Number(financial.cashoutCapex);
    const cashoutLoanRepayment = Number(financial.cashoutLoanRepayment);
    const cashoutOther = Number(financial.cashoutOther);
    const totalCashout = cashoutCapex + cashoutLoanRepayment + cashoutOther;

    // 6. Step4: Target operating profit
    const targetOperatingProfit = target_operating_profit || 7000000;

    // 7. Step5: Model
    const fixedExpenses = sgaTotal;
    const requiredGrossProfit = fixedExpenses + totalCashout + targetOperatingProfit;
    const targetGrossMargin = target_gross_margin || 20.0;
    const requiredRevenue = Math.round(requiredGrossProfit / (targetGrossMargin / 100));

    const totalCogs = gbCostNum + nonGbCostNum;
    const currentGrossProfit = revenue - totalCogs + Number(financial.wipEnding);
    const currentGrossMarginRate = revenue > 0 ? (currentGrossProfit / revenue) * 100 : 0;
    const requiredMarginAtCurrentRevenue = revenue > 0 ? (requiredGrossProfit / revenue) * 100 : 0;

    const result = {
      step1: {
        gb_cost_total: gbCostNum,
        non_gb_cost_total: nonGbCostNum,
        statutory_welfare: statutoryWelfare,
        misc_expenses: miscExpenses,
        gb_cost_ratio: Math.round(gbCostRatio * 100) / 100,
        non_gb_cost_ratio: Math.round(nonGbCostRatio * 100) / 100,
      },
      step2: {
        sga_total: sgaTotal,
        fixed_expenses: fixedExpenses,
      },
      step3: {
        cashout_capex: cashoutCapex,
        cashout_loan_repayment: cashoutLoanRepayment,
        cashout_other: cashoutOther,
        total_cashout: totalCashout,
      },
      step4: {
        target_operating_profit: targetOperatingProfit,
      },
      step5: {
        required_gross_profit: requiredGrossProfit,
        target_gross_margin_rate: targetGrossMargin,
        required_revenue: requiredRevenue,
        current_gross_margin_rate: Math.round(currentGrossMarginRate * 100) / 100,
        required_margin_at_current_revenue: Math.round(requiredMarginAtCurrentRevenue * 100) / 100,
        current_revenue: revenue,
      },
    };

    // Save to simulations table
    const existing = await prisma.simulation.findFirst({
      where: {
        companyId: user.companyId,
        fiscalYear,
        targetType: "revenue",
        name: "5ステップ分析",
      },
    });

    if (existing) {
      await prisma.simulation.update({
        where: { id: existing.id },
        data: {
          targetGrossMargin: targetGrossMargin,
          targetOperatingProfit: BigInt(targetOperatingProfit),
          resultData: result,
          simulationYears: 1,
        },
      });
    } else {
      await prisma.simulation.create({
        data: {
          companyId: user.companyId,
          fiscalYear,
          name: "5ステップ分析",
          targetType: "revenue",
          targetGrossMargin: targetGrossMargin,
          targetOperatingProfit: BigInt(targetOperatingProfit),
          simulationYears: 1,
          resultData: result,
        },
      });
    }

    return NextResponse.json(result);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/analysis/run error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "分析の実行に失敗しました" } }, { status: 500 });
  }
}
