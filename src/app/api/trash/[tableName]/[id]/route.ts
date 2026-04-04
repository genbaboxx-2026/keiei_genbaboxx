import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/db/audit-log";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tableName: string; id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { tableName, id } = await params;
    const body = await request.json();
    const action = body.action; // "restore" | "delete_permanent"

    if (tableName === "employees") {
      if (action === "restore") {
        await prisma.employee.update({ where: { id }, data: { deletedAt: null } });
        await createAuditLog({ companyId: user.companyId, userId: user.id, tableName: "employees", recordId: id, action: "update", fieldName: "deletedAt", newValue: "null" });
      } else if (action === "delete_permanent") {
        await prisma.employee.delete({ where: { id } });
        await createAuditLog({ companyId: user.companyId, userId: user.id, tableName: "employees", recordId: id, action: "delete", source: "permanent" });
      }
    } else if (tableName === "equipment") {
      if (action === "restore") {
        await prisma.equipment.update({ where: { id }, data: { deletedAt: null } });
        await createAuditLog({ companyId: user.companyId, userId: user.id, tableName: "equipment", recordId: id, action: "update", fieldName: "deletedAt", newValue: "null" });
      } else if (action === "delete_permanent") {
        await prisma.equipment.delete({ where: { id } });
        await createAuditLog({ companyId: user.companyId, userId: user.id, tableName: "equipment", recordId: id, action: "delete", source: "permanent" });
      }
    }

    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/trash/[tableName]/[id] error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "操作に失敗しました" } }, { status: 500 });
  }
}
