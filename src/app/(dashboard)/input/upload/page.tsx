"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UploadItem {
  file: File;
  status: "pending" | "processing" | "completed" | "failed";
  ocrId?: string;
  detectedType?: string;
  error?: string;
}

const TYPE_LABELS: Record<string, string> = {
  pl: "損益計算書", bs: "貸借対照表", manufacturing_cost: "製造原価報告書",
  sga_detail: "販管費明細", depreciation: "減価償却明細", payroll: "賃金台帳",
  tax_return: "法人税申告書", other: "その他",
};

interface HistoryItem {
  id: string;
  fileName: string;
  documentType: string;
  status: string;
  createdAt: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load past OCR records
  useEffect(() => {
    fetch("/api/ocr/list").then(r => r.json()).then(j => {
      if (j.data) setHistory(j.data);
    }).catch(() => {});
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: UploadItem[] = Array.from(files).map((file) => ({
      file,
      status: "pending" as const,
    }));
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
  };

  const processItem = async (index: number) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, status: "processing" } : item));

    const item = items[index];
    const formData = new FormData();
    formData.append("file", item.file);
    formData.append("documentType", "auto"); // AIが自動判別

    try {
      const res = await fetch("/api/ocr/extract", { method: "POST", body: formData });
      const json = await res.json();

      if (res.ok && json.data?.status === "completed") {
        setItems((prev) => prev.map((it, i) => i === index ? {
          ...it, status: "completed", ocrId: json.data.id,
          detectedType: json.data.documentType,
        } : it));
        const typeName = TYPE_LABELS[json.data.documentType] || json.data.documentType;
        toast.success(`${item.file.name} → ${typeName}として読取完了`);
      } else {
        setItems((prev) => prev.map((it, i) => i === index ? {
          ...it, status: "failed", error: json.data?.error || json.error?.message || "読取失敗",
        } : it));
        toast.error(`${item.file.name} の読取に失敗しました`);
      }
    } catch {
      setItems((prev) => prev.map((it, i) => i === index ? { ...it, status: "failed", error: "通信エラー" } : it));
    }
  };

  const processAll = async () => {
    for (let i = 0; i < items.length; i++) {
      if (items[i].status === "pending") await processItem(i);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">決算書読取</h1>
      <p className="text-sm text-slate-500">
        決算書のPDFや画像をアップロードしてください。AIが書類の種類を自動判別し、全ての数字を読み取ります。
      </p>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-white"}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="space-y-3">
          <div className="text-4xl">📄</div>
          <p className="text-slate-600 font-medium">決算書のPDFや画像をドラッグ&ドロップ</p>
          <p className="text-sm text-slate-400">PL・BS・製造原価報告書など、AIが自動で判別します</p>
          <div className="flex justify-center gap-3 pt-2">
            <label className="cursor-pointer inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleFileInput} className="hidden" />
              ファイルを選択
            </label>
            <label className="cursor-pointer inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
              <input type="file" accept="image/*" capture="environment" onChange={handleFileInput} className="hidden" />
              📷 カメラで撮影
            </label>
          </div>
          <p className="text-xs text-slate-400">PDF / JPEG / PNG 対応</p>
        </div>
      </div>

      {/* File list */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">アップロードファイル</h2>
            <Button onClick={processAll} disabled={items.every((i) => i.status !== "pending")}>
              すべて読み取り開始
            </Button>
          </div>

          {items.map((item, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.file.name}</p>
                    <p className="text-xs text-slate-400">{(item.file.size / 1024).toFixed(0)} KB</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {item.status === "pending" && (
                      <Button size="sm" onClick={() => processItem(i)}>読み取り開始</Button>
                    )}
                    {item.status === "processing" && (
                      <span className="text-sm text-blue-600 flex items-center gap-1">
                        <span className="animate-spin">⏳</span> AIが読取中...
                      </span>
                    )}
                    {item.status === "completed" && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                          {TYPE_LABELS[item.detectedType || ""] || "読取完了"}
                        </span>
                        <Button size="sm" onClick={() => router.push(`/input/upload/${item.ocrId}/review`)}>
                          結果を確認・反映
                        </Button>
                      </div>
                    )}
                    {item.status === "failed" && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-red-600 max-w-64 truncate">❌ {item.error}</span>
                        <Button size="sm" variant="outline" onClick={() => {
                          setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: "pending", error: undefined } : it));
                        }}>再試行</Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Past OCR History */}
      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">読取履歴</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-4 py-2 text-left font-medium text-slate-600">ファイル名</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 w-28">検出種別</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 w-20">状態</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 w-28">日時</th>
                  <th className="px-4 py-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b">
                    <td className="px-4 py-2 text-slate-700">{h.fileName}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{TYPE_LABELS[h.documentType] || h.documentType}</span>
                    </td>
                    <td className="px-4 py-2">
                      {h.status === "completed" && <span className="text-xs text-emerald-600">✅ 完了</span>}
                      {h.status === "confirmed" && <span className="text-xs text-blue-600">📋 反映済</span>}
                      {h.status === "failed" && <span className="text-xs text-red-600">❌ 失敗</span>}
                      {h.status === "processing" && <span className="text-xs text-amber-600">⏳ 処理中</span>}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-400">{new Date(h.createdAt).toLocaleString("ja-JP")}</td>
                    <td className="px-4 py-2 text-right">
                      {(h.status === "completed" || h.status === "confirmed") && (
                        <Button size="sm" variant="outline" onClick={() => router.push(`/input/upload/${h.id}/review`)}>
                          確認
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
