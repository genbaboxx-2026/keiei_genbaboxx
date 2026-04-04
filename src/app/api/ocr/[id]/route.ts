import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;

    const record = await prisma.ocrRecord.findFirst({
      where: { id, companyId: user.companyId },
    });

    if (!record) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "OCR記録が見つかりません" } }, { status: 404 });
    }

    return NextResponse.json({ data: record });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } }, { status: 500 });
  }
}
