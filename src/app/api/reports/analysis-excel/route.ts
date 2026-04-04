import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { ITEM_KEY_TO_FIELD, DEFAULT_CLASSIFICATIONS } from "@/lib/constants/default-cost-classifications";

function ser(obj: unknown) { return obj ? JSON.parse(JSON.stringify(obj, (_k, v) => typeof v === "bigint" ? Number(v) : v)) : null; }

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const fiscalYear = Number(request.nextUrl.searchParams.get("fiscal_year") || new Date().getFullYear());

    const [fin, bs, masters, classifications, sim, company] = await Promise.all([
      prisma.financialStatement.findFirst({ where: { companyId: user.companyId, fiscalYear, dataType: "annual" } }),
      prisma.balanceSheet.findFirst({ where: { companyId: user.companyId, fiscalYear } }),
      prisma.costMaster.findMany({ where: { companyId: user.companyId, fiscalYear } }),
      prisma.costClassification.findMany({ where: { companyId: user.companyId, fiscalYear } }),
      prisma.simulation.findFirst({ where: { companyId: user.companyId, fiscalYear, name: "5ステップ分析" } }),
      prisma.company.findUnique({ where: { id: user.companyId }, select: { name: true } }),
    ]);

    const wb = XLSX.utils.book_new();
    const f = ser(fin) as Record<string, number> | null;

    // Sheet 1: PL
    if (f) {
      const plRows = [["項目", "金額（円）", "売上比率（%）"]];
      const revenue = f.revenue || 0;
      plRows.push(["売上高", revenue, 100]);
      for (const cls of DEFAULT_CLASSIFICATIONS) {
        const fieldName = ITEM_KEY_TO_FIELD[cls.itemKey];
        const val = f[fieldName] || 0;
        plRows.push([cls.label, val, revenue > 0 ? Math.round((val / revenue) * 10000) / 100 : 0]);
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(plRows), "PL");
    }

    // Sheet 2: BS
    if (bs) {
      const b = ser(bs) as Record<string, number>;
      const bsKeys = ["cashAndDeposits","notesReceivable","accountsReceivable","inventory","prepaidExpenses","currentAssetsOther","buildings","machinery","vehicles","toolsAndEquipment","land","intangibleAssets","investmentsAndOther","notesPayable","accountsPayable","shortTermLoans","accruedExpenses","incomeTaxPayable","currentLiabilitiesOther","longTermLoans","leaseObligations","fixedLiabilitiesOther","capitalStock","capitalSurplus","retainedEarnings","netAssetsOther"];
      const bsRows = [["項目", "金額（円）"]];
      bsKeys.forEach(k => bsRows.push([k, b[k] || 0]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bsRows), "BS");
    }

    // Sheet 3: Cost Masters
    const cmRows = [["カテゴリ", "サブカテゴリ", "平均日額原価（円）", "数量"]];
    masters.forEach(m => cmRows.push([m.category, m.subCategory, m.avgDailyCost, m.itemCount]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cmRows), "コストマスタ");

    // Sheet 4: Five Step
    if (sim?.resultData) {
      const r = sim.resultData as Record<string, Record<string, number>>;
      const fsRows = [["指標", "値"]];
      if (r.step1) { fsRows.push(["GB原価合計", r.step1.gb_cost_total]); fsRows.push(["GB原価比率(%)", r.step1.gb_cost_ratio]); }
      if (r.step2) fsRows.push(["販管費合計", r.step2.sga_total]);
      if (r.step3) fsRows.push(["PL外キャッシュアウト", r.step3.total_cashout]);
      if (r.step5) { fsRows.push(["必要粗利額", r.step5.required_gross_profit]); fsRows.push(["必要売上高", r.step5.required_revenue]); fsRows.push(["現在粗利率(%)", r.step5.current_gross_margin_rate]); }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fsRows), "5ステップ分析");
    }

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `分析データ_${company?.name || "企業"}_${fiscalYear}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("GET /api/reports/analysis-excel error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Excel生成に失敗しました" } }, { status: 500 });
  }
}
