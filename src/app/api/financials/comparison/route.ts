import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";

function serializeBigInt(obj: unknown): Record<string, number> | null {
  if (!obj) return null;
  return JSON.parse(JSON.stringify(obj, (_k, v) => typeof v === "bigint" ? Number(v) : v));
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const sp = request.nextUrl.searchParams;
    const fiscalYear = Number(sp.get("fiscal_year") || new Date().getFullYear());
    const compareYear = Number(sp.get("compare_year") || fiscalYear - 1);

    const [current, compare] = await Promise.all([
      prisma.financialStatement.findFirst({ where: { companyId: user.companyId, fiscalYear, dataType: "annual" } }),
      prisma.financialStatement.findFirst({ where: { companyId: user.companyId, fiscalYear: compareYear, dataType: "annual" } }),
    ]);

    return NextResponse.json({
      current: serializeBigInt(current),
      compare: serializeBigInt(compare),
      fiscalYear,
      compareYear,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } }, { status: 500 });
  }
}
