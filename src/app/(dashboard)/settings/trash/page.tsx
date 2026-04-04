"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface TrashItem {
  id: string;
  tableName: string;
  name: string;
  deletedAt: string;
  fiscalYear: number;
}

const TABLE_LABELS: Record<string, string> = {
  employees: "従業員",
  equipment: "重機・車両",
};

export default function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<TrashItem | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/trash");
      const json = await res.json();
      if (res.ok) setItems(json.data || []);
    } catch { toast.error("取得に失敗しました"); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (item: TrashItem, action: "restore" | "delete_permanent") => {
    try {
      const res = await fetch(`/api/trash/${item.tableName}/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(action === "restore" ? "復元しました" : "完全に削除しました");
        setDeleteConfirm(null);
        await fetchData();
      } else { toast.error("操作に失敗しました"); }
    } catch { toast.error("操作に失敗しました"); }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">ゴミ箱</h1>
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ゴミ箱</h1>
        <p className="text-sm text-slate-500 mt-1">削除後30日以内のデータが表示されます</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-slate-400">
          ゴミ箱は空です
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-4 py-2 text-left font-medium text-slate-600">種別</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">名前</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">年度</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">削除日</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.tableName}-${item.id}`} className="border-b">
                  <td className="px-4 py-2 text-slate-500">{TABLE_LABELS[item.tableName] || item.tableName}</td>
                  <td className="px-4 py-2 text-slate-700 font-medium">{item.name}</td>
                  <td className="px-4 py-2 text-slate-500">{item.fiscalYear}</td>
                  <td className="px-4 py-2 text-slate-500">{new Date(item.deletedAt).toLocaleDateString("ja-JP")}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleAction(item, "restore")}>復元</Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteConfirm(item)}>完全削除</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>完全削除の確認</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">
            「{deleteConfirm?.name}」を完全に削除します。この操作は取り消せません。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>キャンセル</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleAction(deleteConfirm, "delete_permanent")}>完全削除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
