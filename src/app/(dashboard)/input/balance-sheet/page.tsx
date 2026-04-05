"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EditableCell } from "@/components/tables/editable-cell";
import { formatNumber } from "@/lib/format";
import { BS_ITEMS, BS_EDITABLE_KEYS, BS_SECTIONS } from "@/lib/constants/bs-items";
import { FiscalYearSelector } from "@/components/layout/fiscal-year-selector";
import { useFiscalYearStore } from "@/store/fiscal-year-store";

type BsData = Record<string, number>;

function computeBsSummaries(d: BsData): BsData {
  const out = { ...d };
  const sum = (keys: string[]) => keys.reduce((s, k) => s + (d[k] || 0), 0);

  out._currentAssetsTotal = sum(["cashAndDeposits", "notesReceivable", "accountsReceivable", "inventory", "prepaidExpenses", "wipConstruction", "allowanceForBadDebt", "currentAssetsOther"]);
  out._fixedAssetsTotal = sum(["buildings", "buildingEquipment", "machinery", "vehicles", "toolsAndEquipment", "land", "intangibleAssets", "investmentsAndOther"]);
  out._totalAssets = out._currentAssetsTotal + out._fixedAssetsTotal;

  out._currentLiabilitiesTotal = sum(["notesPayable", "accountsPayable", "shortTermLoans", "accruedExpenses", "incomeTaxPayable", "advancesReceived", "currentLiabilitiesOther"]);
  out._fixedLiabilitiesTotal = sum(["longTermLoans", "leaseObligations", "fixedLiabilitiesOther"]);
  out._totalLiabilities = out._currentLiabilitiesTotal + out._fixedLiabilitiesTotal;

  out._netAssetsTotal = sum(["capitalStock", "capitalSurplus", "retainedEarnings", "netAssetsOther"]);
  out._totalLiabilitiesAndNetAssets = out._totalLiabilities + out._netAssetsTotal;
  return out;
}

export default function BalanceSheetPage() {
  const [data, setData] = useState<BsData>({});
  const [computed, setComputed] = useState<BsData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalJson, setOriginalJson] = useState("");
  const { currentFiscalYear: fiscalYear } = useFiscalYearStore();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/balance-sheets?fiscal_year=${fiscalYear}`);
      const json = await res.json();
      if (res.ok && json.data) {
        const d: BsData = {};
        for (const key of BS_EDITABLE_KEYS) d[key] = Number(json.data[key] ?? 0);
        setData(d);
        setComputed(computeBsSummaries(d));
        setOriginalJson(JSON.stringify(d));
      }
    } catch { toast.error("データ取得に失敗しました"); }
    finally { setIsLoading(false); }
  }, [fiscalYear]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setHasChanges(JSON.stringify(data) !== originalJson); }, [data, originalJson]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (hasChanges) e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [hasChanges]);

  const updateField = (key: string, value: number) => {
    setData((prev) => {
      const next = { ...prev, [key]: value };
      setComputed(computeBsSummaries(next));
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/balance-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, fiscalYear }),
      });
      if (!res.ok) { toast.error("保存に失敗しました"); return; }
      toast.success("貸借対照表を保存しました");
      setOriginalJson(JSON.stringify(data));
      setHasChanges(false);
    } catch { toast.error("保存に失敗しました"); }
    finally { setIsSaving(false); }
  };

  const totalAssets = computed._totalAssets || 0;
  const totalLiabAndNet = computed._totalLiabilitiesAndNetAssets || 0;
  const isBalanced = totalAssets === totalLiabAndNet;
  const diff = totalAssets - totalLiabAndNet;

  const getValue = (key: string) => key.startsWith("_") ? (computed[key] || 0) : (data[key] || 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">貸借対照表入力</h1>
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">貸借対照表入力</h1>
          <p className="text-sm text-slate-500 mt-1">年度: {fiscalYear}年度</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && <span className="text-sm text-amber-600 font-medium">未保存</span>}
          <Button onClick={handleSave} disabled={isSaving || !hasChanges} className={hasChanges ? "bg-blue-600 hover:bg-blue-700" : ""}>
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      {/* Balance check */}
      {(totalAssets > 0 || totalLiabAndNet > 0) && !isBalanced && (
        <div className="p-3 text-sm bg-red-50 border border-red-200 rounded-md text-red-700">
          資産合計と負債及び純資産合計が一致しません。差額: <strong>{formatNumber(diff)}円</strong>
        </div>
      )}
      {(totalAssets > 0 || totalLiabAndNet > 0) && isBalanced && (
        <div className="p-3 text-sm bg-emerald-50 border border-emerald-200 rounded-md text-emerald-700">
          バランスチェック OK（資産合計 = 負債及び純資産合計）
        </div>
      )}

      <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="px-4 py-2 text-left font-medium text-slate-600 w-56">項目</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600 w-44">金額（円）</th>
            </tr>
          </thead>
          <tbody>
            {BS_SECTIONS.map((sec) => (
              <BsSection key={sec.id} sectionId={sec.id} sectionLabel={sec.label} items={BS_ITEMS.filter((i) => i.section === sec.id)} getValue={getValue} updateField={updateField} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BsSection({ sectionId, sectionLabel, items, getValue, updateField }: {
  sectionId: string; sectionLabel: string;
  items: typeof BS_ITEMS;
  getValue: (k: string) => number;
  updateField: (k: string, v: number) => void;
}) {
  return (
    <>
      <tr className="bg-slate-200">
        <td colSpan={2} className="px-4 py-1.5 font-bold text-xs text-slate-700 uppercase tracking-wide">
          {sectionLabel}
        </td>
      </tr>
      {items.map((item) => (
        <tr key={`${sectionId}-${item.key}`} className={`border-b ${item.isSummary ? "bg-slate-50" : ""}`}>
          <td className={`px-4 py-1 ${item.isSummary ? "font-bold text-slate-900" : "text-slate-700 pl-8"}`}>
            {item.isSummary ? "── " : ""}{item.label}
          </td>
          <td className="px-0 py-0.5">
            {item.isEditable ? (
              <EditableCell type="number" value={getValue(item.key)} onChange={(v) => updateField(item.key, v as number)} />
            ) : (
              <div className="px-2 py-1 text-right tabular-nums font-bold text-slate-900 bg-slate-50">
                {formatNumber(getValue(item.key))}
              </div>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}
