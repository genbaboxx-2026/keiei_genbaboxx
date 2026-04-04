"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STEPS = [
  { num: 1, title: "決算書をアップロード", desc: "損益計算書（PL）をOCR読取またはExcelで読み込みましょう", link: "/input/upload?type=pl", linkLabel: "OCRアップロード", altLink: "/input/financials", altLabel: "手入力" },
  { num: 2, title: "貸借対照表を入力（任意）", desc: "BSを入力すると経営指標（自己資本比率等）が分析できます", link: "/input/balance-sheet", linkLabel: "BS入力" },
  { num: 3, title: "従業員データを入力", desc: "人工データを入力するとコストマスタが自動生成されます", link: "/input/employees", linkLabel: "人工入力", altLink: "/input/upload", altLabel: "Excel読込" },
  { num: 4, title: "重機・車両を登録", desc: "重機・車両・アタッチメントの情報を登録しましょう", link: "/input/equipment", linkLabel: "重機入力" },
  { num: 5, title: "目標を設定", desc: "売上目標、粗利率目標、営業利益率目標を設定しましょう", link: "/settings/targets", linkLabel: "目標設定" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const completeOnboarding = async () => {
    try {
      await fetch("/api/companies/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingCompleted: true }),
      });
      toast.success("セットアップが完了しました！");
      router.push("/");
    } catch { router.push("/"); }
  };

  const step = STEPS[currentStep];

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">四次元ポケットへようこそ！</h1>
        <p className="text-slate-500">初期データを入力して、経営分析を始めましょう</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <button onClick={() => setCurrentStep(i)} className={`w-8 h-8 rounded-full text-xs font-bold ${i <= currentStep ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>{s.num}</button>
            {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < currentStep ? "bg-blue-600" : "bg-slate-200"}`} />}
          </div>
        ))}
      </div>

      {/* Current Step */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step {step.num}: {step.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">{step.desc}</p>
          <div className="flex gap-3">
            <Link href={step.link}><Button>{step.linkLabel}</Button></Link>
            {step.altLink && <Link href={step.altLink}><Button variant="outline">{step.altLabel}</Button></Link>}
          </div>
          <div className="flex justify-between pt-4 border-t">
            <Button variant="ghost" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}>← 前へ</Button>
            <div className="flex gap-2">
              {currentStep < STEPS.length - 1 ? (
                <>
                  <Button variant="ghost" className="text-slate-400" onClick={() => setCurrentStep(currentStep + 1)}>スキップ</Button>
                  <Button onClick={() => setCurrentStep(currentStep + 1)}>次へ →</Button>
                </>
              ) : (
                <Button onClick={completeOnboarding} className="bg-emerald-600 hover:bg-emerald-700">完了 → ダッシュボードへ</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
