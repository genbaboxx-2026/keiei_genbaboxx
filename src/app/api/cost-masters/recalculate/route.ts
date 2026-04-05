import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/db/audit-log";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const fiscalYear = body.fiscalYear || new Date().getFullYear();

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { annualWorkingDays: true },
    });
    if (!company) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "企業が見つかりません" } }, { status: 404 });
    }

    // Delete existing cost masters for this year
    await prisma.costMaster.deleteMany({
      where: { companyId: user.companyId, fiscalYear },
    });

    // --- Labor cost master ---
    const employees = await prisma.employee.findMany({
      where: { companyId: user.companyId, fiscalYear, deletedAt: null },
    });

    const laborGroups: Record<string, { total: number; count: number }> = {};
    for (const emp of employees) {
      const cat = emp.jobCategory;
      if (!laborGroups[cat]) laborGroups[cat] = { total: 0, count: 0 };
      laborGroups[cat].total += emp.dailyCost;
      laborGroups[cat].count += 1;
    }

    const laborMasters = Object.entries(laborGroups).map(([cat, g]) => ({
      companyId: user.companyId,
      fiscalYear,
      ownership: "self" as const,
      category: "labor" as const,
      subCategory: cat,
      avgDailyCost: Math.round(g.total / g.count),
      itemCount: g.count,
    }));

    // --- Heavy machine cost master ---
    const equipment = await prisma.equipment.findMany({
      where: { companyId: user.companyId, fiscalYear, deletedAt: null },
    });

    const machineGroups: Record<string, { total: number; count: number }> = {};
    const attachmentGroups: Record<string, { total: number; count: number }> = {};
    const transportGroups: Record<string, { vehicleCost: number; count: number }> = {};

    for (const eq of equipment) {
      if (eq.equipmentType === "heavy_machine") {
        const size = eq.sizeCategory || "unknown";
        if (!machineGroups[size]) machineGroups[size] = { total: 0, count: 0 };
        machineGroups[size].total += eq.dailyCost;
        machineGroups[size].count += 1;
      } else if (eq.equipmentType === "attachment") {
        const key = `${eq.sizeCategory || "?"}__${eq.attachmentType || "?"}`;
        if (!attachmentGroups[key]) attachmentGroups[key] = { total: 0, count: 0 };
        attachmentGroups[key].total += eq.dailyCost;
        attachmentGroups[key].count += 1;
      } else if (eq.equipmentType === "vehicle") {
        // Rough tonnage grouping by spec
        const spec = (eq.spec || "").toLowerCase();
        let tonnage = "other";
        if (spec.includes("2t")) tonnage = "2t";
        else if (spec.includes("3t")) tonnage = "3t";
        else if (spec.includes("4t")) tonnage = "4t";
        else if (spec.includes("10t")) tonnage = "10t";
        if (!transportGroups[tonnage]) transportGroups[tonnage] = { vehicleCost: 0, count: 0 };
        transportGroups[tonnage].vehicleCost += eq.dailyCost;
        transportGroups[tonnage].count += 1;
      }
    }

    const machineMasters = Object.entries(machineGroups).map(([size, g]) => ({
      companyId: user.companyId,
      fiscalYear,
      ownership: "self" as const,
      category: "heavy_machine" as const,
      subCategory: size,
      avgDailyCost: Math.round(g.total / g.count),
      itemCount: g.count,
    }));

    const attachmentMasters = Object.entries(attachmentGroups).map(([key, g]) => ({
      companyId: user.companyId,
      fiscalYear,
      ownership: "self" as const,
      category: "attachment" as const,
      subCategory: key,
      avgDailyCost: Math.round(g.total / g.count),
      itemCount: g.count,
    }));

    const transportMasters = Object.entries(transportGroups).map(([tonnage, g]) => ({
      companyId: user.companyId,
      fiscalYear,
      ownership: "self" as const,
      category: "transport" as const,
      subCategory: tonnage,
      avgDailyCost: Math.round(g.vehicleCost / g.count),
      itemCount: g.count,
    }));

    const allMasters = [...laborMasters, ...machineMasters, ...attachmentMasters, ...transportMasters];

    if (allMasters.length > 0) {
      await prisma.costMaster.createMany({ data: allMasters });
    }

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      tableName: "cost_masters",
      recordId: `recalculate-${fiscalYear}`,
      action: "create",
      newValue: `Generated ${allMasters.length} entries`,
      source: "system",
    });

    return NextResponse.json({ data: allMasters, count: allMasters.length });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/cost-masters/recalculate error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "再計算に失敗しました" } }, { status: 500 });
  }
}
