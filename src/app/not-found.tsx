import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-4 p-8">
        <h2 className="text-4xl font-bold text-slate-300">404</h2>
        <p className="text-slate-500">ページが見つかりません</p>
        <Link href="/"><Button>ダッシュボードに戻る</Button></Link>
      </div>
    </div>
  );
}
