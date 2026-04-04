import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { DEFAULT_CURVES } from "@/lib/constants/performance-curves";

export async function GET() {
  try {
    const user = await getSessionUser();
    let curves = await prisma.performanceCurve.findMany({ where: { companyId: user.companyId }, orderBy: [{ position: "asc" }, { ageFrom: "asc" }] });

    // Auto-initialize with defaults
    if (curves.length === 0) {
      await prisma.performanceCurve.createMany({
        data: DEFAULT_CURVES.map(c => ({ companyId: user.companyId, position: c.position, ageFrom: c.ageFrom, ageTo: c.ageTo, coefficient: c.coefficient })),
      });
      curves = await prisma.performanceCurve.findMany({ where: { companyId: user.companyId }, orderBy: [{ position: "asc" }, { ageFrom: "asc" }] });
    }

    const serialized = JSON.parse(JSON.stringify(curves, (_k, v) => typeof v === "object" && v !== null && "toFixed" in v ? Number(v) : v));
    return NextResponse.json({ data: serialized });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const items = body.items as { id: string; coefficient: number }[];

    for (const item of items) {
      await prisma.performanceCurve.update({ where: { id: item.id }, data: { coefficient: item.coefficient } });
    }

    return NextResponse.json({ data: { count: items.length } });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "更新に失敗しました" } }, { status: 500 });
  }
}
