import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/db/audit-log";
import { calculateEmployeeCost } from "@/lib/calculation/employee-cost";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const searchParams = request.nextUrl.searchParams;
    const fiscalYear = Number(searchParams.get("fiscal_year") || new Date().getFullYear());

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { annualWorkingDays: true, bonusCount: true },
    });

    const employees = await prisma.employee.findMany({
      where: {
        companyId: user.companyId,
        fiscalYear,
        deletedAt: null,
      },
      orderBy: { employeeNo: "asc" },
    });

    return NextResponse.json({
      data: employees,
      settings: company,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    }
    console.error("GET /api/employees error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await request.json();

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { annualWorkingDays: true, bonusCount: true },
    });
    if (!company) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "企業が見つかりません" } }, { status: 404 });
    }

    const calc = calculateEmployeeCost(
      {
        monthlyGrossSalary: body.monthlyGrossSalary || 0,
        monthlyHealthInsurance: body.monthlyHealthInsurance || 0,
        monthlyPension: body.monthlyPension || 0,
        monthlyDcPension: body.monthlyDcPension || 0,
        monthlySafetyFund: body.monthlySafetyFund || 0,
        monthlyOther: body.monthlyOther || 0,
      },
      company
    );

    const employee = await prisma.employee.create({
      data: {
        companyId: user.companyId,
        fiscalYear: body.fiscalYear || new Date().getFullYear(),
        employeeNo: body.employeeNo,
        nameOrTitle: body.nameOrTitle,
        jobCategory: body.jobCategory,
        monthlyGrossSalary: body.monthlyGrossSalary || 0,
        monthlyHealthInsurance: body.monthlyHealthInsurance || 0,
        monthlyPension: body.monthlyPension || 0,
        monthlyDcPension: body.monthlyDcPension || 0,
        monthlySafetyFund: body.monthlySafetyFund || 0,
        monthlyOther: body.monthlyOther || 0,
        monthlySubtotal: calc.monthlySubtotal,
        annualTotal: calc.annualTotal,
        dailyCost: calc.dailyCost,
      },
    });

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      tableName: "employees",
      recordId: employee.id,
      action: "create",
      newValue: JSON.stringify(employee),
    });

    return NextResponse.json({ data: employee });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    }
    console.error("POST /api/employees error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "作成に失敗しました" } }, { status: 500 });
  }
}
