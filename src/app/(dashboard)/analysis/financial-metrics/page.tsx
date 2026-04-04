"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiscalYearSelector } from "@/components/layout/fiscal-year-selector";
import { useFiscalYearStore } from "@/store/fiscal-year-store";

interface MetricsData {
  current: Record<string, number> | null;
  previous: Record<string, number> | null;
  targets: Record<string, number | null> | null;
  hasBs: boolean;
  hasFin: boolean;
}

interface MetricDef {
  key: string;
  label: string;
  unit: string;
  formula: string;
  description: string;
  benchmark: string;
  targetKey?: string;
  inverted?: boolean; // lower is better
}

const SAFETY_METRICS: MetricDef[] = [
  { key: "equityRatio", label: "自己資本比率", unit: "%", formula: "純資産 ÷ 総資産 × 100", description: "30%以上が健全、50%以上が優良です。自社の返済に頼らない資本の割合を示します。", benchmark: "建設業平均: 約35%", targetKey: "targetEquityRatio" },
  { key: "currentRatio", label: "流動比率", unit: "%", formula: "流動資産 ÷ 流動負債 × 100", description: "150%以上が望ましい。1年以内に支払う負債に対する支払能力を示します。", benchmark: "建設業平均: 約140%", targetKey: "targetCurrentRatio" },
  { key: "fixedRatio", label: "固定比率", unit: "%", formula: "固定資産 ÷ 純資産 × 100", description: "100%以下が望ましい。固定資産を自己資本でどれだけ賄えているかを示します。", benchmark: "100%以下が健全", inverted: true },
];

const PROFITABILITY_METRICS: MetricDef[] = [
  { key: "roe", label: "ROE（自己資本利益率）", unit: "%", formula: "営業利益 ÷ 純資産 × 100", description: "8%以上が望ましい。株主の投資に対してどれだけ利益を生んでいるかを示します。", benchmark: "建設業平均: 約8%", targetKey: "targetRoe" },
  { key: "roa", label: "ROA（総資本利益率）", unit: "%", formula: "営業利益 ÷ 総資産 × 100", description: "5%以上が望ましい。企業の総資産をどれだけ効率的に使っているかを示します。", benchmark: "建設業平均: 約4%" },
  { key: "assetTurnover", label: "総資本回転率", unit: "回", formula: "売上高 ÷ 総資産", description: "1.0回以上が望ましい。総資産がどれだけ効率的に売上に繋がっているかを示します。", benchmark: "建設業平均: 約1.2回" },
];

const FINANCIAL_METRICS: MetricDef[] = [
  { key: "debtRepaymentYears", label: "借入金償還期間", unit: "年", formula: "(短期借入金+長期借入金) ÷ (営業利益+減価償却費)", description: "10年以内が望ましい。現在のキャッシュフローで借入金を何年で返済できるかを示します。", benchmark: "10年以内が健全", targetKey: "targetDebtRepaymentYears", inverted: true },
  { key: "debtRatio", label: "借入金依存度", unit: "%", formula: "(短期借入金+長期借入金) ÷ 総資産 × 100", description: "50%以下が望ましい。総資産に占める借入金の割合を示します。", benchmark: "50%以下が健全", inverted: true },
];

export default function FinancialMetricsPage() {
  const { currentFiscalYear } = useFiscalYearStore();
  const [data, setData] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/analysis/financial-metrics?fiscal_year=${currentFiscalYear}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } catch { toast.error("データ取得に失敗しました"); }
    finally { setIsLoading(false); }
  }, [currentFiscalYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) return <div className="space-y-6"><h1 className="text-2xl font-bold text-slate-900">経営指標詳細</h1><p className="text-slate-500">読み込み中...</p></div>;

  if (!data?.hasBs || !data?.hasFin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">経営指標詳細</h1>
        <Card><CardContent className="p-8 text-center text-slate-400">
          {!data?.hasFin && <>決算データが必要です。<Link href="/input/financials" className="text-blue-600 underline ml-1">PL入力 →</Link><br /></>}
          {!data?.hasBs && <>貸借対照表が必要です。<Link href="/input/balance-sheet" className="text-blue-600 underline ml-1">BS入力 →</Link></>}
        </CardContent></Card>
      </div>
    );
  }

  const c = data.current!;
  const p = data.previous;
  const tgt = data.targets;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">経営指標詳細</h1>
        <FiscalYearSelector />
      </div>

      <MetricSection title="🛡️ 安全性" metrics={SAFETY_METRICS} current={c} previous={p} targets={tgt} />
      <MetricSection title="📈 収益性" metrics={PROFITABILITY_METRICS} current={c} previous={p} targets={tgt} />
      <MetricSection title="💰 財務力" metrics={FINANCIAL_METRICS} current={c} previous={p} targets={tgt} />
    </div>
  );
}

function MetricSection({ title, metrics, current, previous, targets }: {
  title: string;
  metrics: MetricDef[];
  current: Record<string, number>;
  previous: Record<string, number> | null;
  targets: Record<string, number | null> | null;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 mb-3">{title}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {metrics.map((m) => {
          const val = current[m.key] ?? 0;
          const prevVal = previous?.[m.key] ?? null;
          const targetVal = m.targetKey && targets ? (targets[m.targetKey] != null ? Number(targets[m.targetKey]) : null) : null;
          const diff = prevVal != null ? val - prevVal : null;
          const met = targetVal != null ? (m.inverted ? val <= targetVal : val >= targetVal) : null;

          return (
            <Card key={m.key}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{m.label}</p>
                    <p className="text-3xl font-bold text-slate-900 tabular-nums mt-1">{val.toFixed(2)}<span className="text-lg text-slate-400 ml-1">{m.unit}</span></p>
                  </div>
                  {met !== null && (
                    <span className={`text-xs px-2 py-1 rounded-full ${met ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {met ? "目標達成" : "目標未達"}
                    </span>
                  )}
                </div>

                {/* Target + Previous */}
                <div className="flex gap-4 text-xs">
                  {targetVal != null && <span className="text-slate-500">目標: {targetVal}{m.unit}</span>}
                  {diff != null && (
                    <span className={diff >= 0 ? (m.inverted ? "text-red-500" : "text-emerald-600") : (m.inverted ? "text-emerald-600" : "text-red-500")}>
                      前年比: {diff > 0 ? "+" : ""}{diff.toFixed(2)}{m.unit}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {targetVal != null && (
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${met ? "bg-emerald-500" : "bg-amber-400"}`}
                      style={{ width: `${Math.min(m.inverted ? (targetVal / Math.max(val, 0.01)) * 100 : (val / Math.max(targetVal, 0.01)) * 100, 100)}%` }}
                    />
                  </div>
                )}

                {/* Formula + Description */}
                <div className="bg-slate-50 rounded p-2 space-y-1">
                  <p className="text-xs text-slate-500 font-mono">{m.formula}</p>
                  <p className="text-xs text-slate-600">{m.description}</p>
                  <p className="text-xs text-slate-400">{m.benchmark}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
