"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-4 p-8">
        <h2 className="text-xl font-bold text-slate-900">エラーが発生しました</h2>
        <p className="text-sm text-slate-500 max-w-md">{error.message || "予期しないエラーです。もう一度お試しください。"}</p>
        <Button onClick={reset}>再試行</Button>
      </div>
    </div>
  );
}
