import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/db/audit-log";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const fiscalYear = Number(request.nextUrl.searchParams.get("fiscal_year") || new Date().getFullYear());

    const data = await prisma.financialStatement.findFirst({
      where: { companyId: user.companyId, fiscalYear, dataType: "annual" },
    });

    // BigInt → Number for JSON serialization
    const serialized = data ? JSON.parse(JSON.stringify(data, (_k, v) => typeof v === "bigint" ? Number(v) : v)) : null;
    return NextResponse.json({ data: serialized });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const fiscalYear = body.fiscalYear || new Date().getFullYear();

    // Upsert: 同一年度のannualデータは1件のみ
    const existing = await prisma.financialStatement.findFirst({
      where: { companyId: user.companyId, fiscalYear, dataType: "annual" },
    });

    const fields = {
      companyId: user.companyId,
      fiscalYear,
      dataType: "annual" as const,
      revenue: BigInt(body.revenue || 0),
      cogsSalary: BigInt(body.cogsSalary || 0),
      cogsBonus: BigInt(body.cogsBonus || 0),
      cogsStatutoryWelfare: BigInt(body.cogsStatutoryWelfare || 0),
      cogsSubcontract: BigInt(body.cogsSubcontract || 0),
      cogsWasteDisposal: BigInt(body.cogsWasteDisposal || 0),
      cogsPower: BigInt(body.cogsPower || 0),
      cogsShipping: BigInt(body.cogsShipping || 0),
      cogsTravel: BigInt(body.cogsTravel || 0),
      cogsConsumables: BigInt(body.cogsConsumables || 0),
      cogsOfficeSupplies: BigInt(body.cogsOfficeSupplies || 0),
      cogsRepair: BigInt(body.cogsRepair || 0),
      cogsUtilities: BigInt(body.cogsUtilities || 0),
      cogsMembership: BigInt(body.cogsMembership || 0),
      cogsDepreciation: BigInt(body.cogsDepreciation || 0),
      cogsTax: BigInt(body.cogsTax || 0),
      cogsInsurance: BigInt(body.cogsInsurance || 0),
      cogsProfessionalFee: BigInt(body.cogsProfessionalFee || 0),
      cogsLease: BigInt(body.cogsLease || 0),
      cogsMisc: BigInt(body.cogsMisc || 0),
      wipEnding: BigInt(body.wipEnding || 0),
      sgaExecutiveCompensation: BigInt(body.sgaExecutiveCompensation || 0),
      sgaSalary: BigInt(body.sgaSalary || 0),
      sgaBonus: BigInt(body.sgaBonus || 0),
      sgaStatutoryWelfare: BigInt(body.sgaStatutoryWelfare || 0),
      sgaWelfare: BigInt(body.sgaWelfare || 0),
      sgaSubcontract: BigInt(body.sgaSubcontract || 0),
      sgaAdvertising: BigInt(body.sgaAdvertising || 0),
      sgaEntertainment: BigInt(body.sgaEntertainment || 0),
      sgaMeeting: BigInt(body.sgaMeeting || 0),
      sgaTravel: BigInt(body.sgaTravel || 0),
      sgaCommunication: BigInt(body.sgaCommunication || 0),
      sgaConsumables: BigInt(body.sgaConsumables || 0),
      sgaOfficeConsumables: BigInt(body.sgaOfficeConsumables || 0),
      sgaRepair: BigInt(body.sgaRepair || 0),
      sgaUtilities: BigInt(body.sgaUtilities || 0),
      sgaMembership: BigInt(body.sgaMembership || 0),
      sgaCommission: BigInt(body.sgaCommission || 0),
      sgaRent: BigInt(body.sgaRent || 0),
      sgaLease: BigInt(body.sgaLease || 0),
      sgaInsurance: BigInt(body.sgaInsurance || 0),
      sgaTax: BigInt(body.sgaTax || 0),
      sgaProfessionalFee: BigInt(body.sgaProfessionalFee || 0),
      sgaDepreciation: BigInt(body.sgaDepreciation || 0),
      sgaBadDebt: BigInt(body.sgaBadDebt || 0),
      sgaManagement: BigInt(body.sgaManagement || 0),
      sgaMisc: BigInt(body.sgaMisc || 0),
      cashoutCapex: BigInt(body.cashoutCapex || 0),
      cashoutLoanRepayment: BigInt(body.cashoutLoanRepayment || 0),
      cashoutOther: BigInt(body.cashoutOther || 0),
    };

    let result;
    if (existing) {
      result = await prisma.financialStatement.update({
        where: { id: existing.id },
        data: fields,
      });
      await createAuditLog({ companyId: user.companyId, userId: user.id, tableName: "financial_statements", recordId: existing.id, action: "update" });
    } else {
      result = await prisma.financialStatement.create({ data: fields });
      await createAuditLog({ companyId: user.companyId, userId: user.id, tableName: "financial_statements", recordId: result.id, action: "create" });
    }

    // Serialize BigInt for JSON
    const serialized = JSON.parse(JSON.stringify(result, (_k, v) => typeof v === "bigint" ? Number(v) : v));
    return NextResponse.json({ data: serialized });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/financials error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "保存に失敗しました" } }, { status: 500 });
  }
}
