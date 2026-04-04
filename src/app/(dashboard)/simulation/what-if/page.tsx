"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useFiscalYearStore } from "@/store/fiscal-year-store";
import { FiscalYearSelector } from "@/components/layout/fiscal-year-selector";
import { formatNumber } from "@/lib/format";
import { JOB_CATEGORY_LABELS } from "@/types/employee";

interface WhatIfResult {
  before: Record<string, number>;
  after: Record<string, number>;
  effects: { label: string; amount: number }[];
  netEffect: number;
}

interface Scenario {
  type: string;
  count?: number;
  jobCategory?: string;
  subcontractReduction?: number;
  targetRate?: number;
  selfCostRatio?: number;
  changes?: Record<string, number>;
}

const JOB_OPTIONS = Object.entries(JOB_CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }));

export default function WhatIfPage() {
  const { currentFiscalYear } = useFiscalYearStore();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState("");

  const addScenario = (type: string) => {
    const defaults: Record<string, Scenario> = {
      add_employees: { type: "add_employees", count: 1, jobCategory: "operator", subcontractReduction: 5 },
      reduce_subcontract: { type: "reduce_subcontract", targetRate: 40, selfCostRatio: 0.7 },
      cost_increase: { type: "cost_increase", changes: { waste: 20, fuel: 10 } },
    };
    setScenarios(prev => [...prev, defaults[type] || { type: "custom", changes: {} }]);
  };

  const updateScenario = (i: number, updates: Partial<Scenario>) => {
    setScenarios(prev => prev.map((s, idx) => idx === i ? { ...s, ...updates } : s));
  };

  const removeScenario = (i: number) => setScenarios(prev => prev.filter((_, idx) => idx !== i));

  const run = async () => {
    if (scenarios.length === 0) { toast.info("シナリオを追加してください"); return; }
    setIsRunning(true);
    try {
      const res = await fetch("/api/simulations/what-if", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiscal_year: currentFiscalYear, scenarios }),
      });
      const json = await res.json();
      if (res.ok) setResult(json.data);
      else toast.error(json.error?.message || "シミュレーションに失敗しました");
    } catch { toast.error("失敗しました"); }
    finally { setIsRunning(false); }
  };

  const save = async () => {
    const res = await fetch("/api/simulations/what-if", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fiscal_year: currentFiscalYear, scenarios, save_name: saveName }),
    });
    if (res.ok) { toast.success("保存しました"); setShowSave(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">What-if分析</h1>
        <FiscalYearSelector />
      </div>

      {/* Scenario selection */}
      <Card>
        <CardHeader><CardTitle className="text-base">シナリオを追加</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => addScenario("add_employees")}>👷 人員追加</Button>
            <Button variant="outline" onClick={() => addScenario("reduce_subcontract")}>📉 外注比率変更</Button>
            <Button variant="outline" onClick={() => addScenario("cost_increase")}>📈 コスト増加</Button>
          </div>
        </CardContent>
      </Card>

      {/* Active scenarios */}
      {scenarios.map((sc, i) => (
        <Card key={i}>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                {sc.type === "add_employees" ? "👷 人員追加" : sc.type === "reduce_subcontract" ? "📉 外注比率変更" : "📈 コスト増加"}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => removeScenario(i)} className="text-slate-400 hover:text-red-500">×</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {sc.type === "add_employees" && (
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">追加人数</Label>
                  <Input type="number" value={sc.count || 1} onChange={e => updateScenario(i, { count: Number(e.target.value) })} className="w-20" min={1} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">職種</Label>
                  <Select value={sc.jobCategory || "operator"} onValueChange={v => updateScenario(i, { jobCategory: v })}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{JOB_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">外注費削減率(%)</Label>
                  <Input type="number" value={sc.subcontractReduction || 0} onChange={e => updateScenario(i, { subcontractReduction: Number(e.target.value) })} className="w-20" />
                </div>
              </div>
            )}
            {sc.type === "reduce_subcontract" && (
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">目標外注比率(%)</Label>
                  <Input type="number" value={sc.targetRate || 40} onChange={e => updateScenario(i, { targetRate: Number(e.target.value) })} className="w-20" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">自社コスト比率</Label>
                  <Input type="number" value={sc.selfCostRatio || 0.7} onChange={e => updateScenario(i, { selfCostRatio: Number(e.target.value) })} className="w-20" step={0.1} />
                </div>
              </div>
            )}
            {sc.type === "cost_increase" && (
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">産廃処分費 +(%)</Label>
                  <Input type="number" value={sc.changes?.waste || 0} onChange={e => updateScenario(i, { changes: { ...sc.changes, waste: Number(e.target.value) } })} className="w-20" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">燃料費 +(%)</Label>
                  <Input type="number" value={sc.changes?.fuel || 0} onChange={e => updateScenario(i, { changes: { ...sc.changes, fuel: Number(e.target.value) } })} className="w-20" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {scenarios.length > 0 && (
        <Button onClick={run} disabled={isRunning} className="w-full">{isRunning ? "計算中..." : "シミュレーション実行"}</Button>
      )}

      {/* Results */}
      {result && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PlSummaryCard title="現在（Before）" data={result.before} />
            <PlSummaryCard title="シナリオ後（After）" data={result.after} highlight />
          </div>

          {/* Effects */}
          <Card>
            <CardHeader><CardTitle className="text-base">効果の内訳</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {result.effects.map((e, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-slate-600">{e.label}</span>
                    <span className={`tabular-nums font-medium ${e.amount > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {e.amount > 0 ? "+" : ""}{formatNumber(e.amount)}円
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>ネット効果</span>
                  <span className={`tabular-nums ${result.netEffect > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {result.netEffect > 0 ? "+" : ""}{formatNumber(result.netEffect)}円
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>営業利益の変化</span>
                  <span className={result.after.operatingProfit > result.before.operatingProfit ? "text-emerald-600" : "text-red-600"}>
                    {formatNumber(result.after.operatingProfit - result.before.operatingProfit)}円
                    （{result.before.operatingMarginRate}% → {result.after.operatingMarginRate}%）
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => { setSaveName(`What-if - ${new Date().toLocaleDateString("ja-JP")}`); setShowSave(true); }}>シナリオを保存</Button>
          </div>
        </>
      )}

      <Dialog open={showSave} onOpenChange={setShowSave}>
        <DialogContent>
          <DialogHeader><DialogTitle>シナリオを保存</DialogTitle></DialogHeader>
          <Input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="シナリオ名" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSave(false)}>キャンセル</Button>
            <Button onClick={save}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlSummaryCard({ title, data, highlight }: { title: string; data: Record<string, number>; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-blue-200 bg-blue-50/30" : ""}>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-1 text-sm">
        {[
          { l: "売上高", k: "revenue" }, { l: "売上原価", k: "cogsTotal" },
          { l: "粗利", k: "grossProfit" }, { l: "販管費", k: "sgaTotal" }, { l: "営業利益", k: "operatingProfit" },
        ].map(r => (
          <div key={r.k} className="flex justify-between">
            <span className="text-slate-600">{r.l}</span>
            <span className="tabular-nums">{formatNumber(Math.round(data[r.k] || 0))}</span>
          </div>
        ))}
        <div className="border-t pt-1 flex justify-between font-bold">
          <span>粗利率</span><span>{data.grossMarginRate}%</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>営業利益率</span><span>{data.operatingMarginRate}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
