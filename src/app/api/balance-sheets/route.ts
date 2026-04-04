import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/db/audit-log";

const BS_FIELDS = [
  "cashAndDeposits","notesReceivable","accountsReceivable","inventory","prepaidExpenses","currentAssetsOther",
  "buildings","machinery","vehicles","toolsAndEquipment","land","intangibleAssets","investmentsAndOther",
  "notesPayable","accountsPayable","shortTermLoans","accruedExpenses","incomeTaxPayable","currentLiabilitiesOther",
  "longTermLoans","leaseObligations","fixedLiabilitiesOther",
  "capitalStock","capitalSurplus","retainedEarnings","netAssetsOther",
] as const;

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const fiscalYear = Number(request.nextUrl.searchParams.get("fiscal_year") || new Date().getFullYear());
    const data = await prisma.balanceSheet.findFirst({
      where: { companyId: user.companyId, fiscalYear },
    });
    const serialized = data ? JSON.parse(JSON.stringify(data, (_k, v) => typeof v === "bigint" ? Number(v) : v)) : null;
    return NextResponse.json({ data: serialized });
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

    const fields: Record<string, unknown> = { companyId: user.companyId, fiscalYear };
    for (const key of BS_FIELDS) {
      fields[key] = BigInt(body[key] || 0);
    }

    const existing = await prisma.balanceSheet.findFirst({
      where: { companyId: user.companyId, fiscalYear },
    });

    let result;
    if (existing) {
      result = await prisma.balanceSheet.update({ where: { id: existing.id }, data: fields });
      await createAuditLog({ companyId: user.companyId, userId: user.id, tableName: "balance_sheets", recordId: existing.id, action: "update" });
    } else {
      result = await prisma.balanceSheet.create({ data: fields as Parameters<typeof prisma.balanceSheet.create>[0]["data"] });
      await createAuditLog({ companyId: user.companyId, userId: user.id, tableName: "balance_sheets", recordId: result.id, action: "create" });
    }

    const serialized = JSON.parse(JSON.stringify(result, (_k, v) => typeof v === "bigint" ? Number(v) : v));
    return NextResponse.json({ data: serialized });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/balance-sheets error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "保存に失敗しました" } }, { status: 500 });
  }
}
