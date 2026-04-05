import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog, diffForAudit, createAuditLogs } from "@/lib/db/audit-log";
import { calculateEmployeeCost } from "@/lib/calculation/employee-cost";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.employee.findFirst({
      where: { id, companyId: user.companyId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "従業員が見つかりません" } }, { status: 404 });
    }

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { annualWorkingDays: true, bonusCount: true },
    });

    const calc = calculateEmployeeCost(
      {
        monthlyGrossSalary: body.monthlyGrossSalary ?? existing.monthlyGrossSalary,
        monthlyHealthInsurance: body.monthlyHealthInsurance ?? existing.monthlyHealthInsurance,
        monthlyPension: body.monthlyPension ?? existing.monthlyPension,
        monthlyDcPension: body.monthlyDcPension ?? existing.monthlyDcPension,
        monthlySafetyFund: body.monthlySafetyFund ?? existing.monthlySafetyFund,
        monthlyOther: body.monthlyOther ?? existing.monthlyOther,
      },
      company!
    );

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        employeeNo: body.employeeNo ?? existing.employeeNo,
        nameOrTitle: body.nameOrTitle ?? existing.nameOrTitle,
        jobCategory: body.jobCategory ?? existing.jobCategory,
        monthlyGrossSalary: body.monthlyGrossSalary ?? existing.monthlyGrossSalary,
        monthlyHealthInsurance: body.monthlyHealthInsurance ?? existing.monthlyHealthInsurance,
        monthlyPension: body.monthlyPension ?? existing.monthlyPension,
        monthlyDcPension: body.monthlyDcPension ?? existing.monthlyDcPension,
        monthlySafetyFund: body.monthlySafetyFund ?? existing.monthlySafetyFund,
        monthlyOther: body.monthlyOther ?? existing.monthlyOther,
        monthlySubtotal: calc.monthlySubtotal,
        annualTotal: calc.annualTotal,
        dailyCost: calc.dailyCost,
      },
    });

    const auditEntries = diffForAudit(user.companyId, user.id, "employees", id, existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
    if (auditEntries.length > 0) {
      await createAuditLogs(auditEntries);
    }

    return NextResponse.json({ data: updated });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    }
    console.error("PUT /api/employees/[id] error:", e);
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

    const existing = await prisma.employee.findFirst({
      where: { id, companyId: user.companyId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "従業員が見つかりません" } }, { status: 404 });
    }

    await prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      tableName: "employees",
      recordId: id,
      action: "delete",
      oldValue: JSON.stringify(existing),
    });

    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    }
    console.error("DELETE /api/employees/[id] error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "削除に失敗しました" } }, { status: 500 });
  }
}
