import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "認証が必要です" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const companyId = id === "me" ? (session.user as Record<string, unknown>).companyId as string : id;

  if ((session.user as Record<string, unknown>).companyId !== companyId) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "権限がありません" } },
      { status: 403 }
    );
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "企業が見つかりません" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: company });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "認証が必要です" } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const companyId = id === "me" ? (session.user as Record<string, unknown>).companyId as string : id;

  if ((session.user as Record<string, unknown>).companyId !== companyId) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "権限がありません" } },
      { status: 403 }
    );
  }

  const body = await request.json();

  try {
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.industrySubType !== undefined) updateData.industrySubType = body.industrySubType || null;
    if (body.fiscalYearStartMonth !== undefined) updateData.fiscalYearStartMonth = body.fiscalYearStartMonth;
    if (body.annualWorkingDays !== undefined) updateData.annualWorkingDays = body.annualWorkingDays;
    if (body.bonusCount !== undefined) updateData.bonusCount = body.bonusCount;
    if (body.onboardingCompleted !== undefined) updateData.onboardingCompleted = body.onboardingCompleted;

    const company = await prisma.company.update({
      where: { id: companyId },
      data: updateData,
    });

    return NextResponse.json({ data: company });
  } catch (error) {
    console.error("Company update error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "更新に失敗しました" } },
      { status: 500 }
    );
  }
}
