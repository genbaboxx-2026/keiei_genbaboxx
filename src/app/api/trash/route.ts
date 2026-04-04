import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [deletedEmployees, deletedEquipment] = await Promise.all([
      prisma.employee.findMany({
        where: { companyId: user.companyId, deletedAt: { not: null, gte: thirtyDaysAgo } },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.equipment.findMany({
        where: { companyId: user.companyId, deletedAt: { not: null, gte: thirtyDaysAgo } },
        orderBy: { deletedAt: "desc" },
      }),
    ]);

    const items = [
      ...deletedEmployees.map((e) => ({
        id: e.id, tableName: "employees", name: e.nameOrTitle,
        deletedAt: e.deletedAt, fiscalYear: e.fiscalYear,
      })),
      ...deletedEquipment.map((e) => ({
        id: e.id, tableName: "equipment", name: e.name,
        deletedAt: e.deletedAt, fiscalYear: e.fiscalYear,
      })),
    ].sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());

    return NextResponse.json({ data: items });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } }, { status: 500 });
  }
}
