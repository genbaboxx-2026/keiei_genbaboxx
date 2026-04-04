import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/db/audit-log";
import { DEFAULT_CLASSIFICATIONS } from "@/lib/constants/default-cost-classifications";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const fiscalYear = Number(request.nextUrl.searchParams.get("fiscal_year") || new Date().getFullYear());

    let classifications = await prisma.costClassification.findMany({
      where: { companyId: user.companyId, fiscalYear },
      orderBy: { itemKey: "asc" },
    });

    // Auto-initialize if none exist for this year
    if (classifications.length === 0) {
      await prisma.costClassification.createMany({
        data: DEFAULT_CLASSIFICATIONS.map((c) => ({
          companyId: user.companyId,
          fiscalYear,
          itemKey: c.itemKey,
          isGbCost: c.isGbCost,
        })),
      });
      classifications = await prisma.costClassification.findMany({
        where: { companyId: user.companyId, fiscalYear },
        orderBy: { itemKey: "asc" },
      });
    }

    return NextResponse.json({ data: classifications });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const { fiscalYear, items } = body as { fiscalYear: number; items: { itemKey: string; isGbCost: boolean }[] };

    await prisma.$transaction(
      items.map((item) =>
        prisma.costClassification.updateMany({
          where: { companyId: user.companyId, fiscalYear, itemKey: item.itemKey },
          data: { isGbCost: item.isGbCost },
        })
      )
    );

    await createAuditLog({
      companyId: user.companyId, userId: user.id,
      tableName: "cost_classifications", recordId: `bulk-${fiscalYear}`,
      action: "update", newValue: JSON.stringify(items),
    });

    const updated = await prisma.costClassification.findMany({
      where: { companyId: user.companyId, fiscalYear },
      orderBy: { itemKey: "asc" },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("PUT /api/cost-classifications error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "更新に失敗しました" } }, { status: 500 });
  }
}
