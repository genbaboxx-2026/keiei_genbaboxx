"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EditableCell } from "@/components/tables/editable-cell";
import { formatNumber } from "@/lib/format";
import { PL_ITEMS, EDITABLE_FIELD_KEYS } from "@/lib/constants/pl-items";
import { triggerCostMasterRecalculation } from "@/lib/triggers/recalculate-cost-master";
import { FiscalYearSelector } from "@/components/layout/fiscal-year-selector";
import { useFiscalYearStore } from "@/store/fiscal-year-store";

type PlData = Record<string, number>;

const SGA_EDITABLE_KEYS = PL_ITEMS.filter((i) => i.section === "sga" && i.isEditable).map((i) => i.key);

function computeSummaries(d: PlData): PlData {
  const out = { ...d };
  // 労務費合計
  out._laborTotal = (d.cogsSalary || 0) + (d.cogsBonus || 0) + (d.cogsStatutoryWelfare || 0);
  // 製造経費合計
  const mfgKeys = PL_ITEMS.find((i) => i.key === "_mfgExpenseTotal")!.summaryOf!;
  out._mfgExpenseTotal = mfgKeys.reduce((s, k) => s + (d[k] || 0), 0);
  // 総製造費用
  out._totalMfgCost = out._laborTotal + out._mfgExpenseTotal;
  // 当期製品製造原価
  out._cogTotal = out._totalMfgCost - (d.wipEnding || 0);
  // 売上総利益
  out._grossProfit = (d.revenue || 0) - out._cogTotal;
  // 販管費合計
  out._sgaTotal = SGA_EDITABLE_KEYS.reduce((s, k) => s + (d[k] || 0), 0);
  // 営業利益
  out._operatingProfit = out._grossProfit - out._sgaTotal;
  return out;
}

export default function FinancialsInputPage() {
  const [data, setData] = useState<PlData>({});
  const [computed, setComputed] = useState<PlData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalJson, setOriginalJson] = useState("");
  const { currentFiscalYear: fiscalYear } = useFiscalYearStore();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/financials?fiscal_year=${fiscalYear}`);
      const json = await res.json();
      if (res.ok && json.data) {
        const d: PlData = {};
        for (const key of EDITABLE_FIELD_KEYS) {
          d[key] = Number(json.data[key] ?? 0);
        }
        setData(d);
        setComputed(computeSummaries(d));
        setOriginalJson(JSON.stringify(d));
      } else {
        setData({});
        setComputed(computeSummaries({}));
        setOriginalJson(JSON.stringify({}));
      }
    } catch {
      toast.error("データ取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [fiscalYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    setHasChanges(JSON.stringify(data) !== originalJson);
  }, [data, originalJson]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (hasChanges) e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [hasChanges]);

  const updateField = (key: string, value: number) => {
    setData((prev) => {
      const next = { ...prev, [key]: value };
      setComputed(computeSummaries(next));
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/financials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, fiscalYear }),
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error?.message || "保存に失敗しました");
        return;
      }
      toast.success("決算データを保存しました");
      setOriginalJson(JSON.stringify(data));
      setHasChanges(false);
      triggerCostMasterRecalculation(fiscalYear);
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const revenue = data.revenue || 0;
  const ratio = (v: number) => revenue > 0 ? ((v / revenue) * 100).toFixed(2) : "-";
  const opMargin = revenue > 0 ? ((computed._operatingProfit || 0) / revenue) * 100 : 0;
  const opMarginColor = opMargin >= 5 ? "text-emerald-600" : opMargin >= 3 ? "text-amber-600" : "text-red-600";

  const getValue = (key: string): number => {
    if (key.startsWith("_")) return computed[key] || 0;
    return data[key] || 0;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">決算データ入力</h1>
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">決算データ入力（損益計算書）</h1>
          <FiscalYearSelector />
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/input/upload?type=pl"}>PDFから読取</Button>
          <Button variant="outline" size="sm" onClick={() => { const input = document.createElement("input"); input.type = "file"; input.accept = ".xlsx,.xls"; input.onchange = () => { /* Excel読込はlib/excel/parser.tsを使用 */ }; input.click(); }}>Excelから読込</Button>
          {hasChanges && <span className="text-sm text-amber-600 font-medium">未保存</span>}
          <Button onClick={handleSave} disabled={isSaving || !hasChanges} className={hasChanges ? "bg-blue-600 hover:bg-blue-700" : ""}>
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="px-4 py-2 text-left font-medium text-slate-600 w-56">項目</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600 w-44">金額（円）</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600 w-24">売上比率</th>
            </tr>
          </thead>
          <tbody>
            {/* Section headers + items */}
            <SectionHeader label="売上原価の部" />
            {PL_ITEMS.map((item) => {
              if (item.key === "revenue") {
                return (
                  <PlRow
                    key={item.key}
                    label={item.label}
                    value={getValue(item.key)}
                    ratioStr="100.00%"
                    isEditable
                    isSummary={false}
                    indent={0}
                    isBigCost={false}
                    onChange={(v) => updateField(item.key, v)}
                  />
                );
              }
              if (item.section === "cogs" || item.key === "_grossProfit") {
                const val = getValue(item.key);
                const r = ratio(val);
                const isBig = !item.isSummary && revenue > 0 && Math.abs(val / revenue) * 100 >= 10;
                return (
                  <PlRow
                    key={item.key}
                    label={item.label}
                    value={val}
                    ratioStr={r === "-" ? "-" : `${r}%`}
                    isEditable={item.isEditable}
                    isSummary={!!item.isSummary}
                    indent={item.indent || 0}
                    isBigCost={isBig}
                    onChange={item.isEditable ? (v) => updateField(item.key, v) : undefined}
                  />
                );
              }
              return null;
            })}

            <SectionHeader label="販売費及び一般管理費の部" />
            {PL_ITEMS.filter((i) => i.section === "sga").map((item) => {
              const val = getValue(item.key);
              const r = ratio(val);
              return (
                <PlRow
                  key={item.key}
                  label={item.label}
                  value={val}
                  ratioStr={r === "-" ? "-" : `${r}%`}
                  isEditable={item.isEditable}
                  isSummary={!!item.isSummary}
                  indent={item.indent || 0}
                  isBigCost={false}
                  onChange={item.isEditable ? (v) => updateField(item.key, v) : undefined}
                />
              );
            })}

            {/* 営業利益率 */}
            <tr className="border-t-2 border-slate-300 bg-slate-100">
              <td className="px-4 py-2 font-bold text-slate-900">営業利益率</td>
              <td />
              <td className={`px-4 py-2 text-right font-bold ${opMarginColor}`}>
                {revenue > 0 ? `${opMargin.toFixed(2)}%` : "-"}
              </td>
            </tr>

            <SectionHeader label="PL外キャッシュアウト" />
            {PL_ITEMS.filter((i) => i.section === "cashout").map((item) => (
              <PlRow
                key={item.key}
                label={item.label}
                value={getValue(item.key)}
                ratioStr=""
                isEditable
                isSummary={false}
                indent={item.indent || 0}
                isBigCost={false}
                onChange={(v) => updateField(item.key, v)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <tr className="bg-slate-200">
      <td colSpan={3} className="px-4 py-1.5 font-bold text-xs text-slate-700 uppercase tracking-wide">
        {label}
      </td>
    </tr>
  );
}

function PlRow({
  label, value, ratioStr, isEditable, isSummary, indent, isBigCost, onChange,
}: {
  label: string;
  value: number;
  ratioStr: string;
  isEditable: boolean;
  isSummary: boolean;
  indent: number;
  isBigCost: boolean;
  onChange?: (v: number) => void;
}) {
  return (
    <tr className={`border-b ${isSummary ? "bg-slate-50" : ""}`}>
      <td className={`px-4 py-1 ${isSummary ? "font-bold text-slate-900" : "text-slate-700"}`} style={{ paddingLeft: `${16 + indent * 16}px` }}>
        {isSummary ? "── " : ""}{label}
      </td>
      <td className="px-0 py-0.5">
        {isEditable && onChange ? (
          <EditableCell type="number" value={value} onChange={(v) => onChange(v as number)} />
        ) : (
          <div className={`px-2 py-1 text-right tabular-nums ${isSummary ? "font-bold text-slate-900 bg-slate-50" : "text-slate-500"}`}>
            {formatNumber(value)}
          </div>
        )}
      </td>
      <td className={`px-4 py-1 text-right tabular-nums text-sm ${isBigCost ? "font-bold text-slate-900" : "text-slate-400"}`}>
        {ratioStr}
      </td>
    </tr>
  );
}
