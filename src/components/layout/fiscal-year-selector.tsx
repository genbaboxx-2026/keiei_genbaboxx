"use client";

import { useFiscalYearStore } from "@/store/fiscal-year-store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - 3 + i);

export function FiscalYearSelector() {
  const { currentFiscalYear, setCurrentFiscalYear } = useFiscalYearStore();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-500">年度:</span>
      <Select
        value={String(currentFiscalYear)}
        onValueChange={(v) => setCurrentFiscalYear(Number(v))}
      >
        <SelectTrigger className="w-32 h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {YEARS.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}年度
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
