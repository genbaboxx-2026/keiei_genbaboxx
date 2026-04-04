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

    // Create OCR record
    const ocrRecord = await prisma.ocrRecord.create({
      data: {
        companyId: user.companyId,
        fileName: file.name,
        fileType: file.type.includes("pdf") ? "pdf" : file.type.includes("png") ? "png" : "jpeg",
        documentType: documentType === "auto" ? "other" : documentType,
        status: "processing",
      },
    });

    try {
      // Convert file to base64
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      const mediaType = file.type.includes("pdf")
        ? "application/pdf" as const
        : file.type.includes("png")
          ? "image/png" as const
          : "image/jpeg" as const;

      const prompt = getOcrPrompt(documentType === "auto" ? "generic" : documentType);

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      });

      // Extract text content
      const textContent = response.content.find((c) => c.type === "text");
      const rawText = textContent?.type === "text" ? textContent.text : "";

      // Parse JSON from response
      let extractedData = null;
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // JSON parse failed, store raw text
      }

      // Update document type if auto-detected
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
      await prisma.ocrRecord.update({
        where: { id: ocrRecord.id },
        data: {
          status: "failed",
          errorMessage: (apiError as Error).message,
        },
      });

      return NextResponse.json({
        data: { id: ocrRecord.id, status: "failed", error: (apiError as Error).message },
      });
    }
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED")
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "認証が必要です" } }, { status: 401 });
    console.error("POST /api/ocr/extract error:", e);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "OCR処理に失敗しました" } }, { status: 500 });
  }
}
