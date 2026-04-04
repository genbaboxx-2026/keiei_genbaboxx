import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLogs } from "@/lib/db/audit-log";
import { calculateEquipmentDailyCost } from "@/lib/calculation/equipment-cost";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const items = body.items as Record<string, unknown>[];
    const fiscalYear: number = (body.fiscalYear as number) || new Date().getFullYear();

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { annualWorkingDays: true },
    });
    if (!company) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "企業が見つかりません" } }, { status: 404 });
    }

    const auditEntries: {
      companyId: string;
      userId: string;
      tableName: string;
      recordId: string;
      action: "create" | "update" | "delete";
      newValue?: string;
    }[] = [];

    const results = await prisma.$transaction(async (tx) => {
      const saved = [];

      for (const item of items) {
        const eqType = item.equipmentType as string;
        const calc = calculateEquipmentDailyCost(
          {
            equipmentType: eqType as "vehicle" | "heavy_machine" | "attachment",
            insuranceLiability: (item.insuranceLiability as number) || 0,
            insuranceProperty: (item.insuranceProperty as number) || 0,
            insuranceVehicle: (item.insuranceVehicle as number) || 0,
            insuranceCompulsory: (item.insuranceCompulsory as number) || 0,
            vehicleTax: (item.vehicleTax as number) || 0,
            annualInspection: (item.annualInspection as number) || 0,
            repairMaintenance: (item.repairMaintenance as number) || 0,
            depreciationAmount: (item.depreciationAmount as number) || 0,
            leaseAmount: (item.leaseAmount as number) || 0,
          },
          company.annualWorkingDays
        );

        const data = {
          companyId: user.companyId,
          fiscalYear,
          equipmentType: eqType as "vehicle" | "heavy_machine" | "attachment",
          name: item.name as string,
          spec: (item.spec as string) || null,
          sizeCategory: (item.sizeCategory as string) || null,
          attachmentType: (item.attachmentType as string) || null,
          insuranceLiability: (item.insuranceLiability as number) || 0,
          insuranceProperty: (item.insuranceProperty as number) || 0,
          insuranceVehicle: (item.insuranceVehicle as number) || 0,
          insuranceCompulsory: (item.insuranceCompulsory as number) || 0,
          vehicleTax: (item.vehicleTax as number) || 0,
          annualInspection: (item.annualInspection as number) || 0,
          repairMaintenance: (item.repairMaintenance as number) || 0,
          depreciationAmount: (item.depreciationAmount as number) || 0,
          leaseAmount: (item.leaseAmount as number) || 0,
          isLeased: (item.isLeased as boolean) || false,
          isFixedAsset: (item.isFixedAsset as boolean) || false,
          ownershipType: (item.ownershipType as "owned" | "leased" | "rental") || "owned",
          annualTotalCost: calc.annualTotalCost,
          dailyCost: calc.dailyCost,
        };

        if (item._action === "delete" && item.id) {
          await tx.equipment.update({
            where: { id: item.id as string },
            data: { deletedAt: new Date() },
          });
          auditEntries.push({ companyId: user.companyId, userId: user.id, tableName: "equipment", recordId: item.id as string, action: "delete" });
        } else if (item.id) {
          const updated = await tx.equipment.update({ where: { id: item.id as string }, data });
          saved.push(updated);
          auditEntries.push({ companyId: user.companyId, userId: user.id, tableName: "equipment", recordId: item.id as string, action: "update", newValue: JSON.stringify(data) });
        } else {
          const created = await tx.equipment.create({ data });
          saved.push(created);
          auditEntries.push({ companyId: user.companyId, userId: user.id, tableName: "equipment", recordId: created.id, action: "create", newValue: JSON.stringify(data) });
        }
      }
      return saved;
    });

    await createAuditLogs(auditEntries);
    return NextResponse.json({ data: results });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    }
    console.error("POST /api/equipment/bulk error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "一括保存に失敗しました" } }, { status: 500 });
  }
}
