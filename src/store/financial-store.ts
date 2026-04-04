import { create } from "zustand";
import type { FinancialStatementData } from "@/types/financial";

interface FinancialStore {
  financialData: FinancialStatementData | null;
  fiscalYear: number;
  setFiscalYear: (year: number) => void;
  setFinancialData: (data: FinancialStatementData) => void;
  clearFinancialData: () => void;
}

export const useFinancialStore = create<FinancialStore>((set) => ({
  financialData: null,
  fiscalYear: new Date().getFullYear(),
  setFiscalYear: (year) => set({ fiscalYear: year }),
  setFinancialData: (data) => set({ financialData: data }),
  clearFinancialData: () => set({ financialData: null }),
}));
