import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog, diffForAudit, createAuditLogs } from "@/lib/db/audit-log";
import { calculateEquipmentDailyCost } from "@/lib/calculation/equipment-cost";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.equipment.findFirst({
      where: { id, companyId: user.companyId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "設備が見つかりません" } }, { status: 404 });
    }

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { annualWorkingDays: true },
    });

    const eqType = body.equipmentType ?? existing.equipmentType;
    const calc = calculateEquipmentDailyCost(
      {
        equipmentType: eqType,
        insuranceLiability: body.insuranceLiability ?? existing.insuranceLiability ?? 0,
        insuranceProperty: body.insuranceProperty ?? existing.insuranceProperty ?? 0,
        insuranceVehicle: body.insuranceVehicle ?? existing.insuranceVehicle ?? 0,
        insuranceCompulsory: body.insuranceCompulsory ?? existing.insuranceCompulsory ?? 0,
        vehicleTax: body.vehicleTax ?? existing.vehicleTax ?? 0,
        annualInspection: body.annualInspection ?? existing.annualInspection ?? 0,
        repairMaintenance: body.repairMaintenance ?? existing.repairMaintenance ?? 0,
        depreciationAmount: body.depreciationAmount ?? existing.depreciationAmount ?? 0,
        leaseAmount: body.leaseAmount ?? existing.leaseAmount ?? 0,
      },
      company!.annualWorkingDays
    );

    const updated = await prisma.equipment.update({
      where: { id },
      data: {
        ...body,
        annualTotalCost: calc.annualTotalCost,
        dailyCost: calc.dailyCost,
      },
    });

    const auditEntries = diffForAudit(user.companyId, user.id, "equipment", id, existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
    if (auditEntries.length > 0) await createAuditLogs(auditEntries);

    return NextResponse.json({ data: updated });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    }
    console.error("PUT /api/equipment/[id] error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "更新に失敗しました" } }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;

    const existing = await prisma.equipment.findFirst({
      where: { id, companyId: user.companyId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "設備が見つかりません" } }, { status: 404 });
    }

    await prisma.equipment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      tableName: "equipment",
      recordId: id,
      action: "delete",
      oldValue: JSON.stringify(existing),
    });

    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    }
    console.error("DELETE /api/equipment/[id] error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "削除に失敗しました" } }, { status: 500 });
  }
}
