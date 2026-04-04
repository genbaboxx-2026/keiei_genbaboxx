import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { buildLlmContext } from "@/lib/llm/context-builder";
import { CHAT_SYSTEM_PROMPT } from "@/lib/llm/prompt-templates";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const { message, history = [], context_scope = ["financials", "cost_masters", "analysis", "workforce", "targets"] } = body;
    const fiscalYear = body.fiscal_year || new Date().getFullYear();

    const context = await buildLlmContext(user.companyId, fiscalYear, context_scope);
    const systemPrompt = CHAT_SYSTEM_PROMPT.replace("{context}", JSON.stringify(context, null, 2));

    const messages: Anthropic.MessageParam[] = [
      ...history.map((h: { role: string; content: string }) => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user", content: message },
    ];

    // Streaming response using SSE
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let fullText = "";
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              const text = event.delta.text;
              fullText += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));

          // Save to DB after stream completes
          await prisma.llmAnalysis.create({
            data: { companyId: user.companyId, analysisType: "chat", inputContext: { message, history_length: history.length }, prompt: message, response: fullText },
          });
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", content: (err as Error).message })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/ai/chat error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "チャットに失敗しました" } }, { status: 500 });
  }
}
