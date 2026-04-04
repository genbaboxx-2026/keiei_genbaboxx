"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Factor { name: string; current_status: string; trend: string; growth_rate_estimate: Record<string, number>; confidence: string; reasoning: string; impact_on_demolition: string }
interface MarketData { factors: Factor[]; recommendations: string[]; summary: string }

const TREND_ICONS: Record<string, string> = { "上昇": "📈", "横ばい": "→", "下落": "📉" };
const CONF_COLORS: Record<string, string> = { high: "bg-emerald-100 text-emerald-700", medium: "bg-amber-100 text-amber-700", low: "bg-red-100 text-red-700" };

export default function MarketAnalysisPage() {
  const [data, setData] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const analyze = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/market-trends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const json = await res.json();
      if (res.ok && json.data?.factors) { setData(json.data); toast.success("市場分析が完了しました"); }
      else if (json.data?.raw) { setData(null); toast.info("分析結果のパースに失敗しました"); }
      else toast.error(json.error?.message || "分析に失敗しました");
    } catch { toast.error("分析に失敗しました"); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">市場動向分析</h1>
        <Button onClick={analyze} disabled={isLoading}>{isLoading ? "分析中..." : "市場分析を実行"}</Button>
      </div>

      {data?.summary && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4"><p className="text-sm text-blue-800">{data.summary}</p></CardContent>
        </Card>
      )}

      {data?.factors && data.factors.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.factors.map((f, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{f.name}</CardTitle>
                  <div className="flex gap-2">
                    <span className="text-lg">{TREND_ICONS[f.trend] || "→"}</span>
                    <Badge className={CONF_COLORS[f.confidence] || ""}>{f.confidence === "high" ? "高" : f.confidence === "medium" ? "中" : "低"}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-slate-600">{f.current_status}</p>
                {f.growth_rate_estimate && (
                  <div className="flex gap-4 text-xs">
                    {Object.entries(f.growth_rate_estimate).map(([period, rate]) => (
                      <span key={period} className="bg-slate-100 px-2 py-1 rounded">{period}: <strong>{rate > 0 ? "+" : ""}{rate}%</strong></span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-500">{f.reasoning}</p>
                <p className="text-xs text-blue-600">{f.impact_on_demolition}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !isLoading ? (
        <Card><CardContent className="p-8 text-center text-slate-400">[市場分析を実行] ボタンでAI分析を開始してください</CardContent></Card>
      ) : null}

      {data?.recommendations && data.recommendations.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">推奨アクション</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1">{data.recommendations.map((r, i) => <li key={i} className="text-sm text-slate-600">💡 {r}</li>)}</ul>
            <Link href="/simulation/future" className="inline-block mt-3"><Button variant="outline" size="sm">シミュレーションに反映 →</Button></Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
