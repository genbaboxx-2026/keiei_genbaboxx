import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { buildLlmContext } from "@/lib/llm/context-builder";
import { WORKFORCE_PLANNING_PROMPT } from "@/lib/llm/prompt-templates";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const fiscalYear = body.fiscal_year || new Date().getFullYear();

    const context = await buildLlmContext(user.companyId, fiscalYear, ["financials", "workforce", "targets"]);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: WORKFORCE_PLANNING_PROMPT,
      messages: [{ role: "user", content: `以下の従業員・経営データをもとに、中長期の要員計画をアドバイスしてください:\n\n${JSON.stringify(context, null, 2)}` }],
    });

    const text = response.content.find(c => c.type === "text");
    const rawText = text?.type === "text" ? text.text : "";

    await prisma.llmAnalysis.create({
      data: { companyId: user.companyId, analysisType: "insight", inputContext: context as object, prompt: "要員計画AI分析", response: rawText },
    });

    return NextResponse.json({ data: { analysis: rawText } });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/ai/workforce-analysis error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "分析に失敗しました" } }, { status: 500 });
  }
}
