import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { buildLlmContext } from "@/lib/llm/context-builder";
import { INSIGHT_SYSTEM_PROMPT } from "@/lib/llm/prompt-templates";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const fiscalYear = Number(request.nextUrl.searchParams.get("fiscal_year") || new Date().getFullYear());

    const context = await buildLlmContext(user.companyId, fiscalYear, ["financials", "cost_masters", "analysis", "workforce"]);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: INSIGHT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `以下の経営データを分析し、改善提案を行ってください:\n\n${JSON.stringify(context, null, 2)}` }],
    });

    const text = response.content.find(c => c.type === "text");
    const rawText = text?.type === "text" ? text.text : "";

    let parsed = null;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch { /* non-JSON response */ }

    // Save to DB
    await prisma.llmAnalysis.create({
      data: {
        companyId: user.companyId,
        analysisType: "insight",
        inputContext: context as object,
        prompt: "経営インサイト生成",
        response: rawText,
        dataSources: { scopes: ["financials", "cost_masters", "analysis", "workforce"] },
      },
    });

    return NextResponse.json({ data: parsed || { raw: rawText } });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/ai/insights error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "インサイト生成に失敗しました。ANTHROPIC_API_KEYを確認してください。" } }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const latest = await prisma.llmAnalysis.findFirst({
      where: { companyId: user.companyId, analysisType: "insight" },
      orderBy: { createdAt: "desc" },
    });
    if (!latest) return NextResponse.json({ data: null });

    let parsed = null;
    try { const m = latest.response.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch {}
    return NextResponse.json({ data: parsed || { raw: latest.response }, createdAt: latest.createdAt });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "取得に失敗しました" } }, { status: 500 });
  }
}
