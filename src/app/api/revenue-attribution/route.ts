import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/db/audit-log";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const fiscalYear = Number(request.nextUrl.searchParams.get("fiscal_year") || new Date().getFullYear());
    const data = await prisma.revenueAttribution.findMany({ where: { companyId: user.companyId, fiscalYear } });
    const serialized = JSON.parse(JSON.stringify(data, (_k, v) => typeof v === "bigint" ? Number(v) : v));
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
    const { fiscalYear, items } = body as { fiscalYear: number; items: { employeeId: string; revenue: number; grossProfit: number; projectCount: number }[] };

    // Delete existing and recreate
    await prisma.revenueAttribution.deleteMany({ where: { companyId: user.companyId, fiscalYear } });

    if (items.length > 0) {
      await prisma.revenueAttribution.createMany({
        data: items.map(item => ({
          companyId: user.companyId,
          fiscalYear,
          employeeId: item.employeeId,
          attributedRevenue: BigInt(item.revenue || 0),
          attributedGrossProfit: BigInt(item.grossProfit || 0),
          projectCount: item.projectCount || 0,
        })),
      });
    }

    await createAuditLog({
      companyId: user.companyId, userId: user.id,
      tableName: "revenue_attributions", recordId: `bulk-${fiscalYear}`,
      action: "update", newValue: `${items.length} records`,
    });

    return NextResponse.json({ data: { count: items.length } });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/revenue-attribution error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "保存に失敗しました" } }, { status: 500 });
  }
}
