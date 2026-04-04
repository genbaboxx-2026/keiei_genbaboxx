"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFiscalYearStore } from "@/store/fiscal-year-store";
import { FiscalYearSelector } from "@/components/layout/fiscal-year-selector";
import { generateDashboardPdf } from "@/lib/pdf/report-generator";

export default function ReportsPage() {
  const { currentFiscalYear } = useFiscalYearStore();
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const downloadPdf = async () => {
    setIsGenerating("pdf");
    try {
      const res = await fetch(`/api/dashboard?fiscal_year=${currentFiscalYear}`);
      const data = await res.json();
      if (!res.ok) { toast.error("データ取得に失敗しました"); return; }

      const insightRes = await fetch(`/api/ai/insights?fiscal_year=${currentFiscalYear}`);
      const insightData = await insightRes.json();
      const insights = insightData.data?.insights?.map((i: { title: string; description: string }) => `${i.title}: ${i.description}`) || [];

      const pdf = generateDashboardPdf({
        companyName: "企業",
        fiscalYear: currentFiscalYear,
        financial: data.financial,
        targets: data.targets,
        fiveStep: data.fiveStepResult?.step5,
        bsIndicators: data.bsIndicators,
        insights,
      });

      pdf.save(`経営レポート_${currentFiscalYear}.pdf`);
      toast.success("PDFをダウンロードしました");
    } catch { toast.error("PDF生成に失敗しました"); }
    finally { setIsGenerating(null); }
  };

  const downloadExcel = async () => {
    setIsGenerating("excel");
    try {
      const res = await fetch(`/api/reports/analysis-excel?fiscal_year=${currentFiscalYear}`);
      if (!res.ok) { toast.error("Excel生成に失敗しました"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `分析データ_${currentFiscalYear}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excelをダウンロードしました");
    } catch { toast.error("Excel生成に失敗しました"); }
    finally { setIsGenerating(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">レポート出力</h1>
        <FiscalYearSelector />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">📄 経営レポート（PDF）</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">財務KPI、5ステップ分析、経営指標、AIインサイトを含む経営サマリーレポート</p>
            <Button onClick={downloadPdf} disabled={isGenerating === "pdf"} className="w-full">
              {isGenerating === "pdf" ? "生成中..." : "PDFダウンロード"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">📊 分析データ（Excel）</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">PL/BS/コストマスタ/5ステップ分析の全データをExcelファイルで出力</p>
            <Button onClick={downloadExcel} disabled={isGenerating === "excel"} className="w-full">
              {isGenerating === "excel" ? "生成中..." : "Excelダウンロード"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
