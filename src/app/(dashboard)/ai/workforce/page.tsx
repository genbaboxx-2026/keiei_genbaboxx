"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AiWorkforcePage() {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const analyze = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/workforce-analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const json = await res.json();
      if (res.ok && json.data?.analysis) { setAnalysis(json.data.analysis); toast.success("分析が完了しました"); }
      else toast.error(json.error?.message || "分析に失敗しました");
    } catch { toast.error("分析に失敗しました"); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">要員計画AI相談</h1>
        <Button onClick={analyze} disabled={isLoading}>{isLoading ? "分析中..." : "AI分析を実行"}</Button>
      </div>

      {analysis ? (
        <Card>
          <CardContent className="p-6">
            <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: simpleMarkdown(analysis) }} />
            <div className="flex gap-2 mt-6 pt-4 border-t">
              <Link href="/ai/chat?q=要員計画について詳しく教えてください"><Button variant="outline" size="sm">チャットで詳しく相談 →</Button></Link>
              <Link href="/workforce/hiring-plan"><Button variant="outline" size="sm">採用計画シミュレーション →</Button></Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="p-8 text-center text-slate-400">
          従業員プロファイルを入力後、[AI分析を実行] で組織分析・採用提案を生成します
        </CardContent></Card>
      )}
    </div>
  );
}

function simpleMarkdown(text: string): string {
  return text
    .replace(/### (.+)/g, '<h3 class="font-bold text-base mt-3 mb-1">$1</h3>')
    .replace(/## (.+)/g, '<h2 class="font-bold text-lg mt-4 mb-1">$1</h2>')
    .replace(/# (.+)/g, '<h1 class="font-bold text-xl mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\- (.+)/gm, '<li class="ml-4">$1</li>')
    .replace(/\n/g, '<br/>');
}
