"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFiscalYearStore } from "@/store/fiscal-year-store";
import { FiscalYearSelector } from "@/components/layout/fiscal-year-selector";
import { SelectCell } from "@/components/tables/editable-cell";
import { DEPARTMENTS, POSITIONS } from "@/lib/constants/performance-curves";

interface ProfileRow {
  employeeId: string;
  name: string;
  birthDate: string;
  hireDate: string;
  department: string;
  position: string;
  retirementAge: number;
  performanceOverride: number | null;
  notes: string;
  _dirty: boolean;
}

const DEPT_OPTIONS = DEPARTMENTS.map(d => ({ value: d.value, label: d.label }));
const POS_OPTIONS = POSITIONS.map(p => ({ value: p.value, label: p.label }));

function calcAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age;
}

function calcTenure(hireDate: string): string {
  if (!hireDate) return "-";
  const hire = new Date(hireDate);
  const now = new Date();
  const years = now.getFullYear() - hire.getFullYear();
  return `${years}年`;
}

export default function EmployeeProfilesPage() {
  const { currentFiscalYear } = useFiscalYearStore();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/employee-profiles?fiscal_year=${currentFiscalYear}`);
      const json = await res.json();
      if (res.ok) {
        setRows(json.data.map((e: Record<string, unknown>) => ({
          employeeId: e.id,
          name: e.nameOrTitle,
          birthDate: (e.profile as Record<string, unknown>)?.birthDate ? String((e.profile as Record<string, unknown>).birthDate).slice(0, 10) : "",
          hireDate: (e.profile as Record<string, unknown>)?.hireDate ? String((e.profile as Record<string, unknown>).hireDate).slice(0, 10) : "",
          department: (e.profile as Record<string, unknown>)?.department || "",
          position: (e.profile as Record<string, unknown>)?.position || "",
          retirementAge: (e.profile as Record<string, unknown>)?.retirementAge || 65,
          performanceOverride: (e.profile as Record<string, unknown>)?.performanceOverride != null ? Number((e.profile as Record<string, unknown>).performanceOverride) : null,
          notes: (e.profile as Record<string, unknown>)?.notes || "",
          _dirty: false,
        })));
      }
    } catch { toast.error("取得に失敗しました"); }
    finally { setIsLoading(false); }
  }, [currentFiscalYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const update = (i: number, field: keyof ProfileRow, value: unknown) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value, _dirty: true } : r));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const items = rows.filter(r => r._dirty).map(r => ({
        employeeId: r.employeeId, birthDate: r.birthDate || null, hireDate: r.hireDate || null,
        department: r.department || null, position: r.position || null, retirementAge: r.retirementAge,
        performanceOverride: r.performanceOverride, notes: r.notes || null,
      }));
      if (items.length === 0) { toast.info("変更はありません"); setIsSaving(false); return; }
      const res = await fetch("/api/employee-profiles/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
      if (res.ok) { toast.success(`${items.length}件を保存しました`); await fetchData(); }
      else toast.error("保存に失敗しました");
    } catch { toast.error("保存に失敗しました"); }
    finally { setIsSaving(false); }
  };

  if (isLoading) return <div className="space-y-6"><h1 className="text-2xl font-bold text-slate-900">従業員プロファイル</h1><p className="text-slate-500">読み込み中...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">従業員プロファイル</h1>
        <div className="flex items-center gap-3">
          <FiscalYearSelector />
          <Button onClick={handleSave} disabled={isSaving || !rows.some(r => r._dirty)}>
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="px-3 py-2 text-left font-medium text-slate-600">名前</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600 w-28">生年月日</th>
              <th className="px-3 py-2 text-center font-medium text-slate-600 w-14">年齢</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600 w-28">入社日</th>
              <th className="px-3 py-2 text-center font-medium text-slate-600 w-16">勤続</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600 w-24">部署</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600 w-28">ポジション</th>
              <th className="px-3 py-2 text-center font-medium text-slate-600 w-16">退職年齢</th>
              <th className="px-3 py-2 text-center font-medium text-slate-600 w-14">退職年</th>
              <th className="px-3 py-2 text-center font-medium text-slate-600 w-16">係数</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">備考</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const age = calcAge(row.birthDate);
              const retireYear = row.birthDate ? new Date(row.birthDate).getFullYear() + row.retirementAge : null;
              return (
                <tr key={row.employeeId} className={`border-b ${row._dirty ? "bg-blue-50/30" : ""}`}>
                  <td className="px-3 py-1.5 font-medium text-slate-700">{row.name}</td>
                  <td className="px-1 py-0.5"><Input type="date" value={row.birthDate} onChange={e => update(i, "birthDate", e.target.value)} className="h-7 text-xs" /></td>
                  <td className="px-3 py-1.5 text-center tabular-nums text-slate-500">{age ?? "-"}</td>
                  <td className="px-1 py-0.5"><Input type="date" value={row.hireDate} onChange={e => update(i, "hireDate", e.target.value)} className="h-7 text-xs" /></td>
                  <td className="px-3 py-1.5 text-center text-slate-500">{calcTenure(row.hireDate)}</td>
                  <td className="px-0 py-0.5"><SelectCell value={row.department} options={DEPT_OPTIONS} onChange={v => update(i, "department", v)} /></td>
                  <td className="px-0 py-0.5"><SelectCell value={row.position} options={POS_OPTIONS} onChange={v => update(i, "position", v)} /></td>
                  <td className="px-1 py-0.5"><Input type="number" value={row.retirementAge} onChange={e => update(i, "retirementAge", Number(e.target.value))} className="h-7 text-xs text-center w-14" /></td>
                  <td className="px-3 py-1.5 text-center tabular-nums text-slate-400">{retireYear ?? "-"}</td>
                  <td className="px-1 py-0.5"><Input type="number" value={row.performanceOverride ?? ""} onChange={e => update(i, "performanceOverride", e.target.value === "" ? null : Number(e.target.value))} className="h-7 text-xs text-center w-14" step={0.05} placeholder="自動" /></td>
                  <td className="px-1 py-0.5"><Input value={row.notes} onChange={e => update(i, "notes", e.target.value)} className="h-7 text-xs" placeholder="備考" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
