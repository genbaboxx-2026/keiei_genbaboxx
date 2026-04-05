"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumber } from "@/lib/format";
import { JOB_CATEGORY_LABELS } from "@/types/employee";
import { useFiscalYearStore } from "@/store/fiscal-year-store";
import { SIZE_CATEGORIES, ATTACHMENT_TYPES } from "@/types/equipment";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface CostMasterEntry {
  id: string;
  category: string;
  subCategory: string;
  avgDailyCost: number;
  itemCount: number;
}

export default function CostMasterPage() {
  const [masters, setMasters] = useState<CostMasterEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const { currentFiscalYear: fiscalYear } = useFiscalYearStore();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/cost-masters?fiscal_year=${fiscalYear}`);
      const json = await res.json();
      if (res.ok) setMasters(json.data || []);
    } catch { toast.error("データ取得に失敗しました"); }
    finally { setIsLoading(false); }
  }, [fiscalYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const res = await fetch("/api/cost-masters/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiscalYear }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`コストマスタを再計算しました（${json.count}件）`);
        await fetchData();
      } else {
        toast.error(json.error?.message || "再計算に失敗しました");
      }
    } catch { toast.error("再計算に失敗しました"); }
    finally { setIsRecalculating(false); }
  };

  const laborData = masters.filter((m) => m.category === "labor");
  const machineData = masters.filter((m) => m.category === "heavy_machine");
  const attachmentData = masters.filter((m) => m.category === "attachment");
  const transportData = masters.filter((m) => m.category === "transport");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">コストマスタ</h1>
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">コストマスタ（自動生成結果）</h1>
          <p className="text-sm text-slate-500 mt-1">年度: {fiscalYear}年度</p>
        </div>
        <Button onClick={handleRecalculate} disabled={isRecalculating}>
          {isRecalculating ? "再計算中..." : "コストマスタを再計算"}
        </Button>
      </div>

      {masters.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-slate-400">
          コストマスタがまだ生成されていません。人工・重機データを入力後、「コストマスタを再計算」を実行してください。
        </div>
      ) : (
        <Tabs defaultValue="labor">
          <TabsList>
            <TabsTrigger value="labor">👷 人工</TabsTrigger>
            <TabsTrigger value="heavy_machine">🏗️ 重機</TabsTrigger>
            <TabsTrigger value="attachment">🔧 アタッチメント</TabsTrigger>
            <TabsTrigger value="transport">🚛 運搬</TabsTrigger>
          </TabsList>

          <TabsContent value="labor">
            <CostTable
              data={laborData.map((d) => ({
                label: JOB_CATEGORY_LABELS[d.subCategory as keyof typeof JOB_CATEGORY_LABELS] || d.subCategory,
                avgDailyCost: d.avgDailyCost,
                count: d.itemCount,
                countUnit: "名",
              }))}
              title="職種別人工原価"
            />
          </TabsContent>

          <TabsContent value="heavy_machine">
            <CostTable
              data={machineData.map((d) => ({
                label: d.subCategory,
                avgDailyCost: d.avgDailyCost,
                count: d.itemCount,
                countUnit: "台",
              }))}
              title="サイズ別重機原価"
            />
          </TabsContent>

          <TabsContent value="attachment">
            <AttachmentMatrix data={attachmentData} />
          </TabsContent>

          <TabsContent value="transport">
            <CostTable
              data={transportData.map((d) => ({
                label: d.subCategory,
                avgDailyCost: d.avgDailyCost,
                count: d.itemCount,
                countUnit: "台",
              }))}
              title="トン数別運搬原価"
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function CostTable({ data, title }: {
  data: { label: string; avgDailyCost: number; count: number; countUnit: string }[];
  title: string;
}) {
  const chartData = data.map((d) => ({ name: d.label, 原価: d.avgDailyCost }));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="px-4 py-2 text-left font-medium text-slate-600">{title}</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">平均原価/日</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">数量</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-b">
                <td className="px-4 py-2 text-slate-700">{d.label}</td>
                <td className="px-4 py-2 text-right tabular-nums font-bold">¥{formatNumber(d.avgDailyCost)}</td>
                <td className="px-4 py-2 text-right text-slate-500">{d.count}{d.countUnit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-4" style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`¥${formatNumber(Number(v))}`, "原価/日"]} />
              <Bar dataKey="原価" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function AttachmentMatrix({ data }: { data: CostMasterEntry[] }) {
  // Parse subCategory: "size__type"
  const matrix: Record<string, Record<string, number>> = {};
  for (const d of data) {
    const [size, type] = d.subCategory.split("__");
    if (!type) continue;
    if (!matrix[type]) matrix[type] = {};
    matrix[type][size] = d.avgDailyCost;
  }

  const types = [...new Set(data.map((d) => d.subCategory.split("__")[1]).filter(Boolean))];
  const sizes = SIZE_CATEGORIES as unknown as string[];

  if (types.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center text-slate-400">
        アタッチメントデータがありません
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50">
            <th className="px-3 py-2 text-left font-medium text-slate-600">種類＼サイズ</th>
            {sizes.map((s) => (
              <th key={s} className="px-3 py-2 text-right font-medium text-slate-600">{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {types.map((type) => (
            <tr key={type} className="border-b">
              <td className="px-3 py-2 text-slate-700 font-medium">{type}</td>
              {sizes.map((size) => (
                <td key={size} className="px-3 py-2 text-right tabular-nums">
                  {matrix[type]?.[size] != null ? formatNumber(matrix[type][size]) : <span className="text-slate-300">-</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
