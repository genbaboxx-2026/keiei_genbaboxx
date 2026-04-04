import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";

function serializeBigInt(obj: unknown) {
  return JSON.parse(JSON.stringify(obj, (_k, v) => typeof v === "bigint" ? Number(v) : v));
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const type = request.nextUrl.searchParams.get("type");

    const where: Record<string, unknown> = { companyId: user.companyId };
    if (type) where.targetType = type;

    const simulations = await prisma.simulation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, targetType: true, fiscalYear: true, simulationYears: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ data: serializeBigInt(simulations) });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } }, { status: 500 });
  }
}
