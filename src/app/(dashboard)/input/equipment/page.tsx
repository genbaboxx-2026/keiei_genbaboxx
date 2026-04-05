"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EditableCell, SelectCell } from "@/components/tables/editable-cell";
import { formatNumber } from "@/lib/format";
import { calculateEquipmentDailyCost } from "@/lib/calculation/equipment-cost";
import { triggerCostMasterRecalculation } from "@/lib/triggers/recalculate-cost-master";
import {
  SIZE_CATEGORIES,
  ATTACHMENT_TYPES,
  type EquipmentType,
} from "@/types/equipment";
import { FiscalYearSelector } from "@/components/layout/fiscal-year-selector";
import { useFiscalYearStore } from "@/store/fiscal-year-store";

interface EquipmentRow {
  id?: string;
  _isNew?: boolean;
  _deleted?: boolean;
  _dirty?: boolean;
  equipmentType: EquipmentType;
  name: string;
  spec: string;
  sizeCategory: string;
  attachmentType: string;
  insuranceLiability: number;
  insuranceProperty: number;
  insuranceVehicle: number;
  insuranceCompulsory: number;
  vehicleTax: number;
  annualInspection: number;
  repairMaintenance: number;
  depreciationAmount: number;
  leaseAmount: number;
  isLeased: boolean;
  isFixedAsset: boolean;
  annualTotalCost: number;
  dailyCost: number;
}

const SIZE_OPTIONS = SIZE_CATEGORIES.map((s) => ({ value: s, label: s }));
const ATT_OPTIONS = ATTACHMENT_TYPES.map((a) => ({ value: a, label: a }));

function recalcEquipment(row: EquipmentRow, annualWorkingDays: number): EquipmentRow {
  const calc = calculateEquipmentDailyCost(
    {
      equipmentType: row.equipmentType,
      insuranceLiability: row.insuranceLiability,
      insuranceProperty: row.insuranceProperty,
      insuranceVehicle: row.insuranceVehicle,
      insuranceCompulsory: row.insuranceCompulsory,
      vehicleTax: row.vehicleTax,
      annualInspection: row.annualInspection,
      repairMaintenance: row.repairMaintenance,
      depreciationAmount: row.depreciationAmount,
      leaseAmount: row.leaseAmount,
    },
    annualWorkingDays
  );
  return { ...row, annualTotalCost: calc.annualTotalCost, dailyCost: calc.dailyCost };
}

function emptyRow(type: EquipmentType): EquipmentRow {
  return {
    _isNew: true, _dirty: true, _deleted: false,
    equipmentType: type,
    name: "", spec: "", sizeCategory: "", attachmentType: "",
    insuranceLiability: 0, insuranceProperty: 0, insuranceVehicle: 0,
    insuranceCompulsory: 0, vehicleTax: 0, annualInspection: 0,
    repairMaintenance: 0, depreciationAmount: 0, leaseAmount: 0,
    isLeased: false, isFixedAsset: false,
    annualTotalCost: 0, dailyCost: 0,
  };
}

export default function EquipmentInputPage() {
  const [rows, setRows] = useState<EquipmentRow[]>([]);
  const [activeTab, setActiveTab] = useState<EquipmentType>("vehicle");
  const [annualWorkingDays, setAnnualWorkingDays] = useState(278);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const { currentFiscalYear: fiscalYear } = useFiscalYearStore();
  const originalRef = useRef<string>("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/equipment?fiscal_year=${fiscalYear}`);
      const json = await res.json();
      if (res.ok) {
        const data: EquipmentRow[] = json.data.map((e: Record<string, unknown>) => ({
          id: e.id,
          equipmentType: e.equipmentType,
          name: e.name, spec: e.spec || "",
          sizeCategory: e.sizeCategory || "",
          attachmentType: e.attachmentType || "",
          insuranceLiability: e.insuranceLiability || 0,
          insuranceProperty: e.insuranceProperty || 0,
          insuranceVehicle: e.insuranceVehicle || 0,
          insuranceCompulsory: e.insuranceCompulsory || 0,
          vehicleTax: e.vehicleTax || 0,
          annualInspection: e.annualInspection || 0,
          repairMaintenance: e.repairMaintenance || 0,
          depreciationAmount: e.depreciationAmount || 0,
          leaseAmount: e.leaseAmount || 0,
          isLeased: e.isLeased || false,
          isFixedAsset: e.isFixedAsset || false,
          annualTotalCost: e.annualTotalCost || 0,
          dailyCost: e.dailyCost || 0,
          _isNew: false, _deleted: false, _dirty: false,
        }));
        setRows(data);
        originalRef.current = JSON.stringify(data);
        if (json.settings) setAnnualWorkingDays(json.settings.annualWorkingDays);
      }
    } catch { toast.error("データ取得に失敗しました"); }
    finally { setIsLoading(false); }
  }, [fiscalYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    setHasChanges(rows.some((r) => r._dirty || r._isNew || r._deleted));
  }, [rows]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (hasChanges) e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [hasChanges]);

  const updateRow = (globalIdx: number, field: keyof EquipmentRow, value: unknown) => {
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[globalIdx], [field]: value, _dirty: true };
      next[globalIdx] = recalcEquipment(row, annualWorkingDays);
      return next;
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow(activeTab)]);
  };

  const confirmDelete = (idx: number) => setDeleteTarget(idx);
  const executeDelete = () => {
    if (deleteTarget == null) return;
    setRows((prev) => {
      const next = [...prev];
      if (next[deleteTarget]._isNew) next.splice(deleteTarget, 1);
      else next[deleteTarget] = { ...next[deleteTarget], _deleted: true };
      return next;
    });
    setDeleteTarget(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const items = rows
        .filter((r) => r._dirty || r._isNew || r._deleted)
        .map((r) => ({
          id: r.id,
          _action: r._deleted ? "delete" : r._isNew ? "create" : "update",
          equipmentType: r.equipmentType,
          name: r.name, spec: r.spec,
          sizeCategory: r.sizeCategory || null,
          attachmentType: r.attachmentType || null,
          insuranceLiability: r.insuranceLiability,
          insuranceProperty: r.insuranceProperty,
          insuranceVehicle: r.insuranceVehicle,
          insuranceCompulsory: r.insuranceCompulsory,
          vehicleTax: r.vehicleTax,
          annualInspection: r.annualInspection,
          repairMaintenance: r.repairMaintenance,
          depreciationAmount: r.depreciationAmount,
          leaseAmount: r.leaseAmount,
          isLeased: r.isLeased,
          isFixedAsset: r.isFixedAsset,
          ownershipType: r.isLeased ? "leased" : "owned",
        }));

      if (items.length === 0) { toast.info("変更はありません"); return; }

      const res = await fetch("/api/equipment/bulk", {
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
    } catch { toast.error("保存に失敗しました"); }
    finally { setIsSaving(false); }
  };

  const tabRows = (type: EquipmentType) => rows
    .map((r, i) => ({ ...r, _globalIdx: i }))
    .filter((r) => r.equipmentType === type && !r._deleted);

  // Summary
  const vehicles = rows.filter((r) => r.equipmentType === "vehicle" && !r._deleted);
  const machines = rows.filter((r) => r.equipmentType === "heavy_machine" && !r._deleted);
  const attachments = rows.filter((r) => r.equipmentType === "attachment" && !r._deleted);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">重機・車両・アタッチメント入力</h1>
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">重機・車両・アタッチメント入力</h1>
        <div className="flex items-center gap-3">
          {hasChanges && <span className="text-sm text-amber-600 font-medium">未保存の変更があります</span>}
          <Button onClick={handleSave} disabled={isSaving || !hasChanges} className={hasChanges ? "bg-blue-600 hover:bg-blue-700" : ""}>
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EquipmentType)}>
        <TabsList>
          <TabsTrigger value="vehicle">🚛 車両</TabsTrigger>
          <TabsTrigger value="heavy_machine">🏗️ 重機</TabsTrigger>
          <TabsTrigger value="attachment">🔧 アタッチメント</TabsTrigger>
        </TabsList>

        {/* Vehicle Tab */}
        <TabsContent value="vehicle">
          <EquipmentTable
            rows={tabRows("vehicle")}
            type="vehicle"
            updateRow={updateRow}
            confirmDelete={confirmDelete}
            addRow={addRow}
          />
        </TabsContent>

        {/* Heavy Machine Tab */}
        <TabsContent value="heavy_machine">
          <EquipmentTable
            rows={tabRows("heavy_machine")}
            type="heavy_machine"
            updateRow={updateRow}
            confirmDelete={confirmDelete}
            addRow={addRow}
          />
        </TabsContent>

        {/* Attachment Tab */}
        <TabsContent value="attachment">
          <EquipmentTable
            rows={tabRows("attachment")}
            type="attachment"
            updateRow={updateRow}
            confirmDelete={confirmDelete}
            addRow={addRow}
          />
        </TabsContent>
      </Tabs>

      {/* Summary */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-medium text-slate-600 mb-2">サマリー</h3>
        <div className="flex flex-wrap gap-6 text-sm">
          <span>車両: <strong>{vehicles.length}台</strong>（自社{vehicles.filter((v) => !v.isLeased).length}台、リース{vehicles.filter((v) => v.isLeased).length}台）</span>
          <span>重機: <strong>{machines.length}台</strong>（自社{machines.filter((v) => !v.isLeased).length}台、リース{machines.filter((v) => v.isLeased).length}台）</span>
          <span>アタッチメント: <strong>{attachments.length}個</strong></span>
        </div>
      </div>

      {/* Delete dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>削除の確認</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">
            {deleteTarget !== null && rows[deleteTarget] && (
              <>「{rows[deleteTarget].name || "この項目"}」を削除しますか？</>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>キャンセル</Button>
            <Button variant="destructive" onClick={executeDelete}>削除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---

interface EquipmentTableProps {
  rows: (EquipmentRow & { _globalIdx: number })[];
  type: EquipmentType;
  updateRow: (globalIdx: number, field: keyof EquipmentRow, value: unknown) => void;
  confirmDelete: (globalIdx: number) => void;
  addRow: () => void;
}

function EquipmentTable({ rows, type, updateRow, confirmDelete, addRow }: EquipmentTableProps) {
  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50">
            {type === "attachment" && <th className="px-2 py-2 text-left w-20 font-medium text-slate-600">対応サイズ</th>}
            {type === "attachment" && <th className="px-2 py-2 text-left w-24 font-medium text-slate-600">種類</th>}
            <th className="px-2 py-2 text-left font-medium text-slate-600">名前</th>
            {type !== "attachment" && <th className="px-2 py-2 text-left w-24 font-medium text-slate-600">性能</th>}
            {type === "heavy_machine" && <th className="px-2 py-2 text-left w-20 font-medium text-slate-600">サイズ</th>}
            {type === "vehicle" && <th className="px-2 py-2 text-right w-20 font-medium text-slate-600">対人対物</th>}
            {(type === "vehicle" || type === "heavy_machine") && <th className="px-2 py-2 text-right w-20 font-medium text-slate-600">動産保険</th>}
            {type === "vehicle" && <th className="px-2 py-2 text-right w-20 font-medium text-slate-600">車両保険</th>}
            {type === "vehicle" && <th className="px-2 py-2 text-right w-20 font-medium text-slate-600">自賠</th>}
            {type === "vehicle" && <th className="px-2 py-2 text-right w-20 font-medium text-slate-600">自動車税</th>}
            {type === "vehicle" && <th className="px-2 py-2 text-right w-20 font-medium text-slate-600">車検</th>}
            <th className="px-2 py-2 text-right w-20 font-medium text-slate-600">修繕費</th>
            <th className="px-2 py-2 text-right w-20 font-medium text-slate-600">減価償却</th>
            {type !== "attachment" && <th className="px-2 py-2 text-right w-20 font-medium text-slate-600">リース料</th>}
            {type !== "attachment" && <th className="px-2 py-2 text-center w-16 font-medium text-slate-600">固定資産</th>}
            {type !== "attachment" && <th className="px-2 py-2 text-center w-16 font-medium text-slate-600">リース</th>}
            <th className="px-2 py-2 text-right w-24 font-medium text-slate-600 bg-slate-100">年間合計</th>
            <th className="px-2 py-2 text-right w-20 font-medium text-slate-600 bg-slate-100">日割り</th>
            <th className="px-2 py-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id || `new-${row._globalIdx}`} className="border-b hover:bg-slate-50/50">
              {type === "attachment" && (
                <td className="px-0 py-0.5">
                  <SelectCell value={row.sizeCategory} options={SIZE_OPTIONS} onChange={(v) => updateRow(row._globalIdx, "sizeCategory", v)} />
                </td>
              )}
              {type === "attachment" && (
                <td className="px-0 py-0.5">
                  <SelectCell value={row.attachmentType} options={ATT_OPTIONS} onChange={(v) => updateRow(row._globalIdx, "attachmentType", v)} />
                </td>
              )}
              <td className="px-0 py-0.5">
                <EditableCell value={row.name} onChange={(v) => updateRow(row._globalIdx, "name", v)} placeholder="名前" />
              </td>
              {type !== "attachment" && (
                <td className="px-0 py-0.5">
                  <EditableCell value={row.spec} onChange={(v) => updateRow(row._globalIdx, "spec", v)} placeholder="性能" />
                </td>
              )}
              {type === "heavy_machine" && (
                <td className="px-0 py-0.5">
                  <SelectCell value={row.sizeCategory} options={SIZE_OPTIONS} onChange={(v) => updateRow(row._globalIdx, "sizeCategory", v)} />
                </td>
              )}
              {type === "vehicle" && <td className="px-0 py-0.5"><EditableCell type="number" value={row.insuranceLiability} onChange={(v) => updateRow(row._globalIdx, "insuranceLiability", v)} /></td>}
              {(type === "vehicle" || type === "heavy_machine") && <td className="px-0 py-0.5"><EditableCell type="number" value={row.insuranceProperty} onChange={(v) => updateRow(row._globalIdx, "insuranceProperty", v)} /></td>}
              {type === "vehicle" && <td className="px-0 py-0.5"><EditableCell type="number" value={row.insuranceVehicle} onChange={(v) => updateRow(row._globalIdx, "insuranceVehicle", v)} /></td>}
              {type === "vehicle" && <td className="px-0 py-0.5"><EditableCell type="number" value={row.insuranceCompulsory} onChange={(v) => updateRow(row._globalIdx, "insuranceCompulsory", v)} /></td>}
              {type === "vehicle" && <td className="px-0 py-0.5"><EditableCell type="number" value={row.vehicleTax} onChange={(v) => updateRow(row._globalIdx, "vehicleTax", v)} /></td>}
              {type === "vehicle" && <td className="px-0 py-0.5"><EditableCell type="number" value={row.annualInspection} onChange={(v) => updateRow(row._globalIdx, "annualInspection", v)} /></td>}
              <td className="px-0 py-0.5"><EditableCell type="number" value={row.repairMaintenance} onChange={(v) => updateRow(row._globalIdx, "repairMaintenance", v)} /></td>
              <td className="px-0 py-0.5"><EditableCell type="number" value={row.depreciationAmount} onChange={(v) => updateRow(row._globalIdx, "depreciationAmount", v)} /></td>
              {type !== "attachment" && <td className="px-0 py-0.5"><EditableCell type="number" value={row.leaseAmount} onChange={(v) => updateRow(row._globalIdx, "leaseAmount", v)} /></td>}
              {type !== "attachment" && (
                <td className="px-2 py-0.5 text-center">
                  <Checkbox checked={row.isFixedAsset} onCheckedChange={(v) => updateRow(row._globalIdx, "isFixedAsset", !!v)} />
                </td>
              )}
              {type !== "attachment" && (
                <td className="px-2 py-0.5 text-center">
                  <Checkbox checked={row.isLeased} onCheckedChange={(v) => updateRow(row._globalIdx, "isLeased", !!v)} />
                </td>
              )}
              <td className="px-2 py-1 text-right tabular-nums bg-slate-50 text-slate-600">{formatNumber(row.annualTotalCost)}</td>
              <td className="px-2 py-1 text-right tabular-nums bg-slate-50 font-bold text-slate-900">{formatNumber(row.dailyCost)}</td>
              <td className="px-1 py-0.5 text-center">
                <button onClick={() => confirmDelete(row._globalIdx)} className="p-1 text-slate-400 hover:text-red-500 rounded" title="削除">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-3 border-t">
        <Button variant="outline" size="sm" onClick={addRow}>+ 行を追加</Button>
      </div>
    </div>
  );
}
