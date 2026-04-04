import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/db/audit-log";
import { DEFAULT_CLASSIFICATIONS } from "@/lib/constants/default-cost-classifications";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const fiscalYear = body.fiscalYear || new Date().getFullYear();

    // Delete existing and recreate with defaults
    await prisma.costClassification.deleteMany({
      where: { companyId: user.companyId, fiscalYear },
    });

    await prisma.costClassification.createMany({
      data: DEFAULT_CLASSIFICATIONS.map((c) => ({
        companyId: user.companyId,
        fiscalYear,
        itemKey: c.itemKey,
        isGbCost: c.isGbCost,
      })),
    });

    await createAuditLog({
      companyId: user.companyId, userId: user.id,
      tableName: "cost_classifications", recordId: `reset-${fiscalYear}`,
      action: "update", newValue: "Reset to defaults", source: "system",
    });

    const classifications = await prisma.costClassification.findMany({
      where: { companyId: user.companyId, fiscalYear },
      orderBy: { itemKey: "asc" },
    });

    return NextResponse.json({ data: classifications });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/cost-classifications/reset error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "リセットに失敗しました" } }, { status: 500 });
  }
}
