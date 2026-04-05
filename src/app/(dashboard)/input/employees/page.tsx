"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EditableCell, SelectCell } from "@/components/tables/editable-cell";
import { formatNumber } from "@/lib/format";
import { calculateEmployeeCost } from "@/lib/calculation/employee-cost";
import { triggerCostMasterRecalculation } from "@/lib/triggers/recalculate-cost-master";
import { JOB_CATEGORY_LABELS, type JobCategory } from "@/types/employee";
import { FiscalYearSelector } from "@/components/layout/fiscal-year-selector";
import { useFiscalYearStore } from "@/store/fiscal-year-store";

interface EmployeeRow {
  id?: string;
  _isNew?: boolean;
  _deleted?: boolean;
  _dirty?: boolean;
  employeeNo: number;
  nameOrTitle: string;
  jobCategory: JobCategory;
  monthlyGrossSalary: number;
  monthlyHealthInsurance: number;
  monthlyPension: number;
  monthlyDcPension: number;
  monthlySafetyFund: number;
  monthlyOther: number;
  monthlySubtotal: number;
  annualTotal: number;
  dailyCost: number;
}

const JOB_OPTIONS = Object.entries(JOB_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function recalcRow(
  row: EmployeeRow,
  annualWorkingDays: number,
  bonusCount: number
): EmployeeRow {
  const calc = calculateEmployeeCost(
    {
      monthlyGrossSalary: row.monthlyGrossSalary,
      monthlyHealthInsurance: row.monthlyHealthInsurance,
      monthlyPension: row.monthlyPension,
      monthlyDcPension: row.monthlyDcPension,
      monthlySafetyFund: row.monthlySafetyFund,
      monthlyOther: row.monthlyOther,
    },
    { annualWorkingDays, bonusCount }
  );
  return { ...row, ...calc };
}

export default function EmployeesInputPage() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [annualWorkingDays, setAnnualWorkingDays] = useState(278);
  const [bonusCount, setBonusCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const { currentFiscalYear: fiscalYear } = useFiscalYearStore();
  const originalRowsRef = useRef<string>("");

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/employees?fiscal_year=${fiscalYear}`);
      const json = await res.json();
      if (res.ok) {
        const data = json.data.map((e: Record<string, unknown>) => ({
          id: e.id,
          employeeNo: e.employeeNo,
          nameOrTitle: e.nameOrTitle,
          jobCategory: e.jobCategory,
          monthlyGrossSalary: e.monthlyGrossSalary,
          monthlyHealthInsurance: e.monthlyHealthInsurance,
          monthlyPension: e.monthlyPension,
          monthlyDcPension: e.monthlyDcPension,
          monthlySafetyFund: e.monthlySafetyFund,
          monthlyOther: e.monthlyOther,
          monthlySubtotal: e.monthlySubtotal,
          annualTotal: e.annualTotal,
          dailyCost: e.dailyCost,
          _isNew: false,
          _deleted: false,
          _dirty: false,
        }));
        setRows(data);
        originalRowsRef.current = JSON.stringify(data);
        if (json.settings) {
          setAnnualWorkingDays(json.settings.annualWorkingDays);
          setBonusCount(json.settings.bonusCount);
        }
      }
    } catch {
      toast.error("データの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [fiscalYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Detect changes
  useEffect(() => {
    const activeRows = rows.filter((r) => !r._deleted);
    const changed =
      JSON.stringify(activeRows.map(({ _isNew, _deleted, _dirty, ...rest }) => rest)) !==
      originalRowsRef.current;
    setHasChanges(changed || rows.some((r) => r._isNew || r._deleted));
  }, [rows]);

  // Warn on page leave
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  const updateRow = (index: number, field: keyof EmployeeRow, value: unknown) => {
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[index], [field]: value, _dirty: true };
      next[index] = recalcRow(row, annualWorkingDays, bonusCount);
      return next;
    });
  };

  const addRow = () => {
    const maxNo = rows.reduce((max, r) => Math.max(max, r.employeeNo), 0);
    const newRow: EmployeeRow = {
      _isNew: true,
      _dirty: true,
      _deleted: false,
      employeeNo: maxNo + 1,
      nameOrTitle: "",
      jobCategory: "other",
      monthlyGrossSalary: 0,
      monthlyHealthInsurance: 0,
      monthlyPension: 0,
      monthlyDcPension: 0,
      monthlySafetyFund: 0,
      monthlyOther: 0,
      monthlySubtotal: 0,
      annualTotal: 0,
      dailyCost: 0,
    };
    setRows((prev) => [...prev, newRow]);
  };

  const confirmDelete = (index: number) => setDeleteTarget(index);

  const executeDelete = () => {
    if (deleteTarget == null) return;
    setRows((prev) => {
      const next = [...prev];
      if (next[deleteTarget]._isNew) {
        next.splice(deleteTarget, 1);
      } else {
        next[deleteTarget] = { ...next[deleteTarget], _deleted: true };
      }
      return next;
    });
    setDeleteTarget(null);
  };

  // Recalculate all rows when settings change
  const recalcAll = (days: number, bonus: number) => {
    setRows((prev) =>
      prev.map((r) => recalcRow({ ...r, _dirty: true }, days, bonus))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const items = rows
        .filter((r) => r._dirty || r._isNew || r._deleted)
        .map((r) => ({
          id: r.id,
          _action: r._deleted ? "delete" : r._isNew ? "create" : "update",
          employeeNo: r.employeeNo,
          nameOrTitle: r.nameOrTitle,
          jobCategory: r.jobCategory,
          monthlyGrossSalary: r.monthlyGrossSalary,
          monthlyHealthInsurance: r.monthlyHealthInsurance,
          monthlyPension: r.monthlyPension,
          monthlyDcPension: r.monthlyDcPension,
          monthlySafetyFund: r.monthlySafetyFund,
          monthlyOther: r.monthlyOther,
          fiscalYear,
        }));

      if (items.length === 0) {
        toast.info("変更はありません");
        return;
      }

      const res = await fetch("/api/employees/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, fiscalYear }),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error?.message || "保存に失敗しました");
        return;
      }

      toast.success(`${items.length}件の変更を保存しました`);
      setHasChanges(false);
      await fetchData();
      triggerCostMasterRecalculation(fiscalYear);
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const visibleRows = rows.filter((r) => !r._deleted);
  const monthlyWorkingDays = (annualWorkingDays / 12).toFixed(2);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">人工データ入力</h1>
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">人工データ入力</h1>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm text-amber-600 font-medium">未保存の変更があります</span>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={hasChanges ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">設定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 items-end">
            <div className="space-y-1">
              <Label>年間稼働日数</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={annualWorkingDays}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setAnnualWorkingDays(v);
                    recalcAll(v, bonusCount);
                  }}
                  className="w-24"
                />
                <span className="text-sm text-slate-500">日</span>
                <span className="text-sm text-slate-400 ml-2">
                  → 1ヶ月の稼働日数: {monthlyWorkingDays} 日
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <Label>賞与回数</Label>
              <div className="flex items-center gap-3">
                {[
                  { v: 0, l: "なし（12ヶ月）" },
                  { v: 1, l: "1回（13ヶ月）" },
                  { v: 2, l: "2回（14ヶ月）" },
                ].map((opt) => (
                  <label key={opt.v} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={bonusCount === opt.v}
                      onChange={() => {
                        setBonusCount(opt.v);
                        recalcAll(annualWorkingDays, opt.v);
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{opt.l}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="px-2 py-2 text-left w-12 font-medium text-slate-600">No</th>
              <th className="px-2 py-2 text-left w-28 font-medium text-slate-600">役職/名前</th>
              <th className="px-2 py-2 text-left w-28 font-medium text-slate-600">職種</th>
              <th className="px-2 py-2 text-right w-24 font-medium text-slate-600">総支給</th>
              <th className="px-2 py-2 text-right w-20 font-medium text-slate-600">健保</th>
              <th className="px-2 py-2 text-right w-20 font-medium text-slate-600">厚年</th>
              <th className="px-2 py-2 text-right w-20 font-medium text-slate-600">確定拠出</th>
              <th className="px-2 py-2 text-right w-20 font-medium text-slate-600">安心財団</th>
              <th className="px-2 py-2 text-right w-20 font-medium text-slate-600">その他</th>
              <th className="px-2 py-2 text-right w-24 font-medium text-slate-600 bg-slate-100">月額合計</th>
              <th className="px-2 py-2 text-right w-28 font-medium text-slate-600 bg-slate-100">年間合計</th>
              <th className="px-2 py-2 text-right w-24 font-medium text-slate-600 bg-slate-100">日割り</th>
              <th className="px-2 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, i) => {
              const actualIndex = rows.indexOf(row);
              return (
                <tr key={row.id || `new-${i}`} className="border-b hover:bg-slate-50/50">
                  <td className="px-2 py-0.5 text-slate-400 text-center">{row.employeeNo}</td>
                  <td className="px-0 py-0.5">
                    <EditableCell
                      value={row.nameOrTitle}
                      onChange={(v) => updateRow(actualIndex, "nameOrTitle", v)}
                      placeholder="名前"
                    />
                  </td>
                  <td className="px-0 py-0.5">
                    <SelectCell
                      value={row.jobCategory}
                      options={JOB_OPTIONS}
                      onChange={(v) => updateRow(actualIndex, "jobCategory", v)}
                    />
                  </td>
                  <td className="px-0 py-0.5">
                    <EditableCell type="number" value={row.monthlyGrossSalary} onChange={(v) => updateRow(actualIndex, "monthlyGrossSalary", v)} />
                  </td>
                  <td className="px-0 py-0.5">
                    <EditableCell type="number" value={row.monthlyHealthInsurance} onChange={(v) => updateRow(actualIndex, "monthlyHealthInsurance", v)} />
                  </td>
                  <td className="px-0 py-0.5">
                    <EditableCell type="number" value={row.monthlyPension} onChange={(v) => updateRow(actualIndex, "monthlyPension", v)} />
                  </td>
                  <td className="px-0 py-0.5">
                    <EditableCell type="number" value={row.monthlyDcPension} onChange={(v) => updateRow(actualIndex, "monthlyDcPension", v)} />
                  </td>
                  <td className="px-0 py-0.5">
                    <EditableCell type="number" value={row.monthlySafetyFund} onChange={(v) => updateRow(actualIndex, "monthlySafetyFund", v)} />
                  </td>
                  <td className="px-0 py-0.5">
                    <EditableCell type="number" value={row.monthlyOther} onChange={(v) => updateRow(actualIndex, "monthlyOther", v)} />
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums bg-slate-50 text-slate-600">
                    {formatNumber(row.monthlySubtotal)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums bg-slate-50 text-slate-600">
                    {formatNumber(row.annualTotal)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums bg-slate-50 font-bold text-slate-900">
                    {formatNumber(row.dailyCost)}
                  </td>
                  <td className="px-1 py-0.5 text-center">
                    <button
                      onClick={() => confirmDelete(actualIndex)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded"
                      title="削除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="p-3 border-t">
          <Button variant="outline" size="sm" onClick={addRow}>
            + 行を追加
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>削除の確認</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            {deleteTarget !== null && rows[deleteTarget] && (
              <>「{rows[deleteTarget].nameOrTitle || `No.${rows[deleteTarget].employeeNo}`}」を削除しますか？</>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={executeDelete}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
