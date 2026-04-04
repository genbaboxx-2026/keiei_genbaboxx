import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/db/audit-log";
import { calculateEquipmentDailyCost } from "@/lib/calculation/equipment-cost";
import type { EquipmentType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const searchParams = request.nextUrl.searchParams;
    const fiscalYear = Number(searchParams.get("fiscal_year") || new Date().getFullYear());
    const type = searchParams.get("type") as EquipmentType | null;

    const where: Record<string, unknown> = {
      companyId: user.companyId,
      fiscalYear,
      deletedAt: null,
    };
    if (type) where.equipmentType = type;

    const equipment = await prisma.equipment.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { annualWorkingDays: true },
    });

    return NextResponse.json({ data: equipment, settings: company });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    }
    console.error("GET /api/equipment error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await request.json();

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { annualWorkingDays: true },
    });
    if (!company) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "企業が見つかりません" } }, { status: 404 });
    }

    const calc = calculateEquipmentDailyCost(
      {
        equipmentType: body.equipmentType,
        insuranceLiability: body.insuranceLiability || 0,
        insuranceProperty: body.insuranceProperty || 0,
        insuranceVehicle: body.insuranceVehicle || 0,
        insuranceCompulsory: body.insuranceCompulsory || 0,
        vehicleTax: body.vehicleTax || 0,
        annualInspection: body.annualInspection || 0,
        repairMaintenance: body.repairMaintenance || 0,
        depreciationAmount: body.depreciationAmount || 0,
        leaseAmount: body.leaseAmount || 0,
      },
      company.annualWorkingDays
    );

    const equipment = await prisma.equipment.create({
      data: {
        companyId: user.companyId,
        fiscalYear: body.fiscalYear || new Date().getFullYear(),
        equipmentType: body.equipmentType,
        name: body.name,
        spec: body.spec || null,
        sizeCategory: body.sizeCategory || null,
        attachmentType: body.attachmentType || null,
        insuranceLiability: body.insuranceLiability || 0,
        insuranceProperty: body.insuranceProperty || 0,
        insuranceVehicle: body.insuranceVehicle || 0,
        insuranceCompulsory: body.insuranceCompulsory || 0,
        vehicleTax: body.vehicleTax || 0,
        annualInspection: body.annualInspection || 0,
        repairMaintenance: body.repairMaintenance || 0,
        depreciationAmount: body.depreciationAmount || 0,
        leaseAmount: body.leaseAmount || 0,
        isLeased: body.isLeased || false,
        isFixedAsset: body.isFixedAsset || false,
        ownershipType: body.ownershipType || "owned",
        annualTotalCost: calc.annualTotalCost,
        dailyCost: calc.dailyCost,
      },
    });

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      tableName: "equipment",
      recordId: equipment.id,
      action: "create",
      newValue: JSON.stringify(equipment),
    });

    return NextResponse.json({ data: equipment });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    }
    console.error("POST /api/equipment error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "作成に失敗しました" } }, { status: 500 });
  }
}
