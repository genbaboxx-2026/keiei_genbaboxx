import { create } from "zustand";

interface FiscalYearStore {
  currentFiscalYear: number;
  setCurrentFiscalYear: (year: number) => void;
}

export const useFiscalYearStore = create<FiscalYearStore>((set) => ({
  currentFiscalYear: new Date().getFullYear(),
  setCurrentFiscalYear: (year) => set({ currentFiscalYear: year }),
}));
