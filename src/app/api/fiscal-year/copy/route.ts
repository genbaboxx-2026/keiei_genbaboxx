import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/db/audit-log";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const { sourceYear, targetYear, copyEmployees, copyEquipment, copyCostClassifications, copyTargets, copyFinancials } = body;

    if (!sourceYear || !targetYear || sourceYear === targetYear) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "コピー元とコピー先の年度を正しく指定してください" } }, { status: 400 });
    }

    let copiedCount = 0;

    await prisma.$transaction(async (tx) => {
      if (copyEmployees) {
        const employees = await tx.employee.findMany({
          where: { companyId: user.companyId, fiscalYear: sourceYear, deletedAt: null },
        });
        for (const emp of employees) {
          await tx.employee.create({
            data: {
              companyId: emp.companyId, fiscalYear: targetYear,
              employeeNo: emp.employeeNo, nameOrTitle: emp.nameOrTitle, jobCategory: emp.jobCategory,
              monthlyGrossSalary: emp.monthlyGrossSalary, monthlyHealthInsurance: emp.monthlyHealthInsurance,
              monthlyPension: emp.monthlyPension, monthlyDcPension: emp.monthlyDcPension,
              monthlySafetyFund: emp.monthlySafetyFund, monthlyOther: emp.monthlyOther,
              monthlySubtotal: emp.monthlySubtotal, annualTotal: emp.annualTotal, dailyCost: emp.dailyCost,
            },
          });
          copiedCount++;
        }
      }

      if (copyEquipment) {
        const equipment = await tx.equipment.findMany({
          where: { companyId: user.companyId, fiscalYear: sourceYear, deletedAt: null },
        });
        for (const eq of equipment) {
          const { id: _id, createdAt: _ca, updatedAt: _ua, deletedAt: _da, ...data } = eq;
          await tx.equipment.create({ data: { ...data, fiscalYear: targetYear } });
          copiedCount++;
        }
      }

      if (copyCostClassifications) {
        const classifications = await tx.costClassification.findMany({
          where: { companyId: user.companyId, fiscalYear: sourceYear },
        });
        for (const cls of classifications) {
          await tx.costClassification.create({
            data: {
              companyId: cls.companyId, fiscalYear: targetYear,
              itemKey: cls.itemKey, isGbCost: cls.isGbCost,
            },
          });
          copiedCount++;
        }
      }

      if (copyTargets) {
        const target = await tx.companyTarget.findFirst({
          where: { companyId: user.companyId, fiscalYear: sourceYear },
        });
        if (target) {
          const { id: _id, createdAt: _ca, updatedAt: _ua, ...data } = target;
          await tx.companyTarget.create({ data: { ...data, fiscalYear: targetYear } });
          copiedCount++;
        }
      }

      if (copyFinancials) {
        const fin = await tx.financialStatement.findFirst({
          where: { companyId: user.companyId, fiscalYear: sourceYear, dataType: "annual" },
        });
        if (fin) {
          const { id: _id, createdAt: _ca, updatedAt: _ua, ...data } = fin;
          await tx.financialStatement.create({ data: { ...data, fiscalYear: targetYear } });
          copiedCount++;
        }
        const bs = await tx.balanceSheet.findFirst({
          where: { companyId: user.companyId, fiscalYear: sourceYear },
        });
        if (bs) {
          const { id: _id, createdAt: _ca, updatedAt: _ua, ...data } = bs;
          await tx.balanceSheet.create({ data: { ...data, fiscalYear: targetYear } });
          copiedCount++;
        }
      }
    });

    await createAuditLog({
      companyId: user.companyId, userId: user.id,
      tableName: "fiscal_year", recordId: `${sourceYear}->${targetYear}`,
      action: "create", newValue: `Copied ${copiedCount} records`, source: "system",
    });

    return NextResponse.json({ data: { copiedCount, targetYear } });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/fiscal-year/copy error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "年度コピーに失敗しました" } }, { status: 500 });
  }
}
