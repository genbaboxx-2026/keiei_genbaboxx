"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface SimItem { id: string; name: string; targetType: string; fiscalYear: number; simulationYears: number; createdAt: string }

const TYPE_LABELS: Record<string, string> = { revenue: "将来予測", profit_margin: "目標逆算", what_if: "What-if" };
const TYPE_LINKS: Record<string, string> = { revenue: "/simulation/future", profit_margin: "/simulation/target", what_if: "/simulation/what-if" };

export default function SimulationListPage() {
  const router = useRouter();
  const [items, setItems] = useState<SimItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/simulations");
      const json = await res.json();
      if (res.ok) setItems(json.data || []);
    } catch { toast.error("取得に失敗しました"); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/simulations/${deleteId}`, { method: "DELETE" });
    if (res.ok) { toast.success("削除しました"); setDeleteId(null); await fetchData(); }
    else toast.error("削除に失敗しました");
  };

  if (isLoading) return <div className="space-y-6"><h1 className="text-2xl font-bold text-slate-900">シミュレーション一覧</h1><p className="text-slate-500">読み込み中...</p></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">シミュレーション一覧</h1>

      {items.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-slate-400">
          保存済みシミュレーションはありません
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-4 py-2 text-left font-medium text-slate-600">名前</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600 w-24">種別</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600 w-20">年度</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600 w-28">作成日</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600 w-32">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="px-4 py-2 font-medium text-slate-700">{item.name}</td>
                  <td className="px-4 py-2"><span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{TYPE_LABELS[item.targetType] || item.targetType}</span></td>
                  <td className="px-4 py-2 text-slate-500">{item.fiscalYear}</td>
                  <td className="px-4 py-2 text-slate-500">{new Date(item.createdAt).toLocaleDateString("ja-JP")}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => router.push(TYPE_LINKS[item.targetType] || "/simulation")}>開く</Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteId(item.id)}>削除</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>シミュレーションの削除</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">このシミュレーションを削除しますか？</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>キャンセル</Button>
            <Button variant="destructive" onClick={handleDelete}>削除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
