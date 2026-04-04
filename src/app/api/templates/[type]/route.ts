import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createEmployeeTemplate, createEquipmentTemplate, createFinancialTemplate } from "@/lib/excel/templates";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;

  let wb: XLSX.WorkBook;
  let filename: string;

  switch (type) {
    case "employees":
      wb = createEmployeeTemplate();
      filename = "employee-template.xlsx";
      break;
    case "equipment":
      wb = createEquipmentTemplate();
      filename = "equipment-template.xlsx";
      break;
    case "financials":
      wb = createFinancialTemplate();
      filename = "financial-template.xlsx";
      break;
    default:
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "テンプレートが見つかりません" } }, { status: 404 });
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
