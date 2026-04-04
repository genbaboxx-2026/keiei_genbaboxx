import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLogs } from "@/lib/db/audit-log";
import { calculateEmployeeCost } from "@/lib/calculation/employee-cost";

interface BulkEmployeeItem {
  id?: string;
  _action?: "create" | "update" | "delete";
  employeeNo: number;
  nameOrTitle: string;
  jobCategory: string;
  monthlyGrossSalary: number;
  monthlyHealthInsurance: number;
  monthlyPension: number;
  monthlyDcPension: number;
  monthlySafetyFund: number;
  monthlyOther: number;
  fiscalYear: number;
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const items: BulkEmployeeItem[] = body.items;
    const fiscalYear: number = body.fiscalYear || new Date().getFullYear();

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { annualWorkingDays: true, bonusCount: true },
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
      oldValue?: string;
    }[] = [];

    const results = await prisma.$transaction(async (tx) => {
      const saved = [];

      for (const item of items) {
        const calc = calculateEmployeeCost(
          {
            monthlyGrossSalary: item.monthlyGrossSalary || 0,
            monthlyHealthInsurance: item.monthlyHealthInsurance || 0,
            monthlyPension: item.monthlyPension || 0,
            monthlyDcPension: item.monthlyDcPension || 0,
            monthlySafetyFund: item.monthlySafetyFund || 0,
            monthlyOther: item.monthlyOther || 0,
          },
          company
        );

        const data = {
          companyId: user.companyId,
          fiscalYear,
          employeeNo: item.employeeNo,
          nameOrTitle: item.nameOrTitle,
          jobCategory: item.jobCategory as "manager" | "operator" | "fieldWorker" | "driver" | "gasCutter" | "other",
          monthlyGrossSalary: item.monthlyGrossSalary || 0,
          monthlyHealthInsurance: item.monthlyHealthInsurance || 0,
          monthlyPension: item.monthlyPension || 0,
          monthlyDcPension: item.monthlyDcPension || 0,
          monthlySafetyFund: item.monthlySafetyFund || 0,
          monthlyOther: item.monthlyOther || 0,
          monthlySubtotal: calc.monthlySubtotal,
          annualTotal: calc.annualTotal,
          dailyCost: calc.dailyCost,
        };

        if (item._action === "delete" && item.id) {
          await tx.employee.update({
            where: { id: item.id },
            data: { deletedAt: new Date() },
          });
          auditEntries.push({
            companyId: user.companyId,
            userId: user.id,
            tableName: "employees",
            recordId: item.id,
            action: "delete",
          });
        } else if (item.id) {
          // Update
          const updated = await tx.employee.update({
            where: { id: item.id },
            data,
          });
          saved.push(updated);
          auditEntries.push({
            companyId: user.companyId,
            userId: user.id,
            tableName: "employees",
            recordId: item.id,
            action: "update",
            newValue: JSON.stringify(data),
          });
        } else {
          // Create
          const created = await tx.employee.create({ data });
          saved.push(created);
          auditEntries.push({
            companyId: user.companyId,
            userId: user.id,
            tableName: "employees",
            recordId: created.id,
            action: "create",
            newValue: JSON.stringify(data),
          });
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
    console.error("POST /api/employees/bulk error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "一括保存に失敗しました" } }, { status: 500 });
  }
}
