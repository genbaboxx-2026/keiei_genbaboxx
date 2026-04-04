"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiscalYearSelector } from "@/components/layout/fiscal-year-selector";
import { useFiscalYearStore } from "@/store/fiscal-year-store";
import { getCoefficient, type CurveBracket } from "@/lib/constants/performance-curves";

interface EmpTimeline { name: string; position: string; age: number | null; retireYear: number | null; retireAge: number }

export default function TimelinePage() {
  const { currentFiscalYear } = useFiscalYearStore();
  const [employees, setEmployees] = useState<EmpTimeline[]>([]);
  const [curves, setCurves] = useState<CurveBracket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentYear = new Date().getFullYear();
  const YEARS = Array.from({ length: 20 }, (_, i) => currentYear + i);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [wfRes, curveRes] = await Promise.all([
        fetch(`/api/workforce/dashboard?fiscal_year=${currentFiscalYear}`),
        fetch("/api/performance-curves"),
      ]);
      const wfJson = await wfRes.json();
      const curveJson = await curveRes.json();
      if (wfRes.ok) {
        setEmployees(wfJson.employees.filter((e: { age: number | null }) => e.age != null).map((e: Record<string, unknown>) => ({
          name: e.name, position: e.position, age: e.age, retireYear: e.retireYear, retireAge: e.retireAge || 65,
        })));
      }
      if (curveRes.ok) setCurves(curveJson.data.map((c: Record<string, unknown>) => ({ position: c.position as string, ageFrom: c.ageFrom as number, ageTo: c.ageTo as number, coefficient: Number(c.coefficient) })));
    } catch { toast.error("取得に失敗しました"); }
    finally { setIsLoading(false); }
  }, [currentFiscalYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) return <div className="space-y-6"><h1 className="text-2xl font-bold text-slate-900">従業員タイムライン</h1><p className="text-slate-500">読み込み中...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">従業員タイムライン</h1>
        <FiscalYearSelector />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">在籍期間 × パフォーマンス推移</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Year headers */}
            <div className="flex items-center border-b pb-1 mb-2">
              <div className="w-36 flex-shrink-0 text-xs font-medium text-slate-500">従業員</div>
              <div className="flex-1 flex">
                {YEARS.map(y => (
                  <div key={y} className={`flex-1 text-center text-[10px] ${y === currentYear ? "font-bold text-blue-600" : "text-slate-400"}`}>
                    {y % 2 === 0 ? y : ""}
                  </div>
                ))}
              </div>
            </div>

            {/* Employee rows */}
            {employees.map((emp, i) => {
              const age = emp.age!;
              return (
                <div key={i} className="flex items-center mb-1 group">
                  <div className="w-36 flex-shrink-0 text-xs text-slate-700 truncate pr-2">
                    <span className="font-medium">{emp.name}</span>
                    <span className="text-slate-400 ml-1">({emp.position})</span>
                  </div>
                  <div className="flex-1 flex h-6">
                    {YEARS.map(y => {
                      const futureAge = age + (y - currentYear);
                      const isRetired = emp.retireYear ? y >= emp.retireYear : false;
                      const coeff = !isRetired ? getCoefficient(curves, emp.position, futureAge) : 0;
                      // Color intensity based on coefficient
                      const opacity = isRetired ? 0.1 : Math.max(coeff, 0.15);
                      const bgColor = isRetired ? "bg-slate-200" : "bg-blue-500";

                      return (
                        <div key={y} className="flex-1 px-[1px]" title={`${y}年: ${futureAge}歳 / 係数${coeff.toFixed(2)}`}>
                          <div className={`h-full rounded-sm ${bgColor} ${isRetired ? "border border-dashed border-slate-300" : ""}`} style={{ opacity }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-2 border-t text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-4 h-3 bg-blue-500 rounded-sm inline-block" style={{ opacity: 1.0 }} /> 高パフォ</span>
              <span className="flex items-center gap-1"><span className="w-4 h-3 bg-blue-500 rounded-sm inline-block" style={{ opacity: 0.4 }} /> 低パフォ</span>
              <span className="flex items-center gap-1"><span className="w-4 h-3 bg-slate-200 border border-dashed border-slate-300 rounded-sm inline-block" /> 退職後</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
