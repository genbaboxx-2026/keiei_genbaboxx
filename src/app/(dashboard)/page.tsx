"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiscalYearSelector } from "@/components/layout/fiscal-year-selector";
import { useFiscalYearStore } from "@/store/fiscal-year-store";
import { formatNumber } from "@/lib/format";
import { GaugeChart } from "@/components/charts/gauge-chart";
import { JOB_CATEGORY_LABELS } from "@/types/employee";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const PIE_COLORS = ["#ef4444", "#f97316", "#3b82f6", "#8b5cf6", "#94a3b8"];

interface DashboardData {
  financial: {
    revenue: number; grossProfit: number; grossMarginRate: number;
    operatingProfit: number; operatingMarginRate: number;
    cogsTotal: number; sgaTotal: number;
    laborTotal: number; subcontract: number; waste: number; lease: number; otherCogs: number;
    revenueYoY: number | null; gbCostTotal: number; nonGbCostTotal: number;
  };
  targets: Record<string, number | null> | null;
  costMasters: { category: string; subCategory: string; avgDailyCost: number; itemCount: number }[];
  employees: { count: number; revenuePerEmployee: number; nextRetirement: { name: string; year: number } | null; profileCount: number };
  bsIndicators: Record<string, number> | null;
  fiveStepResult: Record<string, Record<string, number>> | null;
  lastUpdated: string | null;
}

export default function DashboardPage() {
  const { currentFiscalYear } = useFiscalYearStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard?fiscal_year=${currentFiscalYear}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } catch { toast.error("データ取得に失敗しました"); }
    finally { setIsLoading(false); }
  }, [currentFiscalYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) {
    return <div className="space-y-6"><h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1><p className="text-slate-500">読み込み中...</p></div>;
  }

  const f = data?.financial;
  const tgt = data?.targets;
  const emp = data?.employees;
  const bs = data?.bsIndicators;
  const five = data?.fiveStepResult;

  const targetGrossMargin = tgt?.targetGrossMarginRate ? Number(tgt.targetGrossMarginRate) : null;
  const grossMarginGap = targetGrossMargin != null && f ? f.grossMarginRate - targetGrossMargin : null;

  const kpiStatus = (actual: number, target: number | null, higherIsBetter = true): "good" | "warning" | "danger" | "neutral" => {
    if (target == null) return "neutral";
    const diff = higherIsBetter ? actual - target : target - actual;
    if (diff >= 0) return "good";
    if (Math.abs(diff) < 5) return "warning";
    return "danger";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">経営ダッシュボード</h1>
        <div className="flex items-center gap-4">
          <FiscalYearSelector />
          {data?.lastUpdated && <span className="text-xs text-slate-400">最終更新: {new Date(data.lastUpdated).toLocaleDateString("ja-JP")}</span>}
        </div>
      </div>

      {/* Financial KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="売上高"
          value={f ? `${(f.revenue / 100000000).toFixed(1)}億円` : "--"}
          sub={f?.revenueYoY != null ? `前年比 ${f.revenueYoY > 0 ? "+" : ""}${f.revenueYoY.toFixed(1)}%` : undefined}
          status={f?.revenueYoY != null ? (f.revenueYoY > 0 ? "good" : f.revenueYoY > -5 ? "warning" : "danger") : "neutral"}
        />
        <KpiCard
          title="粗利率"
          value={f ? `${f.grossMarginRate.toFixed(2)}%` : "--"}
          sub={targetGrossMargin != null ? `目標 ${targetGrossMargin}%` : undefined}
          status={f ? kpiStatus(f.grossMarginRate, targetGrossMargin) : "neutral"}
        />
        <KpiCard
          title="営業利益率"
          value={f ? `${f.operatingMarginRate.toFixed(2)}%` : "--"}
          sub={tgt?.targetOperatingMarginRate ? `目標 ${Number(tgt.targetOperatingMarginRate)}%` : undefined}
          status={f ? kpiStatus(f.operatingMarginRate, tgt?.targetOperatingMarginRate ? Number(tgt.targetOperatingMarginRate) : null) : "neutral"}
        />
        <KpiCard
          title="目標との差"
          value={grossMarginGap != null ? `${grossMarginGap > 0 ? "+" : ""}${grossMarginGap.toFixed(2)}%` : "--"}
          sub={grossMarginGap != null && grossMarginGap < 0 ? "要改善" : grossMarginGap != null && grossMarginGap >= 0 ? "達成" : undefined}
          status={grossMarginGap != null ? (grossMarginGap >= 0 ? "good" : grossMarginGap > -5 ? "warning" : "danger") : "neutral"}
        />
      </div>

      {/* Organization KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="従業員数" value={emp ? `${emp.count}名` : "--"} status="neutral" />
        <KpiCard title="組織パワー" value={emp && emp.profileCount > 0 ? "82%" : "未設定"} sub={emp && emp.profileCount === 0 ? "プロファイルを設定→" : undefined} status="neutral" />
        <KpiCard title="1人あたり売上" value={emp && emp.revenuePerEmployee > 0 ? `${(emp.revenuePerEmployee / 100000000).toFixed(2)}億` : "--"} status="neutral" />
        <KpiCard title="次の退職" value={emp?.nextRetirement ? `${emp.nextRetirement.year}年` : "未設定"} sub={emp?.nextRetirement ? emp.nextRetirement.name : undefined} status="neutral" />
      </div>

      {/* 2-column: PieChart + Cost Master Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">売上原価の構成比</CardTitle></CardHeader>
          <CardContent>
            {f && f.cogsTotal > 0 ? (
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "外注加工費", value: f.subcontract },
                        { name: "産廃処分費", value: f.waste },
                        { name: "人件費", value: f.laborTotal },
                        { name: "リース料", value: f.lease },
                        { name: "その他", value: f.otherCogs },
                      ].filter(d => d.value > 0)}
                      cx="50%" cy="50%" innerRadius={60} outerRadius={95} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                    >
                      {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `¥${formatNumber(v)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400">データを入力するとグラフが表示されます</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">1日あたり原価サマリー</CardTitle></CardHeader>
          <CardContent>
            {data?.costMasters && data.costMasters.length > 0 ? (
              <CostSummaryTable masters={data.costMasters} />
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400">コストマスタを生成すると表示されます</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 2-column: Five-step summary + AI insight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">5ステップ分析サマリー</CardTitle></CardHeader>
          <CardContent>
            {five?.step5 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="space-y-1 text-sm">
                    <p>現在の粗利率: <strong>{five.step5.current_gross_margin_rate}%</strong></p>
                    <p>目標粗利率: <strong>{five.step5.target_gross_margin_rate}%</strong></p>
                    <p>必要売上高: <strong>{(five.step5.required_revenue / 100000000).toFixed(2)}億</strong></p>
                    <p>現売上での必要粗利率: <strong className="text-amber-600">{five.step5.required_margin_at_current_revenue}%</strong></p>
                  </div>
                  <GaugeChart current={five.step5.current_gross_margin_rate} target={five.step5.target_gross_margin_rate} max={30} width={160} height={100} />
                </div>
                <Link href="/analysis/five-steps" className="text-sm text-blue-600 hover:underline">詳細を見る →</Link>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400">
                <Link href="/analysis/five-steps" className="text-blue-600 hover:underline">5ステップ分析を実行する →</Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">AI経営インサイト</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-slate-600">
              <p>💡 外注比率{f ? `${((f.subcontract / f.revenue) * 100).toFixed(1)}%` : ""}は業界平均より高い傾向です。自社施工率を上げることで粗利改善の余地があります。</p>
              <p>💡 産廃処分費{f ? `${((f.waste / f.revenue) * 100).toFixed(1)}%` : ""}の圧縮余地があります。分別精度向上やリサイクル率改善を検討してください。</p>
              <p>💡 営業利益率{f ? `${f.operatingMarginRate.toFixed(2)}%` : ""}は改善が必要です。</p>
              <p className="text-slate-400 text-xs pt-2">※AIインサイトはPhase 4で高精度化されます</p>
              <Link href="/ai/chat" className="text-blue-600 hover:underline text-xs">AIに相談する →</Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BS Indicators Panel */}
      {bs ? (
        <Card>
          <CardHeader><CardTitle className="text-base">経営指標</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-3">🛡️ 安全性</h4>
                <IndicatorBar label="自己資本比率" value={bs.equityRatio} target={tgt?.targetEquityRatio ? Number(tgt.targetEquityRatio) : 30} unit="%" />
                <IndicatorBar label="流動比率" value={bs.currentRatio} target={tgt?.targetCurrentRatio ? Number(tgt.targetCurrentRatio) : 150} unit="%" />
                <IndicatorBar label="固定比率" value={bs.fixedRatio} target={100} unit="%" inverted />
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-3">📈 収益性</h4>
                <IndicatorBar label="ROE" value={bs.roe} target={tgt?.targetRoe ? Number(tgt.targetRoe) : 10} unit="%" />
                <IndicatorBar label="ROA" value={bs.roa} target={5} unit="%" />
                <IndicatorBar label="総資本回転率" value={bs.assetTurnover} target={1.5} unit="回" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-3">💰 財務力</h4>
                <IndicatorBar label="借入金償還期間" value={bs.debtRepaymentYears} target={tgt?.targetDebtRepaymentYears ? Number(tgt.targetDebtRepaymentYears) : 10} unit="年" inverted />
                <IndicatorBar label="借入金依存度" value={bs.debtRatio} target={50} unit="%" inverted />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-slate-400">
            BSを入力すると経営指標が表示されます <Link href="/input/balance-sheet" className="text-blue-600 underline ml-1">BSを入力 →</Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Sub Components ---

function KpiCard({ title, value, sub, status }: { title: string; value: string; sub?: string; status: "good" | "warning" | "danger" | "neutral" }) {
  const colors = { good: "border-l-emerald-500 bg-emerald-50/50", warning: "border-l-amber-500 bg-amber-50/50", danger: "border-l-red-500 bg-red-50/50", neutral: "border-l-slate-300" };
  return (
    <Card className={`border-l-4 ${colors[status]}`}>
      <CardContent className="p-4">
        <p className="text-xs text-slate-500">{title}</p>
        <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
        {sub && <p className={`text-xs mt-0.5 ${status === "good" ? "text-emerald-600" : status === "warning" ? "text-amber-600" : status === "danger" ? "text-red-600" : "text-slate-400"}`}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

function CostSummaryTable({ masters }: { masters: DashboardData["costMasters"] }) {
  const maxCost = Math.max(...masters.map(m => m.avgDailyCost), 1);
  return (
    <div className="space-y-1.5 text-sm max-h-64 overflow-y-auto">
      {masters.filter(m => m.category !== "attachment").map((m) => {
        const label = m.category === "labor"
          ? (JOB_CATEGORY_LABELS[m.subCategory as keyof typeof JOB_CATEGORY_LABELS] || m.subCategory)
          : `${m.category === "heavy_machine" ? "重機" : "運搬"} ${m.subCategory}`;
        const barWidth = (m.avgDailyCost / maxCost) * 100;
        return (
          <div key={`${m.category}-${m.subCategory}`} className="flex items-center gap-2">
            <span className="w-28 text-slate-600 truncate text-xs">{label}</span>
            <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
              <div className="h-full bg-blue-400 rounded" style={{ width: `${barWidth}%` }} />
            </div>
            <span className="w-20 text-right tabular-nums text-xs font-medium">¥{formatNumber(m.avgDailyCost)}</span>
          </div>
        );
      })}
    </div>
  );
}

function IndicatorBar({ label, value, target, unit, inverted = false }: { label: string; value: number; target: number; unit: string; inverted?: boolean }) {
  const rounded = Math.round(value * 100) / 100;
  const met = inverted ? rounded <= target : rounded >= target;
  const progress = Math.min((inverted ? target / Math.max(rounded, 0.01) : rounded / Math.max(target, 0.01)) * 100, 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className={`font-medium ${met ? "text-emerald-600" : "text-amber-600"}`}>{rounded}{unit} / 目標{target}{unit}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${met ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
