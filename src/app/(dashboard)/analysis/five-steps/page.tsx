"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { formatNumber } from "@/lib/format";
import { GaugeChart } from "@/components/charts/gauge-chart";
import { DEFAULT_CLASSIFICATIONS, ITEM_KEY_TO_FIELD } from "@/lib/constants/default-cost-classifications";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Classification {
  itemKey: string;
  isGbCost: boolean;
}

interface AnalysisResult {
  step1: { gb_cost_total: number; non_gb_cost_total: number; statutory_welfare: number; misc_expenses: number; gb_cost_ratio: number; non_gb_cost_ratio: number };
  step2: { sga_total: number; fixed_expenses: number };
  step3: { cashout_capex: number; cashout_loan_repayment: number; cashout_other: number; total_cashout: number };
  step4: { target_operating_profit: number };
  step5: { required_gross_profit: number; target_gross_margin_rate: number; required_revenue: number; current_gross_margin_rate: number; required_margin_at_current_revenue: number; current_revenue: number };
}

const STEPS = [
  { num: 1, label: "GB原価の選択" },
  { num: 2, label: "固定的経費" },
  { num: 3, label: "PL外キャッシュアウト" },
  { num: 4, label: "目標営業利益" },
  { num: 5, label: "モデル化" },
];

const PIE_COLORS = ["#3b82f6", "#94a3b8", "#f59e0b", "#10b981"];

export default function FiveStepsPage() {
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [financialData, setFinancialData] = useState<Record<string, number>>({});
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [targetGrossMargin, setTargetGrossMargin] = useState(20);
  const [targetOperatingProfit, setTargetOperatingProfit] = useState(7000000);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const fiscalYear = new Date().getFullYear();

  // Fetch classifications and financial data
  const fetchData = useCallback(async () => {
    try {
      const [clsRes, finRes] = await Promise.all([
        fetch(`/api/cost-classifications?fiscal_year=${fiscalYear}`),
        fetch(`/api/financials?fiscal_year=${fiscalYear}`),
      ]);

      const clsJson = await clsRes.json();
      if (clsRes.ok && clsJson.data) {
        setClassifications(clsJson.data);
      }

      const finJson = await finRes.json();
      if (finRes.ok && finJson.data) {
        const d: Record<string, number> = {};
        for (const key of Object.keys(finJson.data)) {
          d[key] = Number(finJson.data[key] ?? 0);
        }
        setFinancialData(d);
      }
    } catch {
      toast.error("データ取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [fiscalYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Run analysis
  const runAnalysis = useCallback(async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/analysis/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fiscal_year: fiscalYear,
          target_gross_margin: targetGrossMargin,
          target_operating_profit: targetOperatingProfit,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setResult(json);
      } else {
        toast.error(json.error?.message || "分析に失敗しました");
      }
    } catch {
      toast.error("分析に失敗しました");
    } finally {
      setIsRunning(false);
    }
  }, [fiscalYear, targetGrossMargin, targetOperatingProfit]);

  // Auto-run on load if data exists
  useEffect(() => {
    if (!isLoading && financialData.revenue > 0) {
      runAnalysis();
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleClassification = async (itemKey: string, newValue: boolean) => {
    const updated = classifications.map((c) =>
      c.itemKey === itemKey ? { ...c, isGbCost: newValue } : c
    );
    setClassifications(updated);

    // Save to server
    await fetch("/api/cost-classifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fiscalYear,
        items: [{ itemKey, isGbCost: newValue }],
      }),
    });

    // Re-run analysis
    runAnalysis();
  };

  const handleReset = async () => {
    await fetch("/api/cost-classifications/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fiscalYear }),
    });
    toast.success("デフォルトに戻しました");
    await fetchData();
    runAnalysis();
  };

  // Local step1 calculation from classifications + financialData
  const step1Local = (() => {
    let gbTotal = 0, nonGbTotal = 0;
    for (const cls of classifications) {
      const fieldName = ITEM_KEY_TO_FIELD[cls.itemKey];
      if (!fieldName) continue;
      const val = financialData[fieldName] || 0;
      if (cls.isGbCost) gbTotal += val; else nonGbTotal += val;
    }
    const revenue = financialData.revenue || 0;
    const welfare = financialData.cogsStatutoryWelfare || 0;
    return {
      gbCost: gbTotal, nonGbCost: nonGbTotal,
      welfare, misc: nonGbTotal - welfare,
      gbRatio: revenue > 0 ? ((gbTotal / revenue) * 100).toFixed(1) : "0",
      nonGbRatio: revenue > 0 ? ((nonGbTotal / revenue) * 100).toFixed(1) : "0",
      welfareRatio: revenue > 0 ? ((welfare / revenue) * 100).toFixed(1) : "0",
      miscRatio: revenue > 0 ? (((nonGbTotal - welfare) / revenue) * 100).toFixed(1) : "0",
    };
  })();

  if (isLoading) {
    return <div className="space-y-6"><h1 className="text-2xl font-bold text-slate-900">5ステップ分析</h1><p className="text-slate-500">読み込み中...</p></div>;
  }

  if (!financialData.revenue) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">5ステップ分析</h1>
        <Card><CardContent className="p-8 text-center text-slate-400">
          決算データが入力されていません。<a href="/input/financials" className="text-blue-600 underline ml-1">決算データ入力</a>から先にデータを入力してください。
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">経営分析 ─ 5ステップモデル</h1>
        <Button onClick={runAnalysis} disabled={isRunning}>
          {isRunning ? "分析中..." : "再分析"}
        </Button>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <a href={`#step${s.num}`} className="flex flex-col items-center group">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${result ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"} group-hover:bg-blue-700 group-hover:text-white`}>
                {s.num}
              </div>
              <span className="text-xs text-slate-500 mt-1 whitespace-nowrap">{s.label}</span>
            </a>
            {i < STEPS.length - 1 && <div className="w-12 h-0.5 bg-slate-300 mx-1 mt-[-16px]" />}
          </div>
        ))}
      </div>

      {/* Step 1: GB原価の選択 */}
      <Card id="step1">
        <CardHeader><CardTitle className="text-lg">Step1: GB原価の選択</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "GB原価", value: step1Local.gbCost, ratio: step1Local.gbRatio, color: "border-blue-500" },
              { label: "GB原価以外", value: step1Local.nonGbCost, ratio: step1Local.nonGbRatio, color: "border-slate-400" },
              { label: "法定福利", value: step1Local.welfare, ratio: step1Local.welfareRatio, color: "border-amber-500" },
              { label: "諸経費", value: step1Local.misc, ratio: step1Local.miscRatio, color: "border-emerald-500" },
            ].map((c) => (
              <div key={c.label} className={`border-l-4 ${c.color} bg-white rounded-lg p-3 shadow-sm`}>
                <p className="text-xs text-slate-500">{c.label}</p>
                <p className="text-lg font-bold tabular-nums">{formatNumber(c.value)}</p>
                <p className="text-sm text-slate-400">{c.ratio}%</p>
              </div>
            ))}
          </div>

          {/* Pie chart + table side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "GB原価", value: step1Local.gbCost },
                      { name: "GB原価以外", value: step1Local.nonGbCost },
                    ]}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                  >
                    <Cell fill={PIE_COLORS[0]} />
                    <Cell fill={PIE_COLORS[1]} />
                  </Pie>
                  <Tooltip formatter={(v: number) => formatNumber(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-y-auto max-h-72 border rounded-md">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b sticky top-0">
                    <th className="px-3 py-1.5 text-left font-medium text-slate-600">項目</th>
                    <th className="px-3 py-1.5 text-right font-medium text-slate-600">金額</th>
                    <th className="px-3 py-1.5 text-right font-medium text-slate-600">比率</th>
                    <th className="px-3 py-1.5 text-center font-medium text-slate-600">GB原価？</th>
                  </tr>
                </thead>
                <tbody>
                  {classifications.map((cls) => {
                    const def = DEFAULT_CLASSIFICATIONS.find((d) => d.itemKey === cls.itemKey);
                    const fieldName = ITEM_KEY_TO_FIELD[cls.itemKey];
                    const amount = financialData[fieldName] || 0;
                    const revenue = financialData.revenue || 0;
                    const ratio = revenue > 0 ? ((amount / revenue) * 100).toFixed(2) : "-";
                    return (
                      <tr key={cls.itemKey} className="border-b">
                        <td className="px-3 py-1 text-slate-700">{def?.label || cls.itemKey}</td>
                        <td className="px-3 py-1 text-right tabular-nums">{formatNumber(amount)}</td>
                        <td className="px-3 py-1 text-right tabular-nums text-slate-400">{ratio}%</td>
                        <td className="px-3 py-1 text-center">
                          <Switch
                            checked={cls.isGbCost}
                            onCheckedChange={(v) => toggleClassification(cls.itemKey, v)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={handleReset}>デフォルトに戻す</Button>
        </CardContent>
      </Card>

      {/* Step 2: 固定的経費 */}
      <Card id="step2">
        <CardHeader><CardTitle className="text-lg">Step2: 固定的経費（販管費）</CardTitle></CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-sm text-blue-600 mb-1">固定的経費（販管費）</p>
            <p className="text-3xl font-bold text-blue-900 tabular-nums">{formatNumber(result?.step2.sga_total || 0)} 円</p>
          </div>
          <p className="text-xs text-slate-400 mt-2">※販管費の詳細は <a href="/input/financials" className="text-blue-600 underline">決算データ入力</a> で確認・編集できます</p>
        </CardContent>
      </Card>

      {/* Step 3: PL外キャッシュアウト */}
      <Card id="step3">
        <CardHeader><CardTitle className="text-lg">Step3: PL外キャッシュアウト</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-50 rounded p-3"><p className="text-xs text-slate-500">設備投資額</p><p className="text-lg font-bold tabular-nums">{formatNumber(result?.step3.cashout_capex || 0)}</p></div>
            <div className="bg-slate-50 rounded p-3"><p className="text-xs text-slate-500">借入金返済額</p><p className="text-lg font-bold tabular-nums">{formatNumber(result?.step3.cashout_loan_repayment || 0)}</p></div>
            <div className="bg-slate-50 rounded p-3"><p className="text-xs text-slate-500">その他</p><p className="text-lg font-bold tabular-nums">{formatNumber(result?.step3.cashout_other || 0)}</p></div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <p className="text-sm text-amber-600 mb-1">投資と返済に必要な金額</p>
            <p className="text-2xl font-bold text-amber-900 tabular-nums">{formatNumber(result?.step3.total_cashout || 0)} 円</p>
          </div>
        </CardContent>
      </Card>

      {/* Step 4: 目標営業利益 */}
      <Card id="step4">
        <CardHeader><CardTitle className="text-lg">Step4: 目標営業利益</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-sm">
            <Label>Step3以外に営業利益として残したい金額</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={targetOperatingProfit}
                onChange={(e) => setTargetOperatingProfit(Number(e.target.value) || 0)}
                className="w-48"
              />
              <span className="text-sm text-slate-500">円</span>
            </div>
            <p className="text-xs text-slate-400">入力するとStep5がリアルタイムに更新されます</p>
            <Button size="sm" onClick={runAnalysis} disabled={isRunning}>Step5を更新</Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 5: モデル化 */}
      <Card id="step5">
        <CardHeader><CardTitle className="text-lg">Step5: モデル化</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {result?.step5 && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Results table */}
                <div className="space-y-3">
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b">
                          <td className="px-4 py-3 text-slate-600">必要粗利額</td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums text-lg">{formatNumber(result.step5.required_gross_profit)} 円</td>
                        </tr>
                        <tr className="border-b bg-blue-50">
                          <td className="px-4 py-3 text-slate-600">
                            目標粗利率
                            <div className="mt-2">
                              <Slider
                                value={[targetGrossMargin]}
                                onValueChange={([v]) => setTargetGrossMargin(v)}
                                min={5} max={40} step={0.5}
                                className="w-full"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Input
                              type="number"
                              value={targetGrossMargin}
                              onChange={(e) => setTargetGrossMargin(Number(e.target.value) || 0)}
                              className="w-20 inline-block text-right"
                              step={0.5}
                            />
                            <span className="ml-1 text-slate-500">%</span>
                            <div className="mt-1">
                              <Button size="sm" variant="outline" onClick={runAnalysis} disabled={isRunning}>再計算</Button>
                            </div>
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="px-4 py-3 text-slate-600">必要売上高</td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums text-lg text-blue-600">{formatNumber(result.step5.required_revenue)} 円</td>
                        </tr>
                        <tr className="border-b bg-slate-50">
                          <td colSpan={2} className="px-4 py-2 text-xs text-slate-400">── 比較 ──</td>
                        </tr>
                        <tr className="border-b">
                          <td className="px-4 py-2 text-slate-500">現在の粗利率</td>
                          <td className="px-4 py-2 text-right tabular-nums">{result.step5.current_gross_margin_rate}%</td>
                        </tr>
                        <tr className="border-b">
                          <td className="px-4 py-2 text-slate-500">直近売上に必要な粗利率</td>
                          <td className="px-4 py-2 text-right tabular-nums font-medium text-amber-600">{result.step5.required_margin_at_current_revenue}%</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-slate-500">現在の売上高</td>
                          <td className="px-4 py-2 text-right tabular-nums">{formatNumber(result.step5.current_revenue)} 円</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Gauge chart */}
                <div className="flex flex-col items-center justify-center">
                  <GaugeChart
                    current={result.step5.current_gross_margin_rate}
                    target={targetGrossMargin}
                    max={30}
                    label="粗利率"
                    width={300}
                    height={180}
                  />
                  <div className="mt-4 text-center text-sm">
                    <p className="text-slate-500">
                      現在 <span className="font-bold text-blue-600">{result.step5.current_gross_margin_rate}%</span>
                      → 目標 <span className="font-bold text-red-600">{targetGrossMargin}%</span>
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      差: {(targetGrossMargin - result.step5.current_gross_margin_rate).toFixed(2)}ポイント
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" disabled>レポート出力</Button>
        <Button disabled>シミュレーションへ →</Button>
      </div>
    </div>
  );
}
