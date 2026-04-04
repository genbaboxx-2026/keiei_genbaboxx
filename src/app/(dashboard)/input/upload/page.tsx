"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DOC_TYPES = [
  { value: "pl", label: "損益計算書（PL）" },
  { value: "bs", label: "貸借対照表（BS）" },
  { value: "depreciation", label: "減価償却明細" },
  { value: "payroll", label: "賃金台帳" },
  { value: "other", label: "その他" },
];

interface UploadItem {
  file: File;
  documentType: string;
  status: "pending" | "processing" | "completed" | "failed";
  ocrId?: string;
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultDocType = searchParams.get("type") || "pl";
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: UploadItem[] = Array.from(files).map((file) => ({
      file,
      documentType: defaultDocType,
      status: "pending" as const,
    }));
    setItems((prev) => [...prev, ...newItems]);
  }, [defaultDocType]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
  };

  const updateItemDocType = (index: number, docType: string) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, documentType: docType } : item));
  };

  const processItem = async (index: number) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, status: "processing" } : item));

    const item = items[index];
    const formData = new FormData();
    formData.append("file", item.file);
    formData.append("documentType", item.documentType);

    try {
      const res = await fetch("/api/ocr/extract", { method: "POST", body: formData });
      const json = await res.json();

      if (res.ok && json.data?.status === "completed") {
        setItems((prev) => prev.map((it, i) => i === index ? { ...it, status: "completed", ocrId: json.data.id } : it));
        toast.success(`${item.file.name} の読取が完了しました`);
      } else {
        setItems((prev) => prev.map((it, i) => i === index ? { ...it, status: "failed", error: json.data?.error || json.error?.message || "読取失敗" } : it));
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
      <h1 className="text-2xl font-bold text-slate-900">OCR読取・ファイル入力</h1>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-white"}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="space-y-3">
          <p className="text-slate-500">ファイルをドラッグ&ドロップ、または</p>
          <div className="flex justify-center gap-3">
            <label className="cursor-pointer">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleFileInput} className="hidden" />
              <Button variant="outline" asChild><span>ファイルを選択</span></Button>
            </label>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" capture="environment" onChange={handleFileInput} className="hidden" />
              <Button variant="outline" asChild><span>📷 カメラで撮影</span></Button>
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

                  <Select value={item.documentType} onValueChange={(v) => updateItemDocType(i, v)}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map((dt) => (
                        <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2 w-36">
                    {item.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => processItem(i)}>読み取り</Button>
                    )}
                    {item.status === "processing" && (
                      <span className="text-sm text-blue-600 flex items-center gap-1">
                        <span className="animate-spin">⏳</span> 読取中...
                      </span>
                    )}
                    {item.status === "completed" && (
                      <Button size="sm" onClick={() => router.push(`/input/upload/${item.ocrId}/review`)}>
                        ✅ 結果を確認
                      </Button>
                    )}
                    {item.status === "failed" && (
                      <span className="text-sm text-red-600">❌ {item.error}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
