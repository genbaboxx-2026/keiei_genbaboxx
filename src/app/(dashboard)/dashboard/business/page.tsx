"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiscalYearSelector } from "@/components/layout/fiscal-year-selector";
import { useFiscalYearStore } from "@/store/fiscal-year-store";
import { formatNumber } from "@/lib/format";
import { ITEM_KEY_TO_FIELD } from "@/lib/constants/default-cost-classifications";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

interface BizData {
  financial: Record<string, number>;
  targets: Record<string, number | null> | null;
  classifications: { itemKey: string; isGbCost: boolean }[];
}

export default function BusinessDashboardPage() {
  const { currentFiscalYear } = useFiscalYearStore();
  const [data, setData] = useState<BizData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dashRes, clsRes] = await Promise.all([
        fetch(`/api/dashboard?fiscal_year=${currentFiscalYear}`),
        fetch(`/api/cost-classifications?fiscal_year=${currentFiscalYear}`),
      ]);
      const dashJson = await dashRes.json();
      const clsJson = await clsRes.json();

      // Get full financial data
      const finRes = await fetch(`/api/financials?fiscal_year=${currentFiscalYear}`);
      const finJson = await finRes.json();
      const fin: Record<string, number> = {};
      if (finJson.data) {
        for (const [k, v] of Object.entries(finJson.data)) {
          fin[k] = Number(v ?? 0);
        }
      }

      setData({
        financial: { ...dashJson.financial, ...fin },
        targets: dashJson.targets,
        classifications: clsJson.data || [],
      });
    } catch { toast.error("データ取得に失敗しました"); }
    finally { setIsLoading(false); }
  }, [currentFiscalYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) {
    return <div className="space-y-6"><h1 className="text-2xl font-bold text-slate-900">事業ダッシュボード</h1><p className="text-slate-500">読み込み中...</p></div>;
  }

  const f = data?.financial || {};
  const tgt = data?.targets;
  const cls = data?.classifications || [];
  const revenue = f.revenue || 0;

  // Compute PL rows
  const cogsFields = ["cogsSalary","cogsBonus","cogsStatutoryWelfare","cogsSubcontract","cogsWasteDisposal","cogsPower","cogsShipping","cogsTravel","cogsConsumables","cogsOfficeSupplies","cogsRepair","cogsUtilities","cogsMembership","cogsDepreciation","cogsTax","cogsInsurance","cogsProfessionalFee","cogsLease","cogsMisc"];
  const cogsTotal = cogsFields.reduce((s, k) => s + (f[k] || 0), 0);
  const grossProfit = revenue - cogsTotal + (f.wipEnding || 0);
  const grossMarginRate = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const sgaFields = ["sgaExecutiveCompensation","sgaSalary","sgaBonus","sgaStatutoryWelfare","sgaWelfare","sgaSubcontract","sgaAdvertising","sgaEntertainment","sgaMeeting","sgaTravel","sgaCommunication","sgaConsumables","sgaOfficeConsumables","sgaRepair","sgaUtilities","sgaMembership","sgaCommission","sgaRent","sgaLease","sgaInsurance","sgaTax","sgaProfessionalFee","sgaDepreciation","sgaBadDebt","sgaManagement","sgaMisc"];
  const sgaTotal = sgaFields.reduce((s, k) => s + (f[k] || 0), 0);
  const operatingProfit = grossProfit - sgaTotal;
  const operatingMarginRate = revenue > 0 ? (operatingProfit / revenue) * 100 : 0;

  const targetRevenue = tgt?.targetRevenue ? Number(tgt.targetRevenue) : null;
  const targetGrossMarginRate = tgt?.targetGrossMarginRate ? Number(tgt.targetGrossMarginRate) : null;
  const targetOperatingMarginRate = tgt?.targetOperatingMarginRate ? Number(tgt.targetOperatingMarginRate) : null;

  // Variable (GB) vs Fixed costs
  let gbTotal = 0, nonGbTotal = 0;
  const gbItems: { label: string; amount: number; key: string }[] = [];
  const fixedItems: { label: string; amount: number; key: string }[] = [];

  const labelMap: Record<string, string> = {
    cogs_salary: "給料手当", cogs_bonus: "賞与", cogs_subcontract: "外注加工費",
    cogs_waste_disposal: "産廃処分費", cogs_repair: "修繕費", cogs_depreciation: "減価償却費",
    cogs_insurance: "保険料", cogs_lease: "リース料", cogs_statutory_welfare: "法定福利費",
    cogs_power: "動力費", cogs_travel: "旅費交通費", cogs_consumables: "消耗品費",
    cogs_utilities: "水道光熱費", cogs_membership: "諸会費", cogs_tax: "租税公課",
    cogs_professional_fee: "支払報酬", cogs_misc: "雑費", cogs_office_supplies: "事務用品費",
    cogs_shipping: "荷造発送費",
  };

  for (const c of cls) {
    const fieldName = ITEM_KEY_TO_FIELD[c.itemKey];
    if (!fieldName) continue;
    const amount = f[fieldName] || 0;
    const item = { label: labelMap[c.itemKey] || c.itemKey, amount, key: c.itemKey };
    if (c.isGbCost) { gbTotal += amount; gbItems.push(item); }
    else { nonGbTotal += amount; fixedItems.push(item); }
  }

  // Waterfall chart data
  const targetGM = targetGrossMarginRate || 20;
  const actualGM = grossMarginRate;
  const gap = actualGM - targetGM;

  // Major gap contributors (top cost items by ratio difference)
  const waterfallData: { name: string; value: number; fill: string }[] = [
    { name: "目標粗利率", value: targetGM, fill: "#3b82f6" },
  ];
  if (revenue > 0) {
    const bigCosts = [
      { name: "外注費", key: "cogsSubcontract", targetRate: tgt?.targetSubcontractRate ? Number(tgt.targetSubcontractRate) : null },
      { name: "産廃費", key: "cogsWasteDisposal", targetRate: tgt?.targetWasteRate ? Number(tgt.targetWasteRate) : null },
      { name: "人件費", key: "cogsSalary", targetRate: tgt?.targetLaborRate ? Number(tgt.targetLaborRate) : null },
    ];
    for (const bc of bigCosts) {
      const actualRate = ((f[bc.key] || 0) / revenue) * 100;
      const diff = bc.targetRate != null ? actualRate - bc.targetRate : 0;
      if (Math.abs(diff) > 0.5) {
        waterfallData.push({ name: `${bc.name}${diff > 0 ? "超過" : "削減"}`, value: -diff, fill: diff > 0 ? "#ef4444" : "#10b981" });
      }
    }
  }
  waterfallData.push({ name: "実績粗利率", value: actualGM, fill: actualGM >= targetGM ? "#10b981" : "#f59e0b" });

  const plRows = [
    { label: "売上高", actual: revenue, target: targetRevenue, isRate: false, higherBetter: true },
    { label: "売上原価", actual: cogsTotal, target: null, isRate: false, higherBetter: false },
    { label: "粗利", actual: grossProfit, target: null, isRate: false, higherBetter: true },
    { label: "粗利率", actual: grossMarginRate, target: targetGrossMarginRate, isRate: true, higherBetter: true },
    { label: "販管費", actual: sgaTotal, target: null, isRate: false, higherBetter: false },
    { label: "営業利益", actual: operatingProfit, target: null, isRate: false, higherBetter: true },
    { label: "営業利益率", actual: operatingMarginRate, target: targetOperatingMarginRate, isRate: true, higherBetter: true },
  ];

  const statusIcon = (actual: number, target: number | null, higherBetter: boolean) => {
    if (target == null) return "";
    const diff = higherBetter ? actual - target : target - actual;
    if (diff >= 0) return "🟢";
    if (Math.abs(diff) < 5) return "🟡";
    return "🔴";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">事業ダッシュボード</h1>
        <FiscalYearSelector />
      </div>

      {/* PL: 実績 vs 目標 */}
      <Card>
        <CardHeader><CardTitle className="text-base">実績 vs 目標</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-4 py-2 text-left font-medium text-slate-600">項目</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">実績</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">目標</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">差分</th>
                <th className="px-4 py-2 text-center font-medium text-slate-600 w-12">状態</th>
              </tr>
            </thead>
            <tbody>
              {plRows.map((row) => {
                const diff = row.target != null ? row.actual - row.target : null;
                return (
                  <tr key={row.label} className="border-b">
                    <td className="px-4 py-2 text-slate-700 font-medium">{row.label}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{row.isRate ? `${row.actual.toFixed(2)}%` : formatNumber(Math.round(row.actual))}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-400">{row.target != null ? (row.isRate ? `${row.target}%` : formatNumber(row.target)) : "-"}</td>
                    <td className={`px-4 py-2 text-right tabular-nums ${diff != null && ((row.higherBetter && diff >= 0) || (!row.higherBetter && diff <= 0)) ? "text-emerald-600" : diff != null ? "text-red-600" : "text-slate-300"}`}>
                      {diff != null ? `${diff > 0 ? "+" : ""}${row.isRate ? diff.toFixed(2) + "%" : formatNumber(Math.round(diff))}` : "-"}
                    </td>
                    <td className="px-4 py-2 text-center">{statusIcon(row.actual, row.target, row.higherBetter)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Fixed / Variable Cost Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">固定費（GB原価以外）</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-bold mb-3 tabular-nums">{formatNumber(nonGbTotal)} 円</p>
            <div className="space-y-1 text-sm max-h-48 overflow-y-auto">
              {fixedItems.sort((a, b) => b.amount - a.amount).map((item) => (
                <div key={item.key} className="flex justify-between">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="tabular-nums">{formatNumber(item.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">変動費（GB原価）</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-bold mb-3 tabular-nums">{formatNumber(gbTotal)} 円</p>
            <div className="space-y-1 text-sm max-h-48 overflow-y-auto">
              {gbItems.sort((a, b) => b.amount - a.amount).map((item) => (
                <div key={item.key} className="flex justify-between">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="tabular-nums">{formatNumber(item.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Waterfall Chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">目標ギャップ分析</CardTitle></CardHeader>
        <CardContent>
          {waterfallData.length > 2 ? (
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfallData} margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
                  <ReferenceLine y={0} stroke="#000" />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {waterfallData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400">
              目標を設定すると目標ギャップ分析が表示されます
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
