import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/db/audit-log";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    const body = await request.json();
    const { correctedData, fiscalYear } = body;

    const record = await prisma.ocrRecord.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!record) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "OCR記録が見つかりません" } }, { status: 404 });
    }

    // Save corrections and mark as confirmed
    await prisma.ocrRecord.update({
      where: { id },
      data: {
        status: "confirmed",
        userCorrections: correctedData,
        confirmedAt: new Date(),
        confirmedBy: user.id,
        targetTable: record.documentType === "pl" ? "financial_statements" : record.documentType === "bs" ? "balance_sheets" : null,
      },
    });

    // Apply to target table
    if (record.documentType === "pl" && correctedData) {
      const year = fiscalYear || new Date().getFullYear();
      const existing = await prisma.financialStatement.findFirst({
        where: { companyId: user.companyId, fiscalYear: year, dataType: "annual" },
      });

      const fields: Record<string, bigint> = {};
      for (const [key, value] of Object.entries(correctedData)) {
        if (key.startsWith("cogs") || key.startsWith("sga") || key.startsWith("cashout") || key === "revenue" || key === "wipEnding") {
          fields[key] = BigInt(value as number || 0);
        }
      }

      if (existing) {
        await prisma.financialStatement.update({ where: { id: existing.id }, data: { ...fields, companyId: user.companyId, fiscalYear: year } });
      } else {
        await prisma.financialStatement.create({ data: { ...fields, companyId: user.companyId, fiscalYear: year, dataType: "annual" } });
      }

      await createAuditLog({
        companyId: user.companyId, userId: user.id,
        tableName: "financial_statements", recordId: existing?.id || "new",
        action: existing ? "update" : "create", source: "ocr_import",
      });
    }

    if (record.documentType === "bs" && correctedData) {
      const year = fiscalYear || new Date().getFullYear();
      const existing = await prisma.balanceSheet.findFirst({
        where: { companyId: user.companyId, fiscalYear: year },
      });

      const fields: Record<string, bigint> = {};
      for (const [key, value] of Object.entries(correctedData)) {
        if (!key.startsWith("_")) {
          fields[key] = BigInt(value as number || 0);
        }
      }

      if (existing) {
        await prisma.balanceSheet.update({ where: { id: existing.id }, data: fields });
      } else {
        await prisma.balanceSheet.create({ data: { ...fields, companyId: user.companyId, fiscalYear: year } });
      }

      await createAuditLog({
        companyId: user.companyId, userId: user.id,
        tableName: "balance_sheets", recordId: existing?.id || "new",
        action: existing ? "update" : "create", source: "ocr_import",
      });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/ocr/[id]/confirm error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "確定に失敗しました" } }, { status: 500 });
  }
}
