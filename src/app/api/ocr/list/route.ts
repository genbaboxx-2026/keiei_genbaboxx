import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    const records = await prisma.ocrRecord.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, fileName: true, documentType: true, status: true, createdAt: true, errorMessage: true },
    });
    return NextResponse.json({ data: records });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } }, { status: 500 });
  }
}
