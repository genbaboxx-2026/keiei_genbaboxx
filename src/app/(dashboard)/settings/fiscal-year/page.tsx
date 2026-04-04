"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

export default function FiscalYearPage() {
  const [sourceYear, setSourceYear] = useState(String(currentYear));
  const [targetYear, setTargetYear] = useState(String(currentYear + 1));
  const [copyEmployees, setCopyEmployees] = useState(true);
  const [copyEquipment, setCopyEquipment] = useState(true);
  const [copyCostClassifications, setCopyCostClassifications] = useState(true);
  const [copyTargets, setCopyTargets] = useState(true);
  const [copyFinancials, setCopyFinancials] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = async () => {
    setIsCopying(true);
    try {
      const res = await fetch("/api/fiscal-year/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceYear: Number(sourceYear), targetYear: Number(targetYear),
          copyEmployees, copyEquipment, copyCostClassifications, copyTargets, copyFinancials,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`${json.data.copiedCount}件のデータを${targetYear}年度にコピーしました`);
        setShowConfirm(false);
      } else {
        toast.error(json.error?.message || "コピーに失敗しました");
      }
    } catch { toast.error("コピーに失敗しました"); }
    finally { setIsCopying(false); }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-slate-900">年度管理</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">年度コピー</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="space-y-1 flex-1">
              <Label>コピー元年度</Label>
              <Select value={sourceYear} onValueChange={setSourceYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}年度</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <span className="pb-2 text-slate-400">→</span>
            <div className="space-y-1 flex-1">
              <Label>コピー先年度</Label>
              <Select value={targetYear} onValueChange={setTargetYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}年度</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">コピーする項目</Label>
            {[
              { checked: copyEmployees, onChange: setCopyEmployees, label: "従業員データ（人工）" },
              { checked: copyEquipment, onChange: setCopyEquipment, label: "重機・車両・アタッチメント" },
              { checked: copyCostClassifications, onChange: setCopyCostClassifications, label: "コスト分類設定" },
              { checked: copyTargets, onChange: setCopyTargets, label: "目標設定" },
              { checked: copyFinancials, onChange: setCopyFinancials, label: "決算データ（PL/BS）" },
            ].map(({ checked, onChange, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>

          <Button onClick={() => setShowConfirm(true)} disabled={sourceYear === targetYear}>
            年度を作成
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle>年度コピーの確認</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">
            {sourceYear}年度 → {targetYear}年度にデータをコピーします。よろしいですか？
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>キャンセル</Button>
            <Button onClick={handleCopy} disabled={isCopying}>
              {isCopying ? "コピー中..." : "実行"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
