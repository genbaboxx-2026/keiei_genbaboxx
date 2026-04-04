"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFiscalYearStore } from "@/store/fiscal-year-store";

interface Insight { title: string; priority: string; category: string; description: string; expected_impact: string; action_items: string[]; data_basis: string }
interface InsightData { insights: Insight[]; overall_assessment: string; risk_warnings: string[] }

const PRIORITY_COLORS: Record<string, string> = { high: "bg-red-100 text-red-700", medium: "bg-amber-100 text-amber-700", low: "bg-blue-100 text-blue-700" };
const CATEGORY_LABELS: Record<string, string> = { cost_reduction: "コスト削減", revenue_growth: "売上拡大", risk_management: "リスク管理", efficiency: "効率化" };

export default function AiInsightsPage() {
  const { currentFiscalYear } = useFiscalYearStore();
  const [data, setData] = useState<InsightData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/ai/insights?fiscal_year=${currentFiscalYear}`);
      const json = await res.json();
      if (res.ok && json.data?.insights) setData(json.data);
    } catch { /* no cached insights */ }
    finally { setIsLoading(false); }
  }, [currentFiscalYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/ai/insights?fiscal_year=${currentFiscalYear}`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.data?.insights) { setData(json.data); toast.success("インサイトを生成しました"); }
      else toast.error(json.error?.message || "生成に失敗しました");
    } catch { toast.error("生成に失敗しました"); }
    finally { setIsGenerating(false); }
  };

  if (isLoading) return <div className="space-y-6"><h1 className="text-2xl font-bold text-slate-900">AI経営提案</h1><p className="text-slate-500">読み込み中...</p></div>;

  const sortedInsights = data?.insights ? [...data.insights].sort((a, b) => { const p = { high: 0, medium: 1, low: 2 }; return (p[a.priority as keyof typeof p] ?? 3) - (p[b.priority as keyof typeof p] ?? 3); }) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">AI経営提案</h1>
        <Button onClick={generate} disabled={isGenerating}>{isGenerating ? "生成中..." : "インサイトを更新"}</Button>
      </div>

      {data?.overall_assessment && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4"><p className="text-sm text-blue-800"><strong>全体評価:</strong> {data.overall_assessment}</p></CardContent>
        </Card>
      )}

      {data?.risk_warnings && data.risk_warnings.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-sm font-bold text-red-700 mb-2">リスク警告</p>
            <ul className="space-y-1">{data.risk_warnings.map((w, i) => <li key={i} className="text-sm text-red-600">⚠️ {w}</li>)}</ul>
          </CardContent>
        </Card>
      )}

      {sortedInsights.length > 0 ? (
        <div className="space-y-4">
          {sortedInsights.map((insight, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{insight.title}</CardTitle>
                  <div className="flex gap-2 flex-shrink-0">
                    <Badge className={PRIORITY_COLORS[insight.priority] || ""}>{insight.priority === "high" ? "高" : insight.priority === "medium" ? "中" : "低"}</Badge>
                    <Badge variant="outline">{CATEGORY_LABELS[insight.category] || insight.category}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">{insight.description}</p>
                {insight.expected_impact && <p className="text-sm"><strong className="text-emerald-600">期待効果:</strong> {insight.expected_impact}</p>}
                {insight.action_items?.length > 0 && (
                  <div><p className="text-xs font-medium text-slate-500 mb-1">アクション項目:</p><ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">{insight.action_items.map((a, j) => <li key={j}>{a}</li>)}</ul></div>
                )}
                {insight.data_basis && <p className="text-xs text-slate-400">根拠: {insight.data_basis}</p>}
                <div className="flex gap-2 pt-2">
                  <Link href="/simulation/what-if"><Button variant="outline" size="sm">シミュレーション →</Button></Link>
                  <Link href={`/ai/chat?q=${encodeURIComponent(insight.title + "について詳しく教えてください")}`}><Button variant="outline" size="sm">詳しくAIに聞く →</Button></Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="p-8 text-center text-slate-400">[インサイトを更新] ボタンでAI分析を実行してください</CardContent></Card>
      )}
    </div>
  );
}
