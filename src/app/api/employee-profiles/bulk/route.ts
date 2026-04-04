import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/db/audit-log";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const items = body.items as { employeeId: string; birthDate?: string; hireDate?: string; department?: string; position?: string; retirementAge?: number; performanceOverride?: number | null; notes?: string }[];

    for (const item of items) {
      const existing = await prisma.employeeProfile.findUnique({ where: { employeeId: item.employeeId } });

      const data = {
        companyId: user.companyId,
        employeeId: item.employeeId,
        birthDate: item.birthDate ? new Date(item.birthDate) : null,
        hireDate: item.hireDate ? new Date(item.hireDate) : null,
        department: item.department || null,
        position: item.position || null,
        retirementAge: item.retirementAge || 65,
        performanceOverride: item.performanceOverride != null ? item.performanceOverride : null,
        notes: item.notes || null,
      };

      if (existing) {
        await prisma.employeeProfile.update({ where: { id: existing.id }, data });
      } else {
        await prisma.employeeProfile.create({ data });
      }
    }

    await createAuditLog({ companyId: user.companyId, userId: user.id, tableName: "employee_profiles", recordId: `bulk-${items.length}`, action: "update" });

    return NextResponse.json({ data: { count: items.length } });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/employee-profiles/bulk error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "保存に失敗しました" } }, { status: 500 });
  }
}
