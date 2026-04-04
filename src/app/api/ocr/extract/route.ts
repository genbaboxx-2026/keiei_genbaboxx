import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { getOcrPrompt } from "@/lib/ocr/prompts";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const documentType = (formData.get("documentType") as string) || "auto";

    if (!file) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "ファイルが必要です" } }, { status: 400 });
    }

    const isPdf = file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");

    const ocrRecord = await prisma.ocrRecord.create({
      data: {
        companyId: user.companyId,
        fileName: file.name,
        fileType: isPdf ? "pdf" : file.type.includes("png") ? "png" : "jpeg",
        documentType: documentType === "auto" ? "other" : documentType,
        status: "processing",
      },
    });

    try {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const prompt = getOcrPrompt(documentType === "auto" ? "generic" : documentType);

      // Build content blocks based on file type
      const contentBlocks: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

      if (isPdf) {
        // PDF: use document type (Claude API supports PDF natively)
        contentBlocks.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64,
          },
        } as unknown as Anthropic.ContentBlockParam);
      } else {
        // Image: use image type
        const mediaType = file.type.includes("png") ? "image/png" as const : "image/jpeg" as const;
        contentBlocks.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data: base64 },
        });
      }

      contentBlocks.push({ type: "text", text: prompt });

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [{ role: "user", content: contentBlocks }],
      });

      const textContent = response.content.find((c) => c.type === "text");
      const rawText = textContent?.type === "text" ? textContent.text : "";

      let extractedData = null;
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // JSON parse failed
      }

      const detectedType = extractedData?.documentType || documentType;

      await prisma.ocrRecord.update({
        where: { id: ocrRecord.id },
        data: {
          status: extractedData ? "completed" : "failed",
          documentType: detectedType,
          rawResponse: { text: rawText },
          extractedData: extractedData,
          errorMessage: extractedData ? null : "JSONのパースに失敗しました",
        },
      });

      return NextResponse.json({
        data: {
          id: ocrRecord.id,
          status: extractedData ? "completed" : "failed",
          documentType: detectedType,
          extractedData,
          rawText: extractedData ? undefined : rawText,
        },
      });
    } catch (apiError) {
      const errorMsg = (apiError as Error).message || String(apiError);
      await prisma.ocrRecord.update({
        where: { id: ocrRecord.id },
        data: { status: "failed", errorMessage: errorMsg },
      });

      return NextResponse.json({
        data: { id: ocrRecord.id, status: "failed", error: errorMsg },
      });
    }
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/ocr/extract error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "読取処理に失敗しました" } }, { status: 500 });
  }
}
