"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiscalYearSelector } from "@/components/layout/fiscal-year-selector";
import { useFiscalYearStore } from "@/store/fiscal-year-store";
import { formatNumber } from "@/lib/format";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, AreaChart, Area, ReferenceLine, Legend } from "recharts";

interface WfData {
  kpi: { totalCount: number; avgAge: number | null; totalPower: number; maxPower: number; powerRate: number; revenuePerEmployee: number };
  employees: { id: string; name: string; age: number | null; coefficient: number | null; dailyCost: number; position: string }[];
  powerProjection: { year: number; power: number; activeCount: number; requiredPower: number }[];
  retirementAlerts: { name: string; year: number; age: number; position: string; coefficient: number | null }[];
}

export default function WorkforceDashboardPage() {
  const { currentFiscalYear } = useFiscalYearStore();
  const [data, setData] = useState<WfData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/workforce/dashboard?fiscal_year=${currentFiscalYear}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } catch { toast.error("取得に失敗しました"); }
    finally { setIsLoading(false); }
  }, [currentFiscalYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) return <div className="space-y-6"><h1 className="text-2xl font-bold text-slate-900">要員計画</h1><p className="text-slate-500">読み込み中...</p></div>;

  const kpi = data?.kpi;
  const scatterData = (data?.employees || []).filter(e => e.age != null && e.coefficient != null).map(e => ({ name: e.name, age: e.age!, coefficient: e.coefficient!, cost: e.dailyCost, position: e.position }));
  const gapYear = data?.powerProjection?.find(p => p.power < p.requiredPower && p.year > new Date().getFullYear());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">要員計画ダッシュボード</h1>
        <FiscalYearSelector />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="従業員数" value={`${kpi?.totalCount || 0}名`} />
        <KpiCard label="平均年齢" value={kpi?.avgAge != null ? `${kpi.avgAge}歳` : "未設定"} />
        <KpiCard label="組織パワー" value={kpi ? `${kpi.totalPower}/${kpi.maxPower}` : "--"} sub={kpi ? `(${kpi.powerRate}%)` : ""} />
        <KpiCard label="1人あたり売上" value={kpi ? `${(kpi.revenuePerEmployee / 100000000).toFixed(2)}億` : "--"} />
      </div>

      {/* Scatter Chart: Age vs Performance */}
      <Card>
        <CardHeader><CardTitle className="text-base">従業員年齢マップ</CardTitle></CardHeader>
        <CardContent>
          {scatterData.length > 0 ? (
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="age" name="年齢" domain={[20, 70]} label={{ value: "年齢", position: "bottom" }} />
                  <YAxis type="number" dataKey="coefficient" name="パフォーマンス" domain={[0, 1.1]} />
                  <ZAxis type="number" dataKey="cost" range={[50, 400]} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload;
                    return <div className="bg-white border rounded p-2 text-xs shadow"><p className="font-bold">{d.name}</p><p>{d.position} / {d.age}歳</p><p>係数: {d.coefficient}</p><p>日割: ¥{formatNumber(d.cost)}</p></div>;
                  }} />
                  <Scatter data={scatterData} fill="#3b82f6" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400">
              従業員プロファイルを入力すると表示されます <Link href="/input/employee-profiles" className="text-blue-600 underline ml-1">入力する →</Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Power Projection */}
      <Card>
        <CardHeader><CardTitle className="text-base">組織パワー推移予測</CardTitle></CardHeader>
        <CardContent>
          {data?.powerProjection && data.powerProjection.length > 0 ? (
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.powerProjection}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="power" name="組織パワー" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" strokeWidth={2} />
                  <Area type="monotone" dataKey="requiredPower" name="必要パワー" fill="none" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" />
                  {gapYear && <ReferenceLine x={gapYear.year} stroke="#ef4444" strokeWidth={2} label={{ value: `⚠️${gapYear.year}`, fill: "#ef4444", fontSize: 11 }} />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400">プロファイルデータが必要です</div>
          )}
        </CardContent>
      </Card>

      {/* Retirement Alerts */}
      {data?.retirementAlerts && data.retirementAlerts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base text-red-600">退職アラート（5年以内）</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.retirementAlerts.map((a, i) => (
                <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                  ⚠️ <strong>{a.year}年</strong>: {a.name}さん（{a.age}歳 / {a.position}）の退職{a.coefficient != null && `によりパワーが${a.coefficient.toFixed(2)}低下`}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Link href="/workforce/timeline"><Button variant="outline">タイムライン →</Button></Link>
        <Link href="/workforce/hiring-plan"><Button variant="outline">採用計画 →</Button></Link>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <Card><CardContent className="p-4"><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>{sub && <p className="text-xs text-slate-400">{sub}</p>}</CardContent></Card>;
}
