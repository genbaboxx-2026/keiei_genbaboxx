import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/db/audit-log";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const fiscalYear = Number(request.nextUrl.searchParams.get("fiscal_year") || new Date().getFullYear());

    const target = await prisma.companyTarget.findFirst({
      where: { companyId: user.companyId, fiscalYear },
    });

    const serialized = target
      ? JSON.parse(JSON.stringify(target, (_k, v) => typeof v === "bigint" ? Number(v) : v))
      : null;

    // Also fetch previous year for comparison
    const prevTarget = await prisma.companyTarget.findFirst({
      where: { companyId: user.companyId, fiscalYear: fiscalYear - 1 },
    });
    const prevSerialized = prevTarget
      ? JSON.parse(JSON.stringify(prevTarget, (_k, v) => typeof v === "bigint" ? Number(v) : v))
      : null;

    // Fetch previous year financials for actuals
    const prevFinancial = await prisma.financialStatement.findFirst({
      where: { companyId: user.companyId, fiscalYear: fiscalYear - 1, dataType: "annual" },
    });
    const prevFinSerialized = prevFinancial
      ? JSON.parse(JSON.stringify(prevFinancial, (_k, v) => typeof v === "bigint" ? Number(v) : v))
      : null;

    return NextResponse.json({ data: serialized, previousYear: prevSerialized, previousFinancials: prevFinSerialized });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const fiscalYear = body.fiscalYear || new Date().getFullYear();

    const existing = await prisma.companyTarget.findFirst({
      where: { companyId: user.companyId, fiscalYear },
    });

    const fields = {
      companyId: user.companyId,
      fiscalYear,
      targetRevenue: body.targetRevenue != null ? BigInt(body.targetRevenue) : null,
      targetGrossMarginRate: body.targetGrossMarginRate ?? null,
      targetOperatingMarginRate: body.targetOperatingMarginRate ?? null,
      targetSubcontractRate: body.targetSubcontractRate ?? null,
      targetWasteRate: body.targetWasteRate ?? null,
      targetLaborRate: body.targetLaborRate ?? null,
      targetEquityRatio: body.targetEquityRatio ?? null,
      targetCurrentRatio: body.targetCurrentRatio ?? null,
      targetRoe: body.targetRoe ?? null,
      targetDebtRepaymentYears: body.targetDebtRepaymentYears ?? null,
    };

    let result;
    if (existing) {
      result = await prisma.companyTarget.update({ where: { id: existing.id }, data: fields });
      await createAuditLog({ companyId: user.companyId, userId: user.id, tableName: "company_targets", recordId: existing.id, action: "update" });
    } else {
      result = await prisma.companyTarget.create({ data: fields });
      await createAuditLog({ companyId: user.companyId, userId: user.id, tableName: "company_targets", recordId: result.id, action: "create" });
    }

    const serialized = JSON.parse(JSON.stringify(result, (_k, v) => typeof v === "bigint" ? Number(v) : v));
    return NextResponse.json({ data: serialized });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/targets error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "保存に失敗しました" } }, { status: 500 });
  }
}
