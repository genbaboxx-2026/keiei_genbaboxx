"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFiscalYearStore } from "@/store/fiscal-year-store";
import { EditableCell, SelectCell } from "@/components/tables/editable-cell";
import { formatNumber } from "@/lib/format";

interface AttrRow {
  employeeId: string;
  revenue: number;
  grossProfit: number;
  projectCount: number;
}

export default function RevenueAttributionPage() {
  const { currentFiscalYear } = useFiscalYearStore();
  const [rows, setRows] = useState<AttrRow[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [actualRevenue, setActualRevenue] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [empRes, attrRes, finRes] = await Promise.all([
        fetch(`/api/employees?fiscal_year=${currentFiscalYear}`),
        fetch(`/api/revenue-attribution?fiscal_year=${currentFiscalYear}`),
        fetch(`/api/financials?fiscal_year=${currentFiscalYear}`),
      ]);
      const empJson = await empRes.json();
      const attrJson = await attrRes.json();
      const finJson = await finRes.json();

      if (empJson.data) setEmployees(empJson.data.map((e: Record<string, string>) => ({ id: e.id, name: e.nameOrTitle })));
      if (attrJson.data) setRows(attrJson.data.map((a: Record<string, unknown>) => ({
        employeeId: a.employeeId, revenue: Number(a.attributedRevenue), grossProfit: Number(a.attributedGrossProfit), projectCount: Number(a.projectCount),
      })));
      if (finJson.data) setActualRevenue(Number(finJson.data.revenue || 0));
    } catch { toast.error("データ取得に失敗しました"); }
    finally { setIsLoading(false); }
  }, [currentFiscalYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const update = (i: number, field: keyof AttrRow, value: unknown) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const addRow = () => setRows(prev => [...prev, { employeeId: "", revenue: 0, grossProfit: 0, projectCount: 0 }]);
  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const totalAttrRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const diff = actualRevenue - totalAttrRevenue;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/revenue-attribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiscalYear: currentFiscalYear, items: rows.filter(r => r.employeeId) }),
      });
      if (res.ok) toast.success("売上按分を保存しました");
      else toast.error("保存に失敗しました");
    } catch { toast.error("保存に失敗しました"); }
    finally { setIsSaving(false); }
  };

  if (isLoading) return <div className="space-y-6"><h1 className="text-2xl font-bold text-slate-900">売上按分入力</h1><p className="text-slate-500">読み込み中...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">売上按分入力</h1>
        <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "保存中..." : "保存"}</Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="px-4 py-2 text-left font-medium text-slate-600 w-40">担当者</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">年間売上（円）</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">年間粗利（円）</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600 w-24">担当件数</th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b">
                <td className="px-0 py-0.5">
                  <SelectCell
                    value={row.employeeId}
                    options={employees.map(e => ({ value: e.id, label: e.name }))}
                    onChange={(v) => update(i, "employeeId", v)}
                  />
                </td>
                <td className="px-0 py-0.5"><EditableCell type="number" value={row.revenue} onChange={(v) => update(i, "revenue", v)} /></td>
                <td className="px-0 py-0.5"><EditableCell type="number" value={row.grossProfit} onChange={(v) => update(i, "grossProfit", v)} /></td>
                <td className="px-0 py-0.5"><EditableCell type="number" value={row.projectCount} onChange={(v) => update(i, "projectCount", v)} /></td>
                <td className="px-1 py-0.5 text-center">
                  <button onClick={() => removeRow(i)} className="p-1 text-slate-400 hover:text-red-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 border-t flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={addRow}>+ 行を追加</Button>
          <div className="text-sm">
            <span className="text-slate-500">按分合計: {formatNumber(totalAttrRevenue)}</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-slate-500">実売上: {formatNumber(actualRevenue)}</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className={diff === 0 ? "text-emerald-600" : "text-amber-600"}>差額: {formatNumber(diff)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
