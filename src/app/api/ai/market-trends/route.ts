import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { buildLlmContext } from "@/lib/llm/context-builder";
import { MARKET_ANALYSIS_SYSTEM_PROMPT } from "@/lib/llm/prompt-templates";

const anthropic = new Anthropic();

const PUBLIC_DATA_CONTEXT = `
【参考: 最新の公的データ（概算）】
- 消費者物価指数(CPI): 前年比+2.1%上昇傾向
- 建設業労務費: 年平均+2.5%上昇
- 軽油価格: 前年比+2.8%上昇
- 産業廃棄物処分費: 年平均+3.5%上昇傾向（環境規制強化）
- 建設工事費デフレーター: +1.8%
- 鉄スクラップ価格: 変動大、直近横ばい
`;

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const fiscalYear = body.fiscal_year || new Date().getFullYear();

    const context = await buildLlmContext(user.companyId, fiscalYear, ["financials"]);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: MARKET_ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `以下の企業データと公的データをもとに、今後のコスト変動を予測してください。\n\n${PUBLIC_DATA_CONTEXT}\n\n企業データ:\n${JSON.stringify(context.financialSummary, null, 2)}` }],
    });

    const text = response.content.find(c => c.type === "text");
    const rawText = text?.type === "text" ? text.text : "";

    let parsed = null;
    try { const m = rawText.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch {}

    await prisma.llmAnalysis.create({
      data: { companyId: user.companyId, analysisType: "market", inputContext: context as object, prompt: "市場動向分析", response: rawText },
    });

    return NextResponse.json({ data: parsed || { raw: rawText } });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/ai/market-trends error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "市場分析に失敗しました" } }, { status: 500 });
  }
}
