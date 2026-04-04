import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/db/audit-log";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const fiscalYear = Number(request.nextUrl.searchParams.get("fiscal_year") || new Date().getFullYear());

    const employees = await prisma.employee.findMany({
      where: { companyId: user.companyId, fiscalYear, deletedAt: null },
      include: { profile: true },
      orderBy: { employeeNo: "asc" },
    });

    return NextResponse.json({ data: employees });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } }, { status: 500 });
  }
}
