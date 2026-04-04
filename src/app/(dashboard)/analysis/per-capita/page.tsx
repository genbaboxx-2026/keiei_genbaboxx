"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiscalYearSelector } from "@/components/layout/fiscal-year-selector";
import { useFiscalYearStore } from "@/store/fiscal-year-store";
import { formatNumber } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PerCapitaData {
  perCapita: { revenuePerEmployee: number; grossProfitPerEmployee: number; revenuePerFieldWorker: number; revenuePerSales: number };
  counts: { total: number; sales: number; construction: number; byCategory: Record<string, number> };
  attributions: { employeeId: string; name: string; revenue: number; grossProfit: number; projectCount: number }[];
  deptProductivity: { department: string; headcount: number; revenuePerCapita: number }[];
  hasProfiles: boolean;
}

const CAPACITY_LIMITS: Record<string, number> = { "営業": 250000000, "現場管理者": 300000000 };

export default function PerCapitaPage() {
  const { currentFiscalYear } = useFiscalYearStore();
  const [data, setData] = useState<PerCapitaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/analysis/per-capita?fiscal_year=${currentFiscalYear}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } catch { toast.error("データ取得に失敗しました"); }
    finally { setIsLoading(false); }
  }, [currentFiscalYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) return <div className="space-y-6"><h1 className="text-2xl font-bold text-slate-900">1人あたり分析</h1><p className="text-slate-500">読み込み中...</p></div>;

  const pc = data?.perCapita;
  const oku = (v: number) => (v / 100000000).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">1人あたり分析</h1>
        <FiscalYearSelector />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="1人あたり売上" value={pc ? `${oku(pc.revenuePerEmployee)}億` : "--"} sub={`全従業員${data?.counts.total || 0}名`} />
        <MetricCard label="1人あたり粗利" value={pc ? `${formatNumber(pc.grossProfitPerEmployee)}円` : "--"} />
        <MetricCard label="工事部員あたり売上" value={pc ? `${oku(pc.revenuePerFieldWorker)}億` : "--"} sub={`工事部${data?.counts.construction || 0}名`} />
        <MetricCard label="営業あたり売上" value={pc ? `${oku(pc.revenuePerSales)}億` : "--"} sub={`営業${data?.counts.sales || 0}名`} />
      </div>

      {/* Revenue Attribution */}
      <Card>
        <CardHeader><CardTitle className="text-base">担当者別売上</CardTitle></CardHeader>
        <CardContent>
          {data?.attributions && data.attributions.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-4 py-2 text-left font-medium text-slate-600">担当者</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">売上（万円）</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">粗利（万円）</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">件数</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">1件あたり</th>
                  <th className="px-4 py-2 font-medium text-slate-600 w-40">キャパ率</th>
                </tr>
              </thead>
              <tbody>
                {data.attributions.map((a) => {
                  const avgPerProject = a.projectCount > 0 ? Math.round(a.revenue / a.projectCount) : 0;
                  const capacityLimit = CAPACITY_LIMITS["営業"] || 250000000;
                  const capacityRate = (a.revenue / capacityLimit) * 100;
                  const capColor = capacityRate < 80 ? "bg-emerald-500" : capacityRate < 95 ? "bg-amber-400" : "bg-red-500";
                  return (
                    <tr key={a.employeeId} className="border-b">
                      <td className="px-4 py-2 font-medium">{a.name}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatNumber(Math.round(a.revenue / 10000))}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatNumber(Math.round(a.grossProfit / 10000))}</td>
                      <td className="px-4 py-2 text-right">{a.projectCount}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatNumber(Math.round(avgPerProject / 10000))}万</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${capColor}`} style={{ width: `${Math.min(capacityRate, 100)}%` }} />
                          </div>
                          <span className="text-xs tabular-nums w-12 text-right">{capacityRate.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-slate-400">
              売上按分データを入力すると、担当者別の分析ができます
              <Link href="/input/revenue-attribution" className="text-blue-600 underline ml-1">入力する →</Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Productivity */}
      {data?.deptProductivity && data.deptProductivity.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">部署別の生産性比較</CardTitle></CardHeader>
          <CardContent>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.deptProductivity} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 100000000).toFixed(1)}億`} />
                  <YAxis type="category" dataKey="department" width={70} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${formatNumber(v)}円`, "1人あたり売上"]} />
                  <Bar dataKey="revenuePerCapita" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
