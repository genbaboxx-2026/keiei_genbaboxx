"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFiscalYearStore } from "@/store/fiscal-year-store";
import { FiscalYearSelector } from "@/components/layout/fiscal-year-selector";
import { formatNumber } from "@/lib/format";

interface RevenueResult {
  type: "revenue";
  current: Record<string, number>;
  projected: Record<string, number>;
}

interface ProfitResult {
  type: "profit_margin";
  current: Record<string, number>;
  projected: { targetGrossMarginRate: number; allowableCogs: number; reductionNeeded: number; projectedGrossProfit: number; projectedOperatingProfit: number; costItems: { key: string; value: number; ratio: number; targetValue: number; reduction: number }[] };
}

export default function TargetSimulationPage() {
  const { currentFiscalYear } = useFiscalYearStore();
  const [targetRevenue, setTargetRevenue] = useState(1200000000);
  const [targetMargin, setTargetMargin] = useState(20);
  const [revenueResult, setRevenueResult] = useState<RevenueResult | null>(null);
  const [profitResult, setProfitResult] = useState<ProfitResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runReverse = async (type: "revenue" | "profit_margin") => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/simulations/target-reverse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiscal_year: currentFiscalYear, target_type: type, target_value: type === "revenue" ? targetRevenue : targetMargin }),
      });
      const json = await res.json();
      if (res.ok) {
        if (type === "revenue") setRevenueResult(json.data);
        else setProfitResult(json.data);
      } else toast.error(json.error?.message || "計算に失敗しました");
    } catch { toast.error("計算に失敗しました"); }
    finally { setIsRunning(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">目標逆算</h1>
        <FiscalYearSelector />
      </div>

      <Tabs defaultValue="revenue">
        <TabsList>
          <TabsTrigger value="revenue">売上目標からの逆算</TabsTrigger>
          <TabsTrigger value="margin">利益率目標からの逆算</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-end gap-4">
                <div className="space-y-1">
                  <Label>目標売上高</Label>
                  <Input type="number" value={targetRevenue} onChange={e => setTargetRevenue(Number(e.target.value) || 0)} className="w-48" />
                </div>
                <span className="text-sm text-slate-500 pb-2">円（{(targetRevenue / 100000000).toFixed(1)}億）</span>
                <Button onClick={() => runReverse("revenue")} disabled={isRunning}>{isRunning ? "計算中..." : "逆算実行"}</Button>
              </div>
            </CardContent>
          </Card>

          {revenueResult && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CompareCard title="現在" data={revenueResult.current} extra={null} />
              <CompareCard title="目標達成時" data={revenueResult.projected} extra={
                <div className="mt-3 space-y-1 text-sm">
                  <p className="text-blue-600 font-medium">追加必要リソース:</p>
                  <p>従業員: +{revenueResult.projected.additionalEmployees}名（計{revenueResult.projected.neededEmployees}名）</p>
                  <p>重機: +{revenueResult.projected.additionalMachines}台（計{revenueResult.projected.neededMachines}台）</p>
                </div>
              } />
            </div>
          )}
        </TabsContent>

        <TabsContent value="margin" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-end gap-4">
                <div className="space-y-1">
                  <Label>目標粗利率</Label>
                  <Input type="number" value={targetMargin} onChange={e => setTargetMargin(Number(e.target.value) || 0)} className="w-32" step={0.5} />
                </div>
                <span className="text-sm text-slate-500 pb-2">%</span>
                <Button onClick={() => runReverse("profit_margin")} disabled={isRunning}>{isRunning ? "計算中..." : "逆算実行"}</Button>
              </div>
            </CardContent>
          </Card>

          {profitResult && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">現在</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>売上原価: <strong>{formatNumber(profitResult.current.cogsTotal)}</strong></p>
                    <p>粗利率: <strong>{profitResult.current.grossMarginRate}%</strong></p>
                  </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50/30">
                  <CardHeader><CardTitle className="text-base">目標（粗利率{profitResult.projected.targetGrossMarginRate}%）</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>許容原価: <strong>{formatNumber(profitResult.projected.allowableCogs)}</strong></p>
                    <p>削減必要額: <strong className="text-red-600">{formatNumber(profitResult.projected.reductionNeeded)}</strong></p>
                    <p>予想営業利益: <strong className="text-emerald-600">{formatNumber(profitResult.projected.projectedOperatingProfit)}</strong></p>
                  </CardContent>
                </Card>
              </div>

              {profitResult.projected.reductionNeeded > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">各コスト項目の目標値</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="px-4 py-2 text-left font-medium text-slate-600">項目</th>
                          <th className="px-4 py-2 text-right font-medium text-slate-600">現在</th>
                          <th className="px-4 py-2 text-right font-medium text-slate-600">目標</th>
                          <th className="px-4 py-2 text-right font-medium text-slate-600">削減額</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profitResult.projected.costItems.filter(i => i.reduction > 0).map(item => (
                          <tr key={item.key} className="border-b">
                            <td className="px-4 py-1.5 text-slate-700">{item.key}</td>
                            <td className="px-4 py-1.5 text-right tabular-nums">{formatNumber(item.value)}</td>
                            <td className="px-4 py-1.5 text-right tabular-nums text-blue-600">{formatNumber(item.targetValue)}</td>
                            <td className="px-4 py-1.5 text-right tabular-nums text-red-600">-{formatNumber(item.reduction)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CompareCard({ title, data, extra }: { title: string; data: Record<string, number>; extra: React.ReactNode }) {
  const isProjected = title !== "現在";
  return (
    <Card className={isProjected ? "border-blue-200 bg-blue-50/30" : ""}>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-1 text-sm">
        <Row label="売上高" value={data.revenue} />
        <Row label="売上原価" value={data.cogsTotal} />
        <Row label="粗利" value={data.grossProfit} />
        <Row label="粗利率" value={data.grossMarginRate} isRate />
        <Row label="販管費" value={data.sgaTotal} />
        <Row label="営業利益" value={data.operatingProfit} highlight />
        <Row label="営業利益率" value={data.operatingMarginRate} isRate />
        {extra}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, isRate, highlight }: { label: string; value: number; isRate?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600">{label}</span>
      <span className={`tabular-nums ${highlight ? "font-bold text-lg" : ""}`}>{isRate ? `${value}%` : formatNumber(Math.round(value))}</span>
    </div>
  );
}
