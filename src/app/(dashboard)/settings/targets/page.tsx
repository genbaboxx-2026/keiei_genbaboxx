"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFiscalYearStore } from "@/store/fiscal-year-store";
import { formatNumber } from "@/lib/format";

interface TargetData {
  targetRevenue: number | null;
  targetGrossMarginRate: number | null;
  targetOperatingMarginRate: number | null;
  targetSubcontractRate: number | null;
  targetWasteRate: number | null;
  targetLaborRate: number | null;
  targetEquityRatio: number | null;
  targetCurrentRatio: number | null;
  targetRoe: number | null;
  targetDebtRepaymentYears: number | null;
}

const EMPTY_TARGETS: TargetData = {
  targetRevenue: null, targetGrossMarginRate: null, targetOperatingMarginRate: null,
  targetSubcontractRate: null, targetWasteRate: null, targetLaborRate: null,
  targetEquityRatio: null, targetCurrentRatio: null, targetRoe: null, targetDebtRepaymentYears: null,
};

export default function TargetsPage() {
  const [data, setData] = useState<TargetData>(EMPTY_TARGETS);
  const [prevActuals, setPrevActuals] = useState<Record<string, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { currentFiscalYear: fiscalYear } = useFiscalYearStore();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/targets?fiscal_year=${fiscalYear}`);
      const json = await res.json();
      if (res.ok) {
        if (json.data) setData(json.data);
        // Compute prev year actuals from financials
        if (json.previousFinancials) {
          const pf = json.previousFinancials;
          const rev = pf.revenue || 0;
          const cogsTotal = (pf.cogsSalary || 0) + (pf.cogsBonus || 0) + (pf.cogsStatutoryWelfare || 0)
            + (pf.cogsSubcontract || 0) + (pf.cogsWasteDisposal || 0) + (pf.cogsPower || 0)
            + (pf.cogsShipping || 0) + (pf.cogsTravel || 0) + (pf.cogsConsumables || 0)
            + (pf.cogsOfficeSupplies || 0) + (pf.cogsRepair || 0) + (pf.cogsUtilities || 0)
            + (pf.cogsMembership || 0) + (pf.cogsDepreciation || 0) + (pf.cogsTax || 0)
            + (pf.cogsInsurance || 0) + (pf.cogsProfessionalFee || 0) + (pf.cogsLease || 0) + (pf.cogsMisc || 0);
          const grossProfit = rev - cogsTotal + (pf.wipEnding || 0);
          const sgaKeys = Object.keys(pf).filter(k => k.startsWith("sga"));
          const sgaTotal = sgaKeys.reduce((s, k) => s + (pf[k] || 0), 0);
          const opProfit = grossProfit - sgaTotal;
          setPrevActuals({
            revenue: rev,
            grossMarginRate: rev > 0 ? Number(((grossProfit / rev) * 100).toFixed(2)) : null,
            operatingMarginRate: rev > 0 ? Number(((opProfit / rev) * 100).toFixed(2)) : null,
            subcontractRate: rev > 0 ? Number((((pf.cogsSubcontract || 0) / rev) * 100).toFixed(2)) : null,
            wasteRate: rev > 0 ? Number((((pf.cogsWasteDisposal || 0) / rev) * 100).toFixed(2)) : null,
            laborRate: rev > 0 ? Number(((((pf.cogsSalary || 0) + (pf.cogsBonus || 0) + (pf.cogsStatutoryWelfare || 0)) / rev) * 100).toFixed(2)) : null,
          });
        }
      }
    } catch { toast.error("データ取得に失敗しました"); }
    finally { setIsLoading(false); }
  }, [fiscalYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const update = (key: keyof TargetData, value: string) => {
    setData((prev) => ({ ...prev, [key]: value === "" ? null : Number(value) }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, fiscalYear }),
      });
      if (!res.ok) { toast.error("保存に失敗しました"); return; }
      toast.success("目標設定を保存しました");
    } catch { toast.error("保存に失敗しました"); }
    finally { setIsSaving(false); }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">目標設定</h1>
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">目標設定</h1>
          <p className="text-sm text-slate-500 mt-1">{fiscalYear}年度</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "保存中..." : "保存"}
        </Button>
      </div>

      {/* PL目標 */}
      <Card>
        <CardHeader><CardTitle className="text-base">PL目標</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <TargetRow
            label="売上目標"
            unit="円"
            value={data.targetRevenue}
            prevActual={prevActuals.revenue}
            prevFormat={(v) => `${formatNumber(v)}円`}
            onChange={(v) => update("targetRevenue", v)}
          />
          <TargetRow
            label="粗利率目標"
            unit="%"
            value={data.targetGrossMarginRate}
            prevActual={prevActuals.grossMarginRate}
            prevFormat={(v) => `${v}%`}
            onChange={(v) => update("targetGrossMarginRate", v)}
          />
          <TargetRow
            label="営業利益率目標"
            unit="%"
            value={data.targetOperatingMarginRate}
            prevActual={prevActuals.operatingMarginRate}
            prevFormat={(v) => `${v}%`}
            onChange={(v) => update("targetOperatingMarginRate", v)}
          />
        </CardContent>
      </Card>

      {/* コスト目標 */}
      <Card>
        <CardHeader><CardTitle className="text-base">コスト目標（売上比率）</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <TargetRow label="外注費率目標" unit="%" value={data.targetSubcontractRate} prevActual={prevActuals.subcontractRate} prevFormat={(v) => `${v}%`} onChange={(v) => update("targetSubcontractRate", v)} />
          <TargetRow label="産廃処分費率目標" unit="%" value={data.targetWasteRate} prevActual={prevActuals.wasteRate} prevFormat={(v) => `${v}%`} onChange={(v) => update("targetWasteRate", v)} />
          <TargetRow label="人件費率目標" unit="%" value={data.targetLaborRate} prevActual={prevActuals.laborRate} prevFormat={(v) => `${v}%`} onChange={(v) => update("targetLaborRate", v)} />
        </CardContent>
      </Card>

      {/* 経営指標目標 */}
      <Card>
        <CardHeader><CardTitle className="text-base">経営指標目標</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <TargetRow label="自己資本比率目標" unit="%" value={data.targetEquityRatio} onChange={(v) => update("targetEquityRatio", v)} />
          <TargetRow label="流動比率目標" unit="%" value={data.targetCurrentRatio} onChange={(v) => update("targetCurrentRatio", v)} />
          <TargetRow label="ROE目標" unit="%" value={data.targetRoe} onChange={(v) => update("targetRoe", v)} />
          <TargetRow label="借入金償還期間目標" unit="年" value={data.targetDebtRepaymentYears} onChange={(v) => update("targetDebtRepaymentYears", v)} />
        </CardContent>
      </Card>
    </div>
  );
}

function TargetRow({ label, unit, value, prevActual, prevFormat, onChange }: {
  label: string;
  unit: string;
  value: number | null;
  prevActual?: number | null;
  prevFormat?: (v: number) => string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <Input
          type="number"
          step="any"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-40"
          placeholder="未設定"
        />
        <span className="text-sm text-slate-500">{unit}</span>
        {prevActual != null && prevFormat && (
          <span className="text-xs text-slate-400 ml-2">
            前年実績: {prevFormat(prevActual)}
          </span>
        )}
      </div>
    </div>
  );
}
