"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FiscalYearSelector } from "@/components/layout/fiscal-year-selector";
import { useFiscalYearStore } from "@/store/fiscal-year-store";
import { formatNumber } from "@/lib/format";

interface PlSection {
  id: string;
  label: string;
  fields: { key: string; label: string; isRevenue?: boolean }[];
  summaryLabel: string;
  summaryKeys: string[];
}

const PL_SECTIONS: PlSection[] = [
  {
    id: "cogs", label: "売上原価の部",
    fields: [
      { key: "cogsSalary", label: "給料手当" }, { key: "cogsBonus", label: "賞与" },
      { key: "cogsStatutoryWelfare", label: "法定福利費" }, { key: "cogsSubcontract", label: "外注加工費" },
      { key: "cogsWasteDisposal", label: "産業廃棄物処分費" }, { key: "cogsPower", label: "動力費" },
      { key: "cogsShipping", label: "荷造発送費" }, { key: "cogsTravel", label: "旅費交通費" },
      { key: "cogsConsumables", label: "消耗品費" }, { key: "cogsOfficeSupplies", label: "事務用品費" },
      { key: "cogsRepair", label: "修繕費" }, { key: "cogsUtilities", label: "水道光熱費" },
      { key: "cogsMembership", label: "諸会費" }, { key: "cogsDepreciation", label: "減価償却費" },
      { key: "cogsTax", label: "租税公課" }, { key: "cogsInsurance", label: "保険料" },
      { key: "cogsProfessionalFee", label: "支払報酬" }, { key: "cogsLease", label: "リース料" },
      { key: "cogsMisc", label: "雑費" },
    ],
    summaryLabel: "売上原価合計",
    summaryKeys: ["cogsSalary","cogsBonus","cogsStatutoryWelfare","cogsSubcontract","cogsWasteDisposal","cogsPower","cogsShipping","cogsTravel","cogsConsumables","cogsOfficeSupplies","cogsRepair","cogsUtilities","cogsMembership","cogsDepreciation","cogsTax","cogsInsurance","cogsProfessionalFee","cogsLease","cogsMisc"],
  },
  {
    id: "sga", label: "販売費及び一般管理費の部",
    fields: [
      { key: "sgaExecutiveCompensation", label: "役員報酬" }, { key: "sgaSalary", label: "給料手当" },
      { key: "sgaBonus", label: "賞与" }, { key: "sgaStatutoryWelfare", label: "法定福利費" },
      { key: "sgaWelfare", label: "福利厚生費" }, { key: "sgaSubcontract", label: "外注費" },
      { key: "sgaAdvertising", label: "広告宣伝" }, { key: "sgaEntertainment", label: "接待交際費" },
      { key: "sgaMeeting", label: "会議費" }, { key: "sgaTravel", label: "旅費交通費" },
      { key: "sgaCommunication", label: "通信費" }, { key: "sgaConsumables", label: "消耗品費" },
      { key: "sgaOfficeConsumables", label: "事務用消耗品費" }, { key: "sgaRepair", label: "修繕費" },
      { key: "sgaUtilities", label: "水道光熱費" }, { key: "sgaMembership", label: "諸会費" },
      { key: "sgaCommission", label: "支払手数料" }, { key: "sgaRent", label: "地代家賃" },
      { key: "sgaLease", label: "リース料" }, { key: "sgaInsurance", label: "保険料" },
      { key: "sgaTax", label: "租税公課" }, { key: "sgaProfessionalFee", label: "支払報酬料" },
      { key: "sgaDepreciation", label: "減価償却費" }, { key: "sgaBadDebt", label: "貸倒引当繰入金" },
      { key: "sgaManagement", label: "管理費" }, { key: "sgaMisc", label: "雑費" },
    ],
    summaryLabel: "販管費合計",
    summaryKeys: ["sgaExecutiveCompensation","sgaSalary","sgaBonus","sgaStatutoryWelfare","sgaWelfare","sgaSubcontract","sgaAdvertising","sgaEntertainment","sgaMeeting","sgaTravel","sgaCommunication","sgaConsumables","sgaOfficeConsumables","sgaRepair","sgaUtilities","sgaMembership","sgaCommission","sgaRent","sgaLease","sgaInsurance","sgaTax","sgaProfessionalFee","sgaDepreciation","sgaBadDebt","sgaManagement","sgaMisc"],
  },
  {
    id: "cashout", label: "PL外キャッシュアウト",
    fields: [
      { key: "cashoutCapex", label: "年間設備投資額" }, { key: "cashoutLoanRepayment", label: "借入金返済額" },
      { key: "cashoutOther", label: "その他" },
    ],
    summaryLabel: "PL外合計",
    summaryKeys: ["cashoutCapex", "cashoutLoanRepayment", "cashoutOther"],
  },
];

const currentYear = new Date().getFullYear();

export default function PlDetailPage() {
  const { currentFiscalYear } = useFiscalYearStore();
  const [compareYear, setCompareYear] = useState(currentFiscalYear - 1);
  const [current, setCurrent] = useState<Record<string, number> | null>(null);
  const [compare, setCompare] = useState<Record<string, number> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showBigChangesOnly, setShowBigChangesOnly] = useState(false);
  const [sortByRatio, setSortByRatio] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/financials/comparison?fiscal_year=${currentFiscalYear}&compare_year=${compareYear}`);
      const json = await res.json();
      if (res.ok) {
        setCurrent(json.current);
        setCompare(json.compare);
      }
    } catch { toast.error("データ取得に失敗しました"); }
    finally { setIsLoading(false); }
  }, [currentFiscalYear, compareYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const revenue = current?.revenue || 0;
  const prevRevenue = compare?.revenue || 0;

  const getChangeInfo = (curVal: number, prevVal: number) => {
    const diff = curVal - prevVal;
    const changeRate = prevVal !== 0 ? (diff / prevVal) * 100 : 0;
    return { diff, changeRate };
  };

  if (isLoading) {
    return <div className="space-y-6"><h1 className="text-2xl font-bold text-slate-900">PL詳細ビュー</h1><p className="text-slate-500">読み込み中...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">PL詳細ビュー</h1>
        <div className="flex items-center gap-4">
          <FiscalYearSelector />
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">比較:</span>
            <Select value={String(compareYear)} onValueChange={(v) => setCompareYear(Number(v))}>
              <SelectTrigger className="w-28 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => currentYear - i - 1).map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}年度</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch checked={showBigChangesOnly} onCheckedChange={setShowBigChangesOnly} />
          <Label className="text-sm">変動が大きい項目のみ（±10%以上）</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={sortByRatio} onCheckedChange={setSortByRatio} />
          <Label className="text-sm">売上比率順でソート</Label>
        </div>
      </div>

      {/* Revenue row */}
      {current && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-4 py-2 text-left font-medium text-slate-600 w-44">項目</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">{currentFiscalYear}年度</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600 w-20">売上比</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">{compareYear}年度</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600 w-20">売上比</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">増減額</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600 w-20">増減率</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b bg-blue-50">
                  <td className="px-4 py-2 font-bold text-slate-900">売上高</td>
                  <td className="px-4 py-2 text-right tabular-nums font-bold">{formatNumber(revenue)}</td>
                  <td className="px-4 py-2 text-right text-slate-400">100.0%</td>
                  <td className="px-4 py-2 text-right tabular-nums">{compare ? formatNumber(prevRevenue) : "-"}</td>
                  <td className="px-4 py-2 text-right text-slate-400">100.0%</td>
                  <ChangeCell curVal={revenue} prevVal={prevRevenue} isRevenue />
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Sections */}
      {PL_SECTIONS.map((section) => {
        const isOpen = !collapsed[section.id];
        const sectionSum = section.summaryKeys.reduce((s, k) => s + (current?.[k] || 0), 0);
        const prevSectionSum = section.summaryKeys.reduce((s, k) => s + (compare?.[k] || 0), 0);

        let fields = section.fields;
        if (showBigChangesOnly) {
          fields = fields.filter((f) => {
            const { changeRate } = getChangeInfo(current?.[f.key] || 0, compare?.[f.key] || 0);
            return Math.abs(changeRate) >= 10;
          });
        }
        if (sortByRatio && revenue > 0) {
          fields = [...fields].sort((a, b) => (current?.[b.key] || 0) - (current?.[a.key] || 0));
        }

        return (
          <Card key={section.id}>
            <CardHeader className="cursor-pointer py-3" onClick={() => setCollapsed((p) => ({ ...p, [section.id]: !p[section.id] }))}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-slate-400">{isOpen ? "▼" : "▶"}</span>
                  {section.label}
                </CardTitle>
                <span className="text-sm font-bold tabular-nums">{formatNumber(sectionSum)}</span>
              </div>
            </CardHeader>
            {isOpen && (
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <tbody>
                    {fields.map((f) => {
                      const curVal = current?.[f.key] || 0;
                      const prevVal = compare?.[f.key] || 0;
                      const ratio = revenue > 0 ? ((curVal / revenue) * 100).toFixed(2) : "-";
                      const prevRatio = prevRevenue > 0 ? ((prevVal / prevRevenue) * 100).toFixed(2) : "-";
                      const isBig = revenue > 0 && (curVal / revenue) * 100 >= 10;
                      return (
                        <tr key={f.key} className="border-b">
                          <td className={`px-4 py-1.5 text-slate-700 w-44 ${isBig ? "font-medium" : ""}`}>{f.label}</td>
                          <td className="px-4 py-1.5 text-right tabular-nums">{formatNumber(curVal)}</td>
                          <td className={`px-4 py-1.5 text-right tabular-nums w-20 ${isBig ? "font-bold text-slate-900" : "text-slate-400"}`}>{ratio}%</td>
                          <td className="px-4 py-1.5 text-right tabular-nums text-slate-400">{compare ? formatNumber(prevVal) : "-"}</td>
                          <td className="px-4 py-1.5 text-right tabular-nums text-slate-400 w-20">{prevRatio}%</td>
                          <ChangeCell curVal={curVal} prevVal={prevVal} />
                        </tr>
                      );
                    })}
                    {/* Summary */}
                    <tr className="border-t-2 bg-slate-50">
                      <td className="px-4 py-2 font-bold text-slate-900 w-44">{section.summaryLabel}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-bold">{formatNumber(sectionSum)}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-bold w-20">{revenue > 0 ? ((sectionSum / revenue) * 100).toFixed(2) : "-"}%</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-500">{compare ? formatNumber(prevSectionSum) : "-"}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-400 w-20">{prevRevenue > 0 ? ((prevSectionSum / prevRevenue) * 100).toFixed(2) : "-"}%</td>
                      <ChangeCell curVal={sectionSum} prevVal={prevSectionSum} />
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function ChangeCell({ curVal, prevVal, isRevenue = false }: { curVal: number; prevVal: number; isRevenue?: boolean }) {
  const diff = curVal - prevVal;
  const changeRate = prevVal !== 0 ? (diff / prevVal) * 100 : 0;
  // For costs, increase is bad (red). For revenue, increase is good (green).
  const isPositiveChange = isRevenue ? diff > 0 : diff < 0;
  const isBigChange = Math.abs(changeRate) >= 10;

  const color = prevVal === 0 ? "text-slate-400"
    : isPositiveChange ? "text-emerald-600"
    : isBigChange ? "text-red-600"
    : "text-slate-500";

  const icon = diff > 0 ? "↑" : diff < 0 ? "↓" : "";

  return (
    <>
      <td className={`px-4 py-1.5 text-right tabular-nums ${color}`}>
        {prevVal === 0 && curVal === 0 ? "-" : `${diff > 0 ? "+" : ""}${formatNumber(diff)}`}
      </td>
      <td className={`px-4 py-1.5 text-right tabular-nums w-20 ${color} ${isBigChange ? "font-bold" : ""}`}>
        {prevVal === 0 ? "-" : `${changeRate > 0 ? "+" : ""}${changeRate.toFixed(1)}%${icon}`}
      </td>
    </>
  );
}
