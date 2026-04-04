import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, name, email, password } = body;

    if (!companyName || !name || !email || !password) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "全ての項目を入力してください" } },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "このメールアドレスは既に登録されています" } },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create company and user together
    const company = await prisma.company.create({
      data: {
        name: companyName,
        fiscalYearStartMonth: 4,
        annualWorkingDays: 278,
        bonusCount: 0,
        users: {
          create: {
            email,
            passwordHash,
            name,
            role: "admin",
          },
        },
      },
      include: {
        users: true,
      },
    });

    const user = company.users[0];

    return NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyId: company.id,
        companyName: company.name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "登録に失敗しました" } },
      { status: 500 }
    );
  }
}
