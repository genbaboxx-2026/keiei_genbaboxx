import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { DEFAULT_CURVES } from "@/lib/constants/performance-curves";

export async function POST() {
  try {
    const user = await getSessionUser();
    await prisma.performanceCurve.deleteMany({ where: { companyId: user.companyId } });
    await prisma.performanceCurve.createMany({
      data: DEFAULT_CURVES.map(c => ({ companyId: user.companyId, position: c.position, ageFrom: c.ageFrom, ageTo: c.ageTo, coefficient: c.coefficient })),
    });
    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "リセットに失敗しました" } }, { status: 500 });
  }
}
