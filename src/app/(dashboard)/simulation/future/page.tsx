"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useFiscalYearStore } from "@/store/fiscal-year-store";
import { FiscalYearSelector } from "@/components/layout/fiscal-year-selector";
import { formatNumber } from "@/lib/format";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

interface Projection { year: number; revenue: number; cogsTotal: number; grossProfit: number; sgaTotal: number; operatingProfit: number; cogsRatio: number; grossMarginRate: number; operatingMarginRate: number }

const RATE_DEFS = [
  { key: "laborCost", label: "人件費上昇率", default: 2.5, ref: "CPI: 2.1%" },
  { key: "fuelCost", label: "燃料費変動率", default: 3.0, ref: "軽油: +2.8%" },
  { key: "wasteCost", label: "産廃処分費変動率", default: 4.0, ref: "環境省: +3.5%" },
  { key: "subcontractCost", label: "外注費変動率", default: 2.0, ref: "建設業: +1.8%" },
  { key: "cpi", label: "物価上昇率", default: 2.0, ref: "CPI: 2.1%" },
  { key: "revenueGrowth", label: "売上成長率", default: 5.0, ref: "-" },
];

export default function FutureSimulationPage() {
  const { currentFiscalYear } = useFiscalYearStore();
  const [rates, setRates] = useState<Record<string, number>>(Object.fromEntries(RATE_DEFS.map(d => [d.key, d.default])));
  const [years, setYears] = useState(5);
  const [projections, setProjections] = useState<Projection[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState("");

  const run = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/simulations/future-projection", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiscal_year: currentFiscalYear, simulation_years: years, growth_rates: rates }),
      });
      const json = await res.json();
      if (res.ok) { setProjections(json.data.projections); }
      else toast.error(json.error?.message || "シミュレーションに失敗しました");
    } catch { toast.error("シミュレーションに失敗しました"); }
    finally { setIsRunning(false); }
  };

  const save = async () => {
    const res = await fetch("/api/simulations/future-projection", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fiscal_year: currentFiscalYear, simulation_years: years, growth_rates: rates, save_name: saveName }),
    });
    if (res.ok) { toast.success("シナリオを保存しました"); setShowSave(false); }
    else toast.error("保存に失敗しました");
  };

  const dangerYear = projections.find(p => p.operatingProfit < 0);
  const chartData = projections.map(p => ({ ...p, revenue: p.revenue / 100000000, grossProfit: p.grossProfit / 100000000, operatingProfit: p.operatingProfit / 100000000 }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">将来予測シミュレーション</h1>
        <FiscalYearSelector />
      </div>

      {/* Rate settings */}
      <Card>
        <CardHeader><CardTitle className="text-base">変動率設定</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {RATE_DEFS.map(d => (
              <div key={d.key} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>{d.label}</Label>
                  <span className="text-xs text-slate-400">{d.ref}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Slider value={[rates[d.key]]} onValueChange={(v) => setRates(p => ({ ...p, [d.key]: v[0] }))} min={0} max={10} step={0.5} className="flex-1" />
                  <Input type="number" value={rates[d.key]} onChange={e => setRates(p => ({ ...p, [d.key]: Number(e.target.value) || 0 }))} className="w-16 text-right text-sm" step={0.5} />
                  <span className="text-xs text-slate-400">%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm">期間:</Label>
              <Select value={String(years)} onValueChange={v => setYears(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 3, 5, 10].map(y => <SelectItem key={y} value={String(y)}>{y}年後まで</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={run} disabled={isRunning}>{isRunning ? "計算中..." : "シミュレーション実行"}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {projections.length > 0 && (
        <>
          {dangerYear && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              ⚠️ 現在のコスト構造のまま売上を伸ばしても、<strong>{dangerYear.year}年度</strong>には営業利益がマイナスになる見込みです。
              <a href="/ai/chat?q=将来予測で営業利益がマイナスになる見込みです。改善策を教えてください"><Button variant="ghost" size="sm" className="ml-2 text-red-600">AIに改善策を相談する →</Button></a>
            </div>
          )}

          {/* Chart */}
          <Card>
            <CardContent className="pt-6">
              <div style={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={v => `${v}億`} />
                    <Tooltip formatter={(v) => `${Number(v).toFixed(2)}億円`} />
                    <Legend />
                    <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="revenue" name="売上高" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="grossProfit" name="粗利額" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="operatingProfit" name="営業利益" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-4 py-2 text-left font-medium text-slate-600">年度</th>
                    <th className="px-4 py-2 text-right font-medium text-slate-600">売上高</th>
                    <th className="px-4 py-2 text-right font-medium text-slate-600">原価率</th>
                    <th className="px-4 py-2 text-right font-medium text-slate-600">粗利率</th>
                    <th className="px-4 py-2 text-right font-medium text-slate-600">営業利益</th>
                    <th className="px-4 py-2 text-right font-medium text-slate-600">営業利益率</th>
                  </tr>
                </thead>
                <tbody>
                  {projections.map((p, i) => (
                    <tr key={p.year} className={`border-b ${p.operatingProfit < 0 ? "bg-red-50" : i === 0 ? "bg-blue-50" : ""}`}>
                      <td className="px-4 py-2 font-medium">{p.year}{i === 0 ? " (実績)" : ""}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatNumber(p.revenue)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{p.cogsRatio}%</td>
                      <td className="px-4 py-2 text-right tabular-nums">{p.grossMarginRate}%</td>
                      <td className={`px-4 py-2 text-right tabular-nums ${p.operatingProfit < 0 ? "text-red-600 font-bold" : ""}`}>{formatNumber(p.operatingProfit)}</td>
                      <td className={`px-4 py-2 text-right tabular-nums ${p.operatingMarginRate < 0 ? "text-red-600" : ""}`}>{p.operatingMarginRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => { setSaveName(`将来予測 ${years}年 - ${new Date().toLocaleDateString("ja-JP")}`); setShowSave(true); }}>
              このシナリオを保存
            </Button>
          </div>

          <Dialog open={showSave} onOpenChange={setShowSave}>
            <DialogContent>
              <DialogHeader><DialogTitle>シナリオを保存</DialogTitle></DialogHeader>
              <Input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="シナリオ名" />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSave(false)}>キャンセル</Button>
                <Button onClick={save}>保存</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
