"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CurveRow { id: string; position: string; ageFrom: number; ageTo: number; coefficient: number; _dirty?: boolean }

const COLORS: Record<string, string> = { "重機オペレーター": "#3b82f6", "手元作業員": "#f59e0b", "営業": "#10b981", "現場管理者": "#8b5cf6" };

export default function PerformanceCurvesPage() {
  const [curves, setCurves] = useState<CurveRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/performance-curves");
      const json = await res.json();
      if (res.ok) setCurves(json.data.map((c: CurveRow) => ({ ...c, _dirty: false })));
    } catch { toast.error("取得に失敗しました"); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const update = (id: string, coefficient: number) => {
    setCurves(prev => prev.map(c => c.id === id ? { ...c, coefficient, _dirty: true } : c));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const dirty = curves.filter(c => c._dirty);
    if (dirty.length === 0) { toast.info("変更はありません"); setIsSaving(false); return; }
    try {
      const res = await fetch("/api/performance-curves", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: dirty.map(c => ({ id: c.id, coefficient: c.coefficient })) }) });
      if (res.ok) { toast.success("保存しました"); await fetchData(); }
    } catch { toast.error("保存に失敗しました"); }
    finally { setIsSaving(false); }
  };

  const handleReset = async () => {
    await fetch("/api/performance-curves/reset", { method: "POST" });
    toast.success("デフォルトに戻しました");
    await fetchData();
  };

  // Chart data: points at midpoint of each age bracket
  const positions = [...new Set(curves.map(c => c.position))];
  const chartPositions = positions.filter(p => COLORS[p]);
  const ages = Array.from({ length: 53 }, (_, i) => i + 18);
  const chartData = ages.map(age => {
    const point: Record<string, number> = { age };
    for (const pos of chartPositions) {
      const bracket = curves.find(c => c.position === pos && age >= c.ageFrom && age <= c.ageTo);
      point[pos] = bracket?.coefficient ?? 0;
    }
    return point;
  });

  if (isLoading) return <div className="space-y-6"><h1 className="text-2xl font-bold text-slate-900">パフォーマンス曲線設定</h1><p className="text-slate-500">読み込み中...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">パフォーマンス曲線設定</h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset}>デフォルトに戻す</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "保存中..." : "保存"}</Button>
        </div>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">年齢-パフォーマンス曲線</CardTitle></CardHeader>
        <CardContent>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="age" label={{ value: "年齢", position: "bottom" }} />
                <YAxis domain={[0, 1.1]} label={{ value: "係数", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                {chartPositions.map(pos => (
                  <Line key={pos} type="stepAfter" dataKey={pos} name={pos} stroke={COLORS[pos]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table per position */}
      {positions.map(pos => (
        <Card key={pos}>
          <CardHeader><CardTitle className="text-sm">{pos}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-4 py-1.5 text-left font-medium text-slate-600">年齢帯</th>
                  <th className="px-4 py-1.5 text-center font-medium text-slate-600 w-24">係数</th>
                </tr>
              </thead>
              <tbody>
                {curves.filter(c => c.position === pos).map(c => (
                  <tr key={c.id} className="border-b">
                    <td className="px-4 py-1 text-slate-600">{c.ageFrom}〜{c.ageTo}歳</td>
                    <td className="px-4 py-0.5 text-center">
                      <Input type="number" value={c.coefficient} onChange={e => update(c.id, Number(e.target.value))} className="h-7 text-xs text-center w-20 mx-auto" step={0.05} min={0} max={1} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
