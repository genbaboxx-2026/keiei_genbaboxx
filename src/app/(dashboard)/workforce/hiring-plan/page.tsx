"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFiscalYearStore } from "@/store/fiscal-year-store";
import { FiscalYearSelector } from "@/components/layout/fiscal-year-selector";
import { formatNumber } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface HiringRow { year: number; targetRevenue: number; activeCount: number; totalPower: number; revenuePerPerson: number; neededIdeal: number; retirees: number; newHires: number; hiringCost: number }

export default function HiringPlanPage() {
  const { currentFiscalYear } = useFiscalYearStore();
  const [growthRate, setGrowthRate] = useState(5);
  const [idealRevenue, setIdealRevenue] = useState(250000000);
  const [subcontractRatio, setSubcontractRatio] = useState(16.5);
  const [salaryGrowth, setSalaryGrowth] = useState(2);
  const [simYears, setSimYears] = useState(15);
  const [rows, setRows] = useState<HiringRow[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const run = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/workforce/hiring-plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiscal_year: currentFiscalYear, simulation_years: simYears, growth_rate: growthRate, ideal_revenue: idealRevenue, subcontract_ratio: subcontractRatio, salary_growth: salaryGrowth }),
      });
      const json = await res.json();
      if (res.ok) { setRows(json.data.rows); setTotalCost(json.data.totalHiringCost); }
      else toast.error(json.error?.message || "計算に失敗しました");
    } catch { toast.error("失敗しました"); }
    finally { setIsRunning(false); }
  };

  const costChartData = rows.filter(r => r.hiringCost > 0).map(r => ({ year: String(r.year), cost: r.hiringCost / 10000 }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">採用計画シミュレーション</h1>
        <FiscalYearSelector />
      </div>

      {/* Settings */}
      <Card>
        <CardHeader><CardTitle className="text-base">前提条件</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1"><Label className="text-xs">目標売上成長率(%/年)</Label><Input type="number" value={growthRate} onChange={e => setGrowthRate(Number(e.target.value))} className="w-24" step={0.5} /></div>
            <div className="space-y-1"><Label className="text-xs">1人あたり理想売上(円)</Label><Input type="number" value={idealRevenue} onChange={e => setIdealRevenue(Number(e.target.value))} className="w-36" /><span className="text-[10px] text-slate-400">{(idealRevenue / 100000000).toFixed(2)}億</span></div>
            <div className="space-y-1"><Label className="text-xs">他社施工比率(%)</Label><Input type="number" value={subcontractRatio} onChange={e => setSubcontractRatio(Number(e.target.value))} className="w-24" step={0.5} /></div>
            <div className="space-y-1"><Label className="text-xs">昇給率(%/年)</Label><Input type="number" value={salaryGrowth} onChange={e => setSalaryGrowth(Number(e.target.value))} className="w-24" step={0.5} /></div>
            <div className="space-y-1"><Label className="text-xs">シミュレーション期間(年)</Label><Input type="number" value={simYears} onChange={e => setSimYears(Number(e.target.value))} className="w-24" min={1} max={30} /></div>
          </div>
          <Button className="mt-4" onClick={run} disabled={isRunning}>{isRunning ? "計算中..." : "シミュレーション実行"}</Button>
        </CardContent>
      </Card>

      {/* Result Table */}
      {rows.length > 0 && (
        <>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="text-xs min-w-[900px]">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-2 py-1.5 text-left font-medium text-slate-600 sticky left-0 bg-slate-50 w-32">項目</th>
                    {rows.map(r => <th key={r.year} className="px-2 py-1.5 text-center font-medium text-slate-600 w-16">{r.year}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <TableRow label="目標売上(万)" values={rows.map(r => formatNumber(Math.round(r.targetRevenue / 10000)))} />
                  <TableRow label="在籍人数" values={rows.map(r => String(r.activeCount))} />
                  <TableRow label="1人売上(万)" values={rows.map(r => formatNumber(Math.round(r.revenuePerPerson / 10000)))} />
                  <TableRow label="必要人数(理想)" values={rows.map(r => String(r.neededIdeal))} highlight />
                  <TableRow label="組織パワー" values={rows.map(r => String(r.totalPower))} />
                  <TableRow label="退職者数" values={rows.map(r => r.retirees > 0 ? `${r.retirees}` : "-")} danger />
                  <TableRow label="新規採用数" values={rows.map(r => r.newHires > 0 ? `+${r.newHires}` : "-")} highlight />
                  <TableRow label="採用コスト(万)" values={rows.map(r => r.hiringCost > 0 ? formatNumber(Math.round(r.hiringCost / 10000)) : "-")} />
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Cost chart */}
          {costChartData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">年度別採用コスト（{simYears}年間累計: {formatNumber(Math.round(totalCost / 10000))}万円）</CardTitle></CardHeader>
              <CardContent>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={v => `${v}万`} />
                      <Tooltip formatter={(v) => [`${v}万円`, "採用コスト"]} />
                      <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function TableRow({ label, values, highlight, danger }: { label: string; values: string[]; highlight?: boolean; danger?: boolean }) {
  return (
    <tr className="border-b">
      <td className={`px-2 py-1 sticky left-0 bg-white font-medium text-slate-600 ${highlight ? "text-blue-600" : ""} ${danger ? "text-red-600" : ""}`}>{label}</td>
      {values.map((v, i) => <td key={i} className={`px-2 py-1 text-center tabular-nums ${highlight ? "font-bold text-blue-600" : ""} ${danger && v !== "-" ? "text-red-600" : ""}`}>{v}</td>)}
    </tr>
  );
}
