"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EditableCell } from "@/components/tables/editable-cell";
import { formatNumber } from "@/lib/format";
import { mapAccountName } from "@/lib/ocr/account-mapping";

interface OcrItem {
  section?: string;
  accountName?: string;
  label?: string;
  amount: number | null;
  numericValue?: number | null;
  value?: string;
  confidence: number;
  mappedKey?: string | null;
}

interface OcrData {
  id: string;
  documentType: string;
  extractedData: {
    items?: OcrItem[];
    revenue?: { amount: number | null; confidence: number };
    totals?: Record<string, number | null>;
    notes?: string;
  };
}

export default function OcrReviewPage() {
  const params = useParams();
  const router = useRouter();
  const ocrId = params.ocrId as string;
  const [ocrData, setOcrData] = useState<OcrData | null>(null);
  const [items, setItems] = useState<OcrItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);

  const fetchOcr = useCallback(async () => {
    try {
      const res = await fetch(`/api/ocr/${ocrId}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setOcrData(json.data);
        const rawItems: OcrItem[] = json.data.extractedData?.items || [];
        // Normalize: use amount || numericValue, apply account mapping
        const mapped = rawItems
          .map((item) => {
            const name = item.accountName || item.label || "";
            const mapping = mapAccountName(name, item.section as "cogs" | "sga" | undefined);
            const amount = item.amount ?? item.numericValue ?? null;
            return { ...item, amount, mappedKey: mapping?.mappedKey || null };
          })
          .filter((item) => item.amount != null && item.amount !== 0); // 金額がない項目は除外
        setItems(mapped);
      }
    } catch { toast.error("OCRデータの取得に失敗しました"); }
    finally { setIsLoading(false); }
  }, [ocrId]);

  useEffect(() => { fetchOcr(); }, [fetchOcr]);

  const updateItem = (index: number, field: "amount" | "mappedKey", value: unknown) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      // Build corrected data from mapped items
      const correctedData: Record<string, number> = {};
      if (ocrData?.extractedData?.revenue?.amount != null) {
        correctedData.revenue = ocrData.extractedData.revenue.amount;
      }
      for (const item of items) {
        if (item.mappedKey && item.amount != null) {
          correctedData[item.mappedKey] = item.amount;
        }
      }

      const res = await fetch(`/api/ocr/${ocrId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correctedData, fiscalYear: new Date().getFullYear() }),
      });

      if (res.ok) {
        toast.success("OCR結果を確定しました");
        const docType = ocrData?.documentType;
        if (docType === "pl") router.push("/input/financials");
        else if (docType === "bs") router.push("/input/balance-sheet");
        else router.push("/input/upload");
      } else {
        toast.error("確定に失敗しました");
      }
    } catch { toast.error("確定に失敗しました"); }
    finally { setIsConfirming(false); }
  };

  if (isLoading) {
    return <div className="p-6"><p className="text-slate-500">読み込み中...</p></div>;
  }

  if (!ocrData) {
    return <div className="p-6"><p className="text-red-500">OCRデータが見つかりません</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">OCR読取結果の確認</h1>
          <p className="text-sm text-slate-500">読取値を確認・修正して確定してください</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>戻る</Button>
          <Button onClick={handleConfirm} disabled={isConfirming} className="bg-blue-600 hover:bg-blue-700">
            {isConfirming ? "確定中..." : "確定して反映"}
          </Button>
        </div>
      </div>

      {ocrData.extractedData?.notes && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-700">
          AI注記: {ocrData.extractedData.notes}
        </div>
      )}

      {/* Revenue (if PL) */}
      {ocrData.extractedData?.revenue && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-4">
            <span className="font-medium text-slate-700 w-32">売上高</span>
            <span className="text-right font-bold tabular-nums">{formatNumber(ocrData.extractedData.revenue.amount || 0)}</span>
            <ConfidenceBadge confidence={ocrData.extractedData.revenue.confidence} />
          </div>
        </div>
      )}

      {/* Items table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="px-4 py-2 text-left font-medium text-slate-600 w-12">#</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">勘定科目（原文）</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 w-32">セクション</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 w-40">マッピング先</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600 w-36">読取値</th>
              <th className="px-4 py-2 text-center font-medium text-slate-600 w-20">信頼度</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className={`border-b ${confidenceBg(item.confidence)}`}>
                <td className="px-4 py-1 text-slate-400">{i + 1}</td>
                <td className="px-4 py-1 text-slate-700">{item.accountName || item.label}</td>
                <td className="px-4 py-1 text-slate-500 text-xs">{item.section || "-"}</td>
                <td className="px-4 py-1">
                  {item.mappedKey ? (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{item.mappedKey}</span>
                  ) : (
                    <span className="text-xs text-red-500">未マッピング</span>
                  )}
                </td>
                <td className="px-0 py-0.5">
                  <EditableCell
                    type="number"
                    value={item.amount || 0}
                    onChange={(v) => updateItem(i, "amount", v)}
                  />
                </td>
                <td className="px-4 py-1 text-center">
                  <ConfidenceBadge confidence={item.confidence} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 95) return <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">{confidence}%</span>;
  if (confidence >= 80) return <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">⚠️ {confidence}%</span>;
  return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">❌ {confidence}%</span>;
}

function confidenceBg(c: number): string {
  if (c >= 95) return "";
  if (c >= 80) return "bg-amber-50/50";
  return "bg-red-50/50";
}
